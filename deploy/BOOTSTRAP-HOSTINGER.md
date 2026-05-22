# Bootstrap durci VPS — Procédure Hostinger US

Procédure complète pour monter un VPS Hostinger en remplacement du VPS WHC Jeux compromis (cf. logs root brute-force du 2026-05-12/13 depuis IPs résidentielles IN). Le nouveau VPS héberge Wendio + Support en série, durcissement appliqué dès la 1ère seconde.

## Vue d'ensemble

```
1. Provisioning Hostinger (~5 min)         ← AVEC SSH key, PAS de password
2. Login + ajout darkvador (~3 min)
3. Run bootstrap-secure.sh (~5 min)        ← Durcit SSH AVANT tout reste
4. tailscale up (~1 min)
5. DNS Cloudflare (~2 min, propagation instantanée)
6. Deploy Wendio (~5 min)
7. Deploy Support (~5 min)
8. Smoke tests (~5 min)
9. Nuke ancien VPS WHC (~2 min via panel)
                                             Total : ~35-40 min
```

## 1. Provisionning Hostinger (CRITIQUE — SSH key au moment du provisioning)

Dans le panel Hostinger VPS :

1. **OS** : Ubuntu 24.04 LTS (pas Debian, pas une image avec panel pré-installé)
2. **Région** : Cleveland ou Phoenix (US) — latence ~30ms depuis Québec, acceptable pour Socket.io
3. **Ressources** : KVM 1 vCPU / 1 GB RAM / 25 GB disque suffit (Wendio + Support sont légers)
4. **SSH Key** : **AJOUTER ta clé publique au moment du provisioning** ⚠️
   - Section "SSH Keys" → Add Public Key
   - Coller le contenu de `~/.ssh/id_ed25519.pub` (clé principale JF)
   - **Aussi** : ajouter `~/.ssh/id_claude_deploy.pub` pour les deploy automatiques
5. **Password root** : Hostinger en demande un quand même au provisioning. Mets un password fort aléatoire (`openssl rand -base64 32`), garde-le dans Bitwarden, ne l'utilise jamais.

**Pourquoi c'est critique** : la fenêtre de vulnérabilité du VPS WHC précédent venait du fait que SSH password était actif au boot. Avec une SSH key au provisioning, on désactive `PasswordAuthentication` dès le 1er login → 0 fenêtre exploitable.

## 2. Login + créer darkvador

Hostinger te donne l'IP publique du VPS. Depuis ton poste :

```bash
# Note l'IP, ex : 198.51.100.42
export VPSIP=198.51.100.42

# Login en root via SSH key (PAS password)
ssh root@$VPSIP

# Sur le VPS, créer darkvador
adduser --gecos "" darkvador        # mot de passe long, gardé dans Bitwarden
usermod -aG sudo darkvador

# Copier ta clé SSH de root vers darkvador
mkdir -p /home/darkvador/.ssh
cp /root/.ssh/authorized_keys /home/darkvador/.ssh/
chown -R darkvador:darkvador /home/darkvador/.ssh
chmod 700 /home/darkvador/.ssh
chmod 600 /home/darkvador/.ssh/authorized_keys

exit
```

Tester le login darkvador depuis ton poste :

```bash
ssh darkvador@$VPSIP   # doit marcher sans password
```

## 3. Bootstrap durci

Depuis ton poste local :

```bash
cd D:/Wendio/deploy
scp bootstrap-secure.sh darkvador@$VPSIP:~/
ssh darkvador@$VPSIP 'bash ~/bootstrap-secure.sh'
```

Le script applique en ordre :
1. **SSH hardening immédiat** (PermitRootLogin no, PasswordAuthentication no)
2. apt upgrade
3. Outils de base + UFW + fail2ban
4. UFW deny incoming sauf 22/80/443 + tailscale0
5. fail2ban avec jail recidive (ban 1 semaine après 5 bans en 24h)
6. Unattended-upgrades (security only)
7. Sysctl hardening
8. Sudoers cleanup
9. Node 24 + Caddy (admin off) + Tailscale

À la fin tu auras un rapport `État des protections`. Vérifie que `passwordauthentication no` est bien dans la config SSH.

## 4. Tailscale

```bash
ssh darkvador@$VPSIP 'sudo tailscale up'
# Suivre le lien affiché, authentifier dans le tailnet jeffze
# Dans le dashboard Tailscale : Disable key expiry pour ce device
ssh darkvador@$VPSIP 'tailscale ip -4'   # noter l'IP Tailscale (ex 100.x.x.x)
```

## 5. DNS Cloudflare

Dans le dashboard Cloudflare → zone `jeuxlirlok.com` → DNS Records :

| Record | Action | Valeur |
|---|---|---|
| `wendio` A | **Edit** | nouvelle IP publique Hostinger, Proxy **Proxied (orange)** |
| `support` A | **Edit** | idem |

Propagation Cloudflare : quasi-instantanée (TTL 300 + edge cache flush). Test depuis ton poste :

```bash
dig +short wendio.jeuxlirlok.com    # doit retourner une IP Cloudflare 104.x ou 172.x
```

## 6. Deploy Wendio

```bash
cd D:/Wendio
# Edit deploy/deploy.sh pour mettre la nouvelle IP+port (port 22 standard maintenant, pas 2243)
# Variables : VPS_HOST=<IP-publique>, VPS_PORT=22
bash deploy/deploy.sh
```

Le script va :
- rsync le code (exclut node_modules, .git, Manual)
- `npm ci --omit=dev`
- Copier le systemd unit + Caddyfile snippet
- `systemctl enable --now wendio`
- `systemctl reload caddy`
- Test healthcheck

Vérifier : `https://wendio.jeuxlirlok.com` répond.

## 7. Deploy Support

```bash
cd D:/Support
# Edit deploy/deploy.sh idem (nouvelle IP+port)
bash deploy/deploy.sh
```

Vérifier : `https://support.jeuxlirlok.com/health` répond `{"ok":true,...}`.

## 8. Smoke tests

- Wendio : créer une partie, vérifier que Socket.io fonctionne (latence acceptable depuis Québec ?)
- Support : login magic link, créer un ticket de test
- Vérifier que les widgets dans Wendio chargent (depuis ccu.strategief.com et wendio.jeuxlirlok.com)
- Logs : `sudo journalctl -u wendio -u support -n 50` (aucune erreur)

## 9. Nuke ancien VPS WHC

Une fois la migration validée :

1. **Annuler le VPS WHC compromis** via panel WHC (ne PAS juste arrêter le service — détruire l'instance)
2. Supprimer les enregistrements DNS WHC liés (si tu en avais pour wendio.jeuxlirlok.com côté DNS WHC)
3. Révoquer le device Tailscale correspondant dans le dashboard
4. Mettre à jour les mémoires Claude : nouvelle IP Hostinger, ancien VPS désactivé

## Référence : structure attendue après bootstrap

```
darkvador@vps:~$ ls -la
~/jeux/              # Code des jeux (rsync depuis poste)
~/backups/           # Backups DB (cron daily, à venir avec deploy support)
~/.ssh/authorized_keys   # Ta clé principale + id_claude_deploy

/etc/caddy/Caddyfile     # Reverse proxy, blocs ajoutés par deploy.sh
/etc/systemd/system/wendio.service
/etc/systemd/system/support.service
/etc/ssh/sshd_config.d/99-hardening.conf
/etc/sysctl.d/99-security.conf
/etc/fail2ban/jail.d/recidive.conf
/etc/apt/apt.conf.d/20auto-upgrades
```

## Différence vs ancien setup-vps.sh

| Aspect | Ancien (compromis) | Nouveau bootstrap-secure.sh |
|---|---|---|
| Ordre SSH hardening | Phase 2 (après setup) | **Phase 1 (en premier)** |
| Fenêtre vulnérable | ~4h avant durcissement | **0 (clef SSH dès le provisioning)** |
| Password root SSH | Actif au boot | **Désactivé dès le 1er run** |
| sshd MaxAuthTries | 6 (défaut) | **3** |
| Sysctl IPv6 redirects | Non configurés | **0 (accept_redirects, source_route)** |
| Caddy admin API | Activée | **`admin off`** |
| Sudoers piège ubuntu | À nettoyer manuellement | **Nettoyé auto** |
| Scripts à exécuter | 2 (setup + post-bootstrap) | **1** |
