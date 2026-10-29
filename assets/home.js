/* Home page: statewide map band (repeaters, NWS alerts, nets, Kp), dashboard, settings accordion, report form. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  window.HOOP = window.HOOP || {};
  var P = function (lat, lon) { return [191.3 * lon + 16854, -250 * lat + 10440]; };
  HOOP.project = P;
  var $ = function (id) { return document.getElementById(id); };
  var el = function (tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var ago = function (iso) {
    var d = (Date.now() - Date.parse(iso)) / 86400000;
    if (d < 1) return Math.max(1, Math.round(d * 24)) + " h";
    if (d < 60) return Math.round(d) + " d";
    return Math.round(d / 30) + " mo";
  };
  var stats = {}, alertCount = null, kpNow = null, netsOnAir = null, netsSoon = null;

  /* ---------- MeshCore repeaters (nightly inventory) ---------- */
  fetch("data/meshcore-nodes.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) {
    stats = d.stats || {};
    var g = $("lyr-meshcore"), quiet = el("g", { fill: "none", stroke: "#E8590C", "stroke-opacity": "0.55", "stroke-width": "1.5" }, g),
        live = el("g", { fill: "#E8590C", stroke: "#080E1C", "stroke-width": "1.5" }, g);
    d.repeaters.forEach(function (r) {
      var xy = P(r.lat, r.lon), fresh = (Date.now() - Date.parse(r.seen)) < 30 * 86400000;
      var c = el("circle", { cx: xy[0].toFixed(1), cy: xy[1].toFixed(1), r: fresh ? 4 : 3.5 }, fresh ? live : quiet);
      el("title", {}, c).textContent = r.name + " · last advert " + ago(r.seen) + " ago";
    });
    var date = d.generated.slice(0, 10);
    $("pillCount").textContent = stats.in_repeaters_30d + " Indiana MeshCore repeaters";
    $("pillSub").textContent = "heard in the last 30 days · map feed " + date;
    var stale = Date.now() - Date.parse(d.generated) > 3 * 86400000;   // the nightly job should never be this far behind
    $("srcbadge").textContent = "REPEATERS: MAP.MESHCORE.IO, " + date + (stale ? " (STALE: NIGHTLY UPDATE HAS STOPPED)" : "") + " · ALERTS: NWS, LIVE";
    if (stale) { $("srcbadge").style.background = "#FFA8A8"; $("srcbadge").innerHTML += ' · <a href="https://github.com/mutiny19/hoop/actions" target="_blank" rel="noopener" style="color:#0F1729">check the nightly job</a>'; }
    $("healthDate").textContent = "MAP FEED " + date;
    var quietest = d.repeaters.filter(function (r) { return r.in; }).sort(function (a, b) { return a.seen < b.seen ? -1 : 1; }).slice(0, 6);
    $("health").innerHTML = quietest.map(function (r) {
      var days = (Date.now() - Date.parse(r.seen)) / 86400000, c = days < 2 ? "#40C057" : days < 30 ? "#FAB005" : "#FA5252";
      return '<div><span><span class="dot" style="background:' + c + '"></span>' + esc(r.name || "(no name)") + "</span><span>seen " + ago(r.seen) + " ago</span></div>";
    }).join("");
    renderCoverage(d);
    renderTiles();
    HOOP.repeaters = d.repeaters; HOOP.project = P; window.dispatchEvent(new Event("hoop:repeaters"));
  }).catch(function () {
    $("pillCount").textContent = "Indiana MeshCore repeaters";
    $("pillSub").textContent = "map data unavailable right now";
  });

  /* ---------- NWS alerts, live (map: Indiana + neighbours; list: Indiana) ---------- */
  var ALERTS_URL = "https://api.weather.gov/alerts/active?area=IN,IL,OH,KY,MI";
  var COLORS = [[/tornado/i, "#FF6B6B", "#2A1414", "#FFA8A8"], [/severe thunderstorm/i, "#FFA94D", "#2A1E10", "#FFC078"],
                [/flood/i, "#40C057", "#12241A", "#8CE99A"], [/winter|ice|snow|blizzard|freeze|frost|chill/i, "#74C0FC", "#10202C", "#A5D8FF"],
                [/.*/, "#FCC419", "#29240F", "#FFE066"]];
  var colorFor = function (ev) { for (var i = 0; i < COLORS.length; i++) if (COLORS[i][0].test(ev)) return COLORS[i]; };
  var rank = function (e) { return /warning/i.test(e) ? 0 : /watch/i.test(e) ? 1 : 2; };
  var zoneCache = {};
  /* Most watches and advisories cover counties or zones and carry no polygon of their own: draw those zones. */
  function zoneGeom(url) {
    if (!zoneCache[url]) zoneCache[url] = fetch(url, { headers: { Accept: "application/geo+json" } })
      .then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { return d && d.geometry; }).catch(function () { return null; });
    return zoneCache[url];
  }
  function geomPath(geom) {
    var polys = geom.type === "Polygon" ? [geom.coordinates] : geom.type === "MultiPolygon" ? geom.coordinates : [];
    return polys.map(function (poly) {
      return poly.map(function (ring) { return "M" + ring.map(function (p) { var xy = P(p[1], p[0]); return xy[0].toFixed(1) + " " + xy[1].toFixed(1); }).join("L") + "Z"; }).join("");
    }).join("");
  }
  var isIndiana = function (f) { return ((f.properties.geocode || {}).UGC || []).some(function (u) { return u.indexOf("IN") === 0; }); };
  function loadAlerts() {
    fetch(ALERTS_URL, { headers: { Accept: "application/geo+json" } }).then(function (r) {
      if (!r.ok) throw new Error(r.status); return r.json();
    }).then(function (d) {
      var feats = (d.features || []).filter(function (f) { return f.properties && f.properties.status === "Actual"; });
      feats.sort(function (a, b) { return rank(b.properties.event) - rank(a.properties.event); });   // advisories first, warnings on top
      var jobs = feats.map(function (f) {
        if (f.geometry) return Promise.resolve([{ g: f.geometry, storm: true }]);
        return Promise.all((f.properties.affectedZones || []).slice(0, 60).map(zoneGeom)).then(function (gs) {
          return gs.filter(Boolean).map(function (g) { return { g: g, storm: false }; });
        });
      });
      return Promise.all(jobs).then(function (shapes) {
        var layer = $("lyr-weather"), frag = document.createDocumentFragment();
        feats.forEach(function (f, i) {
          var c = colorFor(f.properties.event), warn = /warning/i.test(f.properties.event);
          shapes[i].forEach(function (s) {
            var path = el("path", { d: geomPath(s.g), fill: c[1], "fill-opacity": s.storm ? "0.22" : "0.14",
              stroke: s.storm ? c[1] : "none", "stroke-width": s.storm ? "3" : "0", "stroke-linejoin": "round" }, frag);
            if (warn && s.storm) path.setAttribute("class", "pulse");
            el("title", {}, path).textContent = f.properties.event + ": " + f.properties.areaDesc;
          });
        });
        layer.textContent = ""; layer.appendChild(frag);
        renderAlertList(feats.filter(isIndiana));
      });
    }).catch(function () {
      $("alerts").innerHTML = '<div class="empty">Couldn\'t reach the National Weather Service. Check <a href="https://www.weather.gov/" target="_blank" rel="noopener">weather.gov</a>.</div>';
    });
  }
  function renderAlertList(feats) {
    alertCount = feats.length;
    var box = $("alerts");
    if (!feats.length) box.innerHTML = '<div class="empty">No active National Weather Service alerts for Indiana right now.</div>';
    else {
      feats = feats.slice().sort(function (a, b) { return rank(a.properties.event) - rank(b.properties.event); });
      box.innerHTML = feats.slice(0, 6).map(function (f) {
        var p = f.properties, c = colorFor(p.event), until = p.ends || p.expires;
        var t = until ? new Date(until).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" }) : "";
        var areas = p.areaDesc.split("; ");
        return '<div class="alert" style="background:' + c[2] + ";border-color:" + c[1] + '"><div class="t" style="color:' + c[3] + '">' + esc(p.event) +
          '</div><div class="a">' + esc(areas.slice(0, 4).join(", ") + (areas.length > 4 ? "…" : "")) +
          '</div><div class="w">' + (t ? "until " + esc(t) : "") + "</div></div>";
      }).join("") + (feats.length > 6 ? '<div class="empty">' + (feats.length - 6) + ' more at <a href="https://www.weather.gov/" target="_blank" rel="noopener">weather.gov</a></div>' : "");
    }
    $("alertsTime").textContent = "Checked " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + " · refreshes every 3 min";
    renderTiles();
  }
  loadAlerts();
  setInterval(loadAlerts, 3 * 60 * 1000);

  /* ---------- Kp, live ---------- */
  function loadKp() {
    fetch("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json").then(function (r) { return r.json(); }).then(function (rows) {
      var last = rows[rows.length - 1], kp = Array.isArray(last) ? parseFloat(last[1]) : last.Kp;
      kpNow = kp;
      var word = kp >= 7 ? "strong storm" : kp >= 5 ? "storm" : kp >= 4 ? "active" : "quiet";
      $("kp").textContent = "Kp " + kp.toFixed(1) + " · " + word;
      renderTiles();
    }).catch(function () { $("kp").textContent = "unavailable"; });
  }
  loadKp();
  setInterval(loadKp, 15 * 60 * 1000);

  /* ---------- nets (data/nets.json, Indiana time): 3-4 live or upcoming ---------- */
  var netData = null, netSel = null, netShown = {};
  /* Click a net: draw its repeater (town-level) and a dashed circle of typical reach for its band. */
  function bandOf(freq) {
    var f = parseFloat(freq);
    return f >= 144 && f <= 148 ? "2m" : f >= 420 && f <= 450 ? "70cm" : f >= 462 && f <= 468 ? "GMRS" : null;
  }
  function drawNet(o) {
    var g = $("lyr-nets"); g.textContent = "";
    if (!o) return;
    var n = o.net;
    if (n.scope === "statewide") {
      /* a net that is everywhere on the mesh: light up the whole state */
      var live0 = o.start <= new Date(), col0 = "#E8590C";
      var st = el("path", { d: "M110 15 L173 35 L245 0 L630 0 L628 665 L613 745 L517 757 L507 815 L440 870 L402 940 L326 890 L249 952 L191 990 L96 960 L29 995 L10 965 L38 865 L96 770 L115 690 L109 602 Z", fill: col0, "fill-opacity": "0.14", stroke: col0, "stroke-width": "4", "stroke-dasharray": live0 ? "none" : "14 10" }, g);
      if (live0) st.setAttribute("class", "pulse");
      var lines = [n.name + "  ·  " + n.freq + (n.minutes ? "  ·  " + n.minutes + " min" : ""), "Open to all, anywhere in Indiana · stress test of the mesh", "Check in with: " + (n.checkin || ""), "Postponed if weather or another emergency is on the mesh"];
      var w0 = Math.max.apply(null, lines.map(function (t, i) { return t.length * (i ? 9.6 : 10.5); })) + 24, lx0 = 890 - w0, ly0 = -45;
      el("rect", { x: lx0, y: ly0, width: w0, height: 98, rx: 8, fill: "#080E1C", stroke: col0, "stroke-width": "1.5" }, g);
      lines.forEach(function (t, i) {
        var tx = el("text", { x: lx0 + 12, y: ly0 + 21 + i * 22, fill: i ? "#B8C2D8" : "#F2F3F7", "font-family": i ? "IBM Plex Mono, monospace" : "Archivo, sans-serif", "font-size": i ? "15" : "18", "font-weight": i ? "400" : "700" }, g); tx.textContent = t;
      });
      return;
    }
    var s = netData.sites[n.site], band = bandOf(n.freq), mi = (netData.reach_miles || {})[band] || 25;
    var xy = P(s.lat, s.lon), r = mi * 3.61, live = o.start <= new Date(), col = n.type === "GMRS" ? "#FFFFFF" : "#B197FC";
    var c = el("circle", { cx: xy[0].toFixed(1), cy: xy[1].toFixed(1), r: r.toFixed(1), fill: col, "fill-opacity": "0.07", stroke: col, "stroke-width": "3", "stroke-dasharray": live ? "none" : "12 8" }, g);
    if (live) c.setAttribute("class", "pulse");
    el("path", { d: "M" + xy[0] + " " + (xy[1] - 11) + "l10 18h-20z", fill: col, stroke: "#080E1C", "stroke-width": "2" }, g);
    var l1 = n.name, l2 = s.name + " · " + n.freq + " · ~" + mi + " mi rough reach";
    var w = Math.max(l1.length * 10.5, l2.length * 9.6) + 24, ly = xy[1] - r - 62;
    if (ly < -125) ly = xy[1] + r + 12;
    var lx = Math.min(Math.max(xy[0] - w / 2, -240), 900 - w);
    el("rect", { x: lx, y: ly, width: w, height: 52, rx: 8, fill: "#080E1C", stroke: col, "stroke-width": "1.5" }, g);
    var t1 = el("text", { x: lx + 12, y: ly + 21, fill: "#F2F3F7", "font-family": "Archivo, sans-serif", "font-size": "18", "font-weight": "700" }, g); t1.textContent = l1;
    var t2 = el("text", { x: lx + 12, y: ly + 42, fill: "#B8C2D8", "font-family": "IBM Plex Mono, monospace", "font-size": "15" }, g); t2.textContent = l2;
  }
  function pickNet(key) {
    netSel = netSel === key ? null : key;
    drawNet(netSel ? netShown[netSel] : null);
    renderNets();
  }
  $("netlist").addEventListener("click", function (e) { var it = e.target.closest(".net.pick"); if (it) pickNet(it.dataset.key); });
  $("netlist").addEventListener("keydown", function (e) {
    var it = e.target.closest(".net.pick"); if (it && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); pickNet(it.dataset.key); }
  });
  Nets.load("data/nets.json").then(function (d) { netData = d; renderNets(); setInterval(renderNets, 1000); })
    .catch(function () { $("netlist").innerHTML = '<div class="empty">Net schedule unavailable right now.</div>'; });
  function renderNets() {
    var now = new Date(), len = (netData.default_minutes || 30) * 60000;
    var occ = Nets.occurrences(netData, now, new Date(now.getTime() + 8 * 86400000));
    var pad = function (n) { return String(n).padStart(2, "0"); };
    var live = occ.filter(function (o) { return o.start <= now && now - o.start < (o.net.minutes ? o.net.minutes * 60000 : len); });
    var next = occ.filter(function (o) { return o.start > now; });
    var shown = live.concat(next).slice(0, 4);
    var focusKey = document.activeElement && document.activeElement.closest && document.activeElement.closest("#netlist") ? document.activeElement.dataset.key : null;
    $("netlist").innerHTML = shown.map(function (o) {
      var n = o.net, st, color;
      if (o.start <= now) { st = "● ON AIR"; color = "#FF6B6B"; }
      else if (o.start - now <= 3600000) { var s = Math.round((o.start - now) / 1000); st = "T-" + Math.floor(s / 60) + ":" + pad(s % 60); color = "#FFD43B"; }
      else { st = Nets.whenLabel(o.start); color = "#B8C2D8"; }
      var key = n.name + "|" + o.start.toISOString(), pick = !!n.site || n.scope === "statewide";
      return '<div class="net' + (pick ? " pick" : "") + (key === netSel ? " sel" : "") + '"' +
        (pick ? ' role="button" tabindex="0" aria-pressed="' + (key === netSel) + '" data-key="' + esc(key) + '" title="' + (n.scope === "statewide" ? esc(n.note || "Open to all across Indiana") : "Show the repeater and its rough reach on the map") + '"' : ' title="No single repeater (network, app, HF or simplex)"') +
        "><div class=\"hd\"><b>" + esc(n.name) + (n.unverified ? " *" : "") + "</b><span class=\"st\" style=\"color:" + color + "\">" + st + "</span></div><small>" + esc((n.freq.indexOf(n.type) >= 0 ? "" : n.type + " · ") + n.freq + " · " + n.access + (n.minutes ? " · " + n.minutes + " min" : "")) + (n.checkin ? "<br>Check in: " + esc(n.checkin) : "") + (n.brief ? "<br>" + esc(n.brief) : "") +
        '</small></div>';
    }).join("") || '<div class="empty">No nets on the schedule this week.</div>';
    if (focusKey) { var f = $("netlist").querySelector('[data-key="' + focusKey.replace(/"/g, '\\"') + '"]'); if (f) f.focus(); }
    netShown = {}; shown.forEach(function (o) { netShown[o.net.name + "|" + o.start.toISOString()] = o; });
    if (netSel && !netShown[netSel]) { netSel = null; drawNet(null); }   // its slot ended: clear the circle
    var a = live.length, b = next.filter(function (o) { return o.start - now <= 3600000; }).length;
    if (a !== netsOnAir || b !== netsSoon) { netsOnAir = a; netsSoon = b; renderTiles(); }
  }

  /* ---------- dashboard ---------- */
  function renderTiles() {
    var T = [
      ["Indiana repeaters, heard 30 d", stats.in_repeaters_30d, "of " + (stats.in_repeaters || "?") + " on the map", "#F2F3F7"],
      ["Neighbor-state repeaters", stats.neighbor_repeaters_30d, "heard in 30 days, on this map", "#F2F3F7"],
      ["Indiana companions, 30 d", stats.in_companions_30d, "count only, never plotted", "#F2F3F7"],
      ["Active NWS alerts", alertCount, "Indiana, live", alertCount ? "#FFA94D" : "#F2F3F7"],
      ["Nets on air", netsOnAir, "plus starting within 1 h: " + (netsSoon == null ? "…" : netsSoon), netsOnAir ? "#FF6B6B" : "#F2F3F7"],
      ["Planetary Kp", kpNow == null ? null : kpNow.toFixed(1), "aurora and HF conditions", "#66D9E8"]
    ];
    $("tiles").innerHTML = T.map(function (t) {
      return '<div class="tile"><div class="k">' + t[0] + '</div><div class="v" style="color:' + t[3] + '">' + (t[1] == null ? "…" : esc(t[1])) + '</div><div class="s">' + t[2] + "</div></div>";
    }).join("");
  }
  var band = $("map"), dashOn = false, clockTimer = null;
  $("dashBtn").addEventListener("click", function () {
    dashOn = !dashOn;
    band.classList.toggle("dash", dashOn);
    this.setAttribute("aria-pressed", String(dashOn));
    this.textContent = dashOn ? "⤡ Exit dashboard" : "⤢ Dashboard view";
    $("hero").hidden = dashOn; $("dashHead").hidden = !dashOn; $("tiles").hidden = !dashOn; $("dashRow").hidden = !dashOn;
    document.getElementById("protocols").parentElement.hidden = dashOn;
    if (dashOn) { tick(); clockTimer = setInterval(tick, 1000); } else clearInterval(clockTimer);
  });
  function tick() { $("clock").textContent = "Updated live · " + new Date().toLocaleTimeString(); }

  /* ---------- phones: side panel behind a toggle ---------- */
  (function () {
    var t = $("sideToggle"), panel = $("sidePanel"), mq = window.matchMedia("(max-width: 860px)");
    function apply() { var small = mq.matches; t.hidden = !small; if (small && t.getAttribute("aria-expanded") !== "true") panel.hidden = true; else panel.hidden = false; }
    t.addEventListener("click", function () {
      var open = t.getAttribute("aria-expanded") === "true";
      t.setAttribute("aria-expanded", String(!open)); panel.hidden = open;
      t.textContent = open ? "Show alerts, nets and propagation" : "Hide alerts, nets and propagation";
    });
    mq.addEventListener ? mq.addEventListener("change", apply) : mq.addListener(apply);
    apply();
  })();

  /* ---------- layers ---------- */
  document.querySelectorAll(".layer[data-layer]").forEach(function (b) {
    b.addEventListener("click", function () {
      var on = b.getAttribute("aria-pressed") !== "true", id = b.getAttribute("data-layer");
      b.setAttribute("aria-pressed", String(on));
      b.textContent = (on ? "✓ " : "") + b.textContent.replace(/^✓ /, "");
      $("lyr-" + id).style.display = on ? "" : "none";
    });
  });

  /* ---------- interstate coverage + where repeaters are needed: nightly from the MeshCore Map and Census data ---------- */
  var ROADS = [["I-64", ["Posey", "Vanderburgh", "Gibson", "Warrick", "Spencer", "Dubois", "Perry", "Crawford", "Harrison", "Floyd"]], ["I-65", ["Lake", "Jasper", "Newton", "White", "Tippecanoe", "Clinton", "Boone", "Marion", "Hendricks", "Shelby", "Johnson", "Bartholomew", "Jackson", "Scott", "Clark"]], ["I-69", ["Steuben", "DeKalb", "Allen", "Huntington", "Wells", "Grant", "Delaware", "Madison", "Hamilton", "Marion", "Monroe", "Greene", "Daviess", "Pike", "Gibson", "Warrick", "Vanderburgh"]], ["I-70", ["Vigo", "Clay", "Putnam", "Hendricks", "Morgan", "Marion", "Hancock", "Henry", "Wayne"]], ["I-74", ["Vermillion", "Fountain", "Montgomery", "Hendricks", "Boone", "Marion", "Shelby", "Decatur", "Rush", "Ripley", "Franklin", "Dearborn"]], ["I-80/90", ["Lake", "Porter", "LaPorte", "St. Joseph", "Elkhart", "LaGrange", "Steuben"]], ["I-94", ["Lake", "Porter", "LaPorte"]]];   // Indiana counties each interstate passes through (geography)
  function renderCoverage(d) {
    var C = d.counties || {}, cls = function (c) { var v = C[c]; return !v || !v[0] ? ["c-need", "needs a repeater"] : v[1] ? ["c-ok", "covered"] : ["c-quiet", "repeater quiet 30+ days"]; };
    $("cov").innerHTML = ROADS.map(function (r) {
      return '<div class="road"><span>' + r[0] + '</span><div class="cty">' + r[1].map(function (c) {
        var k = cls(c), v = C[c] || [0, 0];
        return '<span class="' + k[0] + '" title="' + c + ": " + k[1] + " (" + v[0] + " repeaters, " + v[1] + ' heard in 30 days)">' + c + "</span>";
      }).join("") + "</div></div>";
    }).join("");
    var roadsOf = {};
    ROADS.forEach(function (r) { r[1].forEach(function (c) { (roadsOf[c] = roadsOf[c] || []).push(r[0]); }); });
    var rank = Object.keys(C).filter(function (k) { return C[k][2]; }).sort(function (a, b) {
      return C[b][2] / Math.max(C[b][1], 0.5) - C[a][2] / Math.max(C[a][1], 0.5);
    }).slice(0, 5);
    $("needs").innerHTML = rank.map(function (k) {
      var v = C[k];
      return '<div class="county"><b>' + esc(k) + '</b><span class="w">' + (roadsOf[k] ? roadsOf[k].join(", ") : "No interstate") + '</span><span class="p">' +
        v[2].toLocaleString() + " people<em>" + v[0] + " repeater" + (v[0] === 1 ? "" : "s") + ", " + v[1] + " active</em></span></div>";
    }).join("");
    $("covDate").textContent = $("needsDate").textContent = "MeshCore Map " + d.generated.slice(0, 10) + " · Census population";
  }

  /* ---------- settings accordion ---------- */
  var PROTOS = [
    { id: "gmrs", netcard: true, name: "GMRS", tagline: "Thirty-five dollars, no exam, and a repeater on a hill: the quickest legal way to talk across a county.", meta: "$35 license, no exam · Voice", status: "Quick reference · reviewed 2026-10-15",
      note: "The calling channel and tone are community conventions, not FCC rules.",
      rows: [["Calling / travel", "Ch 20 · 141.3 Hz"], ["Repeater channels", "15 to 22"], ["Station ID", "Every 15 min and at the end"]],
      links: [["FCC: GMRS and licensing", "fcc.gov", "https://www.fcc.gov/general-mobile-radio-service-gmrs"], ["The rules", "47 CFR Part 95, Subpart E", "https://www.ecfr.gov/current/title-47/chapter-I/subchapter-D/part-95/subpart-E"], ["Repeater directory", "myGMRS", "https://mygmrs.com"], ["Project LongHaul", "A nationwide effort to connect GMRS operators, on the same Ch 20 · 141.3 Hz", "https://projectlonghaul.com/"]] },
    { id: "ham", netcard: true, name: "Ham radio", tagline: "One exam opens VHF, UHF, satellites, and every net on the card; two more open the planet.", meta: "FCC exam · Voice, data", status: "Links only",
      note: "National calling frequencies. Local practice comes from Indiana clubs.",
      rows: [["2 m simplex calling", "146.520 MHz"], ["70 cm simplex calling", "446.000 MHz"], ["Repeater coordination", "Indiana Repeater Council"], ["Emergency service", "ARES, ARRL Indiana Section"]],
      links: [["ARRL: getting licensed", "arrl.org", "https://www.arrl.org/getting-licensed"], ["Find an Indiana club", "ARRL club search", "https://www.arrl.org/find-a-club"], ["ARRL Indiana Section", "arrl.org", "https://www.arrl.org/sections/view/indiana"], ["Repeater directory", "RepeaterBook", "https://www.repeaterbook.com"]] },
    { id: "meshcore", name: "MeshCore",
      intro: ["New here?", "The mesh is small radios that pass short text messages to each other with no cell service or internet. Volunteers run relay boxes on rooftops so messages travel across the state. You can be texting on it this weekend for about $30, with no license.", "Start here: five steps", "meshcore/"],
      tagline: "Texts that hop repeater to repeater with no carrier, no account, no bill. The repeaters are the network.", meta: "No license · Text · 915 MHz", status: "Radio: official MeshCore {PN} preset · reviewed 2026-10-25",
      views: {
        companion: {
          label: "Companion",
          note: "Companions are set up in the MeshCore app; there's nothing to type in a CLI. Tap a channel to copy its name, then add it in the app.",
          rows: [
            ["Firmware", "Companion (Bluetooth), from the web flasher"],
            ["Radio preset", "{PN}: {R}"],
            ["Path hash size", "2 bytes, on the Optimise screen (Experimental settings on older app versions). Indiana's repeaters already run 2-byte or newer; needs radio firmware 1.14+"],
            ["Region / scope", "Rarely used; ask your local group before setting one"],
            ["Channels", "Public is built in. Add:", null, ["#porchlight", "#emergency", "#meshcore", "#skywarn", "#weather", "#wx", "#test"]],
            ["Regional channels", "One per metro, named by its airport code; #nwi covers Northwest Indiana, which has no major airport of its own:", null, ["#ind", "#fwa", "#sbn", "#evv", "#laf", "#bmg", "#huf", "#mie", "#nwi", "#sdf", "#cvg"]],
            ["First thing to send", "A flood advert, so people and repeaters learn about you"]
          ]
        },
        repeater: {
          label: "Repeater",
          note: "Radio: MeshCore's official {PN} preset, read live. The other values are a common starting point; the MeshCore CLI reference explains each one, and your local group may differ. Regions: rarely used; ask others in your area whether they use them on repeaters or companions before setting one.",
          copyAll: "set radio {RC}\nset path.hash.mode 1\nset advert.interval 0\nset flood.advert.interval 47",
          copyAllNote: "Copy all is for firmware 1.16 and newer; it sets no region, matching the advice above. Copy multi.acks and your name separately; edit the name first. Regions are opt-in \u2014 use an alternative below only once you\u2019ve checked with your area.",
          alts: [
            ["Radio on openHop", "Spaces instead of commas, then restart openHop.", "set radio {RS}"],
            ["Path hash mode", "Firmware 1.14 or newer. Older firmware doesn't have this setting; leave it."],
            ["Regions on firmware 1.15 and openHop", "No region def: add one region per line. Put us first (openHop matches the parent by its first letters).", "region put us\nregion put us-in us\nregion put us-oh us\nregion put us-ky us\nregion put us-mi us\nregion put us-il us"],
            ["Regions on firmware 1.14 and older", "Same region put lines, then turn flooding on for each one.", "region allowf us\nregion allowf us-in\nregion allowf us-oh\nregion allowf us-ky\nregion allowf us-mi\nregion allowf us-il"]
          ],
          rows: [
            ["Radio ({PN} preset)", "{R}", "set radio {RC}", null, true],
            ["Path hash mode", "1 (2-byte)", "set path.hash.mode 1", null, true],
            ["Zero-hop advert", "0 (off)", "set advert.interval 0"],
            ["Flood advert", "every 47 h", "set flood.advert.interval 47"],
            ["multi.acks", "1 rural · 0 urban", "set multi.acks 1"],
            ["Regions", "Nothing required. Neighbouring groups publish their own region names; the MeshCore CLI reference covers the commands"]
          ]
        },
        observer: {
          label: "Observer",
          note: "An observer uploads the packets it hears, so Indiana shows up on the live maps and the #meshnet log. It doesn't change how messages route.",
          rows: [
            ["Radio preset", "{PN}: {R}, the same as everyone"],
            ["Setup and networks", "On the Live page, under Help fill the live views"]
          ]
        }
      },
      links: [["Official docs and FAQ", "docs.meshcore.io", "https://docs.meshcore.io/"], ["Web flasher", "flasher.meshcore.io", "https://flasher.meshcore.io/"], ["MeshCore Map", "map.meshcore.io", "https://map.meshcore.io"]] },
    { id: "meshtastic", name: "Meshtastic", tagline: "Every radio relays, so the network exists wherever a few people are standing.", meta: "No license · Text · 915 MHz · Few Indiana users today", status: "Defaults · few Indiana users",
      note: "Few active users in Indiana right now. The stock defaults work here; if you run it, report yours below so it's counted.",
      rows: [["Region", "US"], ["Modem preset", "LongFast (default)"], ["Primary channel", "LongFast (default)"], ["MQTT", "Off by default"]],
      links: [["Official site and docs", "meshtastic.org", "https://meshtastic.org"], ["Source", "github.com/meshtastic", "https://github.com/meshtastic"]] },
    { id: "reticulum", name: "Reticulum", tagline: "Encrypted end to end over anything that moves bits: LoRa, Wi-Fi, packet, or the internet. The quiet, serious option.", meta: "Depends on link · Text, files", status: "Suggested starting point · no statewide network yet",
      note: "There's no statewide Reticulum network yet. These match what Indiana's early users run. RNodes only hear each other when frequency, bandwidth, spreading factor and coding rate all match.",
      copyAll: "[[RNode LoRa]]\n  type = RNodeInterface\n  interface_enabled = True\n  port = /dev/ttyACM0\n  frequency = 915000000\n  bandwidth = 125000\n  spreadingfactor = 9\n  codingrate = 5\n  txpower = 17",
      copyAllLabel: "Copy RNode interface",
      copyAllNote: "Paste into the [interfaces] section of ~/.reticulum/config. Change port to your RNode, and set txpower for your hardware.",
      rows: [["RNode frequency", "915.000 MHz"], ["Bandwidth", "125 kHz"], ["Spreading factor", "SF9"], ["Coding rate", "CR5"], ["TX power", "Set for your hardware"]],
      links: [["Official site and manual", "reticulum.network", "https://reticulum.network"], ["Source", "markqvist/Reticulum", "https://github.com/markqvist/Reticulum"], ["Sideband app", "markqvist/Sideband", "https://github.com/markqvist/Sideband"], ["Propose a change", "GitHub", "https://github.com/mutiny19/hoop/issues/new?template=settings-change.yml"]] }
  ];
  var open = {}, view = { meshcore: "companion" }, clips = [];
  function clip(text) { clips.push(text); return clips.length - 1; }
  var PRESET = { title: "USA", frequency: "910.525", bandwidth: "62.5", spreading_factor: "7", coding_rate: "5" };
  function fillP(s) {
    if (s == null) return s;
    var P_ = PRESET;
    return String(s).replace(/\{PN\}/g, P_.title).replace(/\{R\}/g, P_.frequency + " · " + P_.bandwidth + " · SF" + P_.spreading_factor + " · CR" + P_.coding_rate)
      .replace(/\{RC\}/g, [P_.frequency, P_.bandwidth, P_.spreading_factor, P_.coding_rate].join(",")).replace(/\{RS\}/g, [P_.frequency, P_.bandwidth, P_.spreading_factor, P_.coding_rate].join(" "));
  }
  /* The USA preset is read live from MeshCore's own preset list (the same one the app shows); if that fails, the values above stay. */
  fetch("https://api.meshcore.nz/api/v1/config").then(function (r) { return r.json(); }).then(function (d) {
    var e = (d.config && d.config.suggested_radio_settings && d.config.suggested_radio_settings.entries || []).filter(function (x) { return x.title === "USA"; })[0];
    if (e && e.frequency) { PRESET = e; renderAcc(); }
  }).catch(function () {});
  function settingsCard(p) {
    var v = p.views ? p.views[view[p.id]] : null, rows = (v ? v.rows : p.rows).map(function (r) { return r.map(function (x, i) { return i < 3 ? fillP(x) : x; }); }), note = fillP(v ? v.note : p.note);
    var seg = !p.views ? "" : '<div class="seg" role="group" aria-label="Show settings for">' + Object.keys(p.views).map(function (k) {
      return '<button type="button" data-view="' + p.id + ":" + k + '" aria-pressed="' + (view[p.id] === k) + '">' + p.views[k].label + "</button>";
    }).join("") + "</div>";
    var body = rows.map(function (r) {
      var val = esc(r[1]);
      if (r[3]) val += '<span class="chips">' + r[3].map(function (c) { return '<button type="button" class="chipcopy" data-clip="' + clip(c) + '" title="Copy ' + esc(c) + '">' + esc(c) + "</button>"; }).join("") + "</span>";
      if (r[2]) val += '<span class="cmd"><code>' + esc(r[2]) + '</code><button type="button" class="mini" data-clip="' + clip(r[2]) + '" aria-label="Copy ' + esc(r[2]) + '">Copy</button></span>';
      var mark = r[4] ? ' <span class="diff" title="Different on older firmware or openHop" aria-label="Different on older firmware or openHop">◆</span>' : "";
      return "<div" + (r[2] ? ' class="has-cmd"' : "") + "><span>" + esc(r[0]) + mark + "</span><span>" + val + "</span></div>";
    }).join("");
    var alts = v && v.alts ? '<div class="alts"><b><span class="diff" aria-hidden="true">◆</span> Different on older firmware or openHop</b>' + v.alts.map(function (a) {
        var cmd = fillP(a[2]);
        return "<div><span>" + esc(a[0]) + "</span><span>" + esc(a[1]) + (cmd ? '<span class="cmd"><code>' + esc(cmd).replace(/\n/g, "<br>") + '</code><button type="button" class="mini" data-clip="' + clip(cmd) + '">Copy</button></span>' : "") + "</span></div>";
      }).join("") + "</div>" : "";
    var src = v && v.copyAll ? v : p.copyAll ? p : null, lbl = (src && src.copyAllLabel) || "Copy all repeater CLI";
    var all = src ? '<button type="button" class="btn copy" data-clip="' + clip(fillP(src.copyAll)) + '" data-label="' + lbl + '">' + lbl + '</button><div class="note">' + esc(src.copyAllNote) + "</div>" : "";
    return '<div class="card-set"><div class="top"><b>A starting point</b><span>' + esc(fillP(p.status)) + "</span></div>" + seg +
      '<div class="rows">' + body + "</div>" + all + alts + '<div class="note">' + esc(note) + "</div></div>";
  }
  /* The Indianapolis net card, shown at the top of the expanded GMRS and Ham cards. */
  var NETCARD = '<div class="net-card-box"> <a href="resources/indy-metro-net-card.pdf" target="_blank" rel="noopener"><img src="assets/net-card-thumb.png" alt="Indianapolis metro channel and net reference card, page 1 of 4" width="480" height="371" loading="lazy"></a> <div class="nc-body"> <h3>Indianapolis metro channel &amp; net card</h3> <p>One printable PDF: the weekly net schedule, GMRS and ham channels, antenna lengths, and known-good radio settings for a handheld. Four pages, built for the glovebox.</p> <a class="btn ghost" href="resources/indy-metro-net-card.pdf" target="_blank" rel="noopener">Open the PDF &#8599;</a> </div> </div>';
  function renderAcc() {
    clips = [];
    $("acc").innerHTML = PROTOS.map(function (p) {
      var o = !!open[p.id];
      var card = p.netcard ? NETCARD : "";
      var intro = p.intro ? '<div class="intro"><div><b>' + esc(p.intro[0]) + "</b><p>" + esc(p.intro[1]) + '</p></div><a class="btn" href="' + p.intro[3] + '">' + esc(p.intro[2]) + "</a></div>" : "";
      var body = !o ? "" : '<div class="body" id="pb-' + p.id + '">' + intro + card + settingsCard(p) +
        '<div class="links">' + p.links.map(function (l) {
          var ext = /^https?:/.test(l[2]);
          return '<a href="' + l[2] + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + "><span><b>" + esc(l[0]) + "</b><small>" + esc(l[1]) + "</small></span><span aria-hidden=\"true\">" + (ext ? "↗" : "→") + "</span></a>";
        }).join("") + "</div></div>";
      return '<div class="proto proto-' + p.id + '"><button type="button" aria-expanded="' + o + '" aria-controls="pb-' + p.id + '" data-p="' + p.id + '"><span class="nm">' + p.name +
        '</span><span class="tl">' + esc(p.tagline) + "<small>" + esc(p.meta) + '</small></span><span class="chev" aria-hidden="true">' + (o ? "−" : "+") + "</span></button>" + body + "</div>";
    }).join("");
    var all = PROTOS.every(function (p) { return open[p.id]; });
    $("toggleAll").textContent = all ? "Collapse all" : "Expand all";
  }
  $("acc").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.p) { open[b.dataset.p] = !open[b.dataset.p]; renderAcc(); return; }
    if (b.dataset.view) { var pv = b.dataset.view.split(":"); view[pv[0]] = pv[1]; renderAcc(); return; }
    if (b.dataset.clip != null) {
      var text = clips[+b.dataset.clip], label = b.dataset.label || b.textContent;
      var done = function (msg) { b.textContent = msg; setTimeout(function () { b.textContent = label; }, 1500); };
      try { navigator.clipboard.writeText(text).then(function () { done("Copied"); }, function () { done("Copy failed"); }); }
      catch (err) { done("Copy failed"); }
    }
  });
  $("toggleAll").addEventListener("click", function () {
    var all = PROTOS.every(function (p) { return open[p.id]; });
    PROTOS.forEach(function (p) { open[p.id] = !all; });
    renderAcc();
  });
  renderAcc();

  /* ---------- report: tabs + prefilled GitHub issue ---------- */
  var COUNTIES = ["Adams", "Allen", "Bartholomew", "Benton", "Blackford", "Boone", "Brown", "Carroll", "Cass", "Clark", "Clay", "Clinton", "Crawford", "Daviess", "Dearborn", "Decatur", "DeKalb", "Delaware", "Dubois", "Elkhart", "Fayette", "Floyd", "Fountain", "Franklin", "Fulton", "Gibson", "Grant", "Greene", "Hamilton", "Hancock", "Harrison", "Hendricks", "Henry", "Howard", "Huntington", "Jackson", "Jasper", "Jay", "Jefferson", "Jennings", "Johnson", "Knox", "Kosciusko", "LaGrange", "Lake", "LaPorte", "Lawrence", "Madison", "Marion", "Marshall", "Martin", "Miami", "Monroe", "Montgomery", "Morgan", "Newton", "Noble", "Ohio", "Orange", "Owen", "Parke", "Perry", "Pike", "Porter", "Posey", "Pulaski", "Putnam", "Randolph", "Ripley", "Rush", "St. Joseph", "Scott", "Shelby", "Spencer", "Starke", "Steuben", "Sullivan", "Switzerland", "Tippecanoe", "Tipton", "Union", "Vanderburgh", "Vermillion", "Vigo", "Wabash", "Warren", "Warrick", "Washington", "Wayne", "Wells", "White", "Whitley"];
  $("county").insertAdjacentHTML("beforeend", COUNTIES.map(function (c) { return "<option>" + c + "</option>"; }).join(""));
  var tabs = ["use", "outage", "proto"];
  function pick(id) {
    tabs.forEach(function (t) {
      $("tab-" + t).setAttribute("aria-selected", String(t === id));
      $("f-" + t).hidden = t !== id;
    });
    $("thanks").hidden = true;
  }
  tabs.forEach(function (t) { $("tab-" + t).addEventListener("click", function () { pick(t); }); });
  document.querySelectorAll("a[data-tab]").forEach(function (a) { a.addEventListener("click", function () { pick(a.dataset.tab); }); });
  var TITLES = { use: "[count] ", outage: "[outage] ", proto: "[protocol] " };
  var LABELS = { use: "count", outage: "outage", proto: "protocol" };
  document.querySelectorAll("form[data-kind]").forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var kind = f.dataset.kind, fd = new FormData(f), lines = [], title;
      if (kind === "use") {
        var protos = fd.getAll("proto");
        if (!protos.length) { alertBox(f, "Pick at least one."); return; }
        title = TITLES.use + protos.join(", ") + " in " + fd.get("county") + " County";
        lines.push("**Uses:** " + protos.join(", "), "**County:** " + fd.get("county"), "**Role:** " + fd.get("role"), "**Radios or nodes:** " + fd.get("count"));
      } else {
        title = TITLES[kind] + (fd.get("name") || "");
        fd.forEach(function (v, k) { if (v) lines.push("**" + k + ":** " + v); });
      }
      lines.push("", "_Sent from the HOOP report form._");
      var url = "https://github.com/mutiny19/hoop/issues/new?labels=" + encodeURIComponent("report," + LABELS[kind]) +
        "&title=" + encodeURIComponent(title) + "&body=" + encodeURIComponent(lines.join("\n"));
      window.open(url, "_blank", "noopener");
      $("thanksLink").href = url;
      f.hidden = true; $("thanks").hidden = false;
    });
  });
  function alertBox(f, msg) {
    var s = f.querySelector(".submit small"); s.textContent = msg; s.style.color = "var(--signal)";
  }
  $("again").addEventListener("click", function () {
    var cur = tabs.filter(function (t) { return $("tab-" + t).getAttribute("aria-selected") === "true"; })[0];
    document.querySelectorAll("form[data-kind]").forEach(function (f) { f.reset(); });
    pick(cur);
  });
})();
