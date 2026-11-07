#!/usr/bin/env python3
"""Nightly: how many #meshnet-capable observers report from each Indiana county -> data/observers.json.

One request a day to each CoreScope's /api/observers (the same instances tools/meshnet_log.py reads). Observers heard
in the last 30 days are placed in a county and COUNTED. Nothing else is stored: no names, no IDs, no coordinates,
so the page can show where the log is blind without placing anyone's equipment. Counties are Census boundaries
(data/in-counties.json). An observer outside Indiana is not counted.
"""
import datetime, json, sys, urllib.request
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from update_nodes import county_of   # same point-in-county test the map uses

DATA = Path(__file__).resolve().parent.parent / "data"
SOURCES = ["https://map.okimesh.org", "https://corescope.chicagolandmesh.org"]
UA = "HOOP-observers/1.0 (+https://github.com/mutiny19/hoop)"


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def main():
    counties = json.loads((DATA / "in-counties.json").read_text())["counties"]
    now = datetime.datetime.now(datetime.timezone.utc)
    seen, ok = {}, 0
    for s in SOURCES:
        try:
            obs = get(s + "/api/observers")["observers"]
        except Exception as e:
            print(f"{s}: {type(e).__name__}; skipped")
            continue
        ok += 1
        for o in obs:
            try:
                age = now - datetime.datetime.strptime(o["last_seen"][:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=datetime.timezone.utc)
            except Exception:
                continue
            if age.days >= 30 or o.get("lat") in (None, 0) or o.get("lon") in (None, 0):
                continue
            seen[o["id"]] = (o["lat"], o["lon"])          # one per observer, even if two CoreScopes list it
    if not ok:
        sys.exit("no CoreScope answered; keeping the existing file")
    per = {}
    for lat, lon in seen.values():
        c = county_of(lat, lon, counties)
        if c:
            per[c] = per.get(c, 0) + 1
    out = {"generated": now.strftime("%Y-%m-%dT%H:%MZ"),
           "note": "Observers heard in the last 30 days, counted by Indiana county. No names, IDs, or positions are stored.",
           "total": sum(per.values()), "counties": dict(sorted(per.items()))}
    (DATA / "observers.json").write_text(json.dumps(out, separators=(",", ":")) + "\n")
    print(f"{out['total']} observers in {len(per)} Indiana counties")


if __name__ == "__main__":
    main()
