# Working on this repo

Read this first if you are an AI session or a new contributor. It is the short version of how the
site is built and the rules that are not negotiable.

## What it is

A static GitHub Pages site (no build step, no framework) for off-grid communications in Indiana.
It is a pivot point, not a document repository and not an authority (where an official source exists, that source is the authority), and it represents no network, collective, or organization: it
exists to soften the onboarding of newcomers and the landing of advanced users, links to each protocol's
official docs and to each group's own pages, and only publishes Indiana-specific suggestions as proposals.

## Rules

1. **No personal information, anywhere.** No personal names, GitHub user names, e-mail addresses,
   individual callsigns, home locations, or personal node positions in pages, data, commit
   messages, commit authors, workflows, or issue templates. The one exception is a link to a public
   repository on `projects/`: its URL contains the owner's name, but the page shows only the project's name. Commits are authored
   `Indiana Mesh <mutiny19@users.noreply.github.com>`. Run `python3 tools/check_pii.py` before
   every push; keep your own strings in an untracked `.pii-local` and pass `--names .pii-local`.
2. **Nothing unkind about any other network or group.** Describe each in its own words, link to
   its own site, never compare or rank.
3. **Link, don't copy.** If an official source explains it, link there, and keep our own words to a line
   or so. Every paraphrase of someone else's docs is something to maintain when they change.
4. **Proposals stay proposals.** Region-tag structures on `advanced/` are "for consideration";
   the page says so and must keep saying so until the community decides.
5. **Nothing simulated ships.** Real data from the named sources or nothing.

## Layout

| Path | What |
|---|---|
| `index.html` + `assets/home.js` | Home: map band (repeaters, NWS alerts, nets, Kp), dashboard, settings accordion, report form |
| `meshcore/index.html` | Start page: first radio to first message, nearby groups table. Keep it simple and close to the official docs |
| `advanced/index.html` | **Hidden for now**: unlinked from every page and marked noindex, kept in the repo. Three proposed region structures, open base commands, neighbors' tags, observer brokers. Do not link to it from the main pages until the community wants it back |
| `picker/index.html` | **Hidden**: unlinked from every page, noindex, disallowed in robots.txt, not in the sitemap. A single self-contained page: pick counties, cultural regions, or neighboring states and get the repeater region CLI for the cultural region + county proposal. Carries its own copy of the county outlines and region tables; it does not load `advanced/*.js`. A proposal, and says so |
| `advanced/regions.js` | **Every table the region page draws from**: metro codes, regions, districts, neighbors, bands |
| `advanced/counties.js` | County outlines for the maps (generated from Census data) |
| `advanced/builder.js` | County & district builder logic |
| `advanced/modes.js` | Simplest and Abbreviated modes, mode switch |
| `emergency/index.html` | Agencies article (APA citations) |
| `live/index.html` | Where to watch live traffic |
| `projects/index.html` + `data/projects.json` | Off-grid projects made or used in Indiana (GitHub repos and Printables models). Submitted through the "Add a project" issue form; `tools/projects.py intake` checks it and `projects.yml` opens a pull request for a maintainer to merge; `tools/projects.py refresh` updates each project's own name, description, license, and last update weekly and drops ones gone two weeks running. Shows the project's own words only, never a user name; sorted by name, never ranked. An optional `title` overrides an unhelpful repo name |
| `channels/index.html` | Channel lists for CHIRP: a form (bands the radio can tune, name length, capacity, groups, county) that builds a **listen-only** CHIRP CSV in the browser from the FCC channel plans (constants in the page), `data/nwr-indiana.json` (NWS weather radio by county; `tools/update_nwr.py` via `nwr.yml`, monthly) and the VHF/UHF voice nets and Skywarn in `data/nets.json`. Information only: the page links RadioReference, RepeaterBook, FCC, and ARRL as the authorities and does not police what anyone transmits. The CSV follows CHIRP's own `CSV_FORMAT` and import rules (duplex must be blank, tones and DTCS codes must be on CHIRP's lists, mode from its list); if CHIRP's format changes, update the page's `HEAD`, `TONES`, and `DCS`. Operators change or remove listings by issue (`channel-listing.yml`) or by editing `data/nets.json` |
| `meshnet/index.html` | #meshnet check-in net: what it's for, how to check in, and the map/list of each net's check-ins from `data/meshnet/log.json` |
| `assets/site.css`, `theme.js`, `site.js` | Shared styles, pre-paint theme, nav/theme/copy behaviour, the "Next #meshnet" bar (`HOOP.net` is the one place the net clock is written for the pages' scripts), offline bar, and the footer "What's new" line. `site.css` starts with the `@font-face` rules for the self-hosted fonts in `assets/fonts/` (Archivo variable, IBM Plex Mono 400 and 500, latin subset, OFL); pages preload `archivo.woff2` and make no Google Fonts requests |
| `assets/chirps.js` | Decoration behind the map band's headline only (fades out via CSS mask before the map grid): a soft SDR waterfall and a node constellation. Decoration only; never drawn on the map itself |
| `assets/arcs.js` | Not loaded. Packet-hop drawing kept for a real feed later (`HOOP.arcs.setSource(fn)`). The map shows no invented traffic; do not add the script tag until the source is real |
| `sw.js`, `manifest.webmanifest` | Offline support: the service worker (root scope) shows saved copies of pages and assets at once and refreshes them, and keeps the last copy of `data/*.json` for when there is no signal; bump `CACHE` in `sw.js` when its list changes. `assets/site.js` registers it and shows the "offline, saved copy" bar |
| `data/` | Nightly repeater inventory, yearly county reference, nets, settings JSON, `meshcore-history.json` (one line a day: counties with an active repeater, for the progress bar's month-over-month change), `observers.json` (observers by county, counts only; weekly via `tools/update_observers.py` and `observers.yml`), `county-airports.json` (closest public airfield code per county for the "Your county" card; run `tools/county_airports.py` when the airport or county files change), `changelog.json` (footer "What's new"; `changelog.yml` rewrites it after each push), and `nws-zones.json` (NWS forecast-zone outlines for the map's alert layer, written weekly by `tools/update_zones.py` via `zones.yml`; the home page joins live alerts to it, so a visit makes one weather request, not one per zone) |
| `tools/` | The scripts the workflows run, plus `check_pii.py` and `check_links.py` |
| `tools/meshnet_log.py` | #meshnet collector: reads only 6:57-7:13 PM US Eastern on Sun/Thu from every CoreScope listed in `SOURCES` (OKI's and Chicagoland's; LetsMesh and Waev have no public API) and merges them, decrypts the public `#meshnet` hashtag channel, keeps one check-in per radio (sender plus device, so one person can test several; a bare code from someone who also named a device is folded in). **Never writes names, callsigns, observer names or message text**; names are used in memory only to count each person once. Airports from `tools/meshnet_airports.json` (OurAirports, public-use three-letter codes only, so nobody is placed on a private strip) |
| `.github/workflows/` | nightly `nodes.yml`, weekly `zones.yml` and `observers.yml`, monthly `nwr.yml`, `changelog.yml` (after each push), yearly `reference.yml`, weekly `links.yml`, weekly `projects.yml` (plus intake on each "Add a project" issue), net-night `meshnet.yml` (scheduled after each #meshnet window; GitHub often starts it hours late, so the script looks back 30 hours; only logs that window. For a faster log, run it by hand from the Actions tab: tick `so_far` during the net for a mid-net snapshot, or leave it unticked after 7:21 PM for the final read) |

Each page keeps its own CSS inline in a `<style>` block; shared rules live in `assets/site.css`.
Scripts are classic (non-module) and share globals in load order, so `regions.js` must load
before `builder.js` and `modes.js`.

## Changing things

- The main pages (home, start page) stay simple: a few official links per protocol, no regional conventions.
  Anything Indiana-specific or undecided for repeater owners goes on `advanced/`, which is currently hidden (unlinked).


- Site name, Discord invite, repo URL: they appear in the header and footer of every page.
  `grep -rl "discord.gg" --include=*.html .` finds them all; `FORKING.md` has the checklist.
- Region tags, metros, groups' tags: edit `advanced/regions.js` only.
- Nearby groups: the table on `meshcore/index.html`, the state cells below it, and step 4 of the
  Abbreviated mode on `advanced/index.html`.
- Say each thing once on the site, and link to that place from anywhere else: settings in the protocol cards
  on the home page, observer setup in the Live page's "Help fill the live views" (`live/#obs-h`), #meshnet details on
  `meshnet/`. It is a small site; a second description is just a second thing to keep in sync.
- Nets: `data/nets.json`. Suggested settings: `data/settings/*.json`.
- #meshnet times live in several places: `data/nets.json` (the schedule shown on the map) and the constants at the top of `tools/meshnet_log.py` plus the crons in `meshnet.yml`, plus the time-zone script at the bottom of `meshnet/index.html` (`at7`), plus the share images `assets/meshnet-invite*.png` and the text invite in the page's "Share the invite" section. Change them together.
- After changing `assets/home.js`, `assets/chirps.js`, `assets/theme.js`, or `assets/site.js`, bump the `?v=` on their script tags on every page that loads them; GitHub Pages and browsers cache them hard.

## Testing

```
python3 -m http.server 8000
```
Open each page, switch the theme, use the phone width. For a scripted check, load each page in
a headless browser and assert no page errors and no 404s for local assets; `advanced/` should
produce `region def us|* us-in|* ind` after clicking `ind` in Simplest mode.

## Publishing

GitHub Pages serves `main` from the repo root. Push only from a clone whose history is clean of
personal information. Never force-push over the nightly workflow's commits; `git pull --rebase`
first.
