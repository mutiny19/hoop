#!/usr/bin/env python3
"""Closest public-use airport code to each Indiana county's center -> data/county-airports.json.

Used by the home page's "Your county" card to suggest the code to start a #meshnet check-in with. Codes come from
tools/meshnet_airports.json (OurAirports, public-use three-letter codes only, so nobody is placed on a private strip).
Run it again when either input changes. Usage: python3 tools/county_airports.py
"""
import json, math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
counties = json.loads((ROOT / "data" / "in-counties.json").read_text())["counties"]
airports = {k: v for k, v in json.loads((ROOT / "tools" / "meshnet_airports.json").read_text())["airports"].items() if v.get("icao")}   # only codes people can post


def centroid(rings):
    pts = max(rings, key=len)                      # the main ring
    return sum(p[1] for p in pts) / len(pts), sum(p[0] for p in pts) / len(pts)


def miles(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 3958.8 * 2 * math.asin(math.sqrt(h))


out = {}
for name, c in counties.items():
    if c.get("state") not in (None, "IN") and "fips" not in c:
        continue
    here = centroid(c["rings"])
    best = min(airports.values(), key=lambda a: miles(here, (a["lat"], a["lon"])))
    out[name] = [best["icao"], best["name"], round(miles(here, (best["lat"], best["lon"])))]
(ROOT / "data" / "county-airports.json").write_text(json.dumps(out, separators=(",", ":"), ensure_ascii=False) + "\n")
print(len(out), "counties")
