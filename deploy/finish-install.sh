#!/usr/bin/env bash
# finish-install.sh — finalisation Wendio + Support sur VPS frais.
#
# À lancer EN ROOT (via sudo) une seule fois APRÈS bootstrap-secure.sh,
# rsync du code Wendio + Support, et création du Support .env.
#
# Idempotent. Sans dépendance externe au-delà de Node 24 (déjà installé
# par bootstrap-secure.sh).
#
# Usage : sudo bash finish-install.sh

set -euo pipefail

log() { echo -e "\n\033[1;36m[finish]\033[0m $*"; }
ok()  { echo -e "\033[0;32m  ✓\033[0m $*"; }
warn(){ echo -e "\033[0;33m  ⚠\033[0m $*"; }

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Lancer avec sudo : sudo bash $0"
  exit 1
fi

WENDIO_DIR=/home/darkvador/jeux/wendio
SUPPORT_DIR=/home/darkvador/jeux/support

# ── 1. Support : install-support.sh expects darkvador user, not root ──
log "[1/8] Run install-support.sh en tant que darkvador"
sudo -u darkvador -H bash "$SUPPORT_DIR/deploy/install-support.sh"
ok "Support service installé et démarré"

# ── 2. Caddyfile : append Support snippet si pas déjà là ──
# Détection STRICTE : cherche le bloc 'support.jeuxlirlok.com {' en début
# de ligne, pas juste le domaine (qui apparaît dans la CSP de Wendio →
# faux positif rencontré le 2026-05-20).
log "[2/8] Append Support snippet au Caddyfile"
if grep -qE '^support\.jeuxlirlok\.com[[:space:]]*\{' /etc/caddy/Caddyfile; then
  ok "Snippet Support déjà présent (skip)"
else
  echo "" >> /etc/caddy/Caddyfile
  cat "$SUPPORT_DIR/deploy/Caddyfile-snippet.txt" >> /etc/caddy/Caddyfile
  ok "Snippet Support ajouté"
fi

# ── 3. Caddy logs perms ──
log "[3/8] Fix permissions /var/log/caddy/"
touch /var/log/caddy/wendio.log /var/log/caddy/support.log
chown caddy:caddy /var/log/caddy/wendio.log /var/log/caddy/support.log
chmod 644 /var/log/caddy/wendio.log /var/log/caddy/support.log
ok "Logs Caddy créés avec bonnes perms (caddy:caddy)"

# ── 4. Récupérer api_key game 'wendio' via Node (node:sqlite builtin) ──
# Pas de dépendance sur sqlite3 CLI (absent par défaut sur Ubuntu fresh,
# rencontré le 2026-05-20).
log "[4/8] Récupération api_key game 'wendio' depuis Support DB"
sleep 2
SUPPORT_API_KEY=$(sudo -u darkvador node -e '
const { DatabaseSync } = require("node:sqlite");
const d = new DatabaseSync("/var/lib/bugtracker/bugs.db");
const row = d.prepare("SELECT api_key FROM games WHERE id = ?").get("wendio");
process.stdout.write(row ? row.api_key : "");
')
if [[ -z "$SUPPORT_API_KEY" ]]; then
  warn "api_key wendio absente — Support DB pas encore seed ou autre problème"
  warn "Vérifie via Node : sudo -u darkvador node -e \"console.log(new (require(\\\"node:sqlite\\\")).DatabaseSync('/var/lib/bugtracker/bugs.db').prepare('SELECT * FROM games').all())\""
  exit 1
fi
ok "api_key récupérée (longueur ${#SUPPORT_API_KEY} chars)"

# ── 5. Drop-in pour wendio.service avec Support vars ──
log "[5/8] Drop-in wendio.service.d/support.conf"
mkdir -p /etc/systemd/system/wendio.service.d
cat > /etc/systemd/system/wendio.service.d/support.conf <<EOF
[Service]
Environment=SUPPORT_URL=https://support.jeuxlirlok.com
Environment=SUPPORT_API_KEY=$SUPPORT_API_KEY
Environment=SUPPORT_GAME_ID=wendio
EOF
chmod 640 /etc/systemd/system/wendio.service.d/support.conf
ok "Drop-in support.conf créé"

# ── 6. Drop-in wendio limits (anti-DOS) ──
log "[6/8] Drop-in wendio.service.d/limits.conf"
cat > /etc/systemd/system/wendio.service.d/limits.conf <<'EOF'
[Service]
MemoryMax=512M
TasksMax=100
EOF
chmod 644 /etc/systemd/system/wendio.service.d/limits.conf
ok "Limits 512M/100tasks appliquées"

# ── 7. daemon-reload + restart wendio + caddy ──
log "[7/8] daemon-reload + restart wendio + caddy"
systemctl daemon-reload
systemctl restart wendio
systemctl restart caddy
ok "Services redémarrés"

# ── 8. Healthchecks ──
log "[8/8] Healthchecks (attente 3s)"
sleep 3
if curl -sf http://127.0.0.1:5000 -o /dev/null; then
  ok "Wendio répond sur 127.0.0.1:5000"
else
  warn "Wendio ne répond pas sur 5000 — journalctl -u wendio -n 50"
fi
if curl -sf http://127.0.0.1:5099/health > /dev/null; then
  ok "Support répond sur 127.0.0.1:5099/health"
else
  warn "Support ne répond pas — journalctl -u support -n 50"
fi

log "État final"
systemctl is-active wendio support caddy | awk '{print "  ✓ "$0}'

log "Finalisation terminée ✅"
echo ""
echo "Tests publics (60s pour cert Let's Encrypt si premier appel) :"
echo "  curl -I https://wendio.jeuxlirlok.com/"
echo "  curl -I https://support.jeuxlirlok.com/health"
echo ""
echo "Si Support .env contient encore PLACEHOLDER_RESEND_KEY_TO_REPLACE :"
echo "  nano $SUPPORT_DIR/.env"
echo "  sudo systemctl restart support"
