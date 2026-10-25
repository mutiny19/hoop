#!/usr/bin/env python3
"""Check every outside link the site uses. Prints broken ones; exit 1 if any.

Broken = DNS/connection failure, 404, 410 or a 5xx that persists. Sites that block scripts (401/403/405/429) count as reachable.
"""
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILES = [p for p in ROOT.rglob("*.html") if ".git" not in p.parts]
SKIP = ("https://fonts.g", "https://github.com/mutiny19/hoop/issues/new", "https://api.meshcore.nz")


def urls():
    found = {}
    for p in FILES:
        for u in re.findall(r'https?://[^\s"\'<>)\\]+', p.read_text(errors="ignore")):
            u = u.rstrip(".,;")
            if not u.startswith(SKIP):
                found.setdefault(u, set()).add(str(p.relative_to(ROOT)))
    return found


def check(u):
    req = urllib.request.Request(u, method="GET", headers={"User-Agent": "Mozilla/5.0 (link check; github.com/mutiny19/hoop)"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception as e:  # noqa: BLE001
        return type(e).__name__


def main():
    bad = []
    for u, where in sorted(urls().items()):
        s = check(u)
        if s in (401, 403, 405, 429) or (isinstance(s, int) and s < 400):
            continue
        if isinstance(s, int) and s >= 500:
            s2 = check(u)
            if isinstance(s2, int) and s2 < 400:
                continue
        bad.append((u, s, sorted(where)))
    for u, s, where in bad:
        print(f"- {u} → {s} (in {', '.join(where)})")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
