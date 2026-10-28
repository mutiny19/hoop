#!/usr/bin/env python3
"""Log #meshnet check-ins from the MeshCore #meshnet hashtag channel.

#meshnet runs Sundays and Thursdays at 7:00 PM Indiana time for ten minutes. This script reads only that
window plus a 3-minute buffer each side (6:57:00 through 7:12:59) from CoreScope instances that store packets uploaded by community
observers (OKI Mesh's map.okimesh.org by default; more can be listed in SOURCES), decrypts the public #meshnet channel itself, and keeps
one check-in per sender.

What is written to data/meshnet/log.json: time, airport code (and that airport's public location), device
model, months on the mesh, hop count and how many observers heard it. What is never written: sender
names, callsigns, observer names, chatter text. Names are used in memory only, to count each person once.

Hashtag channels are public by construction: the key is the first 16 bytes of SHA-256 of the channel name,
which is what every MeshCore app does when you join #meshnet.

  python3 tools/meshnet_log.py                 # log the net that ended most recently, if any (the workflow)
  python3 tools/meshnet_log.py --date 2026-10-25   # log one net by date, while the source still holds it
"""
import argparse, hashlib, hmac, json, os, re, struct, sys, urllib.request
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

try:
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
except ImportError:  # pragma: no cover
    sys.exit("needs the 'cryptography' package: pip install cryptography")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "meshnet", "log.json")
AIRPORTS = os.path.join(ROOT, "tools", "meshnet_airports.json")
# Any CoreScope instance (same /api/packets) can be listed; check-ins are merged, one per sender across all of them.
# OKI Mesh (Ohio, Kentucky, Indiana) and Chicagoland Mesh (reaches Northwest Indiana) run open ones.
# LetsMesh and Waev publish no public API, so they are not read.
SOURCES = ["https://map.okimesh.org", "https://corescope.chicagolandmesh.org"]
CHANNEL = "#meshnet"
TZ = ZoneInfo("America/Indiana/Indianapolis")
NET_DAYS = {6: "Sun", 3: "Thu"}          # Python weekday numbers
START, MINUTES = (18, 57), 16            # 6:57:00 up to, not including, 7:13:00: the 7:00-7:10 net plus 3 minutes each side
LOOKBACK_HOURS = 6                       # the scheduled run only logs a net that ended in the last 6 hours
UA = "HOOP-meshnet-log/1.0 (+https://github.com/mutiny19/hoop)"


# ---------- MeshCore group text ----------
KEY = hashlib.sha256(CHANNEL.encode()).digest()[:16]
CHAN_BYTE = hashlib.sha256(KEY).digest()[0]


def payload(raw_hex):
    b = bytes.fromhex(raw_hex)
    route, ptype, i = b[0] & 0x03, (b[0] >> 2) & 0x0F, 1
    if route in (0, 3):                  # transport routes carry 4 bytes of transport codes first
        i += 4
    plen = b[i]; i += 1
    size, hops = (plen >> 6) + 1, plen & 0x3F
    return ptype, hops, b[i + size * hops:]


def decrypt(raw_hex):
    """Return (sender, text, hops) for a #meshnet packet, else None. MAC-checked, so other channels never pass."""
    try:
        ptype, hops, p = payload(raw_hex)
    except (ValueError, IndexError):
        return None
    if ptype != 5 or len(p) < 19 or p[0] != CHAN_BYTE:
        return None
    mac, ct = p[1:3], p[3:]
    if len(ct) % 16 or hmac.new(KEY + bytes(16), ct, hashlib.sha256).digest()[:2] != mac:
        return None
    d = Cipher(algorithms.AES(KEY), modes.ECB()).decryptor()
    pt = d.update(ct) + d.finalize()
    body = pt[5:].split(b"\0", 1)[0].decode("utf-8", "replace")
    sender, sep, text = body.partition(": ")
    if not sep:
        return None
    return sender.strip(), text.strip(), hops


# ---------- check-in format: airport, device model, time on the mesh ----------
DUR = re.compile(r"^(?:about\s+|~\s*)?(\d+(?:\.\d+)?)\s*(months?|mos?|m|years?|yrs?|yr|y|weeks?|wks?|wk|w|days?|d)\.?$", re.I)
UNIT = {"m": 1, "y": 12, "w": 12 / 52, "d": 12 / 365}


def parse_checkin(text):
    """'KUMP, Wio L1 E-ink, 2 months' or 'IND · Heltec V3 · 4 mo' -> (code, device, months), else None."""
    parts = [x.strip(" .") for x in re.split(r"\s*[,·|;/]\s*", text.strip()) if x.strip(" .")]
    if len(parts) < 3 or not re.fullmatch(r"[A-Za-z]{3,4}", parts[0]):
        return None
    last = parts[-1].strip()
    if re.fullmatch(r"(?:brand\s+)?new|first\s+(?:net|time|day)", last, re.I):
        months = 0.0
    else:
        m = DUR.match(last)
        if not m:
            return None
        months = round(float(m.group(1)) * UNIT[m.group(2)[0].lower()], 1)
    device = " ".join(parts[1:-1]).strip()
    if not device or len(device) > 40 or "@[" in device:
        return None
    return parts[0].upper(), device, months


def place(code, airports):
    lid = code[1:] if len(code) == 4 and code[0] == "K" else code
    a = airports.get(lid) if len(lid) == 3 else None
    return lid, a


# ---------- source ----------
def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def iso(dt):
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def window_for(day):
    start = datetime(day.year, day.month, day.day, *START, tzinfo=TZ)
    return start, start + timedelta(minutes=MINUTES)


def latest_window(now):
    for back in range(0, 4):
        day = (now - timedelta(days=back)).date()
        if day.weekday() in NET_DAYS:
            start, end = window_for(day)
            if end <= now:
                return (start, end) if now - end <= timedelta(hours=LOOKBACK_HOURS) else None
    return None


def collect(source, start, end, airports):
    oldest = get(f"{source}/api/packets?type=5&limit=1&order=asc&sort=timestamp")["packets"]
    if not oldest or oldest[0]["timestamp"] > iso(start):
        raise LookupError(f"{source} no longer holds packets from {iso(start)}")
    rows, off = [], 0
    while True:
        d = get(f"{source}/api/packets?type=5&groupByHash=true&limit=500&offset={off}&since={iso(start)}&until={iso(end)}")
        rows += d["packets"]
        off += len(d["packets"])
        if not d["packets"] or off >= d.get("total", 0):
            break
    first, messages = {}, 0
    for p in sorted(rows, key=lambda r: r.get("first_seen") or r["timestamp"]):
        seen = datetime.strptime(p.get("first_seen") or p["timestamp"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        if not (start <= seen < end):
            continue
        r = decrypt(p.get("raw_hex") or "")
        if not r:
            continue
        sender, text, hops = r
        messages += 1
        c = parse_checkin(text)
        if not c or sender in first:
            continue
        code, device, months = c
        lid, a = place(code, airports)
        first[sender] = {
            "time": seen.astimezone(TZ).strftime("%H:%M"),
            "code": (a.get("icao") or lid) if a else code,      # shown as people type it, e.g. KUMP
            **({"place": a["name"], "city": a["city"], "state": a["state"], "lat": a["lat"], "lon": a["lon"]} if a else {}),
            "device": device,
            "months": months,
            "hops": hops,
            "observers": p.get("observer_count") or 1,
            "regions": sorted(set(p.get("distinct_iatas") or ([p["observer_iata"]] if p.get("observer_iata") else []))),
        }
    return first, messages


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", help="net date in Indiana, YYYY-MM-DD (a Sunday or Thursday)")
    ap.add_argument("--force", action="store_true", help="replace a logged net even if the new read has fewer check-ins")
    ap.add_argument("--source", action="append", help="CoreScope base URL; repeat for several (default: %s)" % ", ".join(SOURCES))
    a = ap.parse_args()
    if a.date:
        day = datetime.strptime(a.date, "%Y-%m-%d").date()
        if day.weekday() not in NET_DAYS:
            sys.exit(f"{a.date} is not a Sunday or Thursday")
        start, end = window_for(day)
        if end > datetime.now(TZ):
            sys.exit("that net has not finished yet")
    else:
        w = latest_window(datetime.now(TZ))
        if not w:
            print("No #meshnet window ended in the last few hours; nothing to log.")
            return
        start, end = w
    airports = json.load(open(AIRPORTS, encoding="utf-8"))["airports"]
    sources = [u.rstrip("/") for u in (a.source or SOURCES)]
    merged, messages, used = {}, 0, []
    for src in sources:
        try:
            got, n = collect(src, start, end, airports)
        except (LookupError, OSError, ValueError) as e:
            print(f"skipping {src}: {e}")
            continue
        used.append(src); messages = max(messages, n)
        for sender, c in got.items():
            m = merged.get(sender)
            if not m or c["time"] < m["time"]:
                if m:
                    c["observers"] = max(c["observers"], m["observers"]); c["regions"] = sorted(set(c["regions"]) | set(m["regions"]))
                merged[sender] = c
            else:
                m["observers"] = max(m["observers"], c["observers"]); m["regions"] = sorted(set(m["regions"]) | set(c["regions"]))
    if not used:
        sys.exit("no source could provide that window; not writing a partial log")
    checkins = sorted(merged.values(), key=lambda c: c["time"])

    log = {"nets": []}
    if os.path.exists(OUT):
        log = json.load(open(OUT, encoding="utf-8"))
    entry = {
        "date": start.date().isoformat(),
        "day": NET_DAYS[start.weekday()],
        "start": start.isoformat(),
        "end": (end - timedelta(seconds=1)).isoformat(),
        "logged": iso(datetime.now(timezone.utc)),
        "messages": messages,
        "checkins": checkins,
    }
    old = next((n for n in log.get("nets", []) if n["date"] == entry["date"]), None)
    if old and {k: v for k, v in old.items() if k != "logged"} == {k: v for k, v in entry.items() if k != "logged"}:
        print(f"#meshnet {entry['date']}: unchanged ({len(checkins)} check-ins)")
        return
    if old and len(entry["checkins"]) < len(old["checkins"]) and not a.force:
        # A source can drop old packets; a late re-read must not shrink a good log.
        print(f"#meshnet {entry['date']}: keeping the logged {len(old['checkins'])} check-ins; this read found only {len(entry['checkins'])} (use --force to replace)")
        return
    nets = [n for n in log.get("nets", []) if n["date"] != entry["date"]] + [entry]
    log = {
        "channel": CHANNEL,
        "sources": used,
        "about": "One check-in per sender heard by community observers between 6:57 and 7:13 PM Indiana time on net nights. "
                 "No names, callsigns or message text are stored.",
        "nets": sorted(nets, key=lambda n: n["date"], reverse=True),
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(log, f, indent=1, ensure_ascii=False)
        f.write("\n")
    print(f"#meshnet {entry['date']}: {len(checkins)} check-ins from {messages} channel messages")


if __name__ == "__main__":
    main()
