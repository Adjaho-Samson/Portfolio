"""Dependency-free structural and content checks for the generated portfolio."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse
import json
import re
import subprocess
import sys
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PAGES = ("index.html", "projets.html", "certification.html", "404.html")
APK = "https://github.com/Adjaho-Samson/Tchatz-Music-Android/releases/download/v1.0.0/Tchatz-Music-debug.apk"


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
            self.assertIn('Mes projets', text)
        theme = (ROOT / "assets/js/theme.js").read_text()
        self.assertIn("prefers-color-scheme: dark", theme)
        self.assertIn("localStorage.setItem", theme)
        self.assertIn("catch", theme)
        css = (ROOT / "assets/css/portfolio.css").read_text()
        self.assertIn('[data-theme="dark"]', css)
        self.assertIn("prefers-reduced-motion: reduce", css)
        self.assertNotIn("overflow-x: hidden", css)

    def test_project_catalog_has_five_unique_web_projects_and_one_native_app(self):
        self.assertEqual(len(self.projects), 5)
        self.assertEqual(len({p["id"] for p in self.projects}), 5)
        catalog = self.texts["projets.html"]
        for project in self.projects:
            self.assertEqual(catalog.count(f'id="{project["id"]}"'), 1)
            self.assertIn(project["url"], catalog)
            self.assertTrue((ROOT / "assets/images" / project["image"]).is_file())
        self.assertIn('id="sites-web"', catalog)
        self.assertIn('id="applications"', catalog)
        self.assertIn('id="tchatz-music"', catalog)
        self.assertIn("Android 8.0 et plus", catalog)
        self.assertIn("build debug", catalog)
        self.assertIn("Aucune capture réelle", catalog)
        self.assertEqual(self.texts["index.html"].count('class="project-card"'), 3)

    def test_no_repository_access_in_public_interface(self):
        for filename, doc in self.documents.items():
            for tag, kind, raw, attrs in doc.links:
                if "github.com" in raw.lower():
                    self.assertEqual(raw, APK, f"{filename}: repository/profile link {raw}")
                if tag == "a" and attrs.get("target") == "_blank":
                    self.assertIn("noopener", attrs.get("rel", ""))
                    self.assertIn("noreferrer", attrs.get("rel", ""))
            readable = re.sub(r"<[^>]+>", " ", self.texts[filename])
            self.assertNotRegex(readable, r"Code source|Voir le code|Repository|Espace administrateur")
        for schema in self.documents["index.html"].schemas:
            self.assertNotIn("https://github.com/Adjaho-Samson", schema.get("sameAs", []))

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
        self.assertLess(sum(p.stat().st_size for p in (ROOT / "assets/fonts").glob("*.woff2")), 60000)
        self.assertLess((ROOT / "assets/images/trinahook.webp").stat().st_size, 100000)
        self.assertFalse(list(ROOT.rglob("*.apk")))


if __name__ == "__main__":
    unittest.main(verbosity=2)