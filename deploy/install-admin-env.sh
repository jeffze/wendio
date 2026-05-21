#!/usr/bin/env bash
# install-admin-env.sh — installe le drop-in systemd qui charge ~/jeux/wendio/.env
# pour que ADMIN_EMAILS (et autres seed vars) soient passees au process Wendio
# au boot et survivent a une reinstallation.
#
# Usage : sudo bash install-admin-env.sh
#
# Pre-requis : ~/jeux/wendio/.env doit etre sanitise pour ne PAS dupliquer les
# variables deja definies dans /etc/systemd/system/wendio.service (PORT, HOST,
# NODE_ENV, PUBLIC_URL, SUPPORT_URL, SUPPORT_API_KEY, RESEND_API_KEY, EMAIL_*).
# Si ce script trouve une de ces cles dans le .env, il REFUSE de continuer.

set -euo pipefail

ENV_FILE="/home/darkvador/jeux/wendio/.env"
DROPIN_DIR="/etc/systemd/system/wendio.service.d"
DROPIN_FILE="$DROPIN_DIR/admin.conf"

if [[ "$EUID" -ne 0 ]]; then
  echo "Ce script doit etre lance avec sudo." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Fichier env introuvable : $ENV_FILE" >&2
  exit 1
fi

# Garde-fou : refuser si .env contient des cles qui ecraseraient le systemd unit
FORBIDDEN_KEYS="PORT HOST NODE_ENV PUBLIC_URL SUPPORT_URL SUPPORT_API_KEY RESEND_API_KEY EMAIL_FROM EMAIL_FROM_NAME"
for key in $FORBIDDEN_KEYS; do
  if grep -qE "^${key}=" "$ENV_FILE"; then
    echo "ERREUR : '$key' est defini dans $ENV_FILE et ecraserait le systemd unit." >&2
    echo "Retire-le du .env avant de relancer ce script." >&2
    exit 1
  fi
done

# Cree le drop-in (idempotent)
mkdir -p "$DROPIN_DIR"
cat > "$DROPIN_FILE" <<EOF
# Drop-in genere par install-admin-env.sh — charge le .env utilisateur.
# Le '-' en prefixe = ne pas echouer si le fichier est absent.
[Service]
EnvironmentFile=-${ENV_FILE}
EOF

chmod 644 "$DROPIN_FILE"
echo "[OK] Drop-in installe : $DROPIN_FILE"
echo "--- contenu ---"
cat "$DROPIN_FILE"

systemctl daemon-reload
systemctl restart wendio
sleep 2

# Verifie que ADMIN_EMAILS est bien dans l'env du process
# (le PID est demande a systemd plutot qu'a pgrep — systemd a WorkingDirectory
# mais ExecStart=node server.js sans chemin absolu, donc /proc/N/cmdline ne
# contient pas 'wendio/server.js' mais juste 'node server.js')
PID=$(systemctl show --property=MainPID --value wendio)
if [[ -z "$PID" || "$PID" == "0" ]]; then
  echo "ATTENTION : impossible de trouver le PID wendio, verifier 'systemctl status wendio'" >&2
  exit 2
fi

echo "--- env du process Wendio (PID $PID) ---"
if tr '\0' '\n' < "/proc/$PID/environ" | grep -E "^(ADMIN_EMAILS|DB_PATH|PORT|HOST|NODE_ENV)="; then
  echo
  echo "[OK] ADMIN_EMAILS est maintenant charge. Tu peux te reconnecter via magic link."
else
  echo "ATTENTION : ADMIN_EMAILS toujours absent de l'environnement du process." >&2
  exit 3
fi
