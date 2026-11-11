#!/usr/bin/env python3
"""Projects catalogue (data/projects.json).

  python3 tools/projects.py intake    # run by .github/workflows/projects.yml when an "Add a project" issue is opened or edited
  python3 tools/projects.py refresh   # weekly: refresh each project's name, description, license, and last update

Intake reads the issue from $GITHUB_EVENT_PATH, never from the command line or the shell, because the issue text is
written by anyone. It checks the link, adds the entry to data/projects.json, and writes two files for the workflow:
  .projects-result.json  {"ok": bool, "title": str}
  .projects-comment.md   the reply posted on the issue
The workflow turns an accepted entry into a pull request; a maintainer merges it. Nothing is listed without that merge.

Only the project's own words are shown (its GitHub description), and only the repo name, never the owner's user name.
An optional "title" in an entry overrides the repo name on the page (e.g. "Meshtastic firmware" for meshtastic/firmware);
maintainers set it by hand and the weekly refresh never touches it.
"""
import json, os, re, sys, urllib.request, urllib.error
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data", "projects.json")
UA = "HOOP-projects/1.0 (+https://github.com/mutiny19/hoop)"
GH = re.compile(r"https?://(?:www\.)?github\.com/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))/([A-Za-z0-9._-]{1,100}?)(?:\.git)?/?$")
PR = re.compile(r"https?://(?:www\.)?printables\.com/(?:[a-z]{2}/)?model/(\d+)(?:-[A-Za-z0-9-]*)?/?(?:[?#].*)?$")
INDIANA = {"Made in Indiana": "made", "Used in Indiana": "used"}
TOPIC = re.compile(r"mesh|meshcore|meshtastic|lora|reticulum|ham|amateur|gmrs|frs|radio|aprs|sdr|rf\b|antenna|"
                   r"repeater|off-?grid|emergency|ares|races|packet|winlink|js8|ft8|chirp|baofeng|heltec|rak|t-?deck", re.I)


def load():
    with open(DATA) as f:
        return json.load(f)


def save(d):
    d["projects"].sort(key=lambda p: (d["categories"].index(p["category"]) if p["category"] in d["categories"] else 99,
                                      (p.get("title") or p.get("name") or p["url"]).lower()))
    with open(DATA, "w") as f:
        json.dump(d, f, indent=1, ensure_ascii=False)
        f.write("\n")


def get(url, token=True):
    h = {"User-Agent": UA, "Accept": "application/vnd.github+json"}
    if token and os.environ.get("GITHUB_TOKEN") and "api.github.com" in url:
        h["Authorization"] = "Bearer " + os.environ["GITHUB_TOKEN"]
    req = urllib.request.Request(url, headers=h)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status, r.read()


def key(url):
    m = GH.match(url.strip())
    if m:
        return "gh:" + (m.group(1) + "/" + m.group(2)).lower()
    m = PR.match(url.strip())
    return ("pr:" + m.group(1)) if m else url.strip().lower().rstrip("/")


def clip(text, n):
    """Shorten at a word boundary, never mid-word, and mark the cut."""
    if len(text) <= n:
        return text
    cut = text[:n].rsplit(" ", 1)[0].rstrip(" ,;:-")
    return cut + "…"


def github_meta(owner, repo):
    """(fields, problem). problem is None, 'missing', or a short reason."""
    try:
        _, body = get(f"https://api.github.com/repos/{owner}/{repo}")
    except urllib.error.HTTPError as e:
        return None, ("missing" if e.code == 404 else f"GitHub answered {e.code}")
    except Exception as e:
        return None, f"could not reach GitHub ({type(e).__name__})"
    r = json.loads(body)
    if r.get("private"):
        return None, "missing"
    lic = (r.get("license") or {}).get("spdx_id")
    return {
        "url": r["html_url"],
        "name": r["name"],
        "description": clip((r.get("description") or "").strip(), 240),
        "license": None if lic in (None, "NOASSERTION") else lic,
        "updated": (r.get("pushed_at") or "")[:10],
        "archived": bool(r.get("archived")),
        "_topics": " ".join(r.get("topics") or []),
        "_fork": bool(r.get("fork")),
    }, None


def site_alive(url):
    """True, False (the page is gone: 404 or 410), or None (could not tell; many sites refuse automated requests)."""
    try:
        status, _ = get(url, token=False)
        return status < 400
    except urllib.error.HTTPError as e:
        return False if e.code in (404, 410) else None
    except Exception:
        return None


def printables_alive(url):
    """True, False (gone), or None (could not tell: Printables may refuse automated requests)."""
    try:
        status, _ = get(url, token=False)
        return status < 400
    except urllib.error.HTTPError as e:
        return False if e.code in (404, 410) else None
    except Exception:
        return None


# ---------- intake ----------

def form(body):
    """Issue-form answers: '### Label\n\nvalue' blocks."""
    out = {}
    for m in re.finditer(r"^###\s+(.+?)\s*\n(.*?)(?=^###\s|\Z)", body or "", re.S | re.M):
        v = m.group(2).strip()
        out[m.group(1).strip().lower()] = "" if v == "_No response_" else v
    return out


def intake():
    ev = json.load(open(os.environ["GITHUB_EVENT_PATH"]))
    issue = ev["issue"]
    f = form(issue.get("body"))
    d = load()
    link = (f.get("link") or "").split()[0] if f.get("link") else ""
    cat = f.get("category", "")
    ind = INDIANA.get(f.get("indiana connection", ""))
    title = re.sub(r"\s+", " ", f.get("name to show") or f.get("title (printables only)", ""))[:60].strip()
    problems, notes, entry = [], [], None

    if cat not in d["categories"]:
        problems.append("Pick a category from the list.")
    if not ind:
        problems.append("Pick whether the project is made in Indiana or used in Indiana.")
    gh, pr = GH.match(link), PR.match(link)
    if not (gh or pr):
        problems.append("The link has to be a GitHub repository (https://github.com/owner/project) "
                        "or a Printables model page (https://www.printables.com/model/...).")
    elif any(key(p["url"]) == key(link) for p in d["projects"]):
        problems.append("This project is already listed.")
    elif gh:
        meta, why = github_meta(gh.group(1), gh.group(2))
        if why == "missing":
            problems.append("That repository doesn't exist or isn't public.")
        elif why:
            problems.append(f"Couldn't check the repository: {why}. Edit the issue to try again.")
        elif meta["archived"]:
            problems.append("That repository is archived, so it isn't maintained any more.")
        else:
            if not meta["description"]:
                notes.append("The repository has no description on GitHub, so the card will show the name only. "
                             "Adding one in the repo's About box fixes that, and the site picks it up weekly.")
            if not meta["license"]:
                notes.append("No license was found. Others can't legally reuse code without one.")
            if meta["_fork"]:
                notes.append("This is a fork. Reviewer: check it's the copy people should use.")
            if not TOPIC.search(" ".join([meta["name"], meta["description"], meta["_topics"]])):
                notes.append("Reviewer: nothing in the name, description, or topics says off-grid communications.")
            entry = {k: v for k, v in meta.items() if not k.startswith("_")}
            if title and title.lower() != meta["name"].lower():
                entry["title"] = title
    else:
        if not title:
            problems.append("Printables links need a name to show (the model's name as Printables shows it).")
        else:
            alive = printables_alive(link)
            if alive is False:
                problems.append("That Printables page doesn't exist.")
            else:
                if alive is None:
                    notes.append("Reviewer: Printables didn't answer an automated check; open the link before merging.")
                entry = {"url": link.split("?")[0].split("#")[0], "name": title, "description": "", "license": None,
                         "updated": "", "archived": False}
    if entry:
        entry.update({"category": cat, "indiana": ind, "added": datetime.now(timezone.utc).strftime("%Y-%m-%d")})
        d["projects"].append(entry)
        save(d)

    ok = not problems and entry is not None
    if ok:
        msg = (f"Thanks! **{entry.get('title') or entry['name']}** passed the automatic checks and is waiting for a maintainer to approve it "
               f"in a pull request. Once it's merged it appears on https://mutiny19.github.io/hoop/projects/ within a few minutes.")
        if notes:
            msg += "\n\nNotes:\n" + "\n".join("- " + n for n in notes)
    else:
        msg = "This couldn't be added yet:\n" + "\n".join("- " + p for p in problems) + \
              "\n\nEdit this issue (the ··· menu, then Edit) to fix it, and the check runs again."
    json.dump({"ok": ok, "title": (entry.get("title") or entry["name"]) if entry else ""}, open(os.path.join(ROOT, ".projects-result.json"), "w"))
    open(os.path.join(ROOT, ".projects-comment.md"), "w").write(msg + "\n")
    print(msg)


# ---------- weekly refresh ----------

def refresh():
    d = load()
    keep = []
    for p in d["projects"]:
        gh = GH.match(p["url"])
        if p.get("kind") == "site":               # a website a maintainer added by hand: only check that it still answers
            alive = site_alive(p["url"])
            if alive is False:
                p["missing"] = p.get("missing", 0) + 1
            elif alive:
                p.pop("missing", None)
        elif gh:
            meta, why = github_meta(gh.group(1), gh.group(2))
            if meta:
                p.update({k: v for k, v in meta.items() if not k.startswith("_")})
                p.pop("missing", None)
            elif why == "missing":
                p["missing"] = p.get("missing", 0) + 1
            else:
                print(f"{p['url']}: {why}; left as is")
        else:
            alive = printables_alive(p["url"])
            if alive is False:
                p["missing"] = p.get("missing", 0) + 1
            elif alive:
                p.pop("missing", None)
        if p.get("missing", 0) >= 2:
            print(f"dropping {p['url']}: gone two weeks running")
            continue
        keep.append(p)
    d["projects"] = keep
    save(d)


if __name__ == "__main__":
    {"intake": intake, "refresh": refresh}[sys.argv[1] if len(sys.argv) > 1 else "refresh"]()
