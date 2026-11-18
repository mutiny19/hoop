# HOOP: Hoosier Off-Grid Open Playbook

**A signpost for Indiana off-grid radio. Not an authority.**

Live site: <https://mutiny19.github.io/hoop/>

HOOP gathers the settings people in Indiana use and the nets, maps, and projects around them, and links each one to its source. It covers MeshCore, Meshtastic, GMRS, ham radio, and Reticulum.

- It represents no network, collective, or organization. Indiana people talk on the [Indiana Mesh Discord](https://discord.gg/2uwyceSF37), which does not run or endorse this site.
- It decides nothing. Each radio preset is its maker's own, and the site follows it. For MeshCore that is the US preset, unmodified; the one Indiana convention on top of it is a 2-byte path hash.
- It is not a document repository. Where an official source exists, that source is the authority and the site links to it.
- Work in progress: plays to consider, not rules.

## What's here

| Path | What |
|---|---|
| [`index.html`](index.html) | Home: a card per radio system (a link to the official guide, then the settings used in Indiana), and one statewide map with MeshCore repeaters, National Weather Service alerts, nets with their rough reach, and a ducting estimate |
| [`meshcore/`](meshcore/) | Five steps from a new radio to a first message, each linking to MeshCore's own instructions, plus nearby groups |
| [`meshnet/`](meshnet/) | #meshnet, a MeshCore check-in on the same channel, days, and time everywhere; Indiana's check-in log; how another area can mirror it |
| [`channels/`](channels/) | Every net by day, and a listen-only channel list builder for CHIRP |
| [`live/`](live/) | Where to watch live MeshCore traffic, and how to run an observer |
| [`projects/`](projects/) | Off-grid projects made or used in Indiana, in each project's own words |
| [`gifts/`](gifts/) | Seasonal gift guide: starter kits by budget, one example per kind of gear |
| [`emergency/`](emergency/) | For agencies: how emergency groups use off-grid mesh, with citations. Written October 2026 and not kept current |
| [`advanced/`](advanced/), [`picker/`](picker/) | Hidden (unlinked, noindex): region-tag proposals for repeater owners, kept for when the community wants them |
| [`data/`](data/) | Everything the pages show, as JSON: the repeater inventory, nets, channels, settings, projects, check-in log, and reference data |
| [`tools/`](tools/) | The scripts the scheduled jobs run, and the checks to run before a commit |
| [`assets/`](assets/) | Shared styles, scripts, fonts, and images |

## Where the data comes from

| Data | Source | Refreshed |
|---|---|---|
| MeshCore repeaters | The official MeshCore Map feed (repeaters only; personal nodes are never plotted) | Nightly |
| Weather alerts | National Weather Service | Live, in the visitor's browser |
| Ducting estimate | NOAA model air data by way of Open-Meteo; an estimate worked out on the page, not a report of contacts | Live, in the visitor's browser |
| MeshCore radio preset | MeshCore's own preset list | Live, in the visitor's browser |
| Ham nets statewide | Indiana Ham Radio's open data | Weekly |
| HOOP's own net and channel lists | People who run them, by issue or pull request | By hand |
| #meshnet check-ins | Public CoreScope instances run by neighboring mesh groups; counts and airport codes only, never names or message text | After each net |
| Observers, weather zones, weather radio | CoreScope instances, the National Weather Service, NOAA | Weekly to monthly |
| County outlines and population | Census Bureau | Yearly |

If a scheduled job stops, a weekly check opens an issue, and the map's source strip says when the repeater data is stale.

## Run it locally

It is a static site with no build step. Serve the folder:

```
python3 -m http.server 8000
```

## Publishing

GitHub Pages, published from `main` by [`.github/workflows/pages.yml`](.github/workflows/pages.yml). In the repository's settings, Pages > Source must be "GitHub Actions". The workflow runs on every push and after each scheduled data job.

## Before a commit

```
python3 tools/check_pii.py      # no names, e-mail addresses, or callsigns
python3 tools/check_budget.py   # each page stays inside its word budget
```

## Make your own

[FORKING.md](FORKING.md) is the checklist for another state or group. [CLAUDE.md](CLAUDE.md) is the working guide for an AI session or a new contributor: layout, rules, testing, and publishing.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Corrections, listings, nets, and projects come in through the [issue forms](https://github.com/mutiny19/hoop/issues/new/choose). Anything that is not about the site itself belongs on the Indiana Mesh Discord.

## License

[MIT](LICENSE)
