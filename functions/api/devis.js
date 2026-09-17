/**
 * Réception du formulaire de devis — Cloudflare Pages Function.
 *
 * Aucune dépendance, aucune étape de build : Cloudflare Pages exécute
 * automatiquement les fichiers du dossier `functions/`.
 *
 * Le formulaire est un <form method="POST"> classique : il fonctionne même si
 * le JavaScript du site ne se charge pas. La redirection 303 vers /merci se
 * fait côté serveur, ce qui permet de compter les conversions sur une URL
 * dédiée (exclue de l'indexation, voir robots.txt).
 *
 * Variables d'environnement à définir dans le tableau de bord Cloudflare
 * (Pages > Settings > Environment variables) :
 *   RESEND_API_KEY  clé API du service d'envoi (https://resend.com)
 *   DEVIS_TO        adresse de réception, ex. contact.recb82@gmail.com
 *   DEVIS_FROM      expéditeur vérifié, ex. site@recb82.com
 *
 * Tant que ces variables ne sont pas renseignées, l'envoi échoue avec un
 * message explicite plutôt que de perdre la demande en silence.
 */

const CHAMPS = [
  ['nom', 'Nom'],
  ['commune', 'Commune du chantier'],
  ['telephone', 'Téléphone'],
  ['projet', 'Type de projet'],
  ['budget', 'Budget envisagé'],
  ['email', 'E-mail'],
  ['message', 'Message'],
];

const OBLIGATOIRES = ['nom', 'commune', 'telephone'];

function echappe(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function pageErreur(titre, detail, statut) {
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${echappe(titre)} — RECB82</title>
<style>body{font-family:system-ui,sans-serif;background:#f8f9fb;color:#0b3558;margin:0;
display:grid;place-items:center;min-height:100vh;padding:24px;line-height:1.6}
main{max-width:34rem;background:#fff;border:1px solid #d4e0ed;border-radius:24px;padding:40px;
box-shadow:rgba(71,103,136,.08) 0 30px 50px}h1{font-size:28px;margin:0 0 12px}
p{color:#476788}a{color:#006bff;font-weight:700}</style></head><body><main>
<h1>${echappe(titre)}</h1><p>${echappe(detail)}</p>
<p>Le plus simple reste l'appel : <a href="tel:+33663969711">06 63 96 97 11</a>,
du lundi au vendredi de 9 h à 17 h. Vous pouvez aussi écrire à
<a href="mailto:contact.recb82@gmail.com">contact.recb82@gmail.com</a>.</p>
<p><a href="/devis">Revenir au formulaire</a></p></main></body></html>`;
  return new Response(html, {
    status: statut,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

export async function onRequestGet({ request }) {
  // Une arrivée en GET signifie un lien suivi à la main : on renvoie au formulaire.
  return Response.redirect(new URL('/devis', request.url).toString(), 302);
}

export async function onRequestPost({ request, env }) {
  let form;
  try {
    form = await request.formData();
  } catch (e) {
    return pageErreur('Demande illisible', "Le formulaire n'a pas pu être lu. Réessayez.", 400);
  }

  // Champ piège : rempli, c'est un robot. On répond 200 sans rien envoyer,
  // pour ne pas lui indiquer qu'il a été repéré.
  if ((form.get('_gotcha') || '').trim() !== '') {
    return Response.redirect(new URL('/merci', request.url).toString(), 303);
  }

  const valeurs = {};
  for (const [cle] of CHAMPS) valeurs[cle] = (form.get(cle) || '').toString().trim().slice(0, 4000);

  const manquants = OBLIGATOIRES.filter((c) => !valeurs[c]);
  if (manquants.length) {
    return pageErreur(
      'Il manque une information',
      'Le nom, la commune et le téléphone sont nécessaires pour vous rappeler.',
      400
    );
  }

  const cle = env.RESEND_API_KEY;
  const destinataire = env.DEVIS_TO;
  const expediteur = env.DEVIS_FROM;
  if (!cle || !destinataire || !expediteur) {
    return pageErreur(
      "L'envoi n'est pas encore configuré",
      "Le service d'envoi du formulaire n'a pas été activé sur ce site. Votre demande n'a pas été transmise.",
      500
    );
  }

  const lignes = CHAMPS
    .filter(([c]) => valeurs[c])
    .map(([c, label]) => `${label} : ${valeurs[c]}`)
    .join('\n');

  const texte = `Nouvelle demande de devis depuis recb82.com\n\n${lignes}\n\nReçue le ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}.`;

  let reponse;
  try {
    reponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${cle}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: expediteur,
        to: [destinataire],
        reply_to: valeurs.email || undefined,
        subject: `Devis ${valeurs.projet || 'travaux'} — ${valeurs.nom} (${valeurs.commune})`,
        text: texte,
      }),
    });
  } catch (e) {
    return pageErreur(
      "L'envoi a échoué",
      "Nous n'avons pas pu transmettre votre demande. Appelez-nous, c'est plus sûr.",
      502
    );
  }

  if (!reponse.ok) {
    return pageErreur(
      "L'envoi a échoué",
      "Nous n'avons pas pu transmettre votre demande. Appelez-nous, c'est plus sûr.",
      502
    );
  }

  return Response.redirect(new URL('/merci', request.url).toString(), 303);
}
