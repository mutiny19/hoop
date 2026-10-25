# Contributing

Thanks for helping Indiana get on the air.

## The quickest way

Open an issue with one of the forms at [New issue](https://github.com/mutiny19/hoop/issues/new/choose):

- **Settings change:** a proposed change to the settings listed here
- **Add a listing:** a repeater you own or host, or a local group
- **Something else:** guides, tools, corrections

## Pull requests

1. Fork, branch, and add your change.
2. Settings live in [`data/settings/`](data/settings/) as JSON. A person approves every settings change.
3. Run `python3 tools/check_links.py` if you added or changed links.

## Principles

- **Link, don't copy.** If an official source explains it (MeshCore docs, the FCC, ARRL, a group's own site), link there. Less for us to maintain, and everyone follows the same standard.
- **Get people talking.** Pages put first contact first: radio, settings, first message, nearby people.
- **Neutral.** Every group and protocol is described in its own terms. Nothing here compares, ranks or criticises another network.
- **Privacy.** Run `python3 tools/check_pii.py` before a push. Never publish personal node locations; the nightly inventory keeps repeaters only. No addresses or individual callsigns in the pages. List repeater sites only with the host's permission.
- **Nothing simulated ships.** Best-guess or simulated data stays out of the live pages until it's real.
