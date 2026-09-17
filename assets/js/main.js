/* ==========================================================================
   RECB82 — interactions et animations
   JavaScript natif, sans dépendance. Le site reste entièrement lisible et
   utilisable si ce fichier ne se charge pas : tout ce qui suit est un
   enrichissement, jamais une condition d'affichage (voir le <noscript> du CSS).
   ========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var motionOK = function () { return !reduced.matches; };

  /* ------------------------------------------------------------------ utils */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function rafThrottle(fn) {
    var ticking = false, lastArgs;
    return function () {
      lastArgs = arguments;
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; fn.apply(null, lastArgs); });
    };
  }

  /* -------------------------------------------------- 1. découpage des titres
     Chaque mot — ou chaque caractère — est enveloppé pour pouvoir monter depuis
     le bas. Le texte reste dans le DOM : aucun impact sur le référencement ni
     sur les lecteurs d'écran.

     Trois modes, via l'attribut data-split :
       (vide) mot à mot, la révélation par défaut
       char   caractère par caractère, réservé aux titres courts
       lit    mot à mot, mais l'opacité est pilotée par le défilement */
  function splitWords(el) {
    var mode = el.dataset.split;
    if (mode === 'done') return;
    var words = el.textContent.trim().split(/\s+/);
    var frag = document.createDocumentFragment();
    var ci = 0;

    words.forEach(function (word, i) {
      var span = document.createElement('span');
      span.className = 'w';
      span.style.setProperty('--wi', i);

      if (mode === 'char') {
        // Le mot reste insécable : la césure de ligne ne tombe pas au milieu.
        word.split('').forEach(function (ch) {
          var box = document.createElement('span');
          box.className = 'c';
          box.style.setProperty('--ci', ci++);
          var inner = document.createElement('i');
          inner.textContent = ch;
          box.appendChild(inner);
          span.appendChild(box);
        });
      } else {
        var inner = document.createElement('i');
        inner.textContent = word;
        span.appendChild(inner);
      }

      frag.appendChild(span);
      if (i < words.length - 1) frag.appendChild(document.createTextNode(' '));
    });

    el.textContent = '';
    el.appendChild(frag);
    el.classList.add('split');
    if (mode === 'char') el.classList.add('split--char');
    el.dataset.split = 'done';
  }

  /* ------------------------------- 1 bis. lettres qui se relaient au survol
     Chaque lettre est doublée : la première sort par le haut, la seconde entre
     par le bas. Jamais sur un numéro de téléphone — on ne brouille pas une
     information que le visiteur doit lire. */
  function setupSwap() {
    if (!fine.matches || !motionOK()) return;
    // Tous les boutons texte, plus les éléments marqués à la main. Seuls les
    // nœuds texte sont transformés : les icônes SVG restent en place.
    $$('[data-swap], .btn--ghost, .btn--dark, .btn--outline').forEach(function (el) {
      if (el.dataset.swap === 'done' || el.dataset.swap === 'off') return;
      // Un numéro de téléphone, un e-mail : on ne brouille jamais une
      // information que le visiteur doit lire.
      if (/\d[\d\s.]{6,}|@/.test(el.textContent)) return;

      Array.prototype.slice.call(el.childNodes).forEach(function (noeud) {
        if (noeud.nodeType !== 3 || !noeud.textContent.trim()) return;
        var boite = document.createElement('span');
        boite.className = 'swap';
        noeud.textContent.trim().split('').forEach(function (ch, i) {
          if (ch === ' ') {
            boite.appendChild(document.createTextNode(' '));
            return;
          }
          var lettre = document.createElement('span');
          lettre.className = 'swap__l';
          lettre.style.setProperty('--li', i);
          var haut = document.createElement('span');
          haut.textContent = ch;
          var bas = document.createElement('span');
          bas.textContent = ch;
          bas.setAttribute('aria-hidden', 'true');
          lettre.appendChild(haut);
          lettre.appendChild(bas);
          boite.appendChild(lettre);
        });
        el.replaceChild(boite, noeud);
      });
      el.dataset.swap = 'done';
    });
  }

  /* ------------------------------------------------ 2. révélations au défilement */
  function setupReveals() {
    var items = $$('[data-reveal], [data-split], [data-count], .steps, .mock');

    if (!('IntersectionObserver' in window) || !motionOK()) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      $$('[data-count]').forEach(function (el) {
        el.textContent = (el.dataset.prefix || '') + el.dataset.count + (el.dataset.suffix || '');
      });
      return;
    }

    // Les titres découpés le sont avant toute mesure, pour éviter un reflow visible.
    $$('[data-split]').forEach(splitWords);

    // Décalage automatique des enfants d'un même groupe.
    $$('[data-stagger]').forEach(function (group) {
      var step = parseInt(group.dataset.stagger, 10) || 90;
      $$('[data-reveal]', group).forEach(function (child, i) {
        if (!child.style.getPropertyValue('--d')) {
          child.style.setProperty('--d', (i * step) + 'ms');
        }
      });
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        if (entry.target.hasAttribute('data-count')) countUp(entry.target);
        io.unobserve(entry.target);
      });
      // Seuil volontairement bas : un bloc posé juste au bord du pli doit se
      // révéler à l'arrivée sur la page, pas seulement après un premier
      // défilement — c'est là que se trouvent les boutons d'appel.
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });

    items.forEach(function (el) { io.observe(el); });
  }

  /* --------------------------------------------------- 3. compteurs animés */
  function countUp(el) {
    var target = parseFloat(el.dataset.count);
    if (isNaN(target)) return;
    var suffix = el.dataset.suffix || '';
    var prefix = el.dataset.prefix || '';
    var duration = 1400;
    var start = performance.now();

    function frame(now) {
      var p = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* -------------------------------------- 4. en-tête, barre de progression */
  function setupHeader() {
    var header = $('.header');
    var progress = $('.progress');
    var callbar = $('.callbar');
    var last = window.scrollY;

    var onScroll = rafThrottle(function () {
      var y = window.scrollY;
      var max = document.documentElement.scrollHeight - window.innerHeight;

      if (progress) progress.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
      if (header) {
        header.classList.toggle('is-stuck', y > 12);
        // On masque l'en-tête quand l'utilisateur descend, on le rend au premier
        // geste vers le haut : le menu reste à une intention de distance.
        var hide = y > 320 && y > last && !document.body.classList.contains('is-locked');
        header.classList.toggle('is-hidden', hide);
      }
      last = y;
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // La barre d'appel reste visible dès l'arrivée sur la page : sur mobile, le
    // numéro doit être atteignable sans le moindre défilement.
    if (callbar) requestAnimationFrame(function () { callbar.classList.add('is-in'); });
  }

  /* --------------------------------------------------- 5. menu mobile */
  function setupDrawer() {
    var burger = $('.burger');
    var drawer = $('#menu');
    if (!burger || !drawer) return;

    $$('.drawer__link', drawer).forEach(function (link, i) { link.style.setProperty('--i', i); });

    function setOpen(open) {
      burger.setAttribute('aria-expanded', String(open));
      drawer.classList.toggle('is-open', open);
      document.body.classList.toggle('is-locked', open);
    }

    burger.addEventListener('click', function () {
      setOpen(burger.getAttribute('aria-expanded') !== 'true');
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        setOpen(false);
        burger.focus();
      }
    });
  }

  /* ------------------------------- 6. inclinaison 3D des cartes au survol */
  function setupTilt() {
    if (!fine.matches || !motionOK()) return;
    $$('[data-tilt]').forEach(function (el) {
      var max = parseFloat(el.dataset.tilt) || 6;

      var move = rafThrottle(function (x, y) {
        var r = el.getBoundingClientRect();
        var px = (x - r.left) / r.width - 0.5;
        var py = (y - r.top) / r.height - 0.5;
        el.style.setProperty('--ry', (px * max).toFixed(2) + 'deg');
        el.style.setProperty('--rx', (-py * max).toFixed(2) + 'deg');
      });

      el.addEventListener('pointermove', function (e) { move(e.clientX, e.clientY); });
      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--ry', '0deg');
        el.style.setProperty('--rx', '0deg');
      });
    });
  }

  /* ---------------------------------- 7. halo lumineux qui suit le curseur */
  function setupSpotlight() {
    if (!fine.matches) return;
    $$('.card--spot').forEach(function (el) {
      var move = rafThrottle(function (x, y) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (x - r.left) + 'px');
        el.style.setProperty('--my', (y - r.top) + 'px');
      });
      el.addEventListener('pointermove', function (e) { move(e.clientX, e.clientY); });
    });
  }

  /* ------------------------------------------------- 8. boutons magnétiques */
  function setupMagnetic() {
    if (!fine.matches || !motionOK()) return;
    // Tous les boutons sont magnétiques : c'est un seul geste, pas un privilège.
    $$('.btn, [data-magnetic]').forEach(function (el) {
      var pull = parseFloat(el.dataset.magnetic) || 8;

      var move = rafThrottle(function (x, y) {
        var r = el.getBoundingClientRect();
        var dx = (x - (r.left + r.width / 2)) / (r.width / 2);
        var dy = (y - (r.top + r.height / 2)) / (r.height / 2);
        el.style.setProperty('--tx', (dx * pull).toFixed(1) + 'px');
        el.style.setProperty('--ty', (dy * pull).toFixed(1) + 'px');
      });

      el.addEventListener('pointermove', function (e) { move(e.clientX, e.clientY); });
      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--tx', '0px');
        el.style.setProperty('--ty', '0px');
      });
    });
  }

  /* ------------------------------------------ 9. parallaxe des taches floues */
  function setupParallax() {
    var blobs = $$('.blob[data-speed]');
    if (!blobs.length || !motionOK() || !fine.matches) return;

    var onScroll = rafThrottle(function () {
      var y = window.scrollY;
      blobs.forEach(function (b) {
        var speed = parseFloat(b.dataset.speed) || 0.08;
        b.style.setProperty('--py', (-y * speed).toFixed(1) + 'px');
      });
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* -------------------------------------------------------- 10. accordéon */
  function setupFaq() {
    $$('.faq__btn').forEach(function (btn) {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (!panel) return;
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        // Une seule réponse ouverte : la page reste courte et lisible.
        $$('.faq__btn').forEach(function (other) {
          if (other === btn) return;
          var op = document.getElementById(other.getAttribute('aria-controls'));
          other.setAttribute('aria-expanded', 'false');
          if (op) op.dataset.open = 'false';
        });
        btn.setAttribute('aria-expanded', String(!open));
        panel.dataset.open = String(!open);
      });
    });
  }

  /* ------------------------------------------------- 11. curseur avant/après
     Trois modes d'usage, une seule source de vérité (--pos) :
       souris  — le curseur suit le pointeur au survol, et le clic-glissé le fixe
       doigt   — le premier geste décide : horizontal, on déplace le curseur ;
                 vertical, on rend la main à la page pour qu'elle défile
       clavier — le champ `range` reste focusable et pilote la même variable
     Le champ est en `pointer-events: none` : il ne capte que le clavier, ce qui
     évite qu'il entre en concurrence avec le glissement géré ici. */
  function setupBeforeAfter() {
    $$('.ba, .hero__ba').forEach(function (el) {
      var range = $('.ba__range', el);
      var startX = 0, startY = 0, mode = null; // null · 'attente' · 'glisse' · 'defile'

      function apply(pct) {
        pct = Math.max(2, Math.min(98, pct));
        el.style.setProperty('--pos', pct.toFixed(2) + '%');
        if (range) range.value = Math.round(pct);
      }
      function fromX(x) {
        var r = el.getBoundingClientRect();
        apply(((x - r.left) / r.width) * 100);
      }
      var move = rafThrottle(fromX);

      if (range) {
        range.addEventListener('input', function () { apply(parseFloat(range.value)); });
      }

      function capture(e) {
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* sans importance */ }
      }

      el.addEventListener('pointerdown', function (e) {
        // La révélation jouée au chargement s'efface dès que le visiteur prend
        // la main, sinon elle écraserait sa position au prochain repaint.
        if (el.classList.contains('hero__ba')) el.style.animation = 'none';
        startX = e.clientX;
        startY = e.clientY;
        if (e.pointerType === 'mouse') {
          mode = 'glisse';
          capture(e);
          fromX(e.clientX);
        } else {
          mode = 'attente';
        }
      });

      el.addEventListener('pointermove', function (e) {
        if (mode === 'attente') {
          var dx = Math.abs(e.clientX - startX);
          var dy = Math.abs(e.clientY - startY);
          if (dx < 6 && dy < 6) return;
          if (dx <= dy) { mode = 'defile'; return; }
          mode = 'glisse';
          capture(e);
        }
        if (mode === 'glisse') { move(e.clientX); return; }
        if (mode === null && fine.matches && e.pointerType === 'mouse') move(e.clientX);
      });

      function relacher() { mode = null; }
      el.addEventListener('pointerup', relacher);
      el.addEventListener('pointercancel', relacher);
      el.addEventListener('pointerleave', relacher);
    });
  }

  /* ------------------------------ 12. ancres : compensation de l'en-tête fixe */
  function setupAnchors() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href^="#"]');
      if (!link) return;
      var id = link.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var offset = (document.querySelector('.header') || {}).offsetHeight || 64;
      var top = target.getBoundingClientRect().top + window.scrollY - offset - 16;
      window.scrollTo({ top: top, behavior: motionOK() ? 'smooth' : 'auto' });
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  }

  /* --------------------------------- 13. garde-fou formulaire (anti-robots) */
  function setupForm() {
    $$('form[data-guard]').forEach(function (form) {
      var opened = Date.now();
      form.addEventListener('submit', function (e) {
        var hp = form.querySelector('input[name="_gotcha"]');
        // Champ piège rempli, ou envoi en moins de trois secondes : c'est un robot.
        if ((hp && hp.value) || Date.now() - opened < 3000) {
          e.preventDefault();
          return;
        }
        var btn = form.querySelector('button[type="submit"]');
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Envoi en cours…';
        }
      });
    });
  }

  /* ------------------------------- 14. effets pilotés par la position lue
     Deux effets partagent un seul écouteur de défilement, et ne calculent que
     pour les éléments réellement à l'écran :

     · la maquette du hero part inclinée en arrière et se redresse à mesure que
       la page descend (« Container Scroll »)
     · les mots d'une phrase passent du gris clair à l'encre au fil du
       défilement (« Text Reveal »)

     Les deux angles de la maquette — défilement et survol — sont portés par
     deux variables distinctes que le CSS additionne, pour qu'ils cohabitent. */
  function setupScrollFX() {
    if (!motionOK() || !('IntersectionObserver' in window)) return;
    var mock = $('.hero .mock');
    var lits = $$('.lit');
    if (!mock && !lits.length) return;

    var actifs = [];

    var maj = rafThrottle(function () {
      var h = window.innerHeight;
      actifs.forEach(function (el) {
        var r = el.getBoundingClientRect();

        if (el === mock) {
          var p = Math.min(Math.max(1 - r.top / (h * 0.75), 0), 1);
          el.style.setProperty('--srx', (11 * (1 - p)).toFixed(2) + 'deg');
          el.style.setProperty('--ssc', (0.96 + 0.04 * p).toFixed(3));
          return;
        }

        var mots = el.__mots || (el.__mots = $$('.w', el));
        if (!mots.length) return;
        var n = mots.length;
        var q = Math.min(Math.max((h * 0.82 - r.top) / (r.height + h * 0.3), 0), 1);
        mots.forEach(function (w, i) {
          var o = Math.min(Math.max((q * (n + 6) - i) / 4, 0.22), 1);
          w.style.opacity = o.toFixed(2);
        });
      });
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var i = actifs.indexOf(e.target);
        if (e.isIntersecting && i < 0) actifs.push(e.target);
        else if (!e.isIntersecting && i >= 0) actifs.splice(i, 1);
      });
      maj();
    }, { rootMargin: '15% 0px 15% 0px' });

    if (mock) io.observe(mock);
    lits.forEach(function (el) { io.observe(el); });

    window.addEventListener('scroll', maj, { passive: true });
    window.addEventListener('resize', maj, { passive: true });
    maj();
  }

  /* ------------------------------------------------------------- démarrage */
  function init() {
    setupReveals();
    setupSwap();
    setupScrollFX();
    setupHeader();
    setupDrawer();
    setupTilt();
    setupSpotlight();
    setupMagnetic();
    setupParallax();
    setupFaq();
    setupBeforeAfter();
    setupAnchors();
    setupForm();
    document.documentElement.classList.add('js-ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
