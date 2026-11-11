#!/usr/bin/env python3
"""Weekly: Indiana ham nets from Indiana Ham Radio's open data -> data/ham-nets.json, in HOOP's own net format.

Source: https://indianahamradio.com/data/nets.json (their terms for this file: "Ours. Use it freely, and please
tell us when you find one that is wrong."). They compile it from club pages; each entry carries the page it came
from, which becomes the net's link here. HOOP keeps its own list (data/nets.json: central Indiana, GMRS, mesh,
Zello) and this file adds the ham nets that list does not have, so the schedule on channels/#nets is one table.

What is written, per net: day, time (US Eastern, 24 h), name, frequency, tone or access, type, county, link.
Nothing else is kept: no club field, no sponsor, no notes. A callsign in parentheses is dropped from the name.
Nets with no fixed time (SKYWARN activations, continuous links) are counted, not listed.

A net HOOP already lists (same weekday and frequency) is not added again; when the two disagree about the time
or the weeks, the difference is written to "differs" so the page can show it beside HOOP's row.

    python3 tools/update_ham_nets.py              # fetch and write
    python3 tools/update_ham_nets.py --file x.json  # read a saved copy (testing)
"""
import datetime, json, re, sys, urllib.request
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
URL = "https://indianahamradio.com/data/nets.json"
PAGE = "https://indianahamradio.com/nets/schedule/"
UA = "HOOP-ham-nets/1.0 (+https://github.com/mutiny19/hoop)"
DAYS = {"sunday": "Sun", "monday": "Mon", "tuesday": "Tue", "wednesday": "Wed", "thursday": "Thu", "friday": "Fri", "saturday": "Sat"}
CALL = re.compile(r"\b[AKNW][A-Z]?\d[A-Z]{1,3}(?:-[A-Z0-9]+)?\b")
TIME = re.compile(r"(\d{1,2}):(\d{2})\s*([AP]M)", re.I)


def clean(s):
    return re.sub(r"\s+", " ", str(s or "")).strip()


def name_of(raw):
    n = clean(raw)
    n = re.sub(r"\s*\([^()]*\)", lambda m: "" if CALL.search(m.group(0)) else m.group(0), n)   # "(W9XYZ)" goes; "(ITN)" stays
    n = CALL.sub("", n)                                                                    # so does a bare callsign
    return clean(n).strip(" -,")[:70]


def to24(h, m, ap, central):
    h = int(h) % 12 + (12 if ap.upper() == "PM" else 0)
    if central:
        h += 1                                   # Central is one hour behind Eastern, all year
    return "%02d:%s" % (h % 24, m)


def when_of(day, time):
    """-> (weekday or None, 'HH:MM' Eastern or None, extra words such as '1st & 3rd Thursdays' or None)"""
    d = DAYS.get(clean(day).lower())
    t = clean(time)
    m = TIME.search(t)
    if not m:
        return d, None, t or None
    zoned = re.findall(r"(\d{1,2}):(\d{2})\s*([AP]M)\s*(ET|CT)?", t, re.I)
    east = [z for z in zoned if z[3].upper() == "ET"]
    if east:                                      # "7:00 PM CT (8:00 PM ET)": take the Eastern time as written
        hhmm = to24(east[0][0], east[0][1], east[0][2], False)
    else:
        hhmm = to24(zoned[0][0], zoned[0][1], zoned[0][2], zoned[0][3].upper() == "CT")
    extra = None
    q = re.search(r"\(([^()]*)\)", t)
    if q and not TIME.search(q.group(1)):
        extra = clean(q.group(1))
    if "&" in t.split("(")[0] or re.search(r"\d\s*-\s*\d{1,2}:\d{2}", t.split("(")[0]) is None and len(TIME.findall(t.split("(")[0])) > 1:
        extra = clean(t)                          # two sessions a day: keep the words
    return d, hhmm, extra


def freq_of(raw, mode):
    """-> (frequency for the table, tone or access, first frequency in MHz or None)"""
    s = clean(raw)
    nums = re.findall(r"(\d{1,3}\.\d{2,4})\s*(?:MHz|/|and|,|\(|$)", s) or re.findall(r"(\d{1,3}\.\d{2,4})", s.split("(")[0])
    tone = None
    m = re.search(r"(?:PL|CTCSS)\s*([\d.]+)", s, re.I)
    if m:
        tone = "PL %.1f" % float(m.group(1))
    m = re.search(r"(?:DCS|DPL)\s*(\d{2,3})", s, re.I)
    if m and not tone:
        tone = "DCS %s" % m.group(1)
    if not tone and re.search(r"no (?:PL )?tone", s, re.I):
        tone = "No tone"
    if not tone and re.search(r"simplex", s, re.I):
        tone = "Simplex"
    tg = re.search(r"Talkgroup\s*(\d+)", s, re.I)
    ref = re.search(r"Reflector\s*(REF)?\s*0?(\d+)\s*(?:Module\s*)?([A-Za-z])?", s, re.I)
    if tg:
        show = "TG " + tg.group(1)
    elif ref and not nums:
        show = "REF%03d %s" % (int(ref.group(2)), (ref.group(3) or "").upper())
    else:
        seen, keep = set(), []
        for n in nums:
            f = "%.3f" % float(n)
            if f not in seen:
                seen.add(f); keep.append(f)
        show = " / ".join(keep[:3]) or s.split("(")[0][:28]
    first = float(nums[0]) if nums and not tg else None
    md = clean(mode)
    access = tone or (md if md and md != "FM" else "")
    return clean(show), access, first


def type_of(mode, first):
    md = clean(mode).upper()
    if md in ("DMR", "D-STAR", "DIGITAL", "PACKET"):
        return "Digital"
    if first is not None and first < 30:
        return "HF"
    return "Ham"


STOP = {"indiana", "net", "the", "in", "of", "section", "county", "co"}


def same_net(a, b):
    """Two names for one net: the same initials in parentheses, or a shared word that is not filler."""
    pa, pb = re.search(r"\(([A-Z]{2,5})\)", a), re.search(r"\(([A-Z]{2,5})\)", b)
    if pa and pb:
        return pa.group(1) == pb.group(1)
    wa = set(re.findall(r"[a-z]+", a.lower())) - STOP
    wb = set(re.findall(r"[a-z]+", b.lower())) - STOP
    return bool(wa & wb)


def county_centers(names):
    """Middle of each named county (area-weighted, from the Census outlines in data/in-counties.json) -> {county: [lat, lon]}."""
    C = json.loads((DATA / "in-counties.json").read_text())["counties"]
    out = {}
    for name in sorted(names):
        rings = (C.get(name) or {}).get("rings") or []
        if not rings:
            continue
        ring = max(rings, key=len)
        a = cx = cy = 0.0
        for (x0, y0), (x1, y1) in zip(ring, ring[1:]):
            k = x0 * y1 - x1 * y0
            a += k; cx += (x0 + x1) * k; cy += (y0 + y1) * k
        if a:
            out[name] = [round(cy / (3 * a), 3), round(cx / (3 * a), 3)]
    return out


def hoop_index():
    """HOOP's own nets as (weekday or 'daily', first MHz) -> net, so a net is never listed twice."""
    d = json.loads((DATA / "nets.json").read_text())
    idx, texts = {}, {}
    for group in ("weekly", "monthly", "daily"):
        for n in d.get(group, []):
            day = n.get("day") or "daily"
            texts.setdefault(day, []).append(n)
            m = re.match(r"\s*(\d{1,3}\.\d+)", n.get("freq", ""))
            if m:
                idx.setdefault((day, round(float(m.group(1)), 3)), []).append(n)
    return idx, texts


def main():
    if "--file" in sys.argv:
        src = json.loads(Path(sys.argv[sys.argv.index("--file") + 1]).read_text())
    else:
        req = urllib.request.Request(URL, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=40) as r:
            src = json.load(r)
    items = src.get("items") or []
    if len(items) < 50:                           # a broken or empty download must not wipe the list
        print("Too few nets in the source (%d); keeping the file as it is." % len(items)); return 1
    mine, mine_text = hoop_index()
    nets, other, differs, unscheduled = [], [], {}, 0
    def twins_of(it):
        day, hhmm, extra = when_of(it.get("day"), it.get("time"))
        show, access, first = freq_of(it.get("freq"), it.get("mode"))
        dkey = day or "daily"
        if first is not None:
            tw = mine.get((dkey, round(first, 3)), [])
        else:                                     # talkgroups and reflectors: match on the words HOOP shows
            tw = [n for n in mine_text.get(dkey, []) if show and (show in n.get("freq", "") or show in n.get("access", ""))]
        if dkey == "daily":                       # several daily nets share a frequency: the names must agree too
            tw = [t for t in tw if same_net(t.get("name", ""), it.get("name", ""))]
        return tw, hhmm
    exact = set()                                 # HOOP nets that some source net matches to the minute
    for it in items:
        tw, hhmm = twins_of(it)
        for t in tw:
            if hhmm and t.get("time") == hhmm:
                exact.add(id(t))
    for it in items:
        day, hhmm, extra = when_of(it.get("day"), it.get("time"))
        dayword = clean(it.get("day"))
        if not hhmm:                              # no clock time: activations, continuous links, "after the 2 m net"
            unscheduled += 1; continue
        show, access, first = freq_of(it.get("freq"), it.get("mode"))
        link = clean(it.get("sourceUrl"))
        rec = {"time": hhmm, "name": name_of(it.get("name")), "freq": show, "access": access, "type": type_of(it.get("mode"), first)}
        if clean(it.get("county")):
            rec["county"] = clean(it.get("county"))
        elif clean(it.get("scope")).lower() == "statewide":
            rec["county"] = "Statewide"
        if re.match(r"https?://", link):
            rec["link"] = link
        dkey = day or "daily"
        twins, _ = twins_of(it)
        if any(t.get("time") == hhmm for t in twins) or (twins and dkey == "daily"):
            hit = [t for t in twins if t.get("time") == hhmm] or twins
            if dkey == "daily" and not hit[0].get("time"):
                differs[hit[0]["name"]] = clean(it.get("time"))      # HOOP has no time for its daily nets; pass theirs along
            elif extra and not hit[0].get("weeks"):
                differs[hit[0]["name"]] = extra
            continue                              # HOOP already lists it
        if len(twins) == 1 and id(twins[0]) not in exact and same_net(twins[0].get("name", ""), it.get("name", "")):   # same net, different time: keep HOOP's row and say what they list
            differs[twins[0]["name"]] = "%d:%s %s" % ((int(hhmm[:2]) + 11) % 12 + 1, hhmm[3:], "PM" if int(hhmm[:2]) >= 12 else "AM") + ((", " + extra) if extra else "")
            continue
        if day and not extra:
            rec["day"] = day; nets.append(rec)
        else:
            clock = "%d:%s %s" % ((int(hhmm[:2]) + 11) % 12 + 1, hhmm[3:], "PM" if int(hhmm[:2]) >= 12 else "AM")
            if extra and TIME.search(extra):                      # two sessions a day: their words carry the times
                rec["when"] = clean((dayword + ", " if dayword else "") + extra)
            elif extra:                                           # "1st Sunday of the month" already names the day
                rec["when"] = clean(extra[0].upper() + extra[1:] + ", " + clock)
            else:
                rec["when"] = clean((dayword + ", " if dayword else "") + clock)
            other.append(rec)
    order = {d: i for i, d in enumerate(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"])}
    nets.sort(key=lambda n: (order[n["day"]], n["time"], n["name"]))
    other.sort(key=lambda n: n["name"])
    out = {
        "source": "Indiana Ham Radio open data",
        "source_url": PAGE,
        "data_url": URL,
        "terms": "Published for reuse by its maintainers. Corrections to these nets go to them.",
        "source_generated": clean(src.get("_generated")),
        "fetched": datetime.date.today().isoformat(),
        "note": "Times are US Eastern (Central-time nets are converted). Written by tools/update_ham_nets.py; do not edit by hand.",
        "unscheduled": unscheduled,
        "weekly": nets,
        "other": other,
        "differs": differs,
        "centers_note": "The middle of each county, for a rough reach circle on the map when a net's repeater site is not known.",
        "centers": county_centers({n["county"] for n in nets + other if n.get("county") and n["county"] != "Statewide"}
                                  | {v.get("county") for v in json.loads((DATA / "nets.json").read_text()).get("sites", {}).values() if v.get("county")}),
    }
    path = DATA / "ham-nets.json"
    old = json.loads(path.read_text()) if path.exists() else {}
    same = all(old.get(k) == out[k] for k in ("weekly", "other", "differs", "unscheduled", "source_generated", "centers"))
    if same:
        print("No change (%d weekly, %d other)." % (len(nets), len(other))); return 0
    path.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    print("Wrote %d weekly and %d other nets; %d already on HOOP's list differ; %d unscheduled skipped." % (len(nets), len(other), len(differs), unscheduled))
    return 0


if __name__ == "__main__":
    sys.exit(main())
