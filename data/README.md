# HOOP's data

Everything the site shows is in these files, as plain JSON. They are public, MIT-licensed like the rest of the
repository, and served at stable addresses:

```
https://mutiny19.github.io/hoop/data/<file>
```

Use them freely. If you build on one, a link back helps the next person find the source. If a value looks wrong,
[open an issue](https://github.com/mutiny19/hoop/issues/new/choose); for anything marked "from" another source
below, the fix belongs with that source.

**Privacy:** no file here holds a personal name, an individual callsign, an e-mail address, or a personal node's
position. Repeaters are listed because their owners registered them on the public MeshCore Map.

## Written by scheduled jobs

Do not edit these by hand; the next run overwrites them.

| File | What it holds | From | Refreshed |
|---|---|---|---|
| `meshcore-nodes.json` | Repeaters on the map (name, position, last heard, county, date added), and per-county counts with population | The official MeshCore Map feed | Nightly |
| `meshcore-history.json` | One line a day: how many Indiana counties have an active repeater | Derived from the file above | Nightly |
| `observers.json` | Observers per Indiana county, counts only | Public CoreScope instances run by neighboring mesh groups | Weekly |
| `ham-nets.json` | Ham nets statewide, in HOOP's net format, leaving out the ones `nets.json` already has | Indiana Ham Radio's open data | Weekly |
| `nws-zones.json` | Forecast-zone outlines for the map's alert layer | National Weather Service | Weekly |
| `nwr-indiana.json` | NOAA Weather Radio transmitters by Indiana county | NOAA | Monthly |
| `in-counties.json` | County outlines and population | Census Bureau | Yearly |
| `county-airports.json` | The closest public airfield to each county | Derived from the county file and open airport data | When those change |
| `meshnet/log.json` | #meshnet check-ins per net: counts, airport codes, device types, and hop counts. Never names, callsigns, or message text | Public CoreScope instances | After each net |
| `sources.json` | Outside pages the site points to, with a fingerprint of each so a change is noticed | People keep the list; a weekly job writes the fingerprints | Weekly |
| `changelog.json` | The last three changes to the site, for the footer | This repository's own history | After each push |

## Kept by hand

Changes come in by issue or pull request.

| File | What it holds |
|---|---|
| `nets.json` | Nets HOOP lists itself: day, time, frequency, tone, type, the site or county used for the map's reach circle, and the net's own link |
| `channels.json` | Channel groups for the CHIRP list builder: national plans, and Indianapolis-area repeaters |
| `projects.json` | Projects made or used in Indiana. People add the link, category, and Indiana connection; a weekly job refreshes each project's own name, description, licence, and last update |
| `gifts.json` | The seasonal gift guide: items, listings, and prices as checked on the date inside |
| `settings/meshcore.json`, `settings/reticulum.json` | The settings shown on the home page cards. Each protocol's own defaults, with a link to where each comes from |
| `meshnet/regions.json` | Groups that have listed their own #meshnet, by group name only |

## Not here

The home page also reads three feeds live in the visitor's browser and stores nothing: National Weather Service
alerts, the MeshCore radio preset, and NOAA model air data by way of Open-Meteo for the ducting estimate.
[SOURCES.md](../SOURCES.md) lists every feed and every outside page the site points to.
