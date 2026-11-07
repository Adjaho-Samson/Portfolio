"""Dependency-free structural checks for the static portfolio."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse
import json
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class Document(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.duplicates = []
        self.links = []
        self.headings = {1: 0}
        self.buttons = []
        self._button = None
        self._heading = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            if attrs["id"] in self.ids:
                self.duplicates.append(attrs["id"])
            self.ids.add(attrs["id"])
        for key in ("href", "src"):
            if attrs.get(key):
                self.links.append((key, attrs[key]))
        if tag == "button":
            self._button = {"label": attrs.get("aria-label", ""), "text": ""}
            self.buttons.append(self._button)
        if tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            self._heading = tag
            if tag == "h1":
                self.headings[1] += 1

    def handle_data(self, data):
        if self._button is not None:
            self._button["text"] += data.strip()

    def handle_endtag(self, tag):
        if tag == "button":
            self._button = None
        if self._heading == tag:
            self._heading = None


class StaticPortfolioTests(unittest.TestCase):
    def setUp(self):
        self.documents = {}
        for filename in ("index.html", "certification.html", "admin.html"):
            parser = Document()
            parser.feed((ROOT / filename).read_text(encoding="utf-8"))
            self.documents[filename] = parser

    def test_documents_have_unique_ids_and_one_primary_heading(self):
        for filename, document in self.documents.items():
            with self.subTest(filename=filename):
                self.assertFalse(document.duplicates, document.duplicates)
                # Admin contains two mutually exclusive views, each with a heading.
                self.assertEqual(document.headings[1], 2 if filename == "admin.html" else 1)

    def test_all_local_links_and_anchors_resolve(self):
        for filename, document in self.documents.items():
            for kind, raw_url in document.links:
                parsed = urlparse(raw_url)
                if parsed.scheme or raw_url.startswith(("//", "mailto:", "tel:", "data:")):
                    continue
                path = unquote(parsed.path)
                target = (ROOT / filename).parent / path if path else ROOT / filename
                if not target.exists() and not target.is_dir():
                    self.fail(f"{filename}: missing {kind} target {raw_url}")
                if parsed.fragment and target.suffix.lower() in {".html", ".htm"}:
                    target_doc = self.documents.get(target.name)
                    if target_doc is None:
                        parser = Document()
                        parser.feed(target.read_text(encoding="utf-8"))
                        target_ids = parser.ids
                    else:
                        target_ids = target_doc.ids
                    self.assertIn(unquote(parsed.fragment), target_ids, f"{filename}: broken anchor {raw_url}")

    def test_controls_have_an_accessible_name(self):
        for filename, document in self.documents.items():
            for button in document.buttons:
                self.assertTrue(button["label"] or button["text"], f"{filename}: unnamed button {button}")

    def test_search_engine_and_deployment_metadata(self):
        robots = (ROOT / "robots.txt").read_text()
        self.assertIn("Disallow: /admin.html", robots)
        self.assertIn('name="robots" content="noindex, nofollow, noarchive"', (ROOT / "admin.html").read_text())
        sitemap = (ROOT / "sitemap.xml").read_text()
        self.assertIn("certification.html", sitemap)
        self.assertNotIn("admin.html", sitemap)
        self.assertEqual(json.loads((ROOT / "vercel.json").read_text())["headers"][0]["source"], "/(.*)")

    def test_analytics_is_disabled_without_explicit_public_configuration_and_consent(self):
        config = (ROOT / "analytics-config.js").read_text()
        self.assertIn('supabaseUrl: ""', config)
        self.assertIn('publishableKey: ""', config)
        script = (ROOT / "script.js").read_text()
        self.assertIn('preferences === "accepted"', script)
        self.assertIn("navigator.globalPrivacyControl", script)
        self.assertIn("navigator.doNotTrack", script)
        self.assertNotIn("service_role_key =", config)
        self.assertNotIn("service_role_key:", config)

    def test_project_presentations_are_not_screenshot_claims_when_assets_are_absent(self):
        index = (ROOT / "index.html").read_text()
        readable = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", index))
        for pattern in (r"Tchatz\s*Safe", r"Tchatz\s+Klassio", r"SpeedType", r"Tchatz\s*Music", r"AGORA"):
            self.assertRegex(readable, pattern)
        self.assertIn("PAS UNE CAPTURE D’ÉCRAN", index)
        self.assertIn("Tchatz-Music-debug.apk", index)
        self.assertIn("data-track-music-download", index)
        self.assertRegex(readable, r"L’INTERFACE RÉELLE N’EST PAS FOURNIE")
        self.assertTrue((ROOT / "images/tchatz-music-logo.png").is_file())
        self.assertFalse(list(ROOT.rglob("*.apk")))


if __name__ == "__main__":
    unittest.main(verbosity=2)
