#!/usr/bin/env python3
"""Indiana county reference data from the Census Bureau: boundaries (TIGERweb) and population (county estimates).

Writes data/in-counties.json: {"source": ..., "counties": {"Marion": {"fips": "097", "pop": 981628, "rings": [[[lon, lat], ...]]}}}.
Run yearly (the workflow does it each January) or by hand; the nightly inventory uses it to count repeaters per county.
"""
import csv
import io
import json
import urllib.request
from pathlib import Path

TIGER = ("https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/1/query"
         "?where=STATE%3D%2718%27&outFields=NAME,COUNTY&returnGeometry=true&outSR=4326"
         "&geometryPrecision=4&maxAllowableOffset=0.005&f=geojson")
POP_URLS = ["https://www2.census.gov/programs-surveys/popest/datasets/2020-%d/counties/totals/co-est%d-alldata.csv" % (y, y)
            for y in range(2030, 2022, -1)]
OUT = Path(__file__).resolve().parent.parent / "data" / "in-counties.json"
UA = {"User-Agent": "HOOP (github.com/mutiny19/hoop)"}


def get(url, timeout=120):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return r.read()


def main():
    shapes = json.loads(get(TIGER))["features"]
    pop, pop_src = {}, None
    for url in POP_URLS:   # newest vintage that exists
        try:
            text = get(url).decode("latin-1")
        except Exception:
            continue
        rows = [r for r in csv.DictReader(io.StringIO(text)) if r["STATE"] == "18" and r["COUNTY"] != "000"]
        col = [k for k in rows[0] if k.startswith("POPESTIMATE") and k[-4:].isdigit()][-1]
        pop = {r["COUNTY"]: int(r[col]) for r in rows}
        pop_src = url + " (" + col + ")"
        break
    if not pop:
        raise SystemExit("no Census population file found")
    counties = {}
    for f in shapes:
        name = f["properties"]["NAME"].replace(" County", "")
        fips = f["properties"]["COUNTY"]
        g = f["geometry"]
        polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
        rings = [[[round(x, 4), round(y, 4)] for x, y in poly[0]] for poly in polys]
        counties[name] = {"fips": fips, "pop": pop.get(fips), "rings": rings}
    assert len(counties) == 92, len(counties)
    OUT.write_text(json.dumps({"source": {"boundaries": "Census TIGERweb State_County", "population": pop_src},
                               "counties": dict(sorted(counties.items()))}, separators=(",", ":")) + "\n")
    print(f"{len(counties)} counties, population from {pop_src}, {OUT.stat().st_size} bytes")


if __name__ == "__main__":
    main()
