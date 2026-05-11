#!/usr/bin/env bash
# Bootstrap d'un VPS Ubuntu 24.04 LTS pour héberger les jeux Socket.io
# (WENDIO + futurs jeux Sylvain).
#
# À exécuter UNE SEULE FOIS, en tant qu'utilisateur normal avec sudo
# (typiquement `darkvador`). Le script est idempotent : ré-exécution sans
# risque, il saute ce qui est déjà installé.
#
# Usage : ssh darkvador@<vps-ip> 'bash -s' < setup-vps.sh
#   ou  : scp setup-vps.sh darkvador@<vps-ip>:~ && ssh darkvador@<vps-ip> 'sudo bash ~/setup-vps.sh'

set -euo pipefail

log() { echo -e "\n\033[1;36m[setup]\033[0m $*"; }

# ── 0. Sanity check ──────────────────────────────────────────────────
if [[ "$(id -u)" -eq 0 ]]; then
  echo "Ne PAS exécuter en root. Lance depuis darkvador avec sudo dispo."
  exit 1
fi

if ! command -v sudo >/dev/null; then
  echo "sudo manquant. Demande à WHC ou installe-le manuellement."
  exit 1
fi

# ── 1. Mise à jour système ───────────────────────────────────────────
log "Mise à jour des paquets"
sudo apt-get update -y
sudo apt-get upgrade -y

# ── 2. Outils de base ────────────────────────────────────────────────
log "Installation outils de base"
sudo apt-get install -y \
  curl wget gnupg ca-certificates \
  git build-essential \
  ufw fail2ban \
  rsync

# ── 3. UFW (firewall) AVANT Caddy — sinon Let's Encrypt rate-limite ─
# Cf. memory feedback_caddy_letsencrypt.md
log "Configuration UFW : SSH + HTTP + HTTPS"
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP - Let''s Encrypt + redirect HTTPS'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw --force enable
sudo ufw status verbose

# ── 4. fail2ban ──────────────────────────────────────────────────────
log "Activation fail2ban"
sudo systemctl enable --now fail2ban

# ── 5. Node.js 20 LTS via NodeSource ─────────────────────────────────
if ! command -v node >/dev/null || [[ "$(node -v)" != v20* ]]; then
  log "Installation Node.js 20 LTS"
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  log "Node.js déjà installé : $(node -v)"
fi
node -v
npm -v

# ── 6. Caddy (reverse proxy + HTTPS auto) ────────────────────────────
if ! command -v caddy >/dev/null; then
  log "Installation Caddy"
  sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | \
    sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | \
    sudo tee /etc/apt/sources.list.d/caddy-stable.list
  sudo apt-get update -y
  sudo apt-get install -y caddy
else
  log "Caddy déjà installé"
fi
caddy version

# ── 7. Tailscale (SSH privé) ─────────────────────────────────────────
# Une fois installé, tape `sudo tailscale up` interactivement pour lier
# au compte JF. SSH publique restera ouvert au cas où, mais privilégie
# la connexion Tailscale comme sur l'autre VPS.
if ! command -v tailscale >/dev/null; then
  log "Installation Tailscale"
  curl -fsSL https://tailscale.com/install.sh | sh
else
  log "Tailscale déjà installé"
fi

# ── 8. Structure des dossiers jeux ───────────────────────────────────
log "Création structure ~/jeux/<jeu>/ et ~/backups/"
mkdir -p ~/jeux
mkdir -p ~/backups

# ── 9. Caddy : empêcher le démarrage avec config par défaut ──────────
# Le Caddyfile sera déposé par le script de déploiement du premier jeu.
# Pour éviter que Caddy serve sa page par défaut, on met une config vide.
if [[ ! -f /etc/caddy/Caddyfile.installed ]]; then
  log "Backup Caddyfile par défaut"
  sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.default 2>/dev/null || true
  sudo touch /etc/caddy/Caddyfile.installed
fi

log "Setup VPS terminé ✅"
echo
echo "Prochaines étapes :"
echo "  1. sudo tailscale up               # lier le VPS à ton compte Tailscale"
echo "  2. Vérifier IP Tailscale           # tailscale ip -4"
echo "  3. Mettre à jour DNS A record      # wendio.jeuxlirlok.com → IP publique"
echo "  4. Depuis ton poste : ./deploy.sh  # déploiement WENDIO"
