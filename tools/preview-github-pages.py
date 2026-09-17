#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Construit une copie du site adaptée à GitHub Pages, pour prévisualisation.

CE SCRIPT NE SERT QU'À L'APERÇU. Le site de production est déployé sur
Cloudflare Pages directement depuis les fichiers du dépôt, sans aucune
transformation : ne l'utilisez pas dans cette chaîne-là.

Trois différences rendent GitHub Pages incompatible avec les fichiers tels
qu'ils sont livrés :

1. Le site y est servi dans un sous-dossier (https://<compte>.github.io/Recb/),
   alors que toutes les URL du site sont absolues depuis la racine.
2. GitHub Pages ne résout pas « /devis » vers « devis.html » : il faut des
   dossiers avec un index.html.
3. Il n'y a pas d'exécution côté serveur : la fonction qui reçoit le
   formulaire de devis n'existe pas.

Ce script réécrit les URL, transforme les pages en dossiers, neutralise
l'envoi du formulaire et interdit l'indexation de la copie — sans quoi elle
concurrencerait le vrai site dans les résultats de recherche.

Usage : preview-github-pages.py <source> <destination> <base>
        base étant le préfixe d'URL, par exemple /Recb
"""

import os
import re
import shutil
import sys

# Fichiers propres au déploiement Cloudflare, sans objet sur GitHub Pages.
EXCLUS = {'_headers', '_redirects', 'README.md', 'sitemap.xml', 'robots.txt'}
DOSSIERS_EXCLUS = {'functions', 'archive', 'tools', '.git', '.github'}


def reecrire(html, base):
    """Préfixe les URL absolues et transforme les liens de page en dossiers."""

    def lien(m):
        attr, url = m.group(1), m.group(2)
        if url == '/':
            return '%s="%s/"' % (attr, base)
        if url.startswith('/#'):
            return '%s="%s/%s"' % (attr, base, url[1:])
        # Ressource statique : on préfixe sans rien ajouter d'autre.
        if re.search(r'\.(css|js|svg|png|jpg|webp|woff2?|xml|txt|ico)$', url):
            return '%s="%s%s"' % (attr, base, url)
        # Page : elle devient un dossier, l'ancre éventuelle est conservée.
        chemin, _, ancre = url.partition('#')
        suffixe = ('#' + ancre) if ancre else ''
        return '%s="%s%s/%s"' % (attr, base, chemin.rstrip('/'), suffixe)

    html = re.sub(r'\b(href|src|action)="(/[^"]*)"', lien, html)

    # `srcset` liste plusieurs URL séparées par des virgules : la règle
    # ci-dessus ne le voit pas, et le navigateur lui donne la priorité sur
    # `src`. Sans cette reprise, toutes les photos se cassent alors que `src`
    # paraît juste.
    def jeu(m):
        sortie = []
        for cand in m.group(1).split(','):
            cand = cand.strip()
            if not cand:
                continue
            morceaux = cand.split()
            if morceaux[0].startswith('/'):
                morceaux[0] = base + morceaux[0]
            sortie.append(' '.join(morceaux))
        return 'srcset="%s"' % ', '.join(sortie)

    html = re.sub(r'srcset="([^"]*)"', jeu, html)

    # Polices appelées depuis le CSS critique inséré dans le <head>.
    html = html.replace("url('/assets/", "url('%s/assets/" % base)

    # La copie ne doit jamais être indexée : le canonical continue de pointer
    # vers le domaine réel, et on ajoute une interdiction explicite.
    if 'name="robots"' not in html:
        html = html.replace('<meta name="theme-color"',
                            '<meta name="robots" content="noindex, nofollow">\n  <meta name="theme-color"', 1)

    # Sans serveur, l'envoi du formulaire ne peut pas aboutir : on le rend
    # inoffensif et on le dit, plutôt que de laisser croire à un envoi.
    if 'action="%s/api/devis/"' % base in html or '/api/devis' in html:
        html = re.sub(r'action="[^"]*api/devis[^"]*"', 'action="%s/merci/" method="get"' % base, html)
        html = html.replace('method="POST" action=', 'action=')
        html = html.replace(
            '<button class="btn btn--primary btn--lg btn--block" type="submit">',
            '<p class="form__legal" style="border-left:3px solid var(--blue);'
            'background:var(--pebble);padding:12px 14px;border-radius:0 8px 8px 0">'
            "<strong>Aperçu de démonstration.</strong> L'envoi n'est pas connecté sur cette "
            "version : sur le site en production, la demande arrive par courriel.</p>\n"
            '            <button class="btn btn--primary btn--lg btn--block" type="submit">')
    return html


PAGE_404 = """<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Page introuvable — RECB82</title>
<style>body{font-family:system-ui,sans-serif;background:#f8f9fb;color:#0b3558;margin:0;
display:grid;place-items:center;min-height:100vh;padding:24px;line-height:1.6}
main{max-width:32rem;text-align:center}h1{font-size:32px;margin:0 0 12px}
p{color:#476788}a{color:#006bff;font-weight:700}</style></head><body><main>
<h1>Page introuvable</h1>
<p>Ce lien ne correspond à aucune page de l'aperçu.</p>
<p><a href="__BASE__/">Revenir à l'accueil</a></p></main></body></html>
"""


def main():
    if len(sys.argv) != 4:
        print(__doc__)
        return 1
    source, dest, base = sys.argv[1], sys.argv[2], sys.argv[3].rstrip('/')

    if os.path.exists(dest):
        shutil.rmtree(dest)
    os.makedirs(dest)

    pages = 0
    for nom in sorted(os.listdir(source)):
        chemin = os.path.join(source, nom)
        if nom in EXCLUS or nom in DOSSIERS_EXCLUS or nom.startswith('.'):
            continue

        if os.path.isdir(chemin):
            shutil.copytree(chemin, os.path.join(dest, nom))
            continue

        if nom.endswith('.html'):
            with open(chemin, encoding='utf-8') as f:
                html = reecrire(f.read(), base)
            if nom == 'index.html':
                cible = os.path.join(dest, 'index.html')
            else:
                dossier = os.path.join(dest, nom[:-5])
                os.makedirs(dossier, exist_ok=True)
                cible = os.path.join(dossier, 'index.html')
            with open(cible, 'w', encoding='utf-8') as f:
                f.write(html)
            pages += 1
        else:
            shutil.copy2(chemin, os.path.join(dest, nom))

    # Aucun moteur ne doit explorer la copie.
    with open(os.path.join(dest, 'robots.txt'), 'w', encoding='utf-8') as f:
        f.write('User-agent: *\nDisallow: /\n')
    with open(os.path.join(dest, '404.html'), 'w', encoding='utf-8') as f:
        f.write(PAGE_404.replace('__BASE__', base))
    # Évite que GitHub Pages passe les fichiers dans Jekyll.
    open(os.path.join(dest, '.nojekyll'), 'w').close()

    print('Aperçu construit : %d pages, base « %s »' % (pages, base))
    return 0


if __name__ == '__main__':
    sys.exit(main())
