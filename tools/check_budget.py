#!/usr/bin/env python3
"""Word budgets: keep each page a signpost.

Counts the words a visitor sees when a page first loads, from the static HTML:
text inside a closed <details> (other than its <summary>), inside [hidden], and
inside <script>/<style>/<template>/<pre> is not counted. Text that scripts add
later (tables, cards, lists) is not counted either, so budgets are for prose.

A page over its budget fails. Fix it by cutting, folding, or linking to the
source that maintains the detail; raise a budget only on purpose, in this file.

    python3 tools/check_budget.py          # check every page
    python3 tools/check_budget.py --list   # print the counts
"""
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# page -> most words visible on load. None = exempt, with the reason.
BUDGETS = {
    "index.html": 500,
    "meshcore/index.html": 900,
    "meshnet/index.html": 750,
    "live/index.html": 460,
    "channels/index.html": 650,
    "projects/index.html": 430,
    "emergency/index.html": None,   # a long-form article, on purpose
    "advanced/index.html": None,    # hidden: unlinked and noindex
    "picker/index.html": None,      # hidden: unlinked and noindex
}
SKIP = {"script", "style", "template", "pre", "svg", "select"}
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}


class Counter(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []      # (tag, hides_children)
        self.words = 0

    def hidden(self):
        return any(h for _, h in self.stack)

    def handle_starttag(self, tag, attrs):
        if tag in VOID:
            return
        a = dict(attrs)
        hide = tag in SKIP or "hidden" in a
        if tag == "details" and "open" not in a:
            hide = "details"                      # children hidden, except the summary
        if tag == "summary" and self.stack and self.stack[-1][1] == "details":
            self.stack[-1] = (self.stack[-1][0], "details-summary")
        self.stack.append((tag, hide))

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break
        if tag == "summary" and self.stack and self.stack[-1][1] == "details-summary":
            self.stack[-1] = (self.stack[-1][0], "details")

    def handle_data(self, data):
        # a closed <details> shows its <summary> only
        for _, h in self.stack:
            if h is True or h == "details":
                return
        self.words += len(data.split())


def count(path):
    c = Counter()
    c.feed(path.read_text(encoding="utf-8"))
    return c.words


def main():
    listing = "--list" in sys.argv
    pages = sorted(str(p.relative_to(ROOT)) for p in list(ROOT.glob("index.html")) + list(ROOT.glob("*/index.html")))
    bad = 0
    for page in pages:
        n = count(ROOT / page)
        if page not in BUDGETS:
            print(f"NO BUDGET  {page}: {n} words. Add it to BUDGETS in tools/check_budget.py.")
            bad += 1
            continue
        b = BUDGETS[page]
        if b is None:
            if listing:
                print(f"exempt     {page}: {n}")
        elif n > b:
            print(f"OVER       {page}: {n} words, budget {b}")
            bad += 1
        elif listing:
            print(f"ok         {page}: {n} of {b}")
    print(f"{bad} page(s) over budget" if bad else "0 page(s) over budget")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
