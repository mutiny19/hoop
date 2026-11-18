# Sources

Every outside page and data feed HOOP points to or reads, in one place. This file is written by
`tools/make_sources.py` from the site itself after each change, so do not edit it by hand.

HOOP is a signpost, not an authority: each of these is the authority for what it covers.

## Data the site reads

Feeds fetched by the scheduled jobs or by a visitor's browser. The README says how often each refreshes.

- <https://api.meshcore.nz/api/v1/config> (read by `assets/home.js`, `meshcore/index.html`)
- <https://api.open-meteo.com/v1/forecast> (read by `assets/home.js`)
- <https://api.weather.gov/zones> (read by `tools/update_zones.py`)
- <https://api.weather.gov/zones/forecast/> (read by `tools/update_zones.py`)
- <https://api.weather.gov/alerts/active> (read by `assets/home.js`)
- <https://corescope.chicagolandmesh.org> (read by `tools/meshnet_log.py`, `tools/update_observers.py`)
- <https://indianahamradio.com/data/nets.json> (read by `tools/update_ham_nets.py`)
- <https://indianahamradio.com/nets/schedule/> (read by `tools/update_ham_nets.py`)
- <https://map.meshcore.io/api/v1/nodes> (read by `tools/update_nodes.py`)
- <https://map.okimesh.org> (read by `tools/meshnet_log.py`, `tools/update_observers.py`)
- <https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/1/query> (read by `tools/update_reference.py`)
- <https://www.weather.gov/source/nwr/JS/CCL.js> (read by `tools/update_nwr.py`)
- <https://www2.census.gov/programs-surveys/popest/datasets/2020-%d/counties/totals/co-est%d-alldata.csv> (read by `tools/update_reference.py`)

## Linked from the pages

### Home

- [APRS live map](https://aprs.fi/#!lat=39.8&lng=-86.2&z=8)
- [ARRL Indiana Section](https://www.arrl.org/sections/view/indiana)
- [ARRL: getting licensed](https://www.arrl.org/getting-licensed)
- [Find an Indiana club](https://www.arrl.org/find-a-club)
- [Discord](https://discord.gg/2uwyceSF37)
- [Add your repeater to the map](https://docs.meshcore.io/faq/#512-q-how-do-i-add-a-node-to-the-meshcore-map)
- [Official docs and FAQ](https://docs.meshcore.io/)
- [Hepburn tropo maps](https://www.dxinfocentre.com/tropo.html)
- [The rules](https://www.ecfr.gov/current/title-47/chapter-I/subchapter-D/part-95/subpart-E)
- [FCC: GMRS and licensing](https://www.fcc.gov/general-mobile-radio-service-gmrs)
- [Web flasher](https://flasher.meshcore.io/)
- <https://forecast.weather.gov/showsigwx.php?warnzone=>
- [Sideband app](https://github.com/markqvist/Sideband)
- [Source](https://github.com/meshtastic)
- [Source](https://github.com/markqvist/Reticulum)
- [Indiana Ham Radio](https://indianahamradio.com/)
- [MeshCore Map](https://map.meshcore.io)
- [Official site and docs](https://meshtastic.org)
- [Repeater directory](https://mygmrs.com)
- <https://open-meteo.com/>
- [Project LongHaul](https://projectlonghaul.com/)
- [Repeater directory](https://www.repeaterbook.com)
- [Official site and manual](https://reticulum.network)
- <https://rflab.io>
- [Discord's guide to adding an event](https://support.discord.com/hc/en-us/articles/4409494125719-Scheduled-Events)
- [VHF propagation map](https://vhf.dxview.org/map?center=39.8,-86.2,6)
- [Live traffic on Waev](https://waev.app/#/live-map/@39.85,-86.30,7.00z)
- <https://www.weather.gov/>

### MeshCore start page

- [web](https://app.meshcore.nz/)
- [iPhone](https://apps.apple.com/nz/app/meshcore/id6742354151)
- [Btown Mesh](https://btownmesh.org)
- [Chicagoland Mesh](https://chicagolandmesh.org)
- [Central Indiana Mesh Network](https://www.cimesh.net)
- [Indiana Mesh Discord](https://discord.gg/2uwyceSF37)
- [advert](https://docs.meshcore.io/faq/#24-q-what-is-an-advert-in-meshcore)
- [CLI](https://docs.meshcore.io/cli_commands/)
- [how to change it](https://docs.meshcore.io/faq/#393-q-how-do-i-change-my-companions-path-hash-size)
- [MeshCore docs](https://docs.meshcore.io/)
- [MeshCore FAQ](https://docs.meshcore.io/faq/)
- [what you need to start](https://docs.meshcore.io/faq/#12-q-what-do-you-need-to-start-using-meshcore)
- [MeshCore flasher](https://flasher.meshcore.io/)
- [MichMesh](https://michmesh.com)
- [NashMesh](https://nashme.sh)
- [NEIMesh](https://neimesh.net)
- [NEO Mesh](https://neome.sh)
- [NWO Mesh](https://nwomesh.com)
- [OKI Mesh](https://okimesh.org)
- [Android](https://play.google.com/store/apps/details?id=com.liamcottle.meshcore.android)
- [TennMesh](https://tennmesh.carrd.co)

### #meshnet

- [Find yours](https://www.airnav.com/airports/us/IN)
- [Chicagoland Mesh's CoreScope](https://corescope.chicagolandmesh.org)
- [Indiana Mesh Discord](https://discord.gg/2uwyceSF37)
- [MeshCore's channel QR format](https://docs.meshcore.io/qr_codes/)
- [OKI Mesh's CoreScope](https://map.okimesh.org)

### Channels and nets

- [ARRL band plan](https://www.arrl.org/band-plan)
- [CHIRP](https://chirpmyradio.com/)
- [Indiana Mesh Discord](https://discord.gg/2uwyceSF37)
- [47 CFR Part 95](https://www.ecfr.gov/current/title-47/chapter-I/subchapter-D/part-95)
- [FRS](https://www.fcc.gov/general/family-radio-service-frs)
- [GMRS](https://www.fcc.gov/general/general-mobile-radio-service-gmrs)
- [MURS](https://www.fcc.gov/general/multi-use-radio-service-murs)
- [Indiana Ham Radio's open data](https://indianahamradio.com/nets/schedule/)
- [RadioReference](https://www.radioreference.com/)
- [RepeaterBook](https://www.repeaterbook.com/)
- [National Weather Service](https://www.weather.gov/nwr/)

### Live

- [LetsMesh](https://analyzer.letsmesh.net/observer/onboard)
- [Open the analyzer](https://analyzer.letsmesh.net)
- [Chicagoland Mesh](https://chicagolandmesh.org/guides/meshcore/mqtt/)
- [Indiana Mesh Discord](https://discord.gg/2uwyceSF37)
- [MeshCore's observer guide](https://docs.meshcore.io/faq/#38-q-how-do-i-make-my-repeater-an-observer-on-the-mesh)
- [Broker settings](https://docs.okimesh.org/books/meshcore-I9o/page/mqtt-broker-settings)
- [Open the Fort Wayne map](https://fwa.meshmapper.net)
- [Become an observer](https://fwamesh.net/join.html)
- [Open the Indianapolis map](https://ind.meshmapper.net)
- [Open the live map](https://map.fwamesh.net)
- [Open the MeshCore Map](https://map.meshcore.io/?lat=39.85&lon=-86.3&zoom=7&nodes=2)
- [Open CoreScope](https://map.okimesh.org)
- [Connect an observer](https://waev.app/#/connect)
- [Open the Waev live map](https://waev.app/#/live-map/@39.85,-86.30,7.00z)

### Projects

- [Indiana Mesh Discord](https://discord.gg/2uwyceSF37)
- [awesome-meshcore list](https://github.com/samuk/awesome-meshcore)

### Gift guide

- [Indiana Mesh Discord](https://discord.gg/2uwyceSF37)

### For agencies

- <https://blog.meshcore.io/2026/04/04/meshcore-map>
- <https://blog.waev.app/blog/cert-mesh-network-activation/>
- <https://blog.waev.app/blog/ham-radio-cert-emcomm-mesh/>
- <https://blog.waev.app/blog/what-we-choose-not-to-know/>
- <https://buymeacoffee.com/ripplebiz/the-year-review>
- <https://citizenportal.ai/articles/10490316/vermont/windham-county/windham/town-upgrades-from-meshtastic-to-meshcore-to-join-regional-802mesh-network>
- [Talk to Indiana Mesh](https://discord.gg/2uwyceSF37)
- <https://docs.fcc.gov/public/attachments/DOC-406055A1.pdf>
- [MeshCore documentation](https://docs.meshcore.io/)
- <https://docs.okimesh.org/books/oki-mesh-alliance/page/500khz-testing>
- <https://emnetwork.substack.com/p/the-mesh-is-already-here>
- <https://files.asprtracie.hhs.gov/documents/state-of-response--collaboration-and-communication-in-the-aftermath-of-hurricane-helene.pdf>
- <https://www.gdc.govt.nz/council/news/media-releases/back-up-comms-crucial-in-emergencies>
- <https://hackaday.com/2025/12/06/lessons-learned-after-trying-meshcore-for-off-grid-text-messaging/>
- <https://hackaday.com/2026/09/17/fcc-ism-rules-may-shatter-lora-mesh-communities/>
- <https://map.meshcore.io>
- <https://nodakmesh.org/blog/meshcore-emergency-preparedness>
- <https://pugetmesh.org/meshcore/>
- <https://technical.ly/workforce/wpamesh-western-pa-off-grid-radio-network/>
- <https://vashonmesh.org/mesh-tech/emcomm/>
- <https://www.wcjb.com/2026/07/11/marion-county-residents-build-off-grid-mesh-network-emergency-messaging/>
- <https://www.wia.org.au/newsevents/news/2026/20260702-1/index.php>
- <https://www.wtxl.com/news/local-news/in-your-neighborhood/monticello/monticello-council-considers-new-emergency-communication-system-proposal>

## Held in the data files

Links the pages draw from data, such as each net's own site and each project.

### MeshCore settings (`data/settings/meshcore.json`)

- <https://api.meshcore.nz/api/v1/config (official MeshCore radio presets, read live by the site)>
- <https://blog.meshcore.io/2026/04/17/default-scope>
- <https://docs.meshcore.io/cli_commands/ (MeshCore region management reference)>
- <https://docs.meshcore.io/cli_commands/#region-management-v110>
- <https://docs.meshcore.io/radio_presets/>
- <https://docs.okimesh.org/books/oki-mesh-alliance/page/oki-mesh-region-scopes>

### Reticulum settings (`data/settings/reticulum.json`)

- <https://markqvist.github.io/Reticulum/manual/hardware.html>

### Nets (`data/nets.json`)

- [Blue River Valley ARC / ARES](https://www.brvars.com/)
- [Indiana Statewide / AUXCOMM](https://www.in.gov/dhs/emergency-management-and-preparedness/eoc-operations/communications-and-dispatch/radio-amateur-civil-emergency-service)
- [IN Section ARES HF Net](https://inarrl.org/index.php/emcomm/indiana-section-ares-hf-net)
- [Indiana Traffic Net](https://inarrl.org/index.php/traffic)
- [Tipton County Net](https://www.k9trc.org/)
- [Marion County ARES](https://www.mcinares.org/)
- [Johnson ARES / Mid-State ARC](https://www.midstatehams.org/)
- [Hamilton Co ARES / CIARA](https://n9eoc.org/)
- [Hancock County](https://www.w9atg.org/)
- [Newsline bulletin](https://www.w9ira.org/)
- [Madison Co ARC](https://www.w9vcf.org/)

### Projects (`data/projects.json`)

- [CHIRP](https://github.com/kk7ds/chirp)
- [CoreScope](https://github.com/Kpa-clawbot/CoreScope)
- [FWA Mesh](https://github.com/Bgilsing/fwamesh)
- [Meshage](https://github.com/slack-space/meshage-community)
- [MeshCore](https://github.com/meshcore-dev/MeshCore)
- [meshcoretomqtt](https://github.com/Cisien/meshcoretomqtt)
- [Meshtastic firmware](https://github.com/meshtastic/firmware)
- [Offband](https://github.com/OffbandMesh/meshcore-firmware)
- [Offband MeshCore](https://github.com/OffbandMesh/meshcore-client)
- [OKI Mesh CoreScope](https://github.com/OKI-Mesh/CoreScope)
- [Porchlight](https://github.com/mutiny19/porchlight-openhop-plugin)
- [BIRDHOUSE.DRZ](https://makerworld.com/en/models/3635220-birdhouse-drz)

### Gift guide (`data/gifts.json`)

- [Alientek T80 soldering iron](https://www.amazon.com/dp/B0D75Y55KS)
- [Soleilwear precision electric screwdriver](https://www.amazon.com/dp/B0FF9VMVQT)
- [Baofeng DM-1701](https://www.baofengradio.com/products/dm-1701)
- [Baofeng MINI-5 (two radios)](https://www.baofengradio.com/products/mini-5-ham)
- [Baofeng UV-5G Plus](https://www.baofengradio.com/products/uv-5g-plus)
- [GMRS](https://www.fcc.gov/wireless/bureau-divisions/mobility-division/general-mobile-radio-service-gmrs)
- [HF Signals sBitx v3](https://www.hfsignals.com/index.php/sbitx-v3/)
- [LilyGO T-Deck Plus](https://lilygo.cc/en-us/collections/lilygo-with-meshcore)
- [muzi works 17 cm whip](https://www.muzi.works/products/whip-antenna-17cm)
- [Radioddity DB20-G](https://www.radioddity.com/products/radioddity-db20g)
- [RTL-SDR Blog V4L with antenna kit](https://www.rtl-sdr.com/buy-rtl-sdr-dvb-t-dongles/)
- [SignalStick](https://signalstuff.com/products/st-sma-f/)
- [Heltec Mesh Node T096](https://store.rokland.com/collections/heltec-products/products/heltec-mesh-node-t096-nrf52840-gps-lora-node-meshtastic-meshcore-and-lorawan)
