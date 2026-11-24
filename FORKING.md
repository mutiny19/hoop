# Make your own version

Everything here is MIT-licensed and built to be copied for another state, region, or group.
There are no build tools: fork, edit text files, and turn on GitHub Pages. Budget a weekend for
another US state. Renaming takes an hour; the maps, the local data, and the scheduled jobs are the
real work.

## 1. Fork and publish

1. Fork the repo (or download it and push to a fresh repo).
2. Settings → Pages → Source → **GitHub Actions**. The "Publish site" workflow
   (`.github/workflows/pages.yml`) then publishes on every push and after each scheduled data job.
   Do not choose "Deploy from a branch": commits made by the scheduled jobs would reach the repo
   but never the live site.
3. Settings → Actions → General → Workflow permissions → **Read and write**, so the scheduled jobs
   can commit their data.
4. Open the site. Everything works before you change a word; it just says Indiana.

## 2. Rename

Search and replace these strings. Each one is plain text; nothing is generated.

| Find | Where | Replace with |
|---|---|---|
| `HOOP` and `Hoosier Off-Grid Open Playbook` | header, footer, `<title>`, social tags, About, `manifest.webmanifest`, README | your site name |
| `mutiny19.github.io/hoop` | canonical and social tags on every page, `sitemap.xml`, `robots.txt`, issue templates, `tools/projects.py`, `data/meshnet/regions.json` | your site's address |
| `mutiny19/hoop` | GitHub links, issue forms, workflows, README | `yourorg/yourrepo` |
| `https://discord.gg/2uwyceSF37` | about thirty links across the pages, issue templates, and docs (`grep -rl "discord.gg" .` lists the files) | your community's invite, or remove the link |
| `Indiana Mesh` | the Discord community the site points people to, and the author name this repo's own commits use (see `CLAUDE.md`) | your community |
| `hoop-v` in `sw.js`, and the `ioc-theme` and `hoop-tropo` keys | the offline cache name and two saved settings | any names of your own |
| `assets/mark.svg`, `assets/favicon.svg`, `assets/icon-*.png`, `assets/social.png` | logo, tab icon, app icons, link-preview picture (`node tools/social_image.js` redraws it from the logo; then bump its `?v=` on every page) | your own |

`grep -rn "Indiana" --include=*.html .` lists the prose that still mentions the state. Most of it
is on the home page, the start page, and the #meshnet page.

## 3. Swap the data

Start with the pieces the home page needs, then work down. Anything you do not want, remove its
page and its workflow together.

### The map and its layers

| What | File | What to change |
|---|---|---|
| Map projection | `P(lat, lon)` in `assets/home.js`, mirrored in `svg_xy()` in `tools/update_nodes.py` | two constants per axis, fitted to your area's bounding box; then redraw the state outlines in `index.html` |
| Repeater inventory (nightly) | `tools/update_nodes.py` | the bounding box in `in_indiana()`; the feed is the official MeshCore Map |
| County outlines and population (yearly) | `tools/update_reference.py` | the state FIPS code (`18`); source is the Census Bureau |
| Weather alerts | `ALERTS_URL` in `assets/home.js` | the `area=` list of states |
| Weather zone outlines (weekly) | `tools/update_zones.py` | the same list of states |
| Ducting estimate | `TROPO` in `assets/home.js` | the grid of latitudes and longitudes, and the north, central, and south bands used for the plain-words read |
| Closest airfield per county | `tools/county_airports.py` → `data/county-airports.json` | rerun it after the county and airport files change |

### Lists kept by hand

| What | File | Notes |
|---|---|---|
| Nets | `data/nets.json` | your clubs' schedules; each site carries a latitude, longitude, and county for the reach circle |
| Channels for the CHIRP builder | `data/channels.json` | the national plans carry over; replace the local repeater groups |
| Settings | `data/settings/*.json` | each protocol's own defaults; link, do not invent |
| Projects | `data/projects.json`, `assets/projects/` | start with an empty `projects` list; the issue form and workflow work unchanged |
| Gift guide | `data/gifts.json` | prices go stale; re-check them or drop the page |
| Outside pages the site points to | `data/sources.json` | the weekly source watch reads this list |
| Nearby groups | the table and state cells on `meshcore/index.html` | each group's own site and words |

### Things that are about Indiana only

| What | Where | What to do |
|---|---|---|
| Statewide ham nets | `tools/update_ham_nets.py`, `.github/workflows/hamnets.yml` | this reads Indiana Ham Radio's open data. Point it at an equivalent feed for your area, or delete the script, the workflow, and `data/ham-nets.json` |
| Weather radio stations | `tools/update_nwr.py` | change the state |
| Observer counts | `tools/update_observers.py` → `SOURCES` | the CoreScope instances your observers report to |
| Agencies article | `emergency/index.html` | written for Indiana in October 2026; rewrite it or remove the page |
| Printable guides | `resources/*.pdf` | made by hand for Indiana; replace or remove |
| Region proposals | `advanced/`, `picker/` | hidden pages with Indiana's county outlines and tags; delete them unless your community wants the same thing |

### After you add or remove a data job

- Add or remove its name in the `workflow_run` list in `.github/workflows/pages.yml`, or its data will not publish.
- Add or remove its file in `WATCH` in `tools/check_fresh.py`, or the weekly stale-data check will complain or stay silent.
- Delete `data/meshcore-history.json`; the nightly job starts a new one. `data/changelog.json` is rewritten from your own commits after each push.

## 4. Mirror #meshnet

#meshnet is the same everywhere, and it belongs to no one. Any mesh group, club, collective, or
organization can run it for its own area, announce it under its own name, and add its own spin.

**Keep the same:** the channel (`#meshnet`), the days (Sundays and Thursdays), the time (7:00 to 7:10 PM
US Eastern, for every region), the check-in format (airport code first, then device and months), and the
postponement for severe weather or emergencies. The shared time is the point: every region tests the whole
mesh in the same ten minutes.

**Make it yours:** your page, name, and welcome; your own log, map, and stats; your airport finder and
invite art; where you announce it; extra tools on top.

**Bring improvements back:** if you build something that helps every region, such as a collector fix, a clearer
invite, or a better map, open a pull request or an issue here. **List your region** with the
"List your region's #meshnet" issue form; entries live in `data/meshnet/regions.json` (group names only).

If you also want a log for your area, copy these:

| What | File | Change |
|---|---|---|
| Where messages are read from | `tools/meshnet_log.py` → `SOURCES` | the CoreScope instances your observers report to (any with the `/api/packets` endpoint). They keep only a few days of history, so a missed run cannot be recovered later |
| Airports check-ins are placed at | `tools/meshnet_airports.json` | your states' public-use airports from OurAirports' open data, same fields; leave out codes with digits so nobody is placed on a private strip |
| When it runs | `.github/workflows/meshnet.yml` | nothing, unless you move the time; GitHub starts scheduled runs late, so the script looks back 30 hours |
| The page and map | `meshnet/index.html` | the map outline and projection, the airport-finder link, and the wording about your area |
| Invite image | `assets/meshnet-invite.png` | edit `tools/meshnet_invite.html`, then `node tools/meshnet_invite.js` redraws it |
| The log | `data/meshnet/log.json` | start it empty: `{"nets": []}` |

Do not change `TZ`, `START`, or `MINUTES` at the top of `meshnet_log.py` unless every group moves
together. The script never stores names, callsigns, or message text; keep it that way.

## 5. Keep the rules

- **No personal information.** Run `python3 tools/check_pii.py --names .pii-local` before every push,
  with your own strings in the untracked `.pii-local`. Commit as your organization, not as yourself.
- **Say nothing unkind about any other group or protocol.** Describe each in its own words; never compare or rank.
- **Link to the authority; do not become one.** If an official source explains it, one line and a link.
- **Describe; do not direct or decide.** A preset is its maker's own. Title data for what it is
  ("No repeater heard"), not for what someone should do about it ("Needs a repeater").
- **Nothing simulated ships.** Real data from a named source, or nothing.
- **Keep pages short.** `python3 tools/check_budget.py` holds each page to a word budget; cut or link out
  before you raise one.

## 6. Working with an AI session

`CLAUDE.md` is written for that: what the files are, the rules, how to test, and how to publish.
Point the session at it first, and update it as you change the site, so it stays true for your copy.

After changing any script or stylesheet, bump its `?v=` on the pages that load it and the cache
name in `sw.js` in the same commit. Returning visitors are served saved copies, and a new page next
to an old saved script breaks.
