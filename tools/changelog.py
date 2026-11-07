#!/usr/bin/env python3
"""data/changelog.json: the last three human-made changes to the site, for the footer's "What's new" line.
Subjects only (first line of each commit message); no author names. Skips the bots' nightly and weekly data commits.
Run by .github/workflows/changelog.yml after each push to main."""
import json, re, subprocess
from pathlib import Path

rows = subprocess.run(["git", "log", "-n", "60", "--format=%an%x1f%cs%x1f%s"], capture_output=True, text=True, check=True).stdout.splitlines()
out = []
for r in rows:
    a, d, s = r.split("\x1f", 2)
    if "bot" in a.lower() or re.match(r"(Nightly|Weekly|Merge|Update what)", s):
        continue
    out.append({"date": d, "text": s if len(s) <= 100 else s[:97].rsplit(" ", 1)[0] + "..."})
    if len(out) == 3:
        break
Path(__file__).resolve().parent.parent.joinpath("data", "changelog.json").write_text(json.dumps(out, separators=(",", ":"), ensure_ascii=False) + "\n")
