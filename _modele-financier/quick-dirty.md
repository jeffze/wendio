# Modèle financier Wendio — Quick & Dirty

*v4 — 2026-05-22 — JF + Claude*

TCO annuel de **Wendio** (jeu + tracker Support) modélisé pour scaler de 1 à N nations.

> **Devises** : tout converti en **CAD**. Taux USD→CAD utilisé : **1,40**.
> **Décision JF** : on **ne compte pas le temps humain** dans le TCO (sunk cost qui s'amortit). Voir annexe.
> **Périmètre** : v1.0 en prod le 2026-05-22 (1 nation = Wendat, 1 meneur principal = Sylvain).

---

## 1. Coûts fixes — indépendants du nombre de nations

| Poste | Montant origine | Cadence | **Annuel CAD** | Notes |
|-------|-----------------|---------|----------------|-------|
| VPS WHC 2G | 22,50 $ CAD | /mois | **270 $** | Voir §3 pour seuils d'upgrade. |
| Domaine `jeuxlirlok.com` | 19,99 $ CAD | /an | **20 $** |  |
| Domaine `wendio.app` (réservé WHC) | ~20 $ CAD | /an | **20 $** | Réservé pour le multi-nation. |
| Resend (33 % imputé Wendio) | 20 $ USD × 33 % | /mois | **111 $** | Plan payant partagé entre Wendio, Compta, CCU. JF ne peut pas downgrader (besoins autres apps). 100 % allocation = 336 $ — voir §9 pour ajuster le %. |
| Cloudflare | 0 $ | — | **0 $** | Free plan suffit jusqu'à ~5 nations. Voir §4. |
| Backups (VPS local + GitHub chiffré + pull Windows) | 0 $ | — | **0 $** | Pattern actuel suffit < ~3 nations. Voir §5. |
| Claude Max (50 % imputé) | 140 $ CAD /mois × 50 % | /mois | **840 $** | Confirmé CAD. |
| **Sous-total fixes (état actuel = 1 nation)** |  |  | **1 261 $ / an** | **≈ 105 $ / mois** |

---

## 2. Coûts variables par nation — setup one-shot

À chaque nouvelle nation onboardée, coûts cash one-shot **côté Wendio** :

| Poste | Coût | Notes |
|-------|------|-------|
| Sous-domaine DNS Cloudflare + cert Let's Encrypt | 0 $ | Automatique |
| Création tenant DB + Caddyfile | 0 $ | Quelques minutes de SQL + reload Caddy |
| **Enregistrements audio** (72 numéros + 4 clans dans la langue cible) | **0 $** | **Fournis par la nation elle-même** (décision JF 2026-05-22) |
| Branding / customisation visuelle (couleurs, logo, clans locaux) | 0 $ | Aussi fourni par la nation |
| Sous-domaine `<nation>.wendio.app` | 0 $ | Inclus dans le domaine déjà réservé |
| **Total setup one-shot par nation** | **~ 0 $ cash** | Pas de coût cash côté Wendio. L'effort réel est le temps JF (exclu du TCO, voir annexe). |

---

## 3. Seuils d'upgrade VPS (grille WHC)

État actuel : **VPS 2G**, usage 8 % RAM (177 MB / 2 GB) + 8 % disque (2 GB / 25 GB). Énormément de marge pour scaler.

| Tier VPS | RAM | CPU | Disque | Prix/mois | **Annuel CAD** | Bascule estimée |
|----------|-----|-----|--------|-----------|----------------|-----------------|
| **2G (actuel)** | 2 GB | 2 | 25 GB | 22,50 $ | 270 $ | 1 → ~8 nations |
| 4G | 4 GB | 4 | 50 GB | 38,99 $ | 468 $ | ~8 → ~20 nations |
| 8G | 8 GB | 6 | 100 GB | 66,99 $ | 804 $ | ~20 → ~40 nations |
| 16G | 16 GB | 8 | 200 GB | 108,99 $ | 1 308 $ | 40+ nations |

> **Hypothèse de bascule** : chaque nation active consomme ~150-250 MB RAM en plein événement (Node + sessions Socket.io + cache + Support). À 8 nations actives simultanément, on est à ~1,5 GB → marge confortable. À 10+, on prévoit l'upgrade 4G.

**Surcoût annuel d'un upgrade** :
- 2G → 4G : **+ 198 $/an** (16,49 $/mois × 12)
- 2G → 8G : **+ 534 $/an**
- 2G → 16G : **+ 1 038 $/an**

---

## 4. Cloudflare Pro — quand bascule ?

Cloudflare **Free** suffit largement pour 1-5 nations (DNS + CDN + SSL Universal + DDoS L7 basique).

**Pro à 20 $ USD/mois** (≈ 336 $/an CAD) apporterait :
- **Image Optimization (Polish)** : utile si les cartes Wendat deviennent lourdes
- **WAF managed rules** : protection avancée contre les bots, OWASP
- **Mobile/desktop redirects** : peu utile pour Wendio
- **100 % uptime SLA** : argument commercial vis-à-vis des nations payantes
- **Cache analytics** : visibilité sur le trafic edge

**Bascule recommandée** : à partir de **5 nations payantes** (pour le SLA + WAF).

---

## 5. Backups robustes — quand bascule ?

**Pattern actuel** (gratuit, suffit pour 1-3 nations) :
- VPS local (cron 04:00)
- GitHub privé chiffré (push automatique)
- Pull Windows JF (manuel après session)

**Couche supplémentaire off-site géographique** (recommandée à partir de 3+ nations payantes pour rassurer les clients) :
- **Backblaze B2** : 6 $/TB/mois (USD). Pour Wendio < 1 GB de données total, coût négligeable mais minimum facturation. Disons **10 $/mois = 168 $/an** pour avoir un bucket dédié + retention 90j.
- Alternative : **Wasabi** (sans frais d'egress, 6,99 $/TB/mois USD)

**Bascule recommandée** : à partir de **3 nations payantes** (argument SLA + due diligence).

---

## 6. TCO projeté par nombre de nations

Hypothèses : Resend imputé 33 % (partagé), Claude 50 % imputé (CAD), audio fourni par la nation (pas de coût cash one-shot).

| Nations | VPS | CF Pro | Backups B2 | **TCO annuel** | TCO par nation |
|---------|-----|--------|------------|----------------|----------------|
| **1 (actuel)** | 2G (270) | Free (0) | Gratuit (0) | **1 261 $** | 1 261 $ |
| 3 | 2G (270) | Free (0) | Gratuit (0) | **1 261 $** | 420 $ |
| 5 | 2G (270) | Free (0) | B2 (168) | **1 429 $** | 286 $ |
| 8 | 2G (270) | Pro (336) | B2 (168) | **1 765 $** | 221 $ |
| 10 | 4G (468) | Pro (336) | B2 (168) | **1 963 $** | 196 $ |
| 20 | 4G (468) | Pro (336) | B2 (168) | **1 963 $** | 98 $ |
| 40 | 8G (804) | Pro (336) | B2 (168) | **2 299 $** | 57 $ |

**Cash récurrent reste sous 2 300 $/an même à 40 nations**. L'infrastructure scale extrêmement bien — avantage classique du SaaS bien pensé.

---

## 7. Insights stratégiques

1. **L'infra scale presque gratuitement** : passer de 1 à 40 nations multiplie le coût par moins de 2 (1 261 → 2 299 $). Le coût marginal par nation tend vers ~30-50 $/an au-delà de 20 nations.

2. **Pas de coût cash one-shot par nation** : puisque les nations fournissent leurs propres audio + branding, l'onboarding ne coûte rien en cash (juste du temps JF). Énorme avantage pour la grille tarifaire — on peut faire du gratuit ou très bas pour amorcer.

3. **Le seul poste « coûteux » imputé est Claude** (840 $/an) : c'est plus que toute l'infra réunie. Si Wendio prend moins de 50 % du temps Claude à terme (parce que stabilisé), cette part diminue.

4. **Resend partagé** : à 33 % d'allocation, le coût est minime (111 $/an). Si l'usage Wendio devient marginal vs Compta/CCU, on pourrait descendre à 20-25 %.

5. **Cloudflare Pro et B2** sont des « commodités SLA » : pas indispensables techniquement, mais facilitent la vente aux nations qui veulent un service « pro » — à activer quand on bascule de 1 nation amie (Wendat) à plusieurs nations payantes.

---

## 8. Pistes pour la grille tarifaire (v2 du modèle)

Coût marginal par nation tendant vers ~50 $/an au-delà de 20 nations. Pas de cash one-shot à amortir. Pistes :

- **Setup one-shot par nation** : 500-2 000 $ (couvre le temps JF d'onboarding, formation meneurs, accompagnement initial — pas un coût mais une rémunération du travail d'intégration)
- **Tier « Découverte »** : 1 meneur, max 20 parties/mois, **gratuit** (« pied dans la porte »)
- **Tier « Nation »** : N meneurs illimités, support email, **100-200 $/mois** par nation
- **Tier « Multi-nation entreprise »** : white-label, SLA, **500-1 500 $/mois**

À 5 nations « Nation » à 150 $/mois = **9 000 $/an de revenus** vs **1 429 $/an de coûts** = marge brute ~84 %. Le modèle économique tient largement.

---

## 9. Questions résiduelles

1. **Allocation Resend** : 33 % imputé Wendio est une estimation à la louche (1/3 entre Wendio, Compta, CCU). À affiner selon l'usage réel. Si Wendio est dominant → monter à 50 %. Si marginal → descendre à 20 %.
2. **Allocation Claude 50 %** : idem, à confirmer au feeling. Sur les 6 dernières semaines Wendio a probablement consommé plus que sa quote-part normale (sprint v1.0) — à terme ça devrait baisser.

---

## Annexe — Temps humain (exclu du TCO, pour mémoire)

Décision JF 2026-05-22 : le temps de dev/maintenance n'entre pas dans le calcul du coût Wendio.

| Phase | Estimation | Au taux 160 $/h | Au taux Telus 228 $/h |
|-------|-----------|------------------|----------------------|
| Setup initial (~110 h, basé sur git) | 110 h | 17 600 $ | 25 080 $ |
| Maintenance 10 h/mois récurrent | 120 h/an | 19 200 $/an | 27 360 $/an |
| Setup nouvelle nation (estimé, hors audio) | 20-40 h/nation | 3 200-6 400 $ | 4 560-9 120 $ |

Estimation setup initial via git : 96 commits sur 16 jours actifs entre 2026-04-10 et 2026-05-22 (6 jours sprint ~6h + 5 jours moyens ~3h + 5 jours courts ~1h ≈ 56h tracé, × 2 pour hors-codage ≈ 110h).
