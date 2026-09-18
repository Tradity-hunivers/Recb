/**
 * Consentement aux traceurs — RECB82
 *
 * Fichier volontairement séparé de main.js : si l'un échoue, l'autre continue
 * de fonctionner. Aucune dépendance, aucune étape de build.
 *
 * ── Ce que fait ce script ────────────────────────────────────────────────
 * 1. Il retient le choix du visiteur six mois, dans un cookie de première
 *    partie — durée recommandée par la CNIL avant de redemander.
 * 2. Il débloque les scripts mis en attente, et seulement eux. Un traceur
 *    s'écrit ainsi, et ne s'exécute pas tant que sa catégorie n'est pas
 *    acceptée :
 *
 *      <script type="text/plain" data-consent="mesure" src="..."></script>
 *
 *    C'est le point important : refuser doit réellement empêcher le dépôt,
 *    pas seulement masquer un bandeau.
 * 3. Il laisse rouvrir le choix à tout moment, depuis le pied de page ou la
 *    page /cookies, comme l'exige le droit au retrait.
 *
 * ── État actuel du site ──────────────────────────────────────────────────
 * Aucun traceur n'est déclaré : le site ne charge ni mesure d'audience, ni
 * publicité, ni ressource tierce. Le seul cookie déposé est celui qui retient
 * ce choix, exempté de consentement. Le dispositif est donc en place et prêt
 * le jour où une mesure d'audience sera ajoutée.
 */
(function () {
  'use strict';

  var CLE = 'recb_consent';
  var VERSION = 1;
  // Six mois : au-delà, la question est reposée.
  var DUREE = 60 * 60 * 24 * 182;
  // Catégories refusables. « necessaires » n'y figure pas : elle est toujours
  // active et ne se refuse pas, faute de quoi le site ne fonctionnerait plus.
  var CATEGORIES = ['mesure'];

  /* ------------------------------------------------------------- stockage */

  function lireCookie() {
    var m = document.cookie.match(new RegExp('(?:^|; )' + CLE + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  function ecrireCookie(valeur) {
    var secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = CLE + '=' + encodeURIComponent(valeur) +
      '; path=/; max-age=' + DUREE + '; SameSite=Lax' + secure;
  }

  // Dans un cadre d'aperçu, les cookies tiers sont parfois bloqués : le choix
  // est alors retenu localement plutôt que perdu à chaque page.
  function lireSecours() {
    try { return localStorage.getItem(CLE); } catch (e) { return null; }
  }
  function ecrireSecours(valeur) {
    try { localStorage.setItem(CLE, valeur); } catch (e) { /* sans importance */ }
  }

  function lire() {
    var brut = lireCookie() || lireSecours();
    if (!brut) return null;
    var parts = brut.split('.');
    if (parts[0] !== 'v' + VERSION) return null; // version changée : on redemande
    var choix = {};
    CATEGORIES.forEach(function (c) { choix[c] = false; });
    parts.slice(1).forEach(function (p) {
      var kv = p.split('=');
      if (CATEGORIES.indexOf(kv[0]) !== -1) choix[kv[0]] = kv[1] === '1';
    });
    return choix;
  }

  function enregistrer(choix) {
    var bouts = ['v' + VERSION];
    CATEGORIES.forEach(function (c) { bouts.push(c + '=' + (choix[c] ? '1' : '0')); });
    bouts.push('d=' + new Date().toISOString().slice(0, 10));
    var valeur = bouts.join('.');
    ecrireCookie(valeur);
    ecrireSecours(valeur);
  }

  /* --------------------------------------------------- déblocage des scripts */

  function appliquer(choix) {
    var attente = document.querySelectorAll('script[type="text/plain"][data-consent]');
    Array.prototype.forEach.call(attente, function (vieux) {
      if (!choix[vieux.getAttribute('data-consent')]) return;
      var neuf = document.createElement('script');
      Array.prototype.forEach.call(vieux.attributes, function (a) {
        if (a.name !== 'type' && a.name !== 'data-consent') neuf.setAttribute(a.name, a.value);
      });
      neuf.type = 'text/javascript';
      neuf.text = vieux.text;
      vieux.parentNode.replaceChild(neuf, vieux);
    });
    // Les autres scripts peuvent réagir sans connaître ce fichier.
    document.dispatchEvent(new CustomEvent('recb:consentement', { detail: choix }));
  }

  /* ------------------------------------------------------------- interface */

  var bandeau = document.getElementById('consent');
  var panneau = document.getElementById('consent-reglages');
  if (!bandeau) return;

  function montrerBandeau(oui) {
    bandeau.hidden = !oui;
    // La classe déclenche l'animation d'entrée, une fois l'élément affiché.
    if (oui) requestAnimationFrame(function () { bandeau.classList.add('is-in'); });
    else bandeau.classList.remove('is-in');
  }

  function decider(choix) {
    enregistrer(choix);
    appliquer(choix);
    montrerBandeau(false);
    if (panneau && panneau.open) panneau.close();
  }

  function tout(valeur) {
    var c = {};
    CATEGORIES.forEach(function (k) { c[k] = valeur; });
    return c;
  }

  function surClic(selector, fn) {
    var el = document.querySelector(selector);
    if (el) el.addEventListener('click', fn);
  }

  surClic('[data-consent-accepter]', function () { decider(tout(true)); });
  surClic('[data-consent-refuser]', function () { decider(tout(false)); });

  surClic('[data-consent-reglages]', function () {
    if (!panneau) return;
    var actuel = lire() || tout(false);
    CATEGORIES.forEach(function (c) {
      var champ = panneau.querySelector('input[name="' + c + '"]');
      if (champ) champ.checked = !!actuel[c];
    });
    if (typeof panneau.showModal === 'function') panneau.showModal();
    else panneau.setAttribute('open', '');
  });

  var formulaire = panneau && panneau.querySelector('form');
  if (formulaire) {
    formulaire.addEventListener('submit', function (e) {
      // Le bouton « Enregistrer » applique les interrupteurs ; « Tout
      // accepter » les force tous, sans avoir à les cocher un par un.
      var action = e.submitter && e.submitter.value;
      if (action === 'annuler') return;
      e.preventDefault();
      if (action === 'accepter') return decider(tout(true));
      if (action === 'refuser') return decider(tout(false));
      var c = {};
      CATEGORIES.forEach(function (k) {
        var champ = formulaire.querySelector('input[name="' + k + '"]');
        c[k] = !!(champ && champ.checked);
      });
      decider(c);
    });
  }

  // Rouvrir le choix : lien du pied de page, bouton de la page /cookies.
  Array.prototype.forEach.call(document.querySelectorAll('[data-consent-rouvrir]'), function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      montrerBandeau(true);
      var b = bandeau.querySelector('[data-consent-accepter]');
      if (b) b.focus();
    });
  });

  /* ---------------------------------------------------------- au chargement */

  var choix = lire();
  if (choix) {
    appliquer(choix);
  } else {
    // Rien n'est déposé et rien n'est débloqué tant que le visiteur n'a pas
    // répondu : le bandeau n'est pas une formalité posée après coup.
    montrerBandeau(true);
  }
})();
