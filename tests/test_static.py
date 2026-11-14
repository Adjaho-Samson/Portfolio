"""Dependency-free structural and content checks for the generated portfolio."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse
import hashlib
import json
import re
import subprocess
import sys
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PAGES = ("index.html", "projets.html", "certification.html", "404.html")
APK = "assets/downloads/Tchatz-Music-1.0.0-debug.apk"
APK_SHA256 = "99595ce59ce95f051fed3e7b2b6d8c00e22052888c0c1cab6c07a8f280305e2b"
SKILLS = [
    "HTML5", "CSS3", "JavaScript", "React", "PHP", "Vue.js",
    "Python", "Kotlin", "Android natif", "Git & GitHub", "Linux", "Accessibilité web",
]


class Document(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.duplicates = []
        self.links = []
        self.images = []
        self.buttons = []
        self.h1 = 0
        self.lang = None
        self.meta = {}
        self.schemas = []
        self._button = None
        self._script_type = None
        self._script = ""

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "html":
            self.lang = attrs.get("lang")
        if attrs.get("id"):
            if attrs["id"] in self.ids:
                self.duplicates.append(attrs["id"])
            self.ids.add(attrs["id"])
        for key in ("href", "src"):
            if attrs.get(key):
                self.links.append((tag, key, attrs[key], attrs))
        if tag == "img":
            self.images.append(attrs)
        if tag == "button":
            self._button = {"label": attrs.get("aria-label", ""), "text": ""}
            self.buttons.append(self._button)
        if tag == "h1":
            self.h1 += 1
        if tag == "meta":
            self.meta[attrs.get("name", attrs.get("property", ""))] = attrs.get("content")
        if tag == "script":
            self._script_type = attrs.get("type")
            self._script = ""

    def handle_data(self, data):
        if self._button is not None:
            self._button["text"] += data.strip()
        if self._script_type:
            self._script += data

    def handle_endtag(self, tag):
        if tag == "button":
            self._button = None
        if tag == "script" and self._script_type:
            if self._script_type == "application/ld+json":
                self.schemas.append(json.loads(self._script))
            self._script_type = None


class StaticPortfolioTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.documents = {}
        cls.texts = {}
        for filename in PAGES:
            text = (ROOT / filename).read_text(encoding="utf-8")
            parser = Document()
            parser.feed(text)
            cls.documents[filename] = parser
            cls.texts[filename] = text
        cls.projects = json.loads((ROOT / "src/data/projects.json").read_text())
        cls.certificates = json.loads((ROOT / "src/data/certifications.json").read_text())

    def test_generated_html_is_current(self):
        subprocess.run([sys.executable, str(ROOT / "tools/build.py"), "--check"], check=True)

    def test_unique_ids_one_h1_language_and_image_alternatives(self):
        for filename, doc in self.documents.items():
            with self.subTest(filename=filename):
                self.assertEqual(doc.lang, "fr")
                self.assertFalse(doc.duplicates)
                self.assertEqual(doc.h1, 1)
                for image in doc.images:
                    self.assertIn("alt", image)
                    self.assertTrue(image.get("width") and image.get("height"))
                for button in doc.buttons:
                    self.assertTrue(button["label"] or button["text"])

    def test_local_resources_and_anchors_resolve(self):
        for filename, doc in self.documents.items():
            for tag, kind, raw, attrs in doc.links:
                if tag == "use" or raw.startswith("#"):
                    if raw.startswith("#"):
                        self.assertIn(raw[1:], doc.ids, f"{filename}: {raw}")
                    continue
                parsed = urlparse(raw)
                if parsed.scheme or raw.startswith("//"):
                    continue
                path = unquote(parsed.path)
                target = ROOT / path if path else ROOT / filename
                self.assertTrue(target.is_file(), f"{filename}: missing {raw}")
                if parsed.fragment and target.suffix == ".html":
                    self.assertIn(unquote(parsed.fragment), self.documents[target.name].ids, f"{filename}: {raw}")

    def test_theme_and_navigation_are_shared_on_every_page(self):
        for filename, text in self.texts.items():
            self.assertIn('data-theme-toggle', text)
            self.assertIn('assets/js/theme.js', text)
            self.assertIn('aria-controls="navigation"', text)
            self.assertIn('href="#contenu"', text)
            self.assertIn('Catalogue', text)
        theme = (ROOT / "assets/js/theme.js").read_text()
        # Identité nocturne par défaut, choix explicite conservé, stockage refusé géré.
        self.assertIn('apply(saved || "dark")', theme)
        self.assertIn("localStorage.setItem", theme)
        self.assertIn("catch", theme)
        css = (ROOT / "assets/css/portfolio.css").read_text()
        self.assertIn('[data-theme="light"]', css)
        self.assertIn("color-scheme: dark", css)
        self.assertIn("prefers-reduced-motion: reduce", css)
        self.assertNotIn("overflow-x: hidden", css)

    def test_project_catalog_has_unique_web_projects_and_one_native_app(self):
        web = [p for p in self.projects if p["category"] == "sites-web"]
        self.assertEqual(len(web), 7)
        self.assertEqual(len(self.projects), 8)
        self.assertEqual(len({p["id"] for p in self.projects}), 8)
        # Les projets demandés sont présents, avec leurs vrais liens.
        requested = {
            "tchatzsafe": "https://tchatzsafe.vercel.app/",
            "tchatz-music": None,
            "tchatzstudy": None,
            "tchatz-klassio": "https://tchatzklassio.vercel.app/",
            "agora-factures": "https://agorafactu.vercel.app",
        }
        by_id = {p["id"]: p for p in self.projects}
        for pid, url in requested.items():
            self.assertIn(pid, by_id)
            if url is not None:
                self.assertEqual(by_id[pid]["url"], url)
        catalog = self.texts["projets.html"]
        for project in self.projects:
            self.assertEqual(catalog.count(f'id="{project["id"]}"'), 1)
            if project["url"]:
                self.assertIn(project["url"], catalog)
            if project.get("image"):
                self.assertTrue((ROOT / "assets/images" / project["image"]).is_file())
            # Aucun faux lien : une fiche sans URL n'expose pas de bouton externe.
            if not project["url"]:
                block = catalog.split(f'id="{project["id"]}"', 1)[1].split("</article>", 1)[0]
                self.assertNotIn('target="_blank" rel="noopener noreferrer">Voir', block)
        self.assertIn('id="sites-web"', catalog)
        self.assertIn('id="applications"', catalog)
        self.assertIn('id="tchatz-music"', catalog)
        self.assertIn("Android 8.0 et plus", catalog)
        self.assertIn("build debug", catalog)
        self.assertIn("Aucune capture réelle", catalog)
        self.assertIn('id="tchatz-music"', catalog)
        self.assertEqual(self.texts["index.html"].count('class="project-card'), 3)

    def test_stylesheets_and_scripts_are_versioned_for_cache_busting(self):
        """Après un déploiement, un navigateur ne doit jamais rejouer l'ancien CSS."""
        assets = (
            "assets/css/portfolio.css",
            "assets/css/orbits.css",
            "assets/js/theme.js",
            "assets/js/main.js",
            "assets/js/vendor/gsap.min.js",
            "assets/js/vendor/ScrollTrigger.min.js",
            "assets/js/vendor/lenis.min.js",
        )
        for relative in assets:
            digest = hashlib.sha256((ROOT / relative).read_bytes()).hexdigest()[:10]
            expected = f"{relative}?v={digest}"
            for filename, text in self.texts.items():
                with self.subTest(asset=relative, page=filename):
                    self.assertIn(expected, text)
        config = json.loads((ROOT / "vercel.json").read_text())
        rules = {
            rule["source"]: {h["key"]: h["value"] for h in rule["headers"]}
            for rule in config["headers"]
        }
        # Les URL versionnées peuvent être mises en cache un an ; le HTML et les
        # images doivent, eux, être revalidés régulièrement.
        for source in ("/assets/css/(.*)", "/assets/js/(.*)", "/assets/fonts/(.*)"):
            self.assertIn("immutable", rules[source]["Cache-Control"])
        self.assertEqual(
            rules["/(.*).html"]["Cache-Control"], "public, max-age=0, must-revalidate"
        )
        self.assertLessEqual(
            int(re.search(r"max-age=(\d+)", rules["/assets/images/(.*)"]["Cache-Control"]).group(1)),
            86400,
        )
        # Aucune règle générale ne doit réimposer un cache long aux assets non versionnés.
        self.assertNotIn("/assets/(.*)", rules)

    def test_no_repository_access_in_public_interface(self):
        for filename, doc in self.documents.items():
            for tag, kind, raw, attrs in doc.links:
                self.assertNotIn("github.com", raw.lower(), f"{filename}: {raw}")
                if tag == "a" and attrs.get("target") == "_blank":
                    self.assertIn("noopener", attrs.get("rel", ""))
                    self.assertIn("noreferrer", attrs.get("rel", ""))
            readable = re.sub(r"<[^>]+>", " ", self.texts[filename])
            self.assertNotRegex(readable, r"Code source|Voir le code|Repository|Espace administrateur")
        for schema in self.documents["index.html"].schemas:
            self.assertNotIn("https://github.com/Adjaho-Samson", schema.get("sameAs", []))

    def test_apk_is_served_directly_from_the_site(self):
        """Le bouton déclenche le fichier hébergé ici : ni profil ni dépôt."""
        site = json.loads((ROOT / "src/data/site.json").read_text())
        release = site["release"]
        self.assertEqual(release["file"], APK)
        apk = ROOT / APK
        self.assertTrue(apk.is_file(), APK)
        data = apk.read_bytes()
        self.assertEqual(len(data), release["sizeBytes"])
        self.assertEqual(hashlib.sha256(data).hexdigest(), APK_SHA256)
        self.assertEqual(data[:2], b"PK", "APK illisible : ce n'est pas une archive ZIP")
        for filename in ("index.html", "projets.html"):
            text = self.texts[filename]
            self.assertNotIn("github.com/Adjaho-Samson", text)
        page = self.texts["projets.html"]
        self.assertIn(f'href="{APK}"', page)
        self.assertIn('download="Tchatz-Music-1.0.0-debug.apk"', page)
        self.assertIn('type="application/vnd.android.package-archive"', page)
        self.assertIn(APK_SHA256, page)
        self.assertNotRegex(page, r"releases/download|/releases|/blob/|/tree/")
        # Aucune promesse de version PC ni de fausse confirmation.
        self.assertIn("Android uniquement", page)
        self.assertNotIn("Version PC", page)
        self.assertNotIn("Windows", page.split("Android uniquement")[0].split("Télécharger l’application")[-1])
        status = (ROOT / "assets/js/main.js").read_text()
        self.assertNotIn("window.open", status)
        self.assertNotIn("fetch(", status)
        self.assertIn("data-download-status", status)
        config = json.loads((ROOT / "vercel.json").read_text())
        rules = {rule["source"]: {h["key"]: h["value"] for h in rule["headers"]} for rule in config["headers"]}
        self.assertEqual(
            rules["/assets/downloads/(.*).apk"]["Content-Type"],
            "application/vnd.android.package-archive",
        )
        self.assertEqual(rules["/assets/downloads/(.*).apk"]["Content-Disposition"], "attachment")

    def test_skill_constellation_matches_the_requested_list_and_stays_static(self):
        skills = json.loads((ROOT / "src/data/skills.json").read_text())
        labels = [s["label"] for s in skills["skills"]]
        self.assertEqual(sorted(labels), sorted(SKILLS))
        self.assertEqual(len(skills["orbits"]), 3)
        self.assertEqual(len({s["id"] for s in skills["skills"]}), 12)
        index = self.texts["index.html"]
        self.assertEqual(index.count('class="satellite"'), 12)
        self.assertEqual(index.count('class="orbit"'), 3)
        # Chaque compétence garde son nom accessible et son icône officielle.
        for skill in skills["skills"]:
            self.assertIn(f'data-skill="{skill["id"]}"', index)
            self.assertIn(f'data-name="{skill["label"]}"', index.replace("&amp;", "&"))
            self.assertIn(f'#icon-{skill["icon"]}', index)
        self.assertIn('id="icon-brand-html5"', index)
        self.assertIn('id="icon-brand-kotlin"', index)
        self.assertIn('id="icon-fa-universal-access"', index)
        # Les positions sont générées dans une feuille dédiée, pas en style inline
        # (la CSP de production refuse les styles en ligne).
        orbits = (ROOT / "assets/css/orbits.css").read_text()
        for skill in skills["skills"]:
            self.assertIn(f'.satellite[data-skill="{skill["id"]}"]', orbits)
        self.assertIn("assets/css/orbits.css", index)
        self.assertNotRegex(index, r'data-skill="[a-z]+" style=')
        self.assertNotIn("style=", index.split("<main")[1].split("</main>")[0])
        main_js = (ROOT / "assets/js/main.js").read_text()
        self.assertIn("prefers-reduced-motion", main_js)
        self.assertIn("data-orbit-pause", index)
        self.assertIn("is-frozen", main_js)
        self.assertIn("--dur:", orbits)

    def test_fontawesome_sprites_are_official_and_local(self):
        sys.path.insert(0, str(ROOT / "tools"))
        from icon_data import ICON_LIBRARY

        for name, (_view_box, body, credit) in ICON_LIBRARY.items():
            self.assertTrue(body.strip(), name)
            self.assertIn("currentColor", body + "currentColor", name)
            self.assertTrue(credit.startswith(("Font Awesome", "Simple Icons")), name)
        index = self.texts["index.html"]
        for required in ("fa-envelope", "fa-handshake", "fa-laptop-code", "fa-mobile-screen", "fa-download"):
            self.assertIn(f'id="icon-{required}"', index, required)
        # Chaque symbole déclaré est réellement utilisé quelque part.
        for name in ICON_LIBRARY:
            self.assertIn(f"#icon-{name}", "".join(self.texts.values()), name)
        self.assertTrue((ROOT / "assets/icons/LICENSE.md").is_file())
        self.assertTrue((ROOT / "assets/icons/LICENSE-fontawesome.txt").is_file())
        self.assertTrue((ROOT / "assets/icons/LICENSE-simple-icons.md").is_file())

    def test_identity_logo_footer_and_typography(self):
        css = (ROOT / "assets/css/portfolio.css").read_text()
        # Nouvelle identité : bordeaux, anthracite, blanc cassé.
        for token in ("--bg:", "--accent:", "--steel:", "--text:", "--on-inverse:"):
            self.assertIn(token, css)
        self.assertIn("--accent: #ff2d3f", css)
        self.assertIn('[data-theme="light"]', css)
        # Typographie : Plus Jakarta Sans pour les titres, Inter pour les textes.
        self.assertIn("Plus Jakarta Sans", css)
        self.assertIn("Inter", css)
        self.assertNotIn("Manrope", css)
        self.assertNotIn("DM Mono", css)
        self.assertTrue((ROOT / "assets/fonts/plus-jakarta-sans-variable-latin.woff2").is_file())
        self.assertTrue((ROOT / "assets/fonts/inter-variable-latin.woff2").is_file())
        for font in ("fontsource", "manrope"):
            self.assertEqual(list((ROOT / "assets/fonts").glob(f"*{font}*")), [])
        # Logo : un T seul, plus de point sous le T.
        favicon = (ROOT / "assets/favicon.svg").read_text()
        self.assertIn("<path", favicon)
        self.assertNotIn("<circle", favicon)
        for filename, text in self.texts.items():
            self.assertIn('class="brand-mark"', text)
            self.assertNotIn('class="brand-mark" aria-hidden="true">t<span>', text)
        # Pied de page refondu, sans la mention d'audience supprimée.
        for filename, text in self.texts.items():
            footer = text.split('<footer class="site-footer">')[1]
            self.assertNotRegex(footer.lower(), r"aucun traceur|tracker|site statique")
            self.assertIn("data-current-year", footer)
            self.assertIn("footer-nav", footer)
            self.assertIn("footer-socials", footer)
            self.assertIn("Réalisations", footer)
        self.assertIn("footer-brand", self.texts["index.html"])

    def test_backend_integration_and_tracking_are_removed(self):
        for name in ("admin.html", "admin.js", "admin.css", "analytics-config.js", "supabase", "docs/supabase-analytics.md"):
            self.assertFalse((ROOT / name).exists(), name)
        for path in [ROOT / f for f in PAGES] + list((ROOT / "assets").rglob("*")) + [ROOT / "vercel.json", ROOT / "robots.txt"]:
            if path.is_file() and path.suffix in {".html", ".js", ".css", ".json", ".txt"}:
                text = path.read_text(encoding="utf-8").lower()
                self.assertNotIn("supabase", text, str(path))
                self.assertNotIn("data-track", text, str(path))
                self.assertNotIn("portfolio_dashboard", text, str(path))
        scripts = "".join(p.read_text() for p in (ROOT / "assets/js").glob("*.js"))
        self.assertNotIn("fetch(", scripts)
        self.assertNotIn("XMLHttpRequest", scripts)
        self.assertIn("connect-src 'none'", (ROOT / "vercel.json").read_text())

    def test_certificates_use_official_titles_dates_and_original_pdfs(self):
        expected = {
            "html-css": ("Codez un site web accessible avec HTML & CSS", "2026-08-19"),
            "vibe-coding": ("Développez avec les agents IA à l’ère du vibe coding", "2026-08-20"),
            "git-github": ("Gérez du code avec Git et GitHub", "2026-08-21"),
            "linux": ("Administrez un système Linux", "2026-08-23"),
        }
        page = self.texts["certification.html"]
        for cert in self.certificates:
            self.assertEqual((cert["title"], cert["date"]), expected[cert["id"]])
            self.assertIn(cert["title"], page)
            self.assertIn(cert["dateLabel"], page)
            self.assertTrue((ROOT / cert["pdf"]).is_file())
            self.assertTrue((ROOT / f"assets/images/certificats/{cert['id']}.webp").is_file())
        self.assertNotIn("compétences pratiques en JS", page)
        self.assertNotIn("VERIFIED", page)
        self.assertIn("<dialog", page)

    def test_seo_sitemap_robots_and_vercel_configuration(self):
        for filename, doc in self.documents.items():
            self.assertTrue(doc.meta.get("description"))
            self.assertTrue(doc.meta.get("og:image"))
            self.assertEqual(doc.meta.get("twitter:card"), "summary_large_image")
            self.assertTrue(doc.schemas)
        self.assertIn("noindex", self.documents["404.html"].meta["robots"])
        sitemap = ET.parse(ROOT / "sitemap.xml").getroot()
        urls = [node.text for node in sitemap.iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
        self.assertEqual(len(urls), 3)
        self.assertIn("https://tchatzdev.vercel.app/projets.html", urls)
        self.assertNotIn("admin.html", (ROOT / "robots.txt").read_text())
        config = json.loads((ROOT / "vercel.json").read_text())
        self.assertIsNone(config["framework"])
        self.assertEqual(config["outputDirectory"], ".")
        self.assertTrue((ROOT / "google1384d7baa22e0a92.html").is_file())
        self.assertTrue((ROOT / "assets/images/partage-tchatzdev.jpg").is_file())

    def test_assets_are_local_and_lightweight(self):
        for filename, doc in self.documents.items():
            for tag, kind, raw, attrs in doc.links:
                if tag in {"script", "img"} or (tag == "link" and attrs.get("rel") in {"stylesheet", "preload", "icon"}):
                    self.assertFalse(raw.startswith("http"), f"{filename}: remote asset {raw}")
        # Deux familles variables, sous-ensemble latin : Plus Jakarta Sans
        # (titres) et Inter (textes), préchargées et auto-hébergées.
        self.assertLess(sum(p.stat().st_size for p in (ROOT / "assets/fonts").glob("*.woff2")), 80000)
        self.assertLess((ROOT / "assets/images/trinahook.webp").stat().st_size, 100000)
        # Un seul APK, celui réellement proposé au téléchargement.
        self.assertEqual(sorted(p.relative_to(ROOT).as_posix() for p in ROOT.rglob("*.apk")), [APK])


if __name__ == "__main__":
    unittest.main(verbosity=2)