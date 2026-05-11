#!/usr/bin/env bash
# Installation initiale de WENDIO sur le VPS (UNE SEULE FOIS).
# Copie le systemd unit, installe le Caddyfile (ou un bloc additionnel),
# active le service, recharge Caddy.
#
# À exécuter SUR LE VPS, après que setup-vps.sh ait été lancé et que le
# code wendio ait été synchronisé une première fois (par deploy.sh).
#
# Usage : sudo bash install-wendio.sh

set -euo pipefail

REPO_DIR="/home/darkvador/jeux/wendio"
SYSTEMD_SRC="${REPO_DIR}/deploy/wendio.service"
SYSTEMD_DST="/etc/systemd/system/wendio.service"

CADDYFILE_SRC="${REPO_DIR}/deploy/Caddyfile"
CADDYFILE_DST="/etc/caddy/Caddyfile"

log() { echo -e "\n\033[1;36m[install]\033[0m $*"; }

# ── Vérifs ───────────────────────────────────────────────────────────
if [[ "$(id -u)" -ne 0 ]]; then
  echo "Lance avec sudo : sudo bash install-wendio.sh"
  exit 1
fi

if [[ ! -d "$REPO_DIR" ]]; then
  echo "Code wendio absent dans $REPO_DIR. Lance d'abord deploy.sh depuis ton poste."
  exit 1
fi

# ── 1. systemd unit ──────────────────────────────────────────────────
log "Installation systemd unit"
install -m 644 "$SYSTEMD_SRC" "$SYSTEMD_DST"
systemctl daemon-reload
systemctl enable wendio
log "Service wendio.service installé et activé au boot"

# ── 2. Caddyfile : premier jeu → on dépose le fichier complet ────────
# Si le Caddyfile existe déjà avec des blocs (futurs jeux), ne pas
# l'écraser : avertir et laisser l'admin merger manuellement.
log "Configuration Caddy"
if [[ -s "$CADDYFILE_DST" ]] && grep -q reverse_proxy "$CADDYFILE_DST"; then
  echo
  echo "⚠️  $CADDYFILE_DST contient déjà des blocs reverse_proxy."
  echo "   Pour ne pas écraser, MERGE manuellement le bloc 'wendio.jeuxlirlok.com'"
  echo "   depuis $CADDYFILE_SRC vers $CADDYFILE_DST."
  echo
else
  install -m 644 "$CADDYFILE_SRC" "$CADDYFILE_DST"
  caddy fmt --overwrite "$CADDYFILE_DST" || true
  caddy validate --config "$CADDYFILE_DST"
  systemctl reload caddy
  log "Caddyfile installé et rechargé"
fi

# ── 3. Démarrage du service ──────────────────────────────────────────
log "Démarrage wendio.service"
systemctl restart wendio
sleep 2
systemctl status wendio --no-pager -l | head -15

log "Installation terminée ✅"
echo
echo "Vérifs utiles :"
echo "  curl -I http://127.0.0.1:5000        # Wendio direct (loopback)"
echo "  curl -I https://wendio.jeuxlirlok.com # via Caddy + HTTPS"
echo "  sudo journalctl -u wendio -f         # logs en direct"
echo "  sudo tail -f /var/log/caddy/wendio.log"
