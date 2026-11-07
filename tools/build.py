#!/usr/bin/env python3
"""Generate the static portfolio using only the Python standard library.

Edit src/, then run `python3 tools/build.py`. Generated root HTML is versioned
so Vercel can deploy the repository without a framework or runtime dependency.
"""
from __future__ import annotations

import html
import json
import re
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
E = html.escape


def data(name):
    return json.loads((SRC / "data" / f"{name}.json").read_text(encoding="utf-8"))


def fill(template, values):
    return re.sub(r"\{\{([A-Z_]+)\}\}", lambda m: str(values[m.group(1)]), template)


def icon(name, extra=""):
    return f'<svg class="icon {extra}" aria-hidden="true" focusable="false"><use href="#icon-{name}"></use></svg>'


ICONS = {
    "arrow-up-right": '<path d="M7 17 17 7M7 7h10v10"/>',
    "arrow-right": '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    "arrow-left": '<path d="M20 12H4m6-6-6 6 6 6"/>',
    "arrow-up": '<path d="M12 20V4m-6 6 6-6 6 6"/>',
    "arrow-down": '<path d="M12 4v16m-6-6 6 6 6-6"/>',
    "code": '<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16"/>',
    "smartphone": '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 5h4m-3 14h2"/>',
    "layout": '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/>',
    "terminal": '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3m6 0h4"/>',
    "users": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
    "map-pin": '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    "mail": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
    "message": '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>',
    "moon": '<path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/>',
    "sun": '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
    "download": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M12 3v12m-5-5 5 5 5-5"/>',
    "info": '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
    "x": '<path d="m6 6 12 12M6 18 18 6"/>',
    "award": '<circle cx="12" cy="8" r="6"/><path d="m8.2 12.8-1.7 9.1L12 19l5.5 2.9-1.7-9.1"/>',
    "check": '<path d="m5 12 4 4L19 6"/>',
}
SPRITE = '<svg class="icon-sprite" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><defs>' + ''.join(
    f'<symbol id="icon-{name}" viewBox="0 0 24 24">{paths}</symbol>' for name, paths in ICONS.items()
) + '</defs></svg>'


def tags(items):
    return '<div class="tags">' + ''.join(f'<span>{E(item)}</span>' for item in items) + '</div>'


def features(items):
    return '<ul class="feature-list">' + ''.join(f'<li>{E(item)}</li>' for item in items) + '</ul>'


def project_card(project):
    pid, name = E(project['id']), E(project['name'])
    return f'''<article class="project-card" id="{pid}" aria-labelledby="{pid}-title">
  <div class="project-image"><img src="assets/images/{E(project['image'])}" alt="{E(project['imageAlt'])}" width="1200" height="575" loading="lazy" decoding="async"><span class="image-label">Capture du projet</span></div>
  <div class="project-body"><div class="card-overline"><span>{E(project['kind'])}</span><span class="project-kind">Web</span></div>
    <h3 id="{pid}-title">{name}</h3><p class="card-summary">{E(project['summary'])}</p>
    <p class="project-context"><strong>Le besoin.</strong> {E(project['context'])}</p>{features(project['features'])}
    <div class="project-bottom">{tags(project['technologies'])}<p class="project-status">{icon('check')} {E(project['status'])}</p>
      <a class="button button-primary" href="{E(project['url'], quote=True)}" target="_blank" rel="noopener noreferrer">Visiter le projet <span class="visually-hidden">: {name} (nouvel onglet)</span>{icon('arrow-up-right')}</a>
    </div>
  </div>
</article>'''


def certificate_preview(cert):
    return f'''<a class="cert-preview" href="certification.html#{E(cert['id'])}"><span class="cert-preview-icon">{icon('award')}</span><div><h3>{E(cert['shortTitle'])}</h3><p>{E(cert['issuer'])} · <time datetime="{cert['date']}">{E(cert['dateLabel'])}</time></p></div>{icon('arrow-up-right')}</a>'''


def certificate_card(cert):
    pdf = quote(cert['pdf'], safe='/')
    preview = f"assets/images/certificats/{cert['id']}.webp"
    title = E(cert['title'], quote=True)
    return f'''<article class="certificate-card" id="{E(cert['id'])}" aria-labelledby="{E(cert['id'])}-title">
  <a class="certificate-image" href="{E(pdf, quote=True)}" target="_blank" rel="noopener noreferrer" data-certificate="{E(cert['id'], quote=True)}" data-title="{title}" data-pdf="{E(pdf, quote=True)}" data-preview="{preview}" data-meta="{E(cert['issuer'] + ' · ' + cert['dateLabel'] + ' · Certificat n° ' + cert['number'], quote=True)}" aria-label="Agrandir le certificat : {title}"><img src="{preview}" alt="" width="1200" height="849" loading="lazy" decoding="async"><span>{icon('layout')} Agrandir l’aperçu</span></a>
  <div class="certificate-body"><div class="card-overline"><span>{E(cert['issuer'])}</span>{icon('award')}</div><h2 id="{E(cert['id'])}-title">{E(cert['title'])}</h2><p class="certificate-date">Obtenu le <time datetime="{cert['date']}">{E(cert['dateLabel'])}</time></p><p>{E(cert['description'])}</p><p class="certificate-number">Certificat n° {E(cert['number'])}</p><div class="actions"><a class="button button-primary" href="{E(pdf, quote=True)}" target="_blank" rel="noopener noreferrer" data-certificate="{E(cert['id'], quote=True)}" data-title="{title}" data-pdf="{E(pdf, quote=True)}" data-preview="{preview}" data-meta="{E(cert['issuer'] + ' · ' + cert['dateLabel'] + ' · Certificat n° ' + cert['number'], quote=True)}">Voir le certificat {icon('arrow-up-right')}</a><a class="button button-secondary" href="{E(pdf, quote=True)}" download aria-label="Télécharger le PDF : {title}">{icon('download')} PDF</a></div></div>
</article>'''


def schema_for(page, site):
    url = site['origin'] + page['path']
    if page['path'] == '/':
        return {
            '@context': 'https://schema.org', '@type': 'Person',
            'name': site['legalName'], 'alternateName': site['brand'],
            'url': url, 'image': site['origin'] + '/assets/images/partage-tchatzdev.jpg',
            'jobTitle': 'Développeur web et logiciel',
            'description': page['description'],
            'sameAs': [site['facebook']],
            'knowsAbout': ['Développement web', 'Kotlin', 'Android', 'JavaScript', 'Python', 'Linux'],
            'affiliation': {'@type': 'Organization', 'name': 'AGORA', 'description': 'Collectif technologique fondé par Samson Adjaho.'},
        }
    if page.get('noindex'):
        return {'@context': 'https://schema.org', '@type': 'WebPage', 'name': page['title'], 'url': url}
    items = data('projects') if page['path'] == '/projets.html' else data('certifications')
    elements = []
    for position, item in enumerate(items, 1):
        if page['path'] == '/projets.html':
            entry = {'@type': 'CreativeWork', 'name': item['name'], 'description': item['summary'], 'url': item['url']}
        else:
            entry = {'@type': 'EducationalOccupationalCredential', 'name': item['title'], 'credentialCategory': 'certificate', 'recognizedBy': {'@type': 'Organization', 'name': item['issuer']}, 'dateCreated': item['date'], 'url': url + '#' + item['id']}
        elements.append({'@type': 'ListItem', 'position': position, 'item': entry})
    return {'@context': 'https://schema.org', '@type': 'CollectionPage', 'name': page['title'], 'description': page['description'], 'url': url, 'inLanguage': 'fr', 'isPartOf': {'@type': 'WebSite', 'name': site['brand'], 'url': site['origin'] + '/'}, 'mainEntity': {'@type': 'ItemList', 'itemListElement': elements}}


def build(check=False):
    site, projects, certs = data('site'), data('projects'), data('certifications')
    shell = (SRC / 'templates/shell.html').read_text(encoding='utf-8')
    header = (SRC / 'templates/header.html').read_text(encoding='utf-8')
    footer = (SRC / 'templates/footer.html').read_text(encoding='utf-8')
    changed = []
    for filename, page in site['pages'].items():
        content = (SRC / 'pages' / filename).read_text(encoding='utf-8')
        content = re.sub(r'\{\{icon:([a-z-]+)\}\}', lambda m: icon(m.group(1)), content)
        content = fill(content, {
            'FEATURED_PROJECTS': ''.join(project_card(p) for p in projects if p['featured']),
            'ALL_WEB_PROJECTS': ''.join(project_card(p) for p in projects if p['category'] == 'sites-web'),
            'CERT_PREVIEWS': ''.join(certificate_preview(c) for c in certs),
            'CERTIFICATE_CARDS': ''.join(certificate_card(c) for c in certs),
        })
        nav = fill(header, {'PREFIX': '', 'CURRENT_PROJECTS': ' aria-current="page"' if filename == 'projets.html' else '', 'CURRENT_CERTIFICATIONS': ' aria-current="page"' if filename == 'certification.html' else ''})
        result = fill(shell, {
            'TITLE': E(page['title'], quote=True), 'DESCRIPTION': E(page['description'], quote=True),
            'CANONICAL': E(site['origin'] + page['path'], quote=True), 'ORIGIN': site['origin'],
            'ROBOTS': 'noindex, follow' if page.get('noindex') else 'index, follow, max-image-preview:large',
            'SCHEMA': json.dumps(schema_for(page, site), ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/'),
            'PAGE_ID': Path(filename).stem, 'ICON_SPRITE': SPRITE,
            'HEADER': nav, 'FOOTER': fill(footer, {'PREFIX': ''}), 'CONTENT': content,
        })
        result = "\n".join(line.rstrip() for line in result.splitlines()) + "\n"
        if check:
            if not (ROOT / filename).exists() or (ROOT / filename).read_text(encoding='utf-8') != result:
                changed.append(filename)
        else:
            (ROOT / filename).write_text(result, encoding='utf-8')
    if changed:
        raise SystemExit('Generated HTML is stale: ' + ', '.join(changed) + '. Run python3 tools/build.py.')
    if not check:
        print('Built ' + ', '.join(site['pages']))


if __name__ == '__main__':
    import sys
    build(check='--check' in sys.argv)