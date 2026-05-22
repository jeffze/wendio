# Bootstrap durci VPS — Procédure WHC (réinstall cloud288212)

Procédure pour reprendre en main le VPS WHC `cloud288212.mywhc.ca` après la réinstallation demandée à WHC suite à la compromission du 2026-05-12 (root brute-force par bots IN pendant la fenêtre setup, cf. logs `last` sur ancien VPS).

> Le VPS public est `23.27.253.63` (IP inchangée). WHC réinstalle Ubuntu fresh + port SSH custom.

## Vue d'ensemble

```
1. Réception credentials WHC                ← email avec IP, port SSH, password root
2. Premier login + sécurisation immédiate (~5 min)
3. Run bootstrap-secure.sh (~5 min)
4. Tailscale up + retirer ancien device (~3 min)
5. Vérification DNS Cloudflare (inchangé, déjà bon)
6. Deploy Wendio (~5 min)
7. Deploy Support (~5 min)
8. Smoke tests (~5 min)
                                             Total : ~30-40 min
```

## 0. Avant la réinstall (déjà fait ?)

Si tu as encore accès au VPS compromis :
- **Backup les DB en local** : `scp darkvador@…:/var/lib/bugs-ccu/bugs.db D:/Support/backup-before-wipe.db`
  (Attention : Bugs-CCU n'est PAS sur ce VPS, il est sur le VPS Compta. Ici on parle de Support = bug tracker des jeux Sylvain)
- Le service `support` sur le VPS WHC a sa DB SQLite dans `/var/lib/bugs/bugs.db` (à vérifier le path exact)
- Backup le `~/jeux/wendio/Manual/` si jamais (gitignored)

⚠️ Si tu suspectes le VPS d'être compromis : **NE PAS** copier les binaires/scripts en local (risque d'amener un malware). Backup seulement les **données** (DB, fichiers de config dans `~`).

## 1. Réception credentials WHC

WHC va t'envoyer (typiquement par email) :
- **IP publique** : `23.27.253.63` (inchangée normalement)
- **Port SSH custom** : ex `2244` (ils proposent un numéro)
- **Password root** initial : à changer dès le 1er login

> Si WHC te demande dans leur form ta SSH key publique, donne-leur le contenu de `~/.ssh/id_ed25519.pub` — ça élimine la fenêtre vulnérable. Sinon, password initial OK mais à changer ASAP.

## 2. Premier login + sécurisation immédiate

```bash
# Variables (adapte avec les vraies valeurs WHC)
export VPSIP=23.27.253.63
export SSHPORT=2244        # remplace par le port que WHC te donne

# Login en root (password initial)
ssh -p $SSHPORT root@$VPSIP
```

Sur le VPS, **dans cet ordre, immédiatement** :

```bash
# A. Changer le password root tout de suite (le password initial WHC est dans leur DB)
passwd

# B. Créer darkvador
adduser --gecos "" darkvador           # mot de passe long et unique, stocke dans Bitwarden
usermod -aG sudo darkvador

# C. Copier ta clé SSH publique (depuis ton poste local)
# Depuis une AUTRE fenêtre terminal locale (sans fermer celle du VPS) :
#   cat ~/.ssh/id_ed25519.pub
# Copier la sortie

# De retour sur le VPS :
mkdir -p /home/darkvador/.ssh
cat > /home/darkvador/.ssh/authorized_keys <<'EOF'
ssh-ed25519 AAAA... jfzahnen@gmail.com
EOF
# Ajoute aussi la clé claude-deploy si tu l'utilises :
cat ~/.ssh/id_claude_deploy.pub >> /home/darkvador/.ssh/authorized_keys 2>/dev/null || \
  echo "(ajouter manuellement depuis le poste si voulu)"

chown -R darkvador:darkvador /home/darkvador/.ssh
chmod 700 /home/darkvador/.ssh
chmod 600 /home/darkvador/.ssh/authorized_keys

# D. Tester le login darkvador depuis une AUTRE fenêtre terminal locale,
#    SANS fermer la session root actuelle :
#    ssh -p $SSHPORT darkvador@$VPSIP
#    Doit marcher sans password (via clé SSH).
#
# Si ça marche → exit la session root et continue en darkvador.
# Si ça ne marche pas → debug avant de fermer la session root (filet de sécu).

exit
```

## 3. Bootstrap durci (depuis poste local)

Maintenant tu es loggué en darkvador avec ta clé SSH. Le password reste actif tant que `bootstrap-secure.sh` n'a pas tourné.

```bash
cd D:/Wendio/deploy
scp -P $SSHPORT bootstrap-secure.sh darkvador@$VPSIP:~/
ssh -p $SSHPORT darkvador@$VPSIP "SSH_PORT=$SSHPORT bash ~/bootstrap-secure.sh"
```

Le script applique en ordre :
1. **SSH hardening immédiat** (Port $SSHPORT, PermitRootLogin no, PasswordAuthentication no, MaxAuthTries 3)
2. apt upgrade
3. Outils + UFW + fail2ban
4. UFW : deny incoming sauf $SSHPORT/80/443 + tailscale0
5. fail2ban + jail recidive
6. Unattended-upgrades
7. Sysctl hardening
8. Sudoers cleanup
9. Node 24 + Caddy (admin off) + Tailscale

À la fin tu auras un rapport `État des protections`. Vérifie que `port $SSHPORT` et `passwordauthentication no` apparaissent dans la config SSH effective.

## 4. Tailscale (re-authentifier)

⚠️ **Avant** : aller dans le [dashboard Tailscale](https://login.tailscale.com/admin/machines) et **supprimer l'ancien device `cloud288212-wendio`** (son IP `100.84.108.49` ne sera plus valide).

```bash
ssh -p $SSHPORT darkvador@$VPSIP 'sudo tailscale up'
# Suivre le lien affiché pour authentifier dans le tailnet jeffze
# Dans le dashboard Tailscale : Disable key expiry pour ce nouveau device

ssh -p $SSHPORT darkvador@$VPSIP 'tailscale ip -4'
# → noter la nouvelle IP Tailscale (probablement différente de 100.84.108.49)
```

**Mise à jour des mémoires** : la nouvelle IP Tailscale doit être notée dans `reference_vps_whc.md` ou similaire.

## 5. DNS Cloudflare

DNS reste tel quel — l'IP publique `23.27.253.63` n'a pas changé. Pas d'action requise.

Vérification rapide :
```bash
dig +short wendio.jeuxlirlok.com   # doit retourner une IP CF 104.x ou 172.x
dig +short support.jeuxlirlok.com  # idem
```

## 6. Deploy Wendio

Adapter `D:/Wendio/deploy/deploy.sh` pour le nouveau port SSH si nécessaire :

```bash
# Si l'ancien deploy.sh avait VPS_PORT=2243, mettre à jour vers le nouveau port WHC.
# Le VPS_HOST reste 100.84.108.49... NON : c'est la nouvelle IP Tailscale (étape 4).
```

```bash
cd D:/Wendio
bash deploy/deploy.sh
```

Vérifier : `https://wendio.jeuxlirlok.com` répond.

## 7. Deploy Support

```bash
cd D:/Support
bash deploy/deploy.sh
```

Vérifier : `https://support.jeuxlirlok.com/health` → `{"ok":true,...}`.

## 8. Smoke tests

- Wendio : créer une partie, vérifier que Socket.io fonctionne
- Support : login magic link, créer un ticket de test
- Widget dans Wendio : depuis lobby.html, le bouton 💬 Signaler doit charger
- Logs : `sudo journalctl -u wendio -u support -n 50` → aucune erreur

## 9. Cleanup post-migration

- Mettre à jour `D:/Wendio/deploy/deploy.sh` + `D:/Support/deploy/deploy.sh` avec nouveau port SSH + nouvelle IP Tailscale
- Mettre à jour mémoire `project_wendio_deploy.md` :
  - Nouvelle IP Tailscale
  - Nouveau port SSH
  - Note "VPS réinstallé 2026-05-XX suite à compromission 2026-05-12"
- Mettre à jour clé `id_claude_deploy` côté `authorized_keys` si pas déjà fait

## Différence vs ancien setup (compromis)

| Aspect | Ancien | Nouveau |
|---|---|---|
| Ordre SSH hardening | Phase 2 (après setup) | **Phase 1 (en premier)** |
| Fenêtre vulnérable | ~4h | **~minutes (étape 2 si password initial)** |
| Port SSH | 2243 hardcoded dans le script | **Paramétrable via `SSH_PORT` env var** |
| Password root SSH | Actif jusqu'au hardening | **Désactivé dès la fin de l'étape 2** |
| Caddy admin API | Activée par défaut | **`admin off`** |
| sshd MaxAuthTries | 6 (défaut) | **3** |
