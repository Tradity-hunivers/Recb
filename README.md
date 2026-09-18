# recb82.com — site vitrine

Site statique de **RECB82**, entreprise de rénovation intérieure, plomberie et
électricité à Montauban et Moissac (Tarn-et-Garonne).

HTML, CSS et JavaScript natifs. **Aucun framework, aucune dépendance, aucune
étape de build.** Le dépôt se déploie tel quel : ce que vous voyez ici est
exactement ce qui est servi.

---

## Structure

```
index.html                                Accueil
plombier-montauban.html                   Page métier-ville
electricien-montauban.html                Page métier-ville
renovation-salle-de-bain-montauban.html   Page métier-ville — URL conservée de l'ancien site
renovation-interieure-moissac.html        Page métier-ville
realisations.html                         Chantiers types
devis.html                                Formulaire de demande de devis
merci.html                                Confirmation d'envoi (noindex)
mentions-legales.html
politique-confidentialite.html

peintre-montauban.html                    Page métier-ville
renovation-appartement-montauban.html     Page métier-ville

assets/css/styles.css                     Feuille unique
assets/js/main.js                         Animations et interactions
assets/fonts/manrope-*.woff2              Police auto-hébergée (variable 400→800)
assets/img/                               Logo et photos de chantier de RECB82

functions/api/devis.js                    Réception du formulaire (Cloudflare Pages Function)
_headers                                  En-têtes de sécurité et de cache
_redirects                                Redirections 301 de migration
robots.txt · sitemap.xml · favicon.svg
archive/ancien-site-urls.txt              Relevé de l'ancien site Wix avant refonte
```

Sur Cloudflare Pages, `plombier-montauban.html` est servi à l'URL
`/plombier-montauban`. C'est ce qui permet de conserver
`/renovation-salle-de-bain-montauban` à l'identique, sans redirection.

---

## Déploiement

Deux chaînes possibles vers Cloudflare Pages. **Une seule à la fois** : mises
en place ensemble, elles déploient le même projet et se marchent dessus.

### A. Connexion Git depuis le tableau de bord — le plus court

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**, puis sélectionner ce dépôt.
2. Production branch : la branche à publier. Build command : **laisser vide**.
   Build output directory : **`/`**.
3. Déployer, puis rattacher le domaine `recb82.com` et `www.recb82.com` dans
   **Custom domains**.

Si ce dépôt n'apparaît pas dans la liste, c'est que l'application GitHub de
Cloudflare n'y a pas accès : **Add account / Configure repositories** sur
l'écran de connexion règle le point.

### B. GitHub Actions — utile pour garder la chaîne dans le dépôt

`.github/workflows/deploiement-cloudflare.yml` envoie les fichiers à chaque
push, avec `wrangler pages deploy`. Il faut, une fois :

1. Un projet Pages qui reçoit les dépôts : **Workers & Pages** → **Create** →
   **Pages** → **Upload assets**, un nom, n'importe quel fichier pour
   l'initialiser. Ne pas reprendre le nom du projet qui sert déjà
   `recb82.pages.dev`, sauf à vouloir remplacer le site actuel.
2. Deux secrets de dépôt, dans **Settings → Secrets and variables → Actions** :
   `CLOUDFLARE_ACCOUNT_ID` et `CLOUDFLARE_API_TOKEN` (Cloudflare → *My Profile*
   → *API Tokens* → *Create Token* → modèle **Edit Cloudflare Workers**).
3. Si le projet ne s'appelle pas `recb82-nouveau-site` : une variable de dépôt
   `CLOUDFLARE_PAGES_PROJECT` avec son nom (onglet *Variables* du même écran).

Le workflow exclut `tools/`, `archive/`, `.github/` et le README du paquet
envoyé, et échoue si `functions/api/devis.js` manque à l'appel.

Dans les deux cas, le HTTPS, le HTTP/2 et le cache sont fournis par
Cloudflare : il n'y a rien à configurer. Chaque branche autre que la branche
de production reçoit sa propre URL de préversion, pratique pour faire relire
avant de publier.

### Aperçu sur GitHub Pages

`.github/workflows/apercu-github-pages.yml` publie une copie du site sur
GitHub Pages à chaque push sur la branche par défaut, pour la consulter depuis
un téléphone avant la mise en production. **Ce n'est pas le déploiement du
site** : la copie est adaptée par `tools/preview-github-pages.py` aux
contraintes de GitHub Pages (sous-dossier, pages transformées en dossiers,
aucune exécution côté serveur), le formulaire y est neutralisé et l'ensemble
est en `noindex` pour ne pas concurrencer le vrai site.

L'aperçu est publié sur <https://tradity-hunivers.github.io/Recb/>.

Le dépôt est public : c'est ce qui rend GitHub Pages disponible sans plan
payant. S'il repassait en privé, l'aperçu cesserait de se publier — GitHub
Pages sur dépôt privé demande GitHub Pro. L'URL de prévisualisation de
Cloudflare Pages remplit alors le même rôle, sans cette contrainte.

### Activer le formulaire de devis

Le formulaire est un `<form method="POST">` classique qui poste vers
`/api/devis`. Il fonctionne sans JavaScript. **Tant que les trois variables
ci-dessous ne sont pas définies, l'envoi échoue avec un message explicite** —
la demande n'est pas perdue en silence, mais elle n'arrive pas non plus.

Dans **Pages → Settings → Environment variables**, ajouter pour *Production*
et *Preview* :

| Variable | Valeur |
|---|---|
| `RESEND_API_KEY` | clé API créée sur [resend.com](https://resend.com) |
| `DEVIS_TO` | `contact.recb82@gmail.com` |
| `DEVIS_FROM` | une adresse du domaine vérifié, ex. `site@recb82.com` |

Puis redéployer et **envoyer une demande de test** : vérifier que le courriel
arrive et que la redirection vers `/merci` se fait bien.

Pour changer de prestataire (Formspree, Brevo, une autre API), il n'y a qu'un
seul appel `fetch` à remplacer dans `functions/api/devis.js`.

---

## À compléter avant la mise en ligne définitive

Ces points ne pouvaient pas être renseignés depuis l'ancien site. Les deux
premiers sont des **obligations légales**.

- [ ] **Mentions légales** : capital social, numéro de TVA intracommunautaire,
      assureur décennale + numéro de police + zone couverte, médiateur de la
      consommation. Le fichier `mentions-legales.html` contient un encadré qui
      liste précisément ce qui manque — **le remplacer par les vraies valeurs**,
      l'encadré n'a pas vocation à rester en ligne.
- [x] **Photos de chantiers.** ~~Le site n'utilise aucune photo.~~ Réglé :
      logo, photos de métier et chantiers avant/après récupérés depuis
      `recb82.pages.dev` (site Cloudflare du client) et placés dans
      `assets/img/`. Aucune image de banque, uniquement des chantiers RECB82.
- [x] **Avis clients.** ~~Six cartes marquées « Exemple ».~~ Réglé : elles sont
      retirées. Ne reste que l'avis de Laurie Boissières, recopié mot pour mot
      depuis la fiche Google avec son nom, plus un lien vers la fiche. Pour en
      ajouter d'autres, éditer la liste `AVIS` du générateur — **un avis qui
      n'est pas vérifiable ne doit pas y entrer** : afficher un témoignage
      inventé sur le site d'une entreprise réelle est une pratique commerciale
      trompeuse (art. L121-2 du code de la consommation).
- [ ] **Note Google.** Non affichée : elle n'a pas pu être lue
      automatiquement, Google bloquant l'accès à la fiche. À relever à la main
      sur la fiche puis à afficher **sans balisage `aggregateRating`** — marquer
      soi-même une note collectée sur une plateforme tierce est contraire aux
      règles des résultats enrichis de Google.
- [ ] **Coordonnées GPS.** Le JSON-LD utilise `44.0181 / 1.3550`, position
      approchée du centre de Montauban. À remplacer par la position exacte
      relevée sur la fiche Google Business Profile.
- [ ] **Cohérence NAP.** Vérifier que le nom, l'adresse et le téléphone sont
      écrits **rigoureusement à l'identique** sur la fiche Google Business
      Profile et ici : `RECB82`, `24 avenue du 10e Dragons, 82000 Montauban`,
      `06 63 96 97 11`. Une différence d'abréviation dilue le signal local.
- [ ] **Search Console** : soumettre `sitemap.xml`, puis surveiller les erreurs
      d'exploration pendant quatre à six semaines après la bascule DNS.
- [ ] **Récupérer les deux visuels avant/après** de l'ancien site Wix avant de
      couper l'abonnement (voir `archive/ancien-site-urls.txt`).

---

## Conventions à respecter si vous modifiez le site

**Le CSS critique est dupliqué dans le `<head>` de chaque page.** C'est
volontaire : il évite d'attendre `styles.css` pour afficher l'en-tête et le
haut de page. Si vous touchez aux couleurs, à la police ou à l'en-tête, la
modification doit être reportée **à la fois** dans `assets/css/styles.css` et
dans le bloc `<style>` de chaque page. Le bloc est identifié par un commentaire.

**Tout état « caché avant animation » est conditionné à la classe `.js`**, posée
en tête de document par un script d'une ligne. Sans JavaScript, la page
s'affiche complète : aucun texte ne reste invisible. Ne retirez pas cette
condition en écrivant de nouvelles animations — écrivez `.js [data-reveal]`,
jamais `[data-reveal]` seul.

**Animations.** `assets/js/main.js` ne fait qu'ajouter des classes et des
variables CSS ; toute l'animation est dans le CSS.

| Attribut | Effet |
|---|---|
| `data-reveal` (`left`, `right`, `scale`, `clip`) | apparition au défilement |
| `data-stagger="90"` | décale automatiquement les enfants `data-reveal` |
| `data-split` | découpe un titre en mots qui montent un par un |
| `data-count="8" data-suffix=" ans"` | compteur animé |
| `data-tilt="6"` | inclinaison 3D au survol |
| `data-magnetic="8"` | bouton attiré par le curseur |
| `.card--spot` | halo lumineux qui suit le curseur |
| `.blob[data-speed="0.08"]` | parallaxe des taches décoratives |

Effets repris du catalogue 21st.dev, réécrits en natif (les originaux sont en
React, Tailwind et Framer Motion) — tous réunis par un même langage, la lumière
qui parcourt un tracé :

| Où | Composant d'origine | Mécanique |
|---|---|---|
| Hero | Image Comparison, sur photo réelle | Le chantier lui-même : `.hero__ba` superpose l'avant et l'après du même cadrage, `--pos` s'anime de 0 à 52 % au chargement puis le visiteur fait glisser. **Photo en bande au-dessus du texte sous 860 px** : un paragraphe posé sur une salle de bain claire ne se lit pas, quel que soit le voile. Au-dessus, plein cadre avec voile latéral. |
| Boutons | Border Beam (magicui) + balayage | `.btn::after` : dégradé conique découpé en anneau par un masque, angle animé via `@property --ang`. **Sous `@media (hover: none)` le faisceau reste allumé** — sans cela, aucun effet de bouton n'existait sur téléphone. Le balayage lumineux tourne en boucle (`balayage`, 4,6 s) au lieu d'attendre un survol, et `:active` donne un retour à la pression. |
| Avis | Testimonials Columns | `.avis__col` défilent à l'infini (`monte`), contenu doublé pour boucler sans à-coup, pause au survol, 1 → 2 → 3 colonnes selon la largeur. |
| Réalisations | Focus Cards (Aceternity) | `.grid:has(.work:hover)` floute les voisines ; chaque forme des schémas porte `pathLength="1"` et se dessine à l'apparition. |

**Photos : d'où elles viennent.** Logo, photos de métier et chantiers
avant/après proviennent de `recb82.pages.dev`, le site Cloudflare de RECB82.
Les paires avant/après sont cadrées à l'identique, ce qui rend le comparateur
possible. Les descriptions de chantier (durées, corps d'état, libellés) sont
reprises des pages réalisations de ce même site — rien n'est inventé.

**Tenir le coût de peinture.** Animer `stroke-dashoffset` ou `opacity` sur un
`<path>` repeint toute la zone à chaque image : c'est ce qui a saturé le rendu
lors des premiers essais à 96 tracés animés. Règle à garder : les grandes
couches ne bougent que par `transform`, seules de petites zones animent la
peinture.

Tout est désactivé sous `prefers-reduced-motion: reduce`, et les effets de
survol sont réservés aux pointeurs fins (`hover: hover and pointer: fine`) :
rien ne se déclenche au doigt sur mobile.

**Les avis sont des exemples.** RECB82 n'a aucun avis publié à ce jour. Les six
cartes de la section `#avis` sont des maquettes d'affichage, chacune badgée
« Exemple », et la section le dit en clair. Publier des avis inventés en les
présentant comme réels est interdit (pratique commerciale trompeuse) :
remplacer les cartes par les avis Google réels avant toute mise en ligne, ou
retirer la section.

**Budget de performance à tenir** : page d'accueil sous 500 Ko tout compris,
LCP sous 2,5 s en 4G. Toute image ajoutée doit être en WebP, dimensionnée à sa
taille d'affichage réelle, avec `width` et `height` explicites et
`loading="lazy"` sauf en haut de page.

---

## Références de l'entreprise

RECB82 — SARL, RCS Montauban · SIREN 841 930 126 · SIRET 841 930 126 00013
24 avenue du 10e Dragons, 82000 Montauban · créée le 21 août 2018
06 63 96 97 11 · contact.recb82@gmail.com · du lundi au vendredi, 9 h – 17 h
Zone : Tarn-et-Garonne (82), Lot-et-Garonne (47), Haute-Garonne (31)
