# Modèle financier Wendio — Quick & Dirty

*v5 — 2026-05-25 — JF + Claude*

> **Décision tarifaire 2026-05-25** : objectif = **vraie petite entreprise** (cible 20+ nations), financement client **mixte** (subvention + hors-poche). Grille multi-tiers ; tier « Nation » en **fourchette négociée** 2 400-3 600 $/an selon le financement réel. Voir §8.

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

## 8. Grille tarifaire (v5)

**Positionnement** : Wendio n'est PAS un jeu grand public à quelques dollars. C'est un **outil de revitalisation linguistique** pour des programmes de langue de Premières Nations — souvent financés par subvention (Loi sur les langues autochtones, Patrimoine canadien, budgets éducation de bande). Le prix reflète cette **valeur institutionnelle**, pas le coût marginal d'infra (qui tend vers ~50 $/nation/an, §7).

### Frais d'installation (one-shot, par nation)

**~2 000 $/nation** — intégration (tenant DB, sous-domaine, branding), formation des meneurs, accompagnement initial (~20-40 h). Pas un coût refacturé : la **rémunération du travail d'onboarding**. Réduit/offert pour la **nation fondatrice (Wendat)** au titre de la co-création.

### Tiers d'abonnement annuel

| Tier | Pour qui | Inclus | Prix/an CAD |
|------|----------|--------|-------------|
| **Découverte** | pilote, hors-poche curieux | 1 meneur, parties limitées (~5/mois), support communautaire | **Gratuit** (pied dans la porte) |
| **Communauté** | petit OBNL, hors-poche | 1-2 meneurs, parties illimitées, support email | **~750 $** (≈ 60 $/mois) |
| **Nation** ⭐ | bande / programme de langue financé | meneurs illimités, branding nation, support prioritaire, SLA | **2 400-3 600 $** négocié selon le financement (≈ 200-300 $/mois) |
| **Conseil / Multi-nation** | conseil tribal, organisme régional (N langues) | white-label, multi-langues, formation, SLA renforcé | **6 000-15 000 $** |

Le tier **Nation** est le cœur du revenu. La **fourchette** absorbe le financement mixte : une bande bien subventionnée paie le haut (3 600 $, ligne budgétaire triviale), une nation moins dotée négocie vers le bas (2 400 $) — jamais sous le plancher qui rémunère le support.

### Projection revenus (marge brute, hors temps humain — Nation @ 3 000 $ milieu de fourchette)

| Scénario | Mix | Récurrent/an | − coûts (§6) | Net à partager | **Par associé*** |
|----------|-----|--------------|--------------|----------------|-------------------|
| **Prudent (10 payantes)** | 6 Nation + 3 Communauté + 1 fondatrice | 20 250 $ | 1 963 $ | 18 287 $ | **~9 150 $/an** |
| **Cible (20 payantes)** | 12 Nation + 5 Communauté + 2 Conseil + 1 fondatrice | 55 750 $ | 2 000 $ | 53 750 $ | **~26 900 $/an** |

\+ frais d'installation ~2 000 $ × nb de nations onboardées (one-time, étalé sur la montée en charge — ex. ~38 000 $ pour 19 nations).

\* *Répartition 50/50 illustrative — le partage réel est à formaliser (voir mémoire partenariat : co-création paritaire, mais tout le dev/ops = JF).* **Marge brute > 95 %** : l'infra plafonne à ~2 300 $/an même à 40 nations.

### Pourquoi « quelques centaines $/an » est insuffisant (argumentaire pour Sylvain)

À ~300 $/an/nation :
- **1 nation** : 300 $ vs 1 261 $ de coûts cash → **déficitaire de ~960 $** (on paie pour travailler).
- **5 nations** : ~1 500 $ vs 1 429 $ → +71 $, soit **35 $ chacun/an**.
- **10 nations** : ~3 000 $ vs 1 963 $ → ~1 037 $, soit **~500 $ chacun/an** — sous le salaire minimum pour les seules ~120 h/an de support.

Le prix « grand public » ne paie alors **ni l'infra à faible volume, ni une heure du travail des associés**, et ignore que la valeur livrée supporte aisément 2 400-3 600 $/an. D'où la grille ci-dessus.

---

## 9. Questions résiduelles

1. **Allocation Resend** : 33 % imputé Wendio est une estimation à la louche (1/3 entre Wendio, Compta, CCU). À affiner selon l'usage réel. Si Wendio est dominant → monter à 50 %. Si marginal → descendre à 20 %.
2. **Allocation Claude 50 %** : idem, à confirmer au feeling. Sur les 6 dernières semaines Wendio a probablement consommé plus que sa quote-part normale (sprint v1.0) — à terme ça devrait baisser.
3. **Partage des revenus JF/Sylvain** : ✅ position JF arrêtée 2026-05-25 (install → JF, récurrent 50/50) — voir §10. Reste à faire valider par Sylvain + formaliser par écrit.
4. **Programmes de financement** : ✅ documentés et vérifiés 2026-05-25 — voir §11.
5. **Qui vend ?** Sylvain = canal Premières Nations (réseau, crédibilité Wendat). Définir son rôle commercial vs le support technique (JF).

---

## 10. Partage des revenus JF / Sylvain (proposition JF, 2026-05-25)

Modèle retenu côté JF — **à valider avec Sylvain** (c'est un partenariat, pas une décision unilatérale) :

1. **Coûts cash d'infra remboursés en premier** (VPS, domaines, quote-part Resend/Claude — §1).
2. **Frais d'installation (~2 000 $/nation) → JF** : c'est le travail technique d'onboarding (intégration tenant, branding, formation meneurs). Compense la charge dev/ops continue, portée à 100 % par JF.
3. **Abonnements récurrents → 50/50** : les deux apports y sont continus et indispensables — JF (ops/support/évolution), Sylvain (relation, légitimité wendat, réseau, vente).

**Rationnel** : le 50/50 sur le récurrent honore la co-création paritaire — la légitimité + le réseau de Sylvain *sont* le go-to-market, pas un apport ponctuel. L'attribution des frais d'installation à JF règle l'asymétrie du travail technique sans dévaloriser Sylvain. Chaque flux de revenu correspond au travail qui le génère.

**Exemple (scénario cible 20 nations, §8)** : ~38 000 $ de frais d'installation cumulés → JF (one-time, étalé) ; ~53 750 $/an de récurrent net → **~26 900 $ chacun/an**.

> À formaliser par écrit une fois Sylvain d'accord (entente de partenariat simple). Voir [[project-wendio-partenariat-sylvain]].

---

## 11. Sources de financement des nations (vérifié 2026-05-25)

**Principe stratégique** : Wendio (le partenariat) ne demande PAS de subvention. C'est **la nation cliente qui applique**, et Wendio devient une **dépense admissible** dans un programme qu'elle utilise déjà pour son plan de langue. Argument de vente : « voici l'outil ET le programme qui le paie ». Les montants des programmes (min 5 000 $, max 400 000 $+) rendent le prix Wendio trivial.

### Fédéral (Canada-wide)
- **Programme des langues autochtones** — Patrimoine canadien, sous la **Loi sur les langues autochtones (2019)**. >1 G$ sur 2019-2029 + 162,7 M$/an permanents. Deux volets : *plan linguistique* + *projet*. **Wendio = volet projet.**
  - Admissibilité : organisation/gouvernement des Premières Nations, plan linguistique + ≥2 ans d'expérience.
  - **Au Québec : on applique via le Comité régional des langues ancestrales (CRLA / RCFNL)** (désigné par l'APNQL). Hors QC : l'organisation régionale désignée de la région (ex. **First Peoples' Cultural Council** en C.-B.).
  - ⚠️ Appels **annuels** (2026-27 fermé le 2025-11-12) → aligner sur le prochain cycle (~automne).

### Québec (provincial)
- **Partenariat culturel autochtone** (Secrétariat aux relations avec les Premières Nations et les Inuit) — min **5 000 $**, max **400 000 $/an** par entente (jusqu'à **1,5 M$/an** pour les nations nordiques : Innus, Cris, Inuit, Naskapis). Remplace « Aide au développement culturel autochtone » (juin 2025). Vitalité des langues = axe explicite.
- **Fonds d'initiatives autochtones IV** (2022-23 → 2026-27) — volet développement social incl. langue/culture. *(Se termine 2026-27 ; surveiller un éventuel FIA V.)*
- **Programme du patrimoine culturel autochtone** (Culture Québec) — par projets.

### Autres pistes
- **Budgets éducation/culture de bande** (transferts fédéraux via Services aux Autochtones Canada) : une bande peut allouer son propre budget sans programme dédié.

### Caveats
Programmes, montants et dates **changent chaque année** — l'agent de financement / le conseil de bande de la nation reste l'autorité. Ne pas affirmer un programme précis à un client sans revérifier.

### Sources (consultées 2026-05-25)
- Programme des langues autochtones : https://www.canada.ca/en/canadian-heritage/services/funding/aboriginal-peoples.html
- Modèle de financement des langues des Premières Nations : https://www.canada.ca/en/canadian-heritage/services/funding/aboriginal-peoples/languages.html
- CRLA / RCFNL : https://crla-rcfnl.ca/en/home
- Partenariat culturel autochtone (QC) : https://www.quebec.ca/en/culture/aide-financiere/initiatives-de-partenariat/partenariat-culturel-autochtone/program-indigenous-cultural-partnership
- Fonds d'initiatives autochtones IV (QC) : https://www.quebec.ca/en/gouvernement/portrait-quebec/premieres-nations-inuits/aides-financieres-autochtones/fond-initiatives-autochtones-iv/about-the-initiatives-fund-fia4
- Patrimoine culturel autochtone (QC) : https://www.quebec.ca/en/culture/aide-financiere/aide-aux-projets-appel/patrimoine-culturel-autochtone/indigenous-cultural-heritage-call-for-projects

---

## Annexe — Temps humain (exclu du TCO, pour mémoire)

Décision JF 2026-05-22 : le temps de dev/maintenance n'entre pas dans le calcul du coût Wendio.

| Phase | Estimation | Au taux 160 $/h | Au taux Telus 228 $/h |
|-------|-----------|------------------|----------------------|
| Setup initial (~110 h, basé sur git) | 110 h | 17 600 $ | 25 080 $ |
| Maintenance 10 h/mois récurrent | 120 h/an | 19 200 $/an | 27 360 $/an |
| Setup nouvelle nation (estimé, hors audio) | 20-40 h/nation | 3 200-6 400 $ | 4 560-9 120 $ |

Estimation setup initial via git : 96 commits sur 16 jours actifs entre 2026-04-10 et 2026-05-22 (6 jours sprint ~6h + 5 jours moyens ~3h + 5 jours courts ~1h ≈ 56h tracé, × 2 pour hors-codage ≈ 110h).
