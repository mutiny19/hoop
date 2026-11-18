#!/usr/bin/env python3
"""Rewrite sitemap.xml with each page's real last-changed date, taken from git.

Run by changelog.yml after each push (it needs the full history: fetch-depth 0).
A page's date is the newest commit to the page itself or to the files listed
beside it here, so a page that shows a data file is dated when that data changes.
Hidden pages (advanced/, picker/) are left out on purpose. Add a new page here.

    python3 tools/make_sitemap.py
"""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://mutiny19.github.io/hoop/"
PAGES = [  # address under BASE, then the files whose changes count as the page changing
    ("", ["index.html", "assets/home.js", "data/nets.json", "data/settings"]),
    ("meshcore/", ["meshcore/index.html"]),
    ("meshnet/", ["meshnet/index.html", "data/meshnet"]),
    ("channels/", ["channels/index.html", "data/channels.json", "data/nets.json", "data/ham-nets.json"]),
    ("live/", ["live/index.html"]),
    ("projects/", ["projects/index.html", "data/projects.json"]),
    ("gifts/", ["gifts/index.html", "data/gifts.json"]),
    ("emergency/", ["emergency/index.html"]),
    ("resources/indy-metro-net-card.pdf", ["resources/indy-metro-net-card.pdf"]),
]


def last_changed(paths):
    out = subprocess.run(["git", "log", "-1", "--format=%cs", "--"] + paths, cwd=ROOT, capture_output=True, text=True).stdout.strip()
    return out


def main():
    rows = []
    for loc, paths in PAGES:
        d = last_changed(paths)
        rows.append("  <url><loc>%s%s</loc>%s</url>" % (BASE, loc, "<lastmod>%s</lastmod>" % d if d else ""))
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(rows) + "\n</urlset>\n"
    (ROOT / "sitemap.xml").write_text(xml, encoding="utf-8")
    print("sitemap.xml: %d addresses" % len(rows))


if __name__ == "__main__":
    main()
