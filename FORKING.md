# Make your own version

Everything here is MIT-licensed and built to be copied for another state, region, or group.
No build tools: fork, edit text files, turn on GitHub Pages. Budget an afternoon for a
same-structure fork of another US state; the maps are the only part that takes real work.

## 1. Fork and publish

1. Fork the repo (or download it and push to a fresh repo).
2. Settings → Pages → Deploy from branch `main`, folder `/ (root)`.
3. Settings → Actions → General → Workflow permissions → **Read and write**, so the nightly
   inventory can commit.
4. Open the site. Everything works before you change a word, it just says Indiana.

## 2. Rename

Search and replace these strings, in this order. Each one is plain text; nothing is generated.

| Find | Where | Replace with |
|---|---|---|
| `HOOP` and `Hoosier Off-Grid Open Playbook` | header, footer, `<title>`, social tags, About, README | your site name |
| `https://discord.gg/2uwyceSF37` | 22 links across the pages and issue templates | your community's invite (or remove the Join button) |
| `mutiny19/hoop` | GitHub links, issue forms, workflows, README | `yourorg/yourrepo` |
| `Indiana Mesh` | the Discord community the site points people to | your community |
| `assets/social.png`, `assets/favicon.svg` | social image and tab icon | your own |

`grep -rn "Indiana" --include=*.html .` lists the prose that still mentions the state; most of it
is on the home page and start page.

## 3. Swap the data

| What | File | Source it comes from |
|---|---|---|
| Repeater inventory (nightly) | `tools/update_nodes.py` | official MeshCore Map feed; change the bounding box in `in_indiana()` and the map projection constants in `svg_xy()` |
| County outlines + population (yearly) | `tools/update_reference.py` | Census TIGER and ACS; change the state FIPS (`18`) |
| County outlines for the region page | `advanced/counties.js` | generated from the same Census data (name, fips, SVG path, centroid, neighbours) |
| Region tags, metro codes, neighbours, bands | `advanced/regions.js` | your neighbouring groups' published lists; keep the `published` / `convention` distinction honest |
| Weather alerts | `assets/home.js` → `ALERTS_URL` | NWS API; change `area=` to your states |
| Nets | `data/nets.json` | your clubs' schedules; sites carry a lat/lon for the map |
| Suggested settings | `data/settings/*.json` | the protocol's official defaults; link, don't invent |
| Nearby groups | `meshcore/index.html` table and state cells; `advanced/index.html` step 4 | each group's own site |

The home-page map is an SVG with a fixed linear projection (`P(lat, lon)` in `assets/home.js`,
mirrored in `tools/update_nodes.py`). For another state, fit two constants per axis to your
state's bounding box and regenerate the county paths.

## 4. Keep the rules

- **No personal information.** `python3 tools/check_pii.py --names .pii-local` before every push,
  with your own strings in the untracked `.pii-local`. Commit as your organization, not as yourself.
- **Say nothing unkind about any other group or protocol.**
- **Link to the authority; don't become one.** The "For consideration only" notice is there for a reason.
- **Proposals are labelled proposals** until your community decides.

## 5. Working with an AI session

`CLAUDE.md` is written for that: what the files are, the rules, how to test, how to publish.
Point the session at it first. A session can safely regenerate `counties.js` and `regions.js`
for another state from public sources; have it keep the same field names so the pages need no
code changes.
