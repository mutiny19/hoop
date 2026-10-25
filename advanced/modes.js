(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };



  function chanName(s) { return "#" + s.toLowerCase().replace(/[^a-z]/g, ""); }
  function chanChip(name, host) {
    var b = document.createElement("button"); b.type = "button"; b.className = "chip chan"; b.textContent = name; b.title = "Copy " + name;
    b.addEventListener("click", function () { try { navigator.clipboard.writeText(name).then(function () { var t = b.textContent; b.textContent = "copied"; setTimeout(function () { b.textContent = t; }, 1200); }); } catch (e) {} });
    host.appendChild(b);
  }
  function renderChans() {
    var host = $("abbrChans"); host.innerHTML = "";
    var names = [];
    METROS.forEach(function (m) { if (sel[m.code] && PLACES[m.code]) { PLACES[m.code].cities.concat(PLACES[m.code].counties).forEach(function (x) { var n = chanName(x); if (names.indexOf(n) < 0) names.push(n); }); } });
    if (!names.length) { host.innerHTML = '<span class="sub">Pick a metro above to see channel names for its cities and counties.</span>'; return; }
    names.forEach(function (n) { chanChip(n, host); });
  }
  var sel = {};
  var metroOf = {}, inferred = {};
  Object.keys(PLACES).forEach(function (code) { PLACES[code].counties.forEach(function (c) { metroOf[c] = code; }); });

  var DIST = REGIONS.map(function (r) { return { code: "us-in-" + r.k, key: r.k, name: r.n + " · " + r.name, counties: r.c, n: r.n }; });
  var distOf = {}; DIST.forEach(function (d) { d.counties.forEach(function (c) { distOf[c] = d.code; }); });
  DIST.forEach(function (d) { chip({ code: d.code, name: d.name }, "abbrDistricts"); });
  var mapEls = {}, lblEls = {};
  (function drawMap() {
    var svg = $("abbrMap"); if (!svg) return;
    var list = []; try { list = COUNTIES.filter(function (c) { return c.st === "IN"; }); } catch (e) { return; }
    var NS = "http://www.w3.org/2000/svg", sums = {};
    list.forEach(function (c) {
      var code = metroOf[c.name], path = document.createElementNS(NS, "path");
      var dd = DIST.filter(function (d) { return d.counties.indexOf(c.name) >= 0; })[0], dn = dd ? dd.n : 0;
      path.setAttribute("d", c.d); path.setAttribute("class", "cty" + (code ? " metro" : "") + (dn ? " d" + dn : ""));
      var t = document.createElementNS(NS, "title"); t.textContent = c.name + " County · " + (code ? code : "no metro") + (distOf[c.name] ? " · " + distOf[c.name] : ""); path.appendChild(t);
      path.classList.add("pick");
      path.addEventListener("click", function () { var k = distOf[c.name]; if (!k) return; sel[k] = !sel[k]; syncChips(); renderAbbr(); });
      if (code) { (mapEls[code] = mapEls[code] || []).push(path); var sm = sums[code] = sums[code] || { x: 0, y: 0, n: 0 }; sm.x += c.cx; sm.y += c.cy; sm.n++; }
      svg.appendChild(path);
    });
    DIST.forEach(function (d) {
      var xs = 0, ys = 0, n = 0; list.forEach(function (c) { if (d.counties.indexOf(c.name) >= 0) { xs += c.cx; ys += c.cy; n++; } });
      if (!n) return; var t = document.createElementNS(NS, "text"); t.setAttribute("x", (xs / n).toFixed(1)); t.setAttribute("y", (ys / n - 14).toFixed(1)); t.setAttribute("class", "dnum"); t.textContent = String(d.n); svg.appendChild(t);
    });
    Object.keys(sums).forEach(function (code) {
      var sm = sums[code], g = document.createElementNS(NS, "g"), r = document.createElementNS(NS, "rect"), l = document.createElementNS(NS, "text");
      var x = sm.x / sm.n, y = sm.y / sm.n, w = 18 + code.length * 9.2;
      r.setAttribute("x", (x - w / 2).toFixed(1)); r.setAttribute("y", (y - 12).toFixed(1)); r.setAttribute("width", w.toFixed(1)); r.setAttribute("height", "24"); r.setAttribute("rx", "12");
      l.setAttribute("x", x.toFixed(1)); l.setAttribute("y", (y + 5).toFixed(1)); l.textContent = code;
      g.setAttribute("class", "lbl"); g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-pressed", "false");
      var mt = document.createElementNS(NS, "title"); mt.textContent = "Add metro " + code; g.appendChild(mt); g.appendChild(r); g.appendChild(l);
      function tog() { sel[code] = !sel[code]; g.setAttribute("aria-pressed", String(!!sel[code])); syncChips(); renderAbbr(); }
      g.addEventListener("click", tog); g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tog(); } });
      svg.appendChild(g); lblEls[code] = g;
    });
  })();
  function syncMap() {
    var svg = $("abbrMap");
    if (svg) {
      svg.querySelectorAll("path.cty").forEach(function (p) { var name = p.querySelector("title").textContent.split(" County")[0]; p.classList.toggle("dist", !!sel[distOf[name]]); });
      svg.querySelectorAll(".dlbl").forEach(function (t) { t.remove(); });
      var NS = "http://www.w3.org/2000/svg", list = []; try { list = COUNTIES.filter(function (c) { return c.st === "IN"; }); } catch (e) {}
      DIST.forEach(function (d) {
        if (!sel[d.code]) return;
        var xs = 0, ys = 0, n = 0; list.forEach(function (c) { if (d.counties.indexOf(c.name) >= 0) { xs += c.cx; ys += c.cy; n++; } });
        if (!n) return; var t = document.createElementNS(NS, "text"); t.setAttribute("x", (xs / n).toFixed(1)); t.setAttribute("y", (ys / n - 30).toFixed(1)); t.setAttribute("class", "dlbl"); t.textContent = d.code; svg.appendChild(t);
      });
    } Object.keys(mapEls).forEach(function (code) { mapEls[code].forEach(function (p) { p.classList.toggle("on", !!sel[code]); }); if (lblEls[code]) { lblEls[code].classList.toggle("on", !!sel[code]); lblEls[code].setAttribute("aria-pressed", String(!!sel[code])); } }); }
  $("abbrClear").addEventListener("click", function () { sel = {}; syncChips(); renderAbbr(); });
  function syncChips() {
    document.querySelectorAll("#abbrDistricts .chip").forEach(function (b) { b.setAttribute("aria-pressed", String(!!sel[b.dataset.code])); }); document.querySelectorAll("#abbrMetros .chip").forEach(function (b) { b.setAttribute("aria-pressed", String(!!sel[b.dataset.code])); }); }
  function chip(def, host) {
    var b = document.createElement("button"); b.type = "button"; b.className = "chip" + (def.pub === false || (!def.pub && (host === "abbrMetros" || host === "abbrDistricts")) ? " conv" : "");
    b.setAttribute("aria-pressed", "false"); b.dataset.code = def.code;
    b.innerHTML = def.code + " <small>" + def.name + "</small>";
    b.addEventListener("click", function () { sel[def.code] = !sel[def.code]; b.setAttribute("aria-pressed", String(!!sel[def.code])); renderAbbr(); });
    $(host).appendChild(b);
  }
  METROS.forEach(function (m) { chip(m, "abbrMetros"); });
  NEIGHBORS.forEach(function (n) { chip(n, "abbrNeighbors"); });
  function tags() {
    var t = ["us", "us-in"];
    METROS.concat(DIST).concat(NEIGHBORS).forEach(function (d) { if (sel[d.code] && t.indexOf(d.code) < 0) t.push(d.code); });
    return t;
  }
  function renderAbbr() {
    var t = tags(), fw = $("abbrFw").value, lines = [];
    if (fw === "1.16") {
      lines.push("region def " + t.map(function (x, i) { return i < t.length - 1 ? x + "|*" : x; }).join(" "));
    } else {
      t.forEach(function (x) { lines.push("region put " + x); });
      if (fw === "1.14") t.forEach(function (x) { lines.push("region allowf " + x); });
    }
    lines.push("region allowf *", "region save", "region list allowed");
    $("abbrOut").textContent = lines.join("\n");
    var bytes = t.join(",").length;
    renderChans(); syncMap(); syncChips();
    $("abbrBudget").textContent = t.length + " of 32 region slots · about " + bytes + " of 172 Discover Regions bytes · " + (t.length === 2 ? "no metro selected, which is fine for a rural repeater" : t.slice(2).join(", ") + " added");
    var over = t.length > 32 || bytes > 172, near = !over && (t.length > 29 || bytes > 160), al = $("abbrAlert");
    al.hidden = !(over || near); al.className = "alert" + (over ? " over" : " near");
    al.textContent = over
      ? "Too many scopes selected: " + t.length + " tags, about " + bytes + " bytes. A repeater holds 32 tags and answers Discover Regions in 172 bytes, so this list will not fit and the commands are held back. Remove a few tags; neighbour tags, and a single metro already inside a selected region, are the usual extras."
      : "Close to the limit: " + t.length + " of 32 tags, about " + bytes + " of 172 bytes. One or two more and the list will not fit.";
    $("abbrCopy").disabled = over; $("abbrOut").classList.toggle("over", over);
  }
  $("abbrFw").addEventListener("change", renderAbbr);
  $("abbrCopy").addEventListener("click", function () {
    var text = $("abbrOut").textContent, b = $("abbrCopy");
    try { navigator.clipboard.writeText(text).then(function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy"; }, 1800); }); } catch (e) {}
  });
  renderAbbr();
  /* mode switch */

  var sMetro = null, sBand = null;
  function sChip(host, def, label, small) {
    var b = document.createElement("button"); b.type = "button"; b.className = "chip" + (def.pub === false || (host === "simpleMetros" && !def.pub) ? " conv" : "");
    b.dataset.code = def.code; b.setAttribute("aria-pressed", "false"); b.innerHTML = "<b>" + label + "</b>" + (small ? "<small>" + small + "</small>" : "");
    $(host).appendChild(b); return b;
  }
  METROS.forEach(function (m) { sChip("simpleMetros", m, m.code, m.name).addEventListener("click", function () { sMetro = sMetro === m.code ? null : m.code; renderSimple(); }); });
  BANDS.forEach(function (bd) { sChip("simpleBands", { code: bd.key, pub: false }, bd.name, bd.tag).addEventListener("click", function () { sBand = sBand === bd.key ? null : bd.key; renderSimple(); }); });
  function renderSimple() {
    var t = ["us", "us-in"]; if (sMetro) t.push(sMetro);
    var bd = BANDS.filter(function (b) { return b.key === sBand; })[0];
    if (bd) t.push(bd.tag);
    document.querySelectorAll("#simpleMetros .chip").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.code === sMetro)); });
    document.querySelectorAll("#simpleBands .chip").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.code === sBand)); });
    var fw = $("simpleFw").value, lines = [];
    if (fw === "1.16") lines.push("region def " + t.map(function (x, i) { return i < t.length - 1 ? x + "|*" : x; }).join(" "));
    else { t.forEach(function (x) { lines.push("region put " + x); }); if (fw === "1.14") t.forEach(function (x) { lines.push("region allowf " + x); }); }
    lines.push("region allowf *", "region save", "region list allowed");
    $("simpleOut").textContent = lines.join("\n");
    $("simpleBudget").textContent = t.length + " of 32 region slots · about " + t.join(",").length + " of 172 Discover Regions bytes";
    $("simpleBandNote").textContent = bd ? bd.tag + " covers the " + bd.regions.join(", ") + " regions of the Visit Indiana map." : "No third picked: the repeater carries only us, us-in" + (sMetro ? ", and " + sMetro : "") + ".";
  }
  $("simpleFw").addEventListener("change", renderSimple);
  $("simpleCopy").addEventListener("click", function () {
    var text = $("simpleOut").textContent, b = $("simpleCopy");
    function done() { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy"; }, 1400); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done); else done();
  });
  renderSimple();

  var S = $("modeSimple"), A = $("modeAbbr"), F = $("modeFull"), simple = $("simple"), abbr = $("abbr"), full = $("fullBuilder");
  function mode(m) {
    if (m !== "full" && m !== "abbr") m = "simple";
    S.setAttribute("aria-pressed", String(m === "simple")); A.setAttribute("aria-pressed", String(m === "abbr")); F.setAttribute("aria-pressed", String(m === "full"));
    simple.hidden = m !== "simple"; abbr.hidden = m !== "abbr"; full.hidden = m !== "full";
    try { localStorage.setItem("ioc-scope-mode", m); } catch (e) {}
    if (m === "full") window.dispatchEvent(new Event("resize"));
  }
  /* County & district mode: channel names for the counties picked on the map, without touching the builder */
  /* The builder's render() and state live in the shared global scope of the earlier classic script. */
  var hasBuilder = false; try { hasBuilder = typeof render === "function" && typeof state === "object"; } catch (e) {}
  if (hasBuilder) {
    var fullRender = render;
    render = function () {
      fullRender.apply(this, arguments);
      var host = $("fullChans"); if (!host) return; host.innerHTML = "";
      var picked = (state.sel || []).map(function (k) { var i = String(k).indexOf(":"); return { st: String(k).slice(0, i), name: String(k).slice(i + 1) }; });
      if (!picked.length) { host.innerHTML = '<span class="sub">Pick counties on the map above.</span>'; return; }
      var names = [];
      picked.forEach(function (c) {
        var n = chanName(c.name + (c.st !== "IN" ? c.st : "")); if (names.indexOf(n) < 0) names.push(n);
        Object.keys(PLACES).forEach(function (code) { if (c.st === "IN" && PLACES[code].counties.indexOf(c.name) >= 0) PLACES[code].cities.forEach(function (city) { var cn = chanName(city); if (names.indexOf(cn) < 0) names.push(cn); }); });
      });
      names.forEach(function (n) { chanChip(n, host); });
    };
    try { render(); } catch (e) {}
  }
  S.addEventListener("click", function () { mode("simple"); });
  A.addEventListener("click", function () { mode("abbr"); });
  F.addEventListener("click", function () { mode("full"); });
  var saved = null; try { saved = localStorage.getItem("ioc-scope-mode"); } catch (e) {}
  mode(saved);
})();
