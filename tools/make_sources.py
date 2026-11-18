#!/usr/bin/env python3
"""Write SOURCES.md: every outside page and data feed this site points to or reads, in one place.

Built from the site itself, so it cannot drift: links are collected from the pages people see, from the data files
behind them, and from the scripts that fetch data. Never edit SOURCES.md by hand; change the page, data file, or
script and it follows. Run by .github/workflows/changelog.yml after each push.

    python3 tools/make_sources.py
"""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OWN = ("https://mutiny19.github.io/hoop", "https://github.com/mutiny19/hoop", "http://www.w3.org", "https://www.w3.org",
       "https://schema.org", "http://localhost", "https://fonts.g")
PAGES = [("index.html", "Home"), ("meshcore/index.html", "MeshCore start page"), ("meshnet/index.html", "#meshnet"),
         ("channels/index.html", "Channels and nets"), ("live/index.html", "Live"), ("projects/index.html", "Projects"),
         ("gifts/index.html", "Gift guide"), ("emergency/index.html", "For agencies")]
DATA = [("data/settings/meshcore.json", "MeshCore settings"), ("data/settings/reticulum.json", "Reticulum settings"),
        ("data/nets.json", "Nets"), ("data/projects.json", "Projects"), ("data/gifts.json", "Gift guide"),
        ("data/meshnet/regions.json", "#meshnet regions"), ("data/sources.json", "Pages watched for changes")]
READ = ["tools/update_nodes.py", "tools/update_reference.py", "tools/update_zones.py", "tools/update_nwr.py",
        "tools/update_observers.py", "tools/update_ham_nets.py", "tools/meshnet_log.py", "assets/home.js",
        "meshcore/index.html", "channels/index.html"]
URL = re.compile(r'https?://[^\s"\'<>)\\`]+')
LABELS = ("label", "title", "name", "text", "seller")


def ours(u):
    return u.startswith(OWN)


def clean(u):
    return u.rstrip(".,;:")


def text_of(fragment):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragment))).strip(" ↗")


def page_links(path):
    """Links a visitor can click: each <a href> with its own words."""
    src = (ROOT / path).read_text(errors="ignore")
    src = re.sub(r"<(script|style)\b[\s\S]*?</\1>", "", src)
    out = {}
    for m in re.finditer(r'<a\b[^>]*\bhref="(https?://[^"]+)"[^>]*>([\s\S]*?)</a>', src):
        u, label = clean(html.unescape(m.group(1))), text_of(m.group(2))
        if not ours(u):
            out.setdefault(u, label or u)
    return out


def data_links(path):
    """Links held in a data file, labelled by the nearest name beside them."""
    out = {}

    def walk(node):
        if isinstance(node, dict):
            label = next((str(node[k]) for k in LABELS if isinstance(node.get(k), str) and not node[k].startswith("http")), "")
            for v in node.values():
                if isinstance(v, str) and v.startswith("http") and not ours(v):
                    out.setdefault(clean(v), label or clean(v))
                elif isinstance(v, list) and len(v) == 2 and all(isinstance(x, str) for x in v) and v[1].startswith("http"):
                    if not ours(v[1]):
                        out.setdefault(clean(v[1]), v[0])          # ["label", "url"] pairs
                else:
                    walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)

    walk(json.loads((ROOT / path).read_text()))
    return out


def read_urls(path):
    """Addresses a script fetches: the feeds behind the data. In a page script that means a fetch() call or a
    constant named ..._URL; in a tool, every address it holds."""
    src = (ROOT / path).read_text(errors="ignore")
    if path.endswith(".html"):
        src = "\n".join(re.findall(r"<script\b[^>]*>([\s\S]*?)</script>", src))
    if path.endswith(".py"):
        hits = re.findall(r'["\'](https?://[^"\']+)["\']', src)
    else:
        hits = re.findall(r'fetch\(\s*["\'](https?://[^"\']+)', src) + re.findall(r'_URL\s*=\s*["\'](https?://[^"\']+)', src)
    found = []
    for u in hits:
        u = re.sub(r"\?.*$", "", clean(u))                         # the feed, not one query
        if not ours(u) and "." in u.split("/")[2] and u not in found:
            found.append(u)
    return found


def script_links(path):
    """Links a page script draws: the radio system cards hold ["Label", "site", "address"] triples, and a few
    other addresses are written out in full."""
    src = (ROOT / path).read_text(errors="ignore")
    out = {}
    for label, u in re.findall(r'\["([^"]+)",\s*"[^"]*",\s*"(https?://[^"]+)"\]', src):
        if not ours(u):
            out.setdefault(clean(u), label)
    feeds = set(read_urls(path))
    for u in re.findall(r'["\'](https?://[^"\'\s]+)["\']', src):
        u = clean(u)
        if not ours(u) and re.sub(r"\?.*$", "", u) not in feeds and "." in u.split("/")[2]:
            out.setdefault(u, host(u))
    return out


def host(u):
    return u.split("/")[2].removeprefix("www.")


def item(u, label):
    return "- <%s>" % u if label == u or label == host(u) else "- [%s](%s)" % (md(label), u)


def md(label):
    label = re.sub(r"\s*\(?\b[AKNW][A-Z]?\d[A-Z]{1,3}\b\)?", "", label).strip() or label    # club callsigns stay in the data, not here
    return label.replace("[", "(").replace("]", ")").replace("|", "/")


def main():
    lines = ["# Sources", "",
             "Every outside page and data feed HOOP points to or reads, in one place. This file is written by",
             "`tools/make_sources.py` from the site itself after each change, so do not edit it by hand.", "",
             "HOOP is a signpost, not an authority: each of these is the authority for what it covers.", ""]
    seen = set()

    lines += ["## Data the site reads", "",
              "Feeds fetched by the scheduled jobs or by a visitor's browser. The README says how often each refreshes.", ""]
    feeds = {}
    for path in READ:
        for u in read_urls(path):
            feeds.setdefault(u, []).append(path)
    for u in sorted(feeds, key=host):
        lines.append("- <%s> (read by %s)" % (u, ", ".join("`%s`" % p for p in sorted(set(feeds[u])))))
        seen.add(u)

    lines += ["", "## Linked from the pages", ""]
    for path, name in PAGES:
        links = page_links(path)
        if path == "index.html":
            for u, label in script_links("assets/home.js").items():
                links.setdefault(u, label)
        if not links:
            continue
        lines += ["### %s" % name, ""]
        lines += [item(u, label) for u, label in sorted(links.items(), key=lambda kv: (host(kv[0]), kv[1].lower()))]
        lines.append("")
        seen.update(links)

    lines += ["## Held in the data files", "", "Links the pages draw from data, such as each net's own site and each project.", ""]
    for path, name in DATA:
        links = {u: l for u, l in data_links(path).items() if u not in seen}
        if not links:
            continue
        lines += ["### %s (`%s`)" % (name, path), ""]
        lines += [item(u, label) for u, label in sorted(links.items(), key=lambda kv: (host(kv[0]), kv[1].lower()))]
        lines.append("")
        seen.update(links)

    (ROOT / "SOURCES.md").write_text("\n".join(lines).rstrip() + "\n")
    print("SOURCES.md: %d sources" % len(seen))


if __name__ == "__main__":
    main()
