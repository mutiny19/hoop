#!/usr/bin/env python3
"""Weekly: NWS forecast-zone outlines for the home page's alert layer -> data/nws-zones.json.

The home page used to fetch each alerted zone from api.weather.gov on every visit (up to 189 requests).
This downloads the zones once a week (IN, IL, OH, KY, MI), keeps those that touch the map's frame,
simplifies them (Douglas-Peucker, 0.01 degree in Indiana, 0.025 elsewhere), and writes one small file keyed by zone ID
(e.g. INZ001). The browser joins live alerts to it locally. Real NWS geometry only; nothing invented.
The zone list endpoint ignores include_geometry, so each zone is fetched on its own, politely (one at a time).
Zone borders change a few times a year, which is why this is weekly rather than nightly.
"""
import json, os, sys, time, urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "nws-zones.json")
UA = "HOOP-zones/1.0 (+https://github.com/mutiny19/hoop)"
LIST = "https://api.weather.gov/zones?type=forecast&area=IN,IL,OH,KY,MI"
ONE = "https://api.weather.gov/zones/forecast/"
# The home map's frame (from viewBox and projection in assets/home.js): lon -89.4..-83.4, lat 37.3..42.3
LON0, LON1, LAT0, LAT1 = -89.4, -83.4, 37.3, 42.3
TOL = 0.01          # Indiana zones
TOL_OTHER = 0.025   # neighboring states: context only, drawn at the edge of the map


def dp(pts, tol):
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        (x1, y1), (x2, y2) = pts[a], pts[b]
        dx, dy = x2 - x1, y2 - y1
        n = (dx * dx + dy * dy) ** 0.5
        best, idx = 0.0, None
        for i in range(a + 1, b):
            x, y = pts[i]
            d = abs(dy * (x - x1) - dx * (y - y1)) / n if n else ((x - x1) ** 2 + (y - y1) ** 2) ** 0.5
            if d > best:
                best, idx = d, i
        if idx is not None and best > tol:
            keep[idx] = True
            stack += [(a, idx), (idx, b)]
    return [p for p, k in zip(pts, keep) if k]


def simplify(geom, tol=TOL):
    if geom["type"] == "GeometryCollection":
        return [p for g in geom.get("geometries", []) for p in simplify(g, tol)]
    if geom["type"] not in ("Polygon", "MultiPolygon"):
        return []
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    out = []
    for poly in polys:
        rings = []
        for ring in poly:
            r = dp([tuple(p[:2]) for p in ring], tol)
            if len(r) >= 4:
                rings.append([[round(x, 3), round(y, 3)] for x, y in r])
        if rings:
            out.append(rings)
    return out


def touches(polys):
    xs = [p[0] for poly in polys for ring in poly for p in ring]
    ys = [p[1] for poly in polys for ring in poly for p in ring]
    return bool(xs) and max(xs) >= LON0 and min(xs) <= LON1 and max(ys) >= LAT0 and min(ys) <= LAT1


def get(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/geo+json"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception:
            if i == tries - 1:
                return None
            time.sleep(3 * (i + 1))


def main():
    lst = get(LIST)
    ids = sorted(f["properties"]["id"] for f in (lst or {}).get("features", []))
    if len(ids) < 300:
        sys.exit(f"zone list came back with {len(ids)} entries; keeping the existing file")
    zones, failed = {}, 0
    for zid in ids:
        f = get(ONE + zid)
        time.sleep(0.25)
        if not f:
            failed += 1
            print("failed:", zid, flush=True)
            continue
        if not f.get("geometry"):
            continue
        polys = simplify(f["geometry"], TOL if zid.startswith("IN") else TOL_OTHER)
        if polys and touches(polys):
            zones[zid] = polys
    if failed > len(ids) * 0.05 or len(zones) < 100:     # a partial answer must not replace a good file
        sys.exit(f"{failed} failed, {len(zones)} kept; keeping the existing file")
    out = {"generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
           "source": "api.weather.gov forecast zones, simplified to 0.01 degree (0.025 outside Indiana)", "zones": zones}
    with open(OUT, "w") as f:
        json.dump(out, f, separators=(",", ":"))
        f.write("\n")
    print(f"{len(zones)} zones kept of {len(ids)}, {failed} failed, {os.path.getsize(OUT) // 1024} KB")


if __name__ == "__main__":
    main()
