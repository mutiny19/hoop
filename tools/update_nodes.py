#!/usr/bin/env python3
"""Nightly MeshCore inventory for the home-page map.

Reads the official public node list (map.meshcore.io/api/v1/nodes), keeps REPEATERS inside the map's area
(Indiana and its neighbours), and writes data/meshcore-nodes.json. Companion (personal) node locations are never
written; they are only counted. Usage: update_nodes.py [nodes.json]  (no argument = download the feed).
"""
import datetime
import json
import sys
import urllib.request
from pathlib import Path

FEED = "https://map.meshcore.io/api/v1/nodes"
DATA = Path(__file__).resolve().parent.parent / "data"
OUT = DATA / "meshcore-nodes.json"
COUNTIES = DATA / "in-counties.json"                # Census boundaries + population (tools/update_reference.py)
# The home-page map's view (SVG x = 191.3*lon + 16854, y = -250*lat + 10440), as lon/lat.
LON_MIN, LON_MAX, LAT_MIN, LAT_MAX = -89.6, -83.27, 37.17, 42.37
# Indiana's outline in the same SVG coordinates (matches the map's state shape).
INDIANA = [(110, 15), (173, 35), (245, 0), (630, 0), (628, 665), (613, 745), (517, 757), (507, 815), (440, 870),
           (402, 940), (326, 890), (249, 952), (191, 990), (96, 960), (29, 995), (10, 965), (38, 865), (96, 770),
           (115, 690), (109, 602)]


def svg_xy(lat, lon):
    return 191.3 * lon + 16854, -250 * lat + 10440


def in_indiana(lat, lon):
    x, y = svg_xy(lat, lon)
    inside, j = False, len(INDIANA) - 1
    for i, (xi, yi) in enumerate(INDIANA):
        xj, yj = INDIANA[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def inside(lon, lat, ring):
    c, j = False, len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi:
            c = not c
        j = i
    return c


def county_of(lat, lon, counties):
    for name, c in counties.items():
        if any(inside(lon, lat, ring) for ring in c["rings"]):
            return name
    return None


def load(path=None):
    if path:
        data = json.load(open(path))
    else:
        req = urllib.request.Request(FEED, headers={"User-Agent": "HOOP (github.com/mutiny19/hoop)"})
        with urllib.request.urlopen(req, timeout=120) as r:
            data = json.load(r)
    return data.get("nodes", data) if isinstance(data, dict) else data


def main():
    nodes = load(sys.argv[1] if len(sys.argv) > 1 else None)
    now = datetime.datetime.now(datetime.timezone.utc)
    repeaters, companions_in = [], 0
    for n in nodes:
        lat, lon = n.get("adv_lat"), n.get("adv_lon")
        if not lat or not lon or not (LAT_MIN <= lat <= LAT_MAX and LON_MIN <= lon <= LON_MAX):
            continue
        try:
            seen = datetime.datetime.fromisoformat(n["last_advert"].replace("Z", "+00:00"))
        except (KeyError, ValueError, AttributeError):
            continue
        age = (now - seen).total_seconds() / 86400
        if age > 365:
            continue
        indiana = in_indiana(lat, lon)
        if n.get("type") == 2:
            repeaters.append({"name": (n.get("adv_name") or "").strip()[:40], "lat": round(lat, 4), "lon": round(lon, 4),
                              "seen": seen.strftime("%Y-%m-%dT%H:%MZ"), "in": indiana})
        elif n.get("type") == 1 and indiana and age <= 30:
            companions_in += 1
    repeaters.sort(key=lambda r: (not r["in"], r["seen"]), reverse=False)
    ind = [r for r in repeaters if r["in"]]
    counties = json.loads(COUNTIES.read_text())["counties"] if COUNTIES.exists() else {}
    per_county = {name: [0, 0] for name in counties}   # [repeaters, heard in 30 days]
    for r in ind:
        c = county_of(r["lat"], r["lon"], counties)
        if c:
            r["county"] = c
            per_county[c][0] += 1
            seen = datetime.datetime.strptime(r["seen"], "%Y-%m-%dT%H:%MZ").replace(tzinfo=datetime.timezone.utc)
            per_county[c][1] += (now - seen).days < 30

    def recent(r, days):
        seen = datetime.datetime.strptime(r["seen"], "%Y-%m-%dT%H:%MZ").replace(tzinfo=datetime.timezone.utc)
        return (now - seen).days < days
    stats = {
        "in_repeaters": len(ind),
        "in_repeaters_30d": sum(recent(r, 30) for r in ind),
        "neighbor_repeaters_30d": sum(recent(r, 30) for r in repeaters if not r["in"]),
        "in_companions_30d": companions_in,
    }
    stats["in_counties_with_active"] = sum(1 for v in per_county.values() if v[1])
    out = {"generated": now.strftime("%Y-%m-%dT%H:%MZ"), "source": FEED,
           "note": "Repeaters only; personal node locations are never included. Seen = last advert.",
           "stats": stats, "counties": {k: v + [counties[k]["pop"]] for k, v in per_county.items()}, "repeaters": repeaters}
    text = json.dumps(out, separators=(",", ":"), ensure_ascii=False)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(text + "\n")
    print(f"{len(repeaters)} repeaters ({len(ind)} in Indiana), stats {stats}, {len(text)} bytes")


if __name__ == "__main__":
    main()
