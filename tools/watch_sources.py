#!/usr/bin/env python3
"""Weekly watch on the outside sources this site points to instead of copying.

For every entry in data/sources.json it fetches the page, keeps the readable text (no scripts, styles, navigation, or footers),
and compares it with last week's fingerprint. It writes back only machine fields: when it was checked, when a change was last seen,
and the fingerprint. People edit only `id`, `label`, `url`, `strict`, and `used_on`.

A change is reported when the text hash differs and either the page is `strict` (docs and release notes, where one edited number
matters) or the text moved enough to be more than page noise (word count off by 1% or more, or a simhash distance of 3 or more).
A source that cannot be fetched keeps its old fingerprint; it is reported after 3 failed weeks in a row.

  python3 tools/watch_sources.py            # update data/sources.json and write sources-report.md if anything changed lately
  python3 tools/watch_sources.py --dry      # print what would change, write nothing
"""
import argparse, hashlib, json, re, sys, urllib.request
from datetime import date, timedelta
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILE = ROOT / "data" / "sources.json"
REPORT = ROOT / "sources-report.md"
UA = "HOOP-source-watch/1.0 (+https://github.com/mutiny19/hoop)"
SKIP_TAGS = {"script", "style", "noscript", "svg", "nav", "header", "footer", "aside", "form"}
RECENT_DAYS = 30        # the issue lists changes seen in the last 30 days, then clears itself
MAX_BYTES = 2_000_000


class Text(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.out = []

    def handle_starttag(self, tag, attrs):
        if tag in SKIP_TAGS:
            self.depth += 1

    def handle_endtag(self, tag):
        if tag in SKIP_TAGS and self.depth:
            self.depth -= 1

    def handle_data(self, data):
        if not self.depth:
            self.out.append(data)


def readable(html):
    p = Text()
    p.feed(html)
    return re.sub(r"\s+", " ", " ".join(p.out)).strip()


def simhash(words):
    v = [0] * 64
    for w in words:
        h = int.from_bytes(hashlib.sha256(w.encode()).digest()[:8], "big")
        for i in range(64):
            v[i] += 1 if (h >> i) & 1 else -1
    return sum(1 << i for i in range(64) if v[i] > 0)


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,*/*"})
    with urllib.request.urlopen(req, timeout=25) as r:
        raw = r.read(MAX_BYTES)
        return raw.decode(r.headers.get_content_charset() or "utf-8", errors="replace")


def fingerprint(text):
    words = [w for w in re.findall(r"[a-z0-9.\-]{3,}", text.lower())]
    return {"hash": hashlib.sha256(text.encode()).hexdigest()[:20], "words": len(words), "sim": format(simhash(words), "016x")}


def moved(old, new, strict):
    if old["hash"] == new["hash"]:
        return False
    if strict:
        return True
    off = abs(new["words"] - old["words"]) / max(old["words"], 1)
    dist = bin(int(old["sim"], 16) ^ int(new["sim"], 16)).count("1")
    return off >= 0.01 or dist >= 3


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--file", default=str(FILE), help="sources file (default data/sources.json); for testing")
    ap.add_argument("--today", default=date.today().isoformat())
    a = ap.parse_args()
    path = Path(a.file)
    data = json.loads(path.read_text())
    today = a.today
    lines = []
    for s in data["sources"]:
        try:
            text = readable(fetch(s["url"]))
            if len(text) < 200:
                raise ValueError("almost no readable text (a script-only page); not compared")
            new = fingerprint(text)
        except Exception as e:                                    # keep the old fingerprint; say so after 3 weeks
            s["fails"] = s.get("fails", 0) + 1
            print(f"FAIL {s['id']}: {e}", file=sys.stderr)
            continue
        s["fails"] = 0
        s["checked"] = today
        old = s.get("fp")
        changed = bool(old) and moved(old, new, s.get("strict", False))
        if changed:
            s["changed"] = today
            print(f"CHANGED {s['id']}")
        if not old or changed:
            s["fp"] = new          # a new baseline only on the first read or a real change, so small noise can't pile up into a "change" later
    for s in data["sources"]:
        if s.get("fails", 0) >= 3:
            lines.append(f"- {s['label']} ({s['url']}) could not be read for {s['fails']} weeks in a row. It may have moved or closed.")
    cutoff = (date.fromisoformat(today) - timedelta(days=RECENT_DAYS)).isoformat()
    for s in data["sources"]:
        if s.get("changed", "") >= cutoff:
            lines.append(f"- [{s['label']}]({s['url']}) changed {s['changed']}. Check what this site says against it. Used on: {', '.join(s.get('used_on', [])) or 'n/a'}.")
    if a.dry:
        print("\n".join(lines) or "nothing to report")
        return
    data["checked"] = today
    path.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n")
    if lines:
        REPORT.write_text("These outside pages changed lately. This site links to them instead of copying them, so skim each one and update any line here that no longer matches. The note clears itself 30 days after a change.\n\n" + "\n".join(lines) + "\n")
    elif REPORT.exists():
        REPORT.unlink()


if __name__ == "__main__":
    main()
