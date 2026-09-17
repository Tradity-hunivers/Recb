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

assets/css/styles.css                     Feuille unique
assets/js/main.js                         Animations et interactions
assets/fonts/manrope-*.woff2              Police auto-hébergée (variable 400→800)

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

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**, puis sélectionner ce dépôt.
2. Build command : **laisser vide**. Build output directory : **`/`**.
3. Déployer, puis rattacher le domaine `recb82.com` et `www.recb82.com` dans
   **Custom domains**.

Le HTTPS et le HTTP/2 sont fournis par Cloudflare, il n'y a rien à configurer.

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
- [ ] **Photos de chantiers.** Le site n'utilise aucune photo : les visuels sont
      des schémas de principe, volontairement non photographiques. C'est le
      point le plus coûteux en conversion. Dès que RECB82 fournit des photos de
      ses propres réalisations, elles remplacent les schémas de
      `realisations.html` et alimentent le curseur avant/après de la page salle
      de bain. **Ne jamais y mettre de banque d'images** : ça se repère, et ça
      dit qu'on n'a rien à montrer.
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

Tout est désactivé sous `prefers-reduced-motion: reduce`, et les effets de
survol sont réservés aux pointeurs fins (`hover: hover and pointer: fine`) :
rien ne se déclenche au doigt sur mobile.

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
