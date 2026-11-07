#!/usr/bin/env python3
"""Monthly: NOAA Weather Radio transmitters that serve Indiana counties -> data/nwr-indiana.json.

Source: the National Weather Service's public coverage list (weather.gov/source/nwr/JS/CCL.js), one row per county
served. Written as {generated, source, counties: {County: [callsign, ...]}, sites: {callsign: [freq MHz, site name,
site state]}}. Real NWS data only. The /channels/ page uses it for "my county's weather radio".
"""
import json, re, sys, urllib.request
from datetime import datetime, timezone
from pathlib import Path

URL = "https://www.weather.gov/source/nwr/JS/CCL.js"
OUT = Path(__file__).resolve().parent.parent / "data" / "nwr-indiana.json"


def main():
    req = urllib.request.Request(URL, headers={"User-Agent": "HOOP-nwr/1.0 (+https://github.com/mutiny19/hoop)"})
    text = urllib.request.urlopen(req, timeout=60).read().decode("utf-8", "replace")
    rows = {}
    for m in re.finditer(r'^([A-Z]+)\[(\d+)\] = "(.*)";', text, re.M):
        rows.setdefault(int(m.group(2)), {})[m.group(1)] = m.group(3)
    counties, sites = {}, {}
    for r in rows.values():
        if r.get("ST") != "IN" or (r.get("STATUS") or "").upper() not in ("NORMAL", ""):
            continue
        call = r["CALLSIGN"]
        counties.setdefault(r["COUNTY"], [])
        if call not in counties[r["COUNTY"]]:
            counties[r["COUNTY"]].append(call)
        sites[call] = [r["FREQ"], r.get("SITELOC") or r.get("SITENAME") or "", r.get("SITESTATE") or ""]
    if len(counties) < 60 or len(sites) < 10:
        sys.exit(f"only {len(counties)} counties / {len(sites)} sites came back; keeping the existing file")
    out = {"generated": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "source": URL,
           "counties": dict(sorted(counties.items())), "sites": dict(sorted(sites.items()))}
    OUT.write_text(json.dumps(out, separators=(",", ":"), ensure_ascii=False) + "\n")
    print(f"{len(counties)} counties, {len(sites)} transmitters")


if __name__ == "__main__":
    main()
