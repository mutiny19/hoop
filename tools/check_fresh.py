#!/usr/bin/env python3
"""Weekly: is every data file the workflows write still being written?

Each scheduled job stamps its file with a date. If a stamp is older than the job's schedule allows, the job has
stopped (a failed run, a changed source, a disabled workflow) and nobody would otherwise notice. Prints one line
per stale file and exits 1, so fresh.yml can open one issue and close it again once everything is current.

    python3 tools/check_fresh.py
"""
import datetime, json, sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
# file, where its date is, the most days it may be old, the workflow that writes it
WATCH = [
    ("meshcore-nodes.json", "generated", 3, "nodes.yml (nightly repeater inventory)"),
    ("meshnet/log.json", "nets.0.date", 6, "meshnet.yml (#meshnet check-in log, Sundays and Thursdays)"),
    ("observers.json", "generated", 10, "observers.yml (weekly)"),
    ("nws-zones.json", "generated", 10, "zones.yml (weekly)"),
    ("ham-nets.json", "fetched", 10, "hamnets.yml (weekly)"),
    ("sources.json", "checked", 10, "sources.yml (weekly)"),
    ("nwr-indiana.json", "generated", 40, "nwr.yml (monthly)"),
]


def dig(d, path):
    for key in path.split("."):
        d = d[int(key)] if isinstance(d, list) else d[key]
    return d


def main():
    today = datetime.datetime.now(datetime.timezone.utc).date()
    stale = []
    for name, path, limit, job in WATCH:
        try:
            stamp = str(dig(json.loads((DATA / name).read_text()), path))[:10]
            age = (today - datetime.date.fromisoformat(stamp)).days
        except Exception as e:                     # a missing file or date is as much a problem as an old one
            stale.append("- `data/%s`: no readable date (%s). Written by %s" % (name, type(e).__name__, job)); continue
        if age > limit:
            stale.append("- `data/%s`: last written %s, %d days ago (expected within %d). Written by %s" % (name, stamp, age, limit, job))
    print("\n".join(stale) if stale else "Every watched data file is current.")
    return 1 if stale else 0


if __name__ == "__main__":
    sys.exit(main())
