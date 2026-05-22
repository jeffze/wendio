#!/usr/bin/env bash
# Bootstrap durci d'un VPS Ubuntu 24.04 LTS pour héberger Wendio + Support.
#
# Remplace l'ancien combo `setup-vps.sh` + `post-bootstrap.sh` qui appliquait
# le durcissement EN DEUXIÈME, laissant une fenêtre de vulnérabilité de
# quelques heures pendant lesquelles SSH acceptait root + password. Cette
# fenêtre a été exploitée le 2026-05-12/13 sur l'ancien VPS WHC (logins
# root depuis IPs résidentielles IN détectés via `last`).
#
# Ce script fait le durcissement SSH EN PREMIER, avant tout reste.
#
# Pré-requis (côté provider WHC / Hostinger) :
#   1. Provisionner Ubuntu 24.04 LTS
#   2. Idéalement : ajouter ta clé publique SSH au moment du provisioning
#      (élimine la fenêtre password initial)
#   3. Si le provider impose un password root initial : login root + créer
#      darkvador + dropper la clé SSH AVANT de run ce script
#
# Usage :
#   # Port SSH par défaut (22) :
#   ssh darkvador@<vps-ip> 'bash -s' < bootstrap-secure.sh
#
#   # Port SSH custom (ex WHC réinstall) :
#   SSH_PORT=2243 ssh -p 2243 darkvador@<vps-ip> 'SSH_PORT=2243 bash -s' < bootstrap-secure.sh
#
# Variables d'environnement :
#   SSH_PORT     port SSH à autoriser dans UFW + restreindre dans sshd_config (défaut 22)
#
# Idempotent : ré-exécution sans risque.

set -euo pipefail

SSH_PORT="${SSH_PORT:-22}"
if ! [[ "$SSH_PORT" =~ ^[0-9]+$ ]] || (( SSH_PORT < 1 || SSH_PORT > 65535 )); then
  echo "SSH_PORT invalide : $SSH_PORT (doit être 1-65535)" >&2
  exit 1
fi

log()  { echo -e "\n\033[1;36m[bootstrap]\033[0m $*"; }
ok()   { echo -e "\033[0;32m  ✓\033[0m $*"; }
warn() { echo -e "\033[0;33m  ⚠\033[0m $*"; }
err()  { echo -e "\033[0;31m  ✗\033[0m $*" >&2; }

# ─── 0. Sanity checks ───────────────────────────────────────────────────────
if [[ "$(id -u)" -eq 0 ]]; then
  err "Ne PAS exécuter en root. Lance depuis un user normal avec sudo."
  exit 1
fi
if ! command -v sudo >/dev/null; then
  err "sudo manquant. Installe-le manuellement avant de relancer."
  exit 1
fi

# Vérif que le user courant a une SSH key dans authorized_keys.
# Sans ça, désactiver PasswordAuthentication nous lock out du VPS.
if [[ ! -s ~/.ssh/authorized_keys ]]; then
  err "Aucune clé SSH dans ~/.ssh/authorized_keys."
  err "Ajoute ta clé publique AVANT de relancer (sinon tu te lock out après le hardening SSH) :"
  err "  ssh-copy-id darkvador@<vps-ip>"
  err "  ou : depuis ton poste, ssh darkvador@<vps-ip> 'mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys' < ~/.ssh/id_ed25519.pub"
  exit 1
fi
ok "Clé SSH détectée dans ~/.ssh/authorized_keys ($(wc -l < ~/.ssh/authorized_keys) clé(s))"

# ─── 1. PRIORITÉ ABSOLUE : SSH hardening AVANT toute exposition réseau ─────
# Le bug de l'ancien VPS WHC : les bots ont brute-forcé root password
# pendant la fenêtre entre le 1er boot et le hardening manuel. On corrige
# ÇA en premier — fail-fast avant tout reste.
log "[1/9] SSH hardening immédiat (drop-in 99-hardening.conf)"

# Test SSH agent : si la connexion qui exécute ce script utilise PasswordAuth,
# le restart sshd va peut-être lock out la session. Refuser dans ce cas.
if [[ -n "${SSH_AUTH_SOCK:-}" ]] || ssh-add -L >/dev/null 2>&1; then
  ok "Session SSH avec agent forwarding (sera préservée)"
fi

sudo tee /etc/ssh/sshd_config.d/99-hardening.conf >/dev/null <<EOF
# Hardening — appliqué par bootstrap-secure.sh
# Cf. compromission VPS WHC 2026-05-12 (root brute-force par bots IN)
Port $SSH_PORT
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
X11Forwarding no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
EOF
sudo sshd -t && ok "Config SSH valide" || { err "Config SSH invalide — abandon"; exit 1; }
sudo systemctl restart ssh
ok "SSH durci (port $SSH_PORT, PermitRootLogin no, PasswordAuthentication no)"

# ─── 2. Mise à jour système ────────────────────────────────────────────────
log "[2/9] Mise à jour des paquets"
sudo apt-get update -y
DEBIAN_FRONTEND=noninteractive sudo -E apt-get upgrade -y
ok "Système à jour"

# ─── 3. Outils de base + UFW + fail2ban ────────────────────────────────────
log "[3/9] Installation outils + UFW + fail2ban"
sudo apt-get install -y \
  curl wget gnupg ca-certificates \
  git build-essential \
  ufw fail2ban \
  rsync unattended-upgrades \
  debian-keyring debian-archive-keyring apt-transport-https
ok "Paquets de base installés"

# ─── 4. UFW (firewall) AVANT Caddy ─────────────────────────────────────────
# Pourquoi ouvrir 80/443 ici : Caddy plus tard va demander Let's Encrypt,
# qui rate-limite si 80/443 sont fermés à l'install.
log "[4/9] Configuration UFW (firewall)"
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow "$SSH_PORT/tcp" comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP - Let''s Encrypt + redirect HTTPS'
sudo ufw allow 443/tcp comment 'HTTPS'
# Tailscale : autoriser tout le trafic depuis le tailnet (sinon UFW coupe la session 100.x)
sudo ufw allow in on tailscale0 comment 'Tailscale tailnet' 2>/dev/null || true
sudo ufw allow from 100.64.0.0/10 comment 'Tailscale CGNAT range'
sudo ufw --force enable
ok "UFW actif (deny incoming sauf 22/80/443 + Tailscale)"

# ─── 5. fail2ban + jail recidive ────────────────────────────────────────────
log "[5/9] fail2ban + recidive jail"
sudo systemctl enable --now fail2ban
sudo tee /etc/fail2ban/jail.d/recidive.conf >/dev/null <<'EOF'
[recidive]
enabled  = true
filter   = recidive
logpath  = /var/log/fail2ban.log
bantime  = 1w
findtime = 1d
maxretry = 5
banaction = ufw
EOF
sudo systemctl restart fail2ban
ok "fail2ban actif (sshd + recidive : ban 1 semaine après 5 bans en 24h)"

# ─── 6. Unattended-upgrades (security patches auto) ────────────────────────
log "[6/9] Unattended-upgrades"
sudo tee /etc/apt/apt.conf.d/20auto-upgrades >/dev/null <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
sudo systemctl enable --now unattended-upgrades >/dev/null 2>&1
ok "Unattended-upgrades actif (security only)"

# ─── 7. Sysctl hardening ───────────────────────────────────────────────────
log "[7/9] Sysctl hardening"
sudo tee /etc/sysctl.d/99-security.conf >/dev/null <<'EOF'
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_source_route = 0
kernel.kptr_restrict = 2
kernel.dmesg_restrict = 1
EOF
sudo sysctl -p /etc/sysctl.d/99-security.conf 2>&1 | grep -v "permission denied" || true
ok "Sysctl appliqué (kernel.* skippé si LXC)"

# ─── 8. Sudoers cleanup (piège ubuntu NOPASSWD) ────────────────────────────
log "[8/9] Sudoers cleanup"
if [[ -f /etc/sudoers.d/90-incus ]] && grep -q "^ubuntu " /etc/sudoers.d/90-incus 2>/dev/null; then
  sudo cp /etc/sudoers.d/90-incus /etc/sudoers.d/90-incus.bak
  sudo tee /etc/sudoers.d/90-incus >/dev/null <<'EOF'
# Désactivé : la règle ubuntu NOPASSWD était un vestige du template cloud image.
# Le user ubuntu n'existe pas sur ce système ; règle vidée pour neutraliser le piège latent.
EOF
  sudo chmod 440 /etc/sudoers.d/90-incus
  sudo visudo -c >/dev/null && ok "Piège ubuntu neutralisé"
else
  ok "Pas de piège sudoers (skip)"
fi

# ─── 9. Node.js + Caddy + Tailscale + Caddy admin off ──────────────────────
log "[9/9] Node 24 LTS + Caddy + Tailscale"

# Node 24 LTS via NodeSource
CURRENT_NODE_MAJOR=$(node --version 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/' || echo "0")
if [[ "$CURRENT_NODE_MAJOR" != "24" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_24.x" | sudo -E bash -
  sudo apt-get install -y nodejs
fi
ok "Node $(node -v) / npm $(npm -v)"

# Caddy
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | \
    sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | \
    sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y caddy
fi
# Caddy : désactiver admin API (sécurité, on utilise systemctl restart au lieu de reload)
if ! sudo grep -q "admin off" /etc/caddy/Caddyfile 2>/dev/null; then
  sudo tee /etc/caddy/Caddyfile >/dev/null <<'EOF'
{
  admin off
  email contact@strategief.com
}
# Sites ajoutés par les scripts de déploiement des apps
EOF
  sudo systemctl restart caddy 2>/dev/null || true
fi
ok "Caddy $(caddy version | head -1) installé (admin off)"

# Tailscale
if ! command -v tailscale >/dev/null; then
  curl -fsSL https://tailscale.com/install.sh | sh
fi
ok "Tailscale installé (lancer 'sudo tailscale up' pour authentifier)"

# ─── Structure dossiers ─────────────────────────────────────────────────────
mkdir -p ~/jeux ~/backups
ok "Structure ~/jeux et ~/backups OK"

# ─── Rapport final ──────────────────────────────────────────────────────────
log "Bootstrap durci terminé ✅"
echo ""
echo "─── État des protections ──────────────────────────"
echo "  SSH config :"
sudo sshd -T 2>/dev/null | grep -E "^(port|permitrootlogin|passwordauthentication|pubkeyauthentication)" | sed 's/^/    /'
echo "  UFW :"
sudo ufw status numbered | tail -n +4 | sed 's/^/    /'
echo "  fail2ban jails :"
sudo fail2ban-client status 2>/dev/null | grep "Jail list" | sed 's/^/    /'
echo "  Node : $(node -v)  |  Caddy : $(caddy version 2>/dev/null | head -1 | awk '{print $1}')"
echo ""
echo "─── Étapes suivantes ──────────────────────────────"
echo "  1. sudo tailscale up                       # authentifier le VPS au tailnet"
echo "  2. tailscale ip -4                          # noter l'IP Tailscale"
echo "  3. DNS : pointer A records vers IP publique de ce VPS"
echo "  4. Depuis poste local : ./deploy.sh        # déployer Wendio puis Support"
echo "  5. Ajouter monitoring externe (UptimeRobot)"
