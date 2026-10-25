#!/usr/bin/env python3
"""Scan the repo for things that should never be published: e-mail addresses,
personal handles, and any extra strings you list in a local, untracked file.

    python3 tools/check_pii.py            # scan tracked text files
    python3 tools/check_pii.py --names .pii-local   # also flag each line of that file

.pii-local is gitignored; put one string per line (your name, GitHub user, callsign).
Exit code 1 if anything is found, so it can gate a push.
"""
import os
import re
import subprocess
import sys

EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
# Amateur callsign shape. Club calls cited in articles are fine; the point is to look at every hit.
CALLSIGN = re.compile(r"\b[AKNW][A-Z]?[0-9][A-Z]{1,3}\b")
ALLOW = {
    "41898283+github-actions[bot]@users.noreply.github.com",
    "mutiny19@users.noreply.github.com",  # the organization's GitHub no-reply address, used as commit author
    "W7VMI",  # club callsign of Vashon Island's ARC, cited in the agencies article
}
TEXT = (".html", ".md", ".yml", ".yaml", ".py", ".js", ".css", ".json", ".txt", ".svg")


def tracked():
    out = subprocess.run(["git", "ls-files"], capture_output=True, text=True, check=True).stdout
    return [p for p in out.split("\n") if p.endswith(TEXT)]


def main():
    names = []
    if "--names" in sys.argv:
        path = sys.argv[sys.argv.index("--names") + 1]
        if os.path.exists(path):
            names = [l.strip() for l in open(path, encoding="utf-8") if l.strip()]
    hits = []
    for path in tracked():
        try:
            text = open(path, encoding="utf-8").read()
        except (UnicodeDecodeError, FileNotFoundError):
            continue
        for n, line in enumerate(text.split("\n"), 1):
            for m in EMAIL.finditer(line):
                if m.group(0) not in ALLOW:
                    hits.append((path, n, "email", m.group(0)))
            if path.endswith((".html", ".md")):
                for m in CALLSIGN.finditer(line):
                    if m.group(0) not in ALLOW:
                        hits.append((path, n, "callsign?", m.group(0)))
            low = line.lower()
            for s in names:
                if s.lower() in low:
                    hits.append((path, n, "name", s))
    for h in hits:
        print("%s:%d  %s  %s" % h)
    print("%d hit(s)" % len(hits))
    return 1 if hits else 0


if __name__ == "__main__":
    sys.exit(main())
