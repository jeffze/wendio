#!/usr/bin/env bash
# Durcissement post-bootstrap du VPS Jeux Sylvain.
#
# À exécuter UNE FOIS après `setup-vps.sh`, en `darkvador` avec sudo.
# Rejoue tous les hardening appliqués manuellement le 2026-05-13 (audit
# sécurité approfondi). Idempotent : ré-exécution sans risque.
#
# Usage : sudo bash post-bootstrap.sh

set -euo pipefail

log()  { echo -e "\n\033[1;36m[harden]\033[0m $*"; }
ok()   { echo -e "\033[0;32m  ✓\033[0m $*"; }
warn() { echo -e "\033[0;33m  ⚠\033[0m $*"; }

if [[ "$(id -u)" -eq 0 ]]; then
  echo "Ne PAS exécuter en root. Lance depuis darkvador avec sudo."
  exit 1
fi

# ── 1. SSH : durcissement via drop-in ─────────────────────────────────
log "SSH hardening (drop-in 99-hardening.conf)"
sudo bash -c 'echo "PermitRootLogin no" > /etc/ssh/sshd_config.d/99-hardening.conf'
sudo bash -c 'echo "PasswordAuthentication no" >> /etc/ssh/sshd_config.d/99-hardening.conf'
sudo bash -c 'echo "PubkeyAuthentication yes" >> /etc/ssh/sshd_config.d/99-hardening.conf'
sudo sshd -t && ok "Config SSH valide" || { warn "Config SSH invalide — abandon"; exit 1; }
sudo systemctl restart ssh
ok "SSH durci"

# ── 2. Neutraliser le piège sudoers `ubuntu` (template cloud image) ──
log "Neutralisation sudoers piège (user ubuntu inexistant + NOPASSWD)"
if [[ -f /etc/sudoers.d/90-incus ]]; then
  if grep -q "^ubuntu " /etc/sudoers.d/90-incus 2>/dev/null; then
    sudo cp /etc/sudoers.d/90-incus /etc/sudoers.d/90-incus.bak
    sudo bash -c 'echo "# Desactive : la regle ubuntu NOPASSWD etait un vestige du template cloud image WHC." > /etc/sudoers.d/90-incus'
    sudo bash -c 'echo "# Le user ubuntu n existe pas sur ce systeme ; regle videe pour neutraliser le piege latent." >> /etc/sudoers.d/90-incus'
    sudo chmod 440 /etc/sudoers.d/90-incus
    sudo visudo -c >/dev/null && ok "Piège ubuntu neutralisé"
  else
    ok "Piège ubuntu déjà neutralisé (skip)"
  fi
else
  ok "Pas de 90-incus (skip)"
fi

# ── 3. Unattended-upgrades (security patches auto) ───────────────────
log "Unattended-upgrades"
if ! dpkg -l | grep -q "^ii  unattended-upgrades"; then
  sudo apt-get install -y unattended-upgrades
fi
sudo bash -c 'echo "APT::Periodic::Update-Package-Lists \"1\";" > /etc/apt/apt.conf.d/20auto-upgrades'
sudo bash -c 'echo "APT::Periodic::Unattended-Upgrade \"1\";" >> /etc/apt/apt.conf.d/20auto-upgrades'
sudo systemctl enable --now unattended-upgrades >/dev/null 2>&1
ok "Unattended-upgrades actif (security only)"

# ── 4. Sysctl hardening (les options LXC-incompatibles seront refusées, c'est OK) ──
log "Sysctl hardening (kernel.* peut échouer en LXC, ce n'est pas grave)"
sudo bash -c 'echo "net.ipv4.conf.all.rp_filter = 1" > /etc/sysctl.d/99-security.conf'
sudo bash -c 'echo "net.ipv4.conf.default.rp_filter = 1" >> /etc/sysctl.d/99-security.conf'
sudo bash -c 'echo "net.ipv4.tcp_syncookies = 1" >> /etc/sysctl.d/99-security.conf'
sudo bash -c 'echo "kernel.kptr_restrict = 2" >> /etc/sysctl.d/99-security.conf'
sudo bash -c 'echo "kernel.dmesg_restrict = 1" >> /etc/sysctl.d/99-security.conf'
sudo sysctl -p /etc/sysctl.d/99-security.conf 2>&1 | grep -v "permission denied" || true
ok "Sysctl appliqué (kernel.* skippés en LXC = normal)"

# ── 5. fail2ban — jail recidive (ban 1 semaine après 5 bans en 24h) ──
log "fail2ban recidive jail"
sudo bash -c 'echo "[recidive]" > /etc/fail2ban/jail.d/recidive.conf'
sudo bash -c 'echo "enabled = true" >> /etc/fail2ban/jail.d/recidive.conf'
sudo bash -c 'echo "filter = recidive" >> /etc/fail2ban/jail.d/recidive.conf'
sudo bash -c 'echo "logpath = /var/log/fail2ban.log" >> /etc/fail2ban/jail.d/recidive.conf'
sudo bash -c 'echo "bantime = 1w" >> /etc/fail2ban/jail.d/recidive.conf'
sudo bash -c 'echo "findtime = 1d" >> /etc/fail2ban/jail.d/recidive.conf'
sudo bash -c 'echo "maxretry = 5" >> /etc/fail2ban/jail.d/recidive.conf'
sudo bash -c 'echo "banaction = ufw" >> /etc/fail2ban/jail.d/recidive.conf'
sudo systemctl restart fail2ban
ok "fail2ban jail recidive active"

# ── 6. Wendio systemd : limites anti-DOS (mémoire + tâches) ──────────
log "Wendio systemd anti-DOS limits"
sudo mkdir -p /etc/systemd/system/wendio.service.d
sudo bash -c 'echo "[Service]" > /etc/systemd/system/wendio.service.d/limits.conf'
sudo bash -c 'echo "MemoryMax=512M" >> /etc/systemd/system/wendio.service.d/limits.conf'
sudo bash -c 'echo "TasksMax=100" >> /etc/systemd/system/wendio.service.d/limits.conf'
sudo systemctl daemon-reload
sudo systemctl restart wendio
ok "Wendio limites appliquées (512MB max, 100 tâches max)"

# ── 7. Vérifications finales ──────────────────────────────────────────
log "Vérifications finales"
echo "  SSH effective config :"
sudo sshd -T 2>/dev/null | grep -E "^(port|permitrootlogin|passwordauth)" | sed 's/^/    /'
echo "  UFW :"
sudo ufw status | tail -n +4 | sed 's/^/    /'
echo "  fail2ban jails :"
sudo fail2ban-client status 2>/dev/null | grep "Jail list" | sed 's/^/    /'
echo "  Wendio limits :"
systemctl show wendio --property=MemoryMax,TasksMax | sed 's/^/    /'

log "Durcissement post-bootstrap terminé ✅"
echo ""
echo "Reste à faire MANUELLEMENT :"
echo "  • Caddyfile : déposer la version du repo (admin off + headers) → /etc/caddy/Caddyfile"
echo "  • Monitoring externe : UptimeRobot ou similaire sur https://<jeu>.jeuxlirlok.com"
echo "  • Tailscale : sudo tailscale up (puis approuver dans le dashboard, disable key expiry)"
