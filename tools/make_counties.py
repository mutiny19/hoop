#!/usr/bin/env python3
"""Generate advanced/counties.js (county outlines for the region-settings maps) from Census TIGERweb.

    python3 tools/make_counties.py --extra "KY:Hardin,KY:Meade,KY:Oldham,KY:Trimble,KY:Jefferson,OH:Butler,OH:Hamilton,KY:Boone,KY:Gallatin,KY:Carroll"
        # Indiana as published: 92 counties plus the 39 border and OKI-metro counties
    python3 tools/make_counties.py --state 39 --neighbors 18,21,26,42,54 --out advanced/counties.js

Writes one classic-script file defining COUNTIES = [{fips, name, st, d, cx, cy, nb}, ...]:
  fips  5-digit state+county FIPS            d    SVG path in the page's map coordinates
  name  county name without "County"         cx, cy  label point
  st    two-letter state                     nb   fips of touching counties (used by the builder's "reach" option)

The main state's counties are all included; from each neighbouring state only the counties that
touch the main state, plus any named with --extra (e.g. --extra "KY:Hardin,KY:Meade" for metro
counties a neighbour's region list mentions). The projection is a plain linear fit that keeps the
state inside the page's map viewBox; the script prints the viewBox to put on the <svg>.
Source: TIGERweb State_County layer, generalized to about 0.005 degrees.
"""
import argparse
import json
import math
import sys
import urllib.parse
import urllib.request
from pathlib import Path

TIGER = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/1/query"
STATES = {"01": "AL", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT", "10": "DE", "12": "FL", "13": "GA",
          "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME", "24": "MD",
          "25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
          "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH", "40": "OK", "41": "OR", "42": "PA",
          "44": "RI", "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA",
          "54": "WV", "55": "WI", "56": "WY"}
# The projection the published Indiana file uses, so a rebuild stays byte-compatible with the page's viewBox.
INDIANA_PROJ = (135.612, 11987.20, -173.648, 7346.72)
UA = {"User-Agent": "HOOP (github.com/mutiny19/hoop)"}


def fetch(state):
    q = {"where": "STATE='%s'" % state, "outFields": "NAME,COUNTY,STATE,GEOID", "returnGeometry": "true",
         "outSR": "4326", "geometryPrecision": "4", "maxAllowableOffset": "0.005", "f": "geojson"}
    with urllib.request.urlopen(urllib.request.Request(TIGER + "?" + urllib.parse.urlencode(q), headers=UA), timeout=180) as r:
        return json.loads(r.read())["features"]


def rings(feature):
    g = feature["geometry"]
    return g["coordinates"] if g["type"] == "Polygon" else [r for poly in g["coordinates"] for r in poly]


def vertex_set(feature):
    return {(round(x, 3), round(y, 3)) for ring in rings(feature) for x, y in ring}


def seg_dist(p, a, b):
    (px, py), (ax, ay), (bx, by) = p, a, b
    dx, dy = bx - ax, by - ay
    t = 0.0 if dx == dy == 0 else max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def touches(fa, fb, tol=0.003):
    """True when the two counties share a border: some vertex of one lies on an edge of the other
    (generalized shapes rarely share exact vertices, so a distance test replaces a set intersection)."""
    ra, rb = rings(fa), rings(fb)
    ax = [x for r in ra for x, _ in r]; ay = [y for r in ra for _, y in r]
    bx = [x for r in rb for x, _ in r]; by = [y for r in rb for _, y in r]
    if min(ax) > max(bx) + tol or min(bx) > max(ax) + tol or min(ay) > max(by) + tol or min(by) > max(ay) + tol:
        return False
    for src, dst in ((ra, rb), (rb, ra)):
        for ring in src:
            for p in ring:
                for ring2 in dst:
                    for i in range(len(ring2) - 1):
                        if seg_dist(p, ring2[i], ring2[i + 1]) < tol:
                            return True
    return False


def centroid(ring):
    a = cx = cy = 0.0
    for i in range(len(ring) - 1):
        (x0, y0), (x1, y1) = ring[i], ring[i + 1]
        cross = x0 * y1 - x1 * y0
        a += cross; cx += (x0 + x1) * cross; cy += (y0 + y1) * cross
    if abs(a) < 1e-9:
        return ring[0]
    return cx / (3 * a), cy / (3 * a)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--state", default="18", help="main state FIPS")
    ap.add_argument("--neighbors", default="17,21,26,39", help="comma-separated neighbouring state FIPS")
    ap.add_argument("--extra", default="", help="extra neighbour counties, e.g. KY:Hardin,KY:Meade")
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "advanced" / "counties.js"))
    args = ap.parse_args()

    main_feats = fetch(args.state)
    extras = {tuple(e.split(":")) for e in args.extra.split(",") if ":" in e}
    chosen = [(f, STATES[args.state]) for f in main_feats]
    for st in [s for s in args.neighbors.split(",") if s]:
        for f in fetch(st):
            name = f["properties"]["NAME"].replace(" County", "").replace(" Parish", "")
            if (STATES[st], name) in extras or any(touches(f, m) for m in main_feats):
                chosen.append((f, STATES[st]))

    if args.state == "18":
        a, b, c, d = INDIANA_PROJ
    else:   # fit the main state into x 30..500, keeping lon/lat proportions at the state's middle latitude
        lons = [x for f in main_feats for r in rings(f) for x, _ in r]; lats = [y for f in main_feats for r in rings(f) for _, y in r]
        a = 470.0 / (max(lons) - min(lons)); b = 30 - a * min(lons)
        c = -a / math.cos(math.radians((max(lats) + min(lats)) / 2)); d = 85 - c * max(lats)
    proj = lambda x, y: (a * x + b, c * y + d)

    out, feats = [], {}
    for f, st in chosen:
        p = f["properties"]; name = p["NAME"].replace(" County", "").replace(" Parish", "")
        parts, best = [], None
        for ring in rings(f):
            pts = [proj(x, y) for x, y in ring]
            parts.append("M" + "L".join("%.1f,%.1f" % q for q in pts[:-1]) + "Z")
            cxy, area = centroid(pts), abs(sum(pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1] for i in range(len(pts) - 1)))
            if best is None or area > best[0]:
                best = (area, cxy)
        fips = p["GEOID"]
        out.append({"fips": fips, "name": name, "st": st, "d": "".join(parts), "cx": round(best[1][0], 1), "cy": round(best[1][1], 1), "nb": []})
        feats[fips] = f
    for i in out:
        i["nb"] = [j["fips"] for j in out if j["fips"] != i["fips"] and touches(feats[i["fips"]], feats[j["fips"]])]
    out.sort(key=lambda r: (r["st"] != STATES[args.state], r["st"], r["name"]))

    xs = [r["cx"] for r in out if r["st"] == STATES[args.state]]; ys = [r["cy"] for r in out if r["st"] == STATES[args.state]]
    header = ("/* County outlines for the region-settings maps: fips, name, state, SVG path, label point, neighbour fips.\n"
              "   Generated by tools/make_counties.py from Census TIGERweb (state %s, neighbours %s); edit the tool, not this file. */\n"
              % (args.state, args.neighbors))
    Path(args.out).write_text(header + "const COUNTIES = " + json.dumps(out, separators=(",", ":")) + ";\n", encoding="utf-8")
    print("wrote %s: %d counties (%d in the main state)" % (args.out, len(out), len(xs)))
    print("suggested viewBox for the page's <svg>: %d %d %d %d" % (min(xs) - 40, min(ys) - 40, max(xs) - min(xs) + 80, max(ys) - min(ys) + 80))
    return 0


if __name__ == "__main__":
    sys.exit(main())
