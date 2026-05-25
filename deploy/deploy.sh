#!/usr/bin/env bash
# Déploiement WENDIO : push code local → VPS, restart service.
#
# Usage : ./deploy.sh              # déploie depuis le répertoire courant
#         VPS_HOST=...  ./deploy.sh  # override la cible
#
# Prérequis : setup-vps.sh exécuté une fois sur le VPS, wendio.service
# installé dans /etc/systemd/system/, Caddyfile en place.

set -euo pipefail

# ── Couleurs (définies tôt pour les messages d'erreur de config) ─────
RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[1;36m'; NC='\033[0m'
log()  { echo -e "${CYAN}[deploy]${NC} $*"; }
ok()   { echo -e "${GREEN}✓${NC} $*"; }
err()  { echo -e "${RED}✗${NC} $*" >&2; }

# ── Config : lue depuis .deploy.env (gitignored) ou env vars ─────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY_ENV="$REPO_ROOT/.deploy.env"
if [[ -f "$DEPLOY_ENV" ]]; then
  set -a; source "$DEPLOY_ENV"; set +a
fi

VPS_USER="${VPS_USER:-darkvador}"
VPS_HOST="${VPS_HOST:-}"
VPS_PORT="${VPS_PORT:-}"
APP_NAME="wendio"
REMOTE_DIR="/home/${VPS_USER}/jeux/${APP_NAME}"
HEALTH_URL="${HEALTH_URL:-https://wendio.jeuxlirlok.com/}"

if [[ -z "$VPS_HOST" || -z "$VPS_PORT" ]]; then
  err "VPS_HOST et VPS_PORT requis. Crée $DEPLOY_ENV avec :"
  err "  VPS_USER=darkvador"
  err "  VPS_HOST=<IP Tailscale ou publique du VPS>"
  err "  VPS_PORT=<port SSH custom>"
  exit 1
fi

# ── Vérifs ───────────────────────────────────────────────────────────
if [[ ! -f "$REPO_ROOT/server.js" ]]; then
  err "server.js introuvable dans $REPO_ROOT"
  exit 1
fi

log "Cible : ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}"
log "Source : $REPO_ROOT"

# ── Sync code (exclure node_modules, .git, données runtime) ──────────
log "Sync via rsync"
rsync -avz --delete \
  -e "ssh -p ${VPS_PORT}" \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude 'Manual/' \
  --exclude 'sources/*.psd' \
  --exclude 'deploy/' \
  --exclude '*.log' \
  --exclude '.env' \
  --exclude '.deploy.env' \
  --exclude 'data/' \
  --exclude 'cartes-orig/' \
  --exclude 'cartes-pales/' \
  --exclude 'cartes-test/' \
  "$REPO_ROOT/" \
  "${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/"
ok "Code synchronisé"

# ── Install deps prod sur le VPS ─────────────────────────────────────
log "npm ci --omit=dev sur le VPS"
ssh -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" \
  "cd ${REMOTE_DIR} && npm ci --omit=dev"
ok "Dépendances installées"

# ── Restart service ──────────────────────────────────────────────────
log "Restart systemd service ${APP_NAME}"
ssh -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" \
  "sudo systemctl restart ${APP_NAME} && sudo systemctl status ${APP_NAME} --no-pager -l | head -20"
ok "Service redémarré"

# ── Vérif santé HTTP ─────────────────────────────────────────────────
log "Vérif HTTP : ${HEALTH_URL}"
sleep 2
if curl -fsSL -o /dev/null -w "%{http_code}" "${HEALTH_URL}" | grep -qE '^(200|301|302)$'; then
  ok "WENDIO répond ✅"
else
  err "WENDIO ne répond pas correctement. Logs : ssh ${VPS_USER}@${VPS_HOST} 'sudo journalctl -u ${APP_NAME} -n 50'"
  exit 1
fi

log "Déploiement terminé 🎉"
