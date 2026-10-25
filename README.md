# HOOP: Hoosier Off-Grid Open Playbook

*Represents no network, collective, or organization. It exists to soften the onboarding of newcomers and the landing of advanced users, then point them on; Indiana people talk on the [Indiana Mesh](https://discord.gg/2uwyceSF37) Discord. Not a document repository: where an official source exists, that source is the authority and this site links to it. Work in progress; plays to consider, not rules.*

Quick-glance settings for off-grid communications in Indiana (MeshCore, Meshtastic, GMRS, ham radio, Reticulum) and links to each
protocol's official home.

## What's here

| Path | What |
|---|---|
| [`index.html`](index.html) | Home: statewide map (MeshCore repeaters from the nightly inventory, live NWS alerts, net schedule, live Kp), dashboard view, settings people use in Indiana for each protocol, report form (opens a GitHub issue), support |
| [`meshcore/`](meshcore/) | **Get on the Indiana mesh:** first radio to first message, nearby groups, repeater region setup |
| [`advanced/`](advanced/) | **Hidden for now** (unlinked, noindex): Indiana-specific proposals for repeater owners. Three proposed tag structures, open base commands, neighbours' tags, observer brokers. Tables in [`regions.js`](advanced/regions.js), county outlines in [`counties.js`](advanced/counties.js) |
| [`emergency/`](emergency/) | **For agencies:** how emergency management, CERT, ARES/RACES, and disaster groups use off-grid mesh, with cited case studies (APA) |
| [`live/`](live/) | Where to watch live MeshCore traffic: Waev, OKI CoreScope, LetsMesh, MeshMapper, the MeshCore Map |
| [`assets/`](assets/) | Shared styles (`site.css`), pre-paint theme (`theme.js`), nav/theme/copy behaviour (`site.js`), home-page script (`home.js`), map-band background (`chirps.js`); `arcs.js` is unused until a real packet feed exists |
| [`data/meshcore-nodes.json`](data/meshcore-nodes.json) | Repeaters on the map, refreshed nightly by [`tools/update_nodes.py`](tools/update_nodes.py) ([workflow](.github/workflows/nodes.yml)) from the official MeshCore Map feed. Repeaters only; personal nodes are counted, never plotted |
| [`data/in-counties.json`](data/in-counties.json) | Indiana county boundaries and population from the Census Bureau, refreshed yearly ([workflow](.github/workflows/reference.yml)); feeds the coverage view |
| [`data/nets.json`](data/nets.json) | Net schedule that feeds the home page's Nets box (on air now, starting within the hour, next up); [`resources/indy-metro-net-card.pdf`](resources/indy-metro-net-card.pdf) is the printable card it comes from |
| [`data/settings/`](data/settings/) | Settings people use in Indiana, as data; a starting point, not a standard |
| [`tools/check_links.py`](tools/check_links.py) | Weekly link check ([workflow](.github/workflows/links.yml)); opens an issue if an outside link breaks |
| [`tools/check_pii.py`](tools/check_pii.py) | Scans the repo for e-mail addresses, callsigns, and your own strings before a push |
| [`tools/make_counties.py`](tools/make_counties.py) | Regenerates the county outlines for any state from Census TIGERweb |

Data sources: the official MeshCore Map feed (nightly, repeaters only), the Census Bureau (yearly), and, live in the browser, the National Weather Service, NOAA SWPC and MeshCore's radio preset list. Live traffic is a link to Waev. If the nightly job stops, the map's source badge says so.

## Run it locally

It's a static site with no build step. Open `index.html`, or serve the folder:

```
python3 -m http.server 8000
```

## Deploying

GitHub Pages from the repo root, branch `main`.

## Make your own

[FORKING.md](FORKING.md) is the checklist for another state or group; [CLAUDE.md](CLAUDE.md) is the
short guide for an AI session or a new contributor (layout, rules, testing, publishing).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Settings changes, listings and corrections come in through the
[issue forms](https://github.com/mutiny19/hoop/issues/new/choose).

## License

[MIT](LICENSE)
