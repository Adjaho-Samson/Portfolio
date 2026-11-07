#!/usr/bin/env python3
"""Generate the static portfolio using only the Python standard library.

Edit src/, then run `python3 tools/build.py`. Generated root HTML is versioned
so Vercel can deploy the repository without a framework or runtime dependency.
"""
from __future__ import annotations

import html
import json
import math
import re
from pathlib import Path
from urllib.parse import quote

from icon_data import ICON_LIBRARY

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
E = html.escape


def data(name):
    return json.loads((SRC / "data" / f"{name}.json").read_text(encoding="utf-8"))


def fill(template, values):
    return re.sub(r"\{\{([A-Z_]+)\}\}", lambda m: str(values[m.group(1)]), template)


def icon(name, extra=""):
    """Inline SVG reference to a sprite symbol drawn from the official sources."""
    if name not in ICON_LIBRARY:
        raise KeyError(f"Unknown icon: {name}")
    classes = f"icon {extra}".strip()
    return f'<svg class="{classes}" aria-hidden="true" focusable="false"><use href="#icon-{name}"></use></svg>'


SPRITE = (
    '<svg class="icon-sprite" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><defs>'
    + "".join(
        f'<symbol id="icon-{name}" viewBox="{view_box}">{body}</symbol>'
        for name, (view_box, body, _credit) in ICON_LIBRARY.items()
    )
    + "</defs></svg>"
)

# Logo TchatzDev : un T solide, une barre d'accent grise et un dégradé bordeaux.
# Le tracé est volontairement simple pour rester lisible à 16 px.
LOGO_MARK = (
    '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">'
    '<path d="M9 12h30v6.5H9z" fill="#F8F4EF"/>'
    '<path d="M20.5 12H27v21.5l-6.5 6z" fill="#F8F4EF"/>'
    '<path d="M13 42.5h22" stroke="#C9CDD4" stroke-width="2" stroke-linecap="round" opacity=".6"/>'
    "</svg>"
)


def brand(prefix: str, label: str, in_footer: bool = False) -> str:
    """Logo + nom, partagés par l'en-tête et le pied de page."""
    return (
        f'<a class="brand" href="{prefix}index.html" aria-label="{label}">'
        f'<span class="brand-mark">{LOGO_MARK}</span>'
        '<span class="brand-name">Tchatz<span class="brand-accent">Dev</span></span></a>'
    )


def tags(items):
    return '<div class="tags">' + "".join(f"<span>{E(i)}</span>" for i in items) + "</div>"


def features(items):
    return '<ul class="feature-list">' + "".join(f"<li>{E(i)}</li>" for i in items) + "</ul>"


# --------------------------------------------------------------------------- #
# Constellation : portrait central, compétences en orbite.
# --------------------------------------------------------------------------- #
def constellation(site, skills):
    """Portrait central et compétences en orbite.

    Les positions sont écrites dans une feuille générée (assets/css/orbits.css)
    plutôt qu'en attributs style : la CSP de production interdit les styles en
    ligne, et les orbites doivent rester parfaitement calées sans JavaScript.
    """
    grouped = []
    legend = []
    for orbit in skills["orbits"]:
        members = [s for s in skills["skills"] if s["orbit"] == orbit["id"]]
        buttons = "".join(
            f'<button class="satellite" type="button" data-skill="{skill["id"]}"'
            f' data-name="{E(skill["label"], quote=True)}"'
            f' data-kind="{E(skill["kind"], quote=True)}"'
            f' aria-describedby="constellation-hint">'
            f'<span class="satellite-chip">{icon(skill["icon"])}</span>'
            f'<span class="satellite-name">{E(skill["label"])}</span></button>'
            for skill in members
        )
        grouped.append(
            f'<div class="orbit-path" data-orbit="{orbit["id"]}">{buttons}</div>'
        )
        legend.append(f'<li>{E(orbit["label"])}</li>')

    orbits = "".join(
        f'<div class="orbit" data-orbit="{orbit["id"]}"></div>'
        for orbit in skills["orbits"]
    )
    portrait = (
        '<div class="portrait-orbit">'
        '<img src="assets/images/samson-800.webp"'
        ' srcset="assets/images/samson-480.webp 480w, assets/images/samson-800.webp 800w"'
        ' sizes="(max-width: 760px) 40vw, 260px"'
        ' alt="Portrait de Samson Adjaho, développeur web et Android"'
        ' width="800" height="994" fetchpriority="high" decoding="async">'
        "</div>"
    )
    return (
        '<div class="constellation-figure">'
        '<div class="constellation" data-constellation>'
        f'<div class="orbits" aria-hidden="true">{orbits}</div>'
        f'<div class="satellites">{portrait}{"".join(grouped)}</div>'
        "</div>"
        '<p class="visually-hidden" id="constellation-hint">'
        "Compétences de Samson Adjaho en orbite autour de son portrait. "
        "Utilisez la touche Tab pour passer d’une compétence à l’autre : "
        "son nom s’affiche alors sous le portrait.</p>"
        '<div class="constellation-caption">'
        '<span class="caption-text" role="status" aria-live="polite">'
        f'<strong data-caption-name>{len(skills["skills"])} compétences</strong>'
        '<span data-caption-kind>Web, mobile et systèmes</span></span>'
        '<button class="orbit-pause" type="button" data-orbit-pause aria-pressed="false">'
        f'{icon("fa-pause", "icon-pause")}{icon("fa-play", "icon-play")}'
        '<span data-orbit-pause-label>Pause</span></button>'
        "</div>"
        f'<ul class="orbit-legend" aria-label="Organisation des orbites">{"".join(legend)}</ul>'
        "</div>"
    )


def constellation_css(skills):
    """Feuille de style générée : rayons, durées et positions des satellites."""
    lines = [
        "/* Généré par tools/build.py à partir de src/data/skills.json.",
        "   Positions des orbites et des compétences : aucune règle écrite à la main.",
        "   Les coordonnées sont des pourcentages de la scène : la scène étant",
        "   carrée, les orbites restent parfaitement circulaires et aucun élément",
        "   ne peut sortir de son cadre. */",
    ]
    for orbit in skills["orbits"]:
        lines.append(
            f'.orbit[data-orbit="{orbit["id"]}"],'
            f'.orbit-path[data-orbit="{orbit["id"]}"] {{'
            f' --r: {orbit["radius"]}; --dur: {orbit["duration"]}s;'
            f' --dir: {orbit["direction"]};'
            f' --dir-counter: {"reverse" if orbit["direction"] == "normal" else "normal"}; }}'
        )
        members = [s for s in skills["skills"] if s["orbit"] == orbit["id"]]
        count = len(members)
        for index, skill in enumerate(members):
            angle = math.radians(orbit["offset"] + index * 360 / count)
            reach = orbit["radius"] * 50
            lines.append(
                f'.satellite[data-skill="{skill["id"]}"] {{'
                f' --x: {math.cos(angle) * reach:.3f}%;'
                f' --y: {math.sin(angle) * reach:.3f}%; }}'
            )
    return "\n".join(lines) + "\n"


def skill_groups(skills):
    by_id = {s["id"]: s for s in skills["skills"]}
    groups = []
    for group in skills["groups"]:
        chips = "".join(
            f'<span>{icon(by_id[skill]["icon"])}{E(by_id[skill]["label"])}</span>'
            for skill in group["skills"]
        )
        groups.append(
            f'<article class="skill-group">'
            f'<div class="skill-group-head"><span class="icon-box">{icon(group["icon"])}</span>'
            f"<div><h3>{E(group['title'])}</h3><p>{E(group['summary'])}</p></div></div>"
            f'<div class="tags">{chips}</div></article>'
        )
    return "".join(groups)


# --------------------------------------------------------------------------- #
# Cartes de projets et certifications.
# --------------------------------------------------------------------------- #
def project_card(project):
    pid, name = E(project["id"]), E(project["name"])
    return f'''<article class="project-card" id="{pid}" aria-labelledby="{pid}-title">
  <div class="project-image"><img src="assets/images/{E(project['image'])}" alt="{E(project['imageAlt'])}" width="1200" height="575" loading="lazy" decoding="async"><span class="image-label">Capture du projet</span></div>
  <div class="project-body"><div class="card-overline"><span>{E(project['kind'])}</span><span class="project-kind">Web</span></div>
    <h3 id="{pid}-title">{name}</h3><p class="card-summary">{E(project['summary'])}</p>
    <p class="project-context"><strong>Le besoin.</strong> {E(project['context'])}</p>{features(project['features'])}
    <div class="project-bottom">{tags(project['technologies'])}<p class="project-status">{icon('fa-circle-check')} {E(project['status'])}</p>
      <a class="button button-primary" href="{E(project['url'], quote=True)}" target="_blank" rel="noopener noreferrer">Visiter le projet <span class="visually-hidden">: {name} (nouvel onglet)</span>{icon('fa-arrow-up-right-from-square')}</a>
    </div>
  </div>
</article>'''


def certificate_preview(cert):
    return (
        f'<a class="cert-preview" href="certification.html#{E(cert["id"])}">'
        f'<span class="cert-preview-icon">{icon("fa-award")}</span>'
        f'<div><h3>{E(cert["shortTitle"])}</h3>'
        f'<p>{E(cert["issuer"])} · <time datetime="{cert["date"]}">{E(cert["dateLabel"])}</time></p></div>'
        f'{icon("fa-arrow-right")}</a>'
    )


def certificate_card(cert):
    pdf = quote(cert["pdf"], safe="/")
    preview = f"assets/images/certificats/{cert['id']}.webp"
    title = E(cert["title"], quote=True)
    meta = E(cert["issuer"] + " · " + cert["dateLabel"] + " · Certificat n° " + cert["number"], quote=True)
    return f'''<article class="certificate-card" id="{E(cert['id'])}" aria-labelledby="{E(cert['id'])}-title">
  <a class="certificate-image" href="{E(pdf, quote=True)}" target="_blank" rel="noopener noreferrer" data-certificate="{E(cert['id'], quote=True)}" data-title="{title}" data-pdf="{E(pdf, quote=True)}" data-preview="{preview}" data-meta="{meta}" aria-label="Agrandir le certificat : {title}"><img src="{preview}" alt="" width="1200" height="849" loading="lazy" decoding="async"><span>{icon('fa-layer-group')} Agrandir l’aperçu</span></a>
  <div class="certificate-body"><div class="card-overline"><span>{E(cert['issuer'])}</span>{icon('fa-award')}</div><h2 id="{E(cert['id'])}-title">{E(cert['title'])}</h2><p class="certificate-date">Obtenu le <time datetime="{cert['date']}">{E(cert['dateLabel'])}</time></p><p>{E(cert['description'])}</p><p class="certificate-number">Certificat n° {E(cert['number'])}</p><div class="actions"><a class="button button-primary" href="{E(pdf, quote=True)}" target="_blank" rel="noopener noreferrer" data-certificate="{E(cert['id'], quote=True)}" data-title="{title}" data-pdf="{E(pdf, quote=True)}" data-preview="{preview}" data-meta="{meta}">Voir le certificat {icon('fa-arrow-up-right-from-square')}</a><a class="button button-secondary" href="{E(pdf, quote=True)}" download aria-label="Télécharger le PDF : {title}">{icon('fa-file-arrow-down')} PDF</a></div></div>
</article>'''


# --------------------------------------------------------------------------- #
# Panneau de téléchargement de l'application Android.
# Le fichier APK est servi depuis ce domaine : aucune redirection vers un
# profil ou un dépôt, et aucune confirmation simulée.
# --------------------------------------------------------------------------- #
def download_panel(site):
    release = site["release"]
    return f'''<div class="download-panel" data-download="{release['file']}">
  <div class="download-panel-head"><h4>Télécharger l’application</h4><span class="download-meta">APK · v{E(release['version'])} · {E(release['sizeLabel'])}</span></div>
  <a class="button button-primary" href="{E(release['file'])}" download="{E(release['fileName'])}" type="application/vnd.android.package-archive">{icon('fa-download')} Télécharger l’APK Android<span class="visually-hidden"> : Tchatz Music {E(release['version'])}, {E(release['sizeLabel'])}, fichier hébergé sur ce site</span></a>
  <ul class="download-facts">
    <li>{icon('fa-check')} Android 8.0 ou plus récent (API 26), cible {E(release['targetAndroid'])}</li>
    <li>{icon('fa-check')} Fichier {E(release['fileName'])} · {E(release['sizeLabel'])}</li>
    <li>{icon('fa-check')} Build debug publié le {E(release['dateLabel'])}</li>
  </ul>
  <p class="download-checksum">SHA-256 : {E(release['sha256'])}</p>
  <p class="download-status" data-download-status hidden role="status"></p>
  <p class="platform-note">{icon('fa-circle-info')} <span>Tchatz Music est une application <strong>Android uniquement</strong> : il n’existe pas de version Windows, macOS ou Linux. Depuis un ordinateur, enregistrez le fichier puis transférez-le sur un téléphone Android.</span></p>
</div>'''


def schema_for(page, site, skills):
    url = site["origin"] + page["path"]
    if page["path"] == "/":
        return {
            "@context": "https://schema.org",
            "@type": "Person",
            "name": site["legalName"],
            "alternateName": site["brand"],
            "url": url,
            "image": site["origin"] + "/assets/images/partage-tchatzdev.jpg",
            "jobTitle": "Développeur web et Android",
            "email": "mailto:" + site["email"],
            "description": page["description"],
            "address": {"@type": "PostalAddress", "addressLocality": "Abomey-Calavi", "addressCountry": "BJ"},
            "alumniOf": {"@type": "CollegeOrUniversity", "name": site["school"]},
            "sameAs": [site["facebook"]],
            "knowsAbout": [s["label"] for s in skills["skills"]],
            "affiliation": {
                "@type": "Organization",
                "name": "AGORA",
                "description": "Collectif technologique fondé par Samson Adjaho.",
            },
        }
    if page.get("noindex"):
        return {"@context": "https://schema.org", "@type": "WebPage", "name": page["title"], "url": url}
    items = data("projects") if page["path"] == "/projets.html" else data("certifications")
    elements = []
    for position, item in enumerate(items, 1):
        if page["path"] == "/projets.html":
            entry = {
                "@type": "CreativeWork",
                "name": item["name"],
                "description": item["summary"],
                "url": item["url"],
            }
        else:
            entry = {
                "@type": "EducationalOccupationalCredential",
                "name": item["title"],
                "credentialCategory": "certificate",
                "recognizedBy": {"@type": "Organization", "name": item["issuer"]},
                "dateCreated": item["date"],
                "url": url + "#" + item["id"],
            }
        elements.append({"@type": "ListItem", "position": position, "item": entry})
    return {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": page["title"],
        "description": page["description"],
        "url": url,
        "inLanguage": "fr",
        "isPartOf": {"@type": "WebSite", "name": site["brand"], "url": site["origin"] + "/"},
        "mainEntity": {"@type": "ItemList", "itemListElement": elements},
    }


def footer(site, css, years="2026"):
    links = [
        ("index.html#parcours", "À propos"),
        ("index.html#competences", "Compétences"),
        ("index.html#services", "Services"),
        ("projets.html", "Mes projets"),
    ]
    project_links = [
        ("projets.html#sites-web", "Sites web"),
        ("projets.html#tchatz-music", "Tchatz Music"),
        ("certification.html", "Certifications"),
        ("index.html#agora", "AGORA"),
    ]
    nav_one = "".join(f"<li><a href=\"{h}\">{t}</a></li>" for h, t in links)
    nav_two = "".join(f"<li><a href=\"{h}\">{t}</a></li>" for h, t in project_links)
    socials = (
        f'<a href="{E(site["whatsapp"], quote=True)}" target="_blank" rel="noopener noreferrer"'
        f' aria-label="WhatsApp de Samson Adjaho (nouvel onglet)">{icon("fa-whatsapp")}</a>'
        f'<a href="{E(site["facebook"], quote=True)}" target="_blank" rel="noopener noreferrer"'
        f' aria-label="Profil Facebook de Samson Adjaho (nouvel onglet)">{icon("fa-facebook-f")}</a>'
        f'<a href="mailto:{E(site["email"], quote=True)}" aria-label="Envoyer un e-mail à Samson Adjaho">'
        f'{icon("fa-envelope")}</a>'
    )
    return f'''<footer class="site-footer">
  <div class="wrap footer-top">
    <div class="footer-brand">
      {brand("", "TchatzDev, accueil, pied de page")}
      <p>TchatzDev, c’est mon atelier numérique : des sites, des applications et des outils construits à partir d’un besoin réel, avec le souci du détail et de l’accessibilité.</p>
      <div class="footer-badges">
        <span>{icon("fa-location-dot")} Abomey-Calavi, Bénin</span>
        <span>{icon("fa-code")} Web · Android</span>
      </div>
    </div>
    <nav class="footer-nav" aria-label="Navigation de pied de page">
      <div class="footer-col"><h2>Explorer</h2><ul>{nav_one}</ul></div>
      <div class="footer-col"><h2>Réalisations</h2><ul>{nav_two}</ul></div>
      <div class="footer-col footer-contact"><h2>Contact</h2>
        <a class="footer-contact-link" href="mailto:{E(site["email"], quote=True)}">{icon("fa-envelope")} {E(site["email"])}</a>
        <a class="footer-contact-link" href="{E(site["whatsapp"], quote=True)}" target="_blank" rel="noopener noreferrer">{icon("fa-whatsapp")} {E(site["whatsappLabel"])}</a>
        <div class="footer-socials">{socials}</div>
      </div>
    </nav>
  </div>
  <div class="wrap footer-bottom">
    <p>© <span data-current-year>{years}</span> {E(site["name"])} · TchatzDev. Tous droits réservés.</p>
    <a href="#contenu">Retour en haut {icon("fa-arrow-up")}</a>
  </div>
</footer>'''


def build(check=False):
    site, projects, certs = data("site"), data("projects"), data("certifications")
    skills = data("skills")
    shell = (SRC / "templates/shell.html").read_text(encoding="utf-8")
    header = (SRC / "templates/header.html").read_text(encoding="utf-8")
    changed = []

    orbits_css = ROOT / "assets/css/orbits.css"
    generated_css = constellation_css(skills)
    if check:
        if not orbits_css.exists() or orbits_css.read_text(encoding="utf-8") != generated_css:
            changed.append("assets/css/orbits.css")
    else:
        orbits_css.write_text(generated_css, encoding="utf-8")
    for filename, page in site["pages"].items():
        content = (SRC / "pages" / filename).read_text(encoding="utf-8")
        content = re.sub(r"\{\{icon:([a-z0-9-]+)\}\}", lambda m: icon(m.group(1)), content)
        content = fill(
            content,
            {
                "FEATURED_PROJECTS": "".join(project_card(p) for p in projects if p["featured"]),
                "ALL_WEB_PROJECTS": "".join(project_card(p) for p in projects if p["category"] == "sites-web"),
                "CERT_PREVIEWS": "".join(certificate_preview(c) for c in certs),
                "CERTIFICATE_CARDS": "".join(certificate_card(c) for c in certs),
                "SKILL_ORBITS": constellation(site, skills),
                "SKILL_GROUPS": skill_groups(skills),
                "DOWNLOAD_PANEL": download_panel(site),
                "EMAIL": E(site["email"], quote=True),
                "WHATSAPP": E(site["whatsapp"], quote=True),
                "FACEBOOK": E(site["facebook"], quote=True),
                "RELEASE_VERSION": E(site["release"]["version"]),
            },
        )
        nav = fill(
            header,
            {
                "PREFIX": "",
                "BRAND": brand("", "TchatzDev, accueil"),
                "THEME_MOON": icon("fa-moon", "theme-icon-moon"),
                "THEME_SUN": icon("fa-sun", "theme-icon-sun"),
                "ICON_ARROW": icon("fa-arrow-up-right-from-square"),
                "CURRENT_PROJECTS": ' aria-current="page"' if filename == "projets.html" else "",
                "CURRENT_CERTIFICATIONS": ' aria-current="page"' if filename == "certification.html" else "",
            },
        )
        result = fill(
            shell,
            {
                "TITLE": E(page["title"], quote=True),
                "DESCRIPTION": E(page["description"], quote=True),
                "CANONICAL": E(site["origin"] + page["path"], quote=True),
                "ORIGIN": site["origin"],
                "ROBOTS": "noindex, follow" if page.get("noindex") else "index, follow, max-image-preview:large",
                "SCHEMA": json.dumps(schema_for(page, site, skills), ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/"),
                "PAGE_ID": Path(filename).stem,
                "ICON_SPRITE": SPRITE,
                "HEADER": nav,
                "FOOTER": footer(site, ""),
                "CONTENT": content,
            },
        )
        result = "\n".join(line.rstrip() for line in result.splitlines()) + "\n"
        if check:
            if not (ROOT / filename).exists() or (ROOT / filename).read_text(encoding="utf-8") != result:
                changed.append(filename)
        else:
            (ROOT / filename).write_text(result, encoding="utf-8")
    if changed:
        raise SystemExit("Generated HTML is stale: " + ", ".join(changed) + ". Run python3 tools/build.py.")
    if not check:
        print("Built " + ", ".join(site["pages"]))


if __name__ == "__main__":
    import sys

    build(check="--check" in sys.argv)
