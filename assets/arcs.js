/* Packet arcs on the home-page map. NOT LOADED by index.html: the map shows no traffic that is not real.
   Keep this file for the day a real packet feed exists; wire it in with setSource and only then add the script tag.
   As written the default driver is decorative: random hops between repeaters that are close enough to hear each
   other. The drawing code only knows about "a hop from A to B", so a real feed can replace the
   decorative driver without touching the drawing:

     HOOP.arcs.hop([lat, lon], [lat, lon], { ttl: 2.5 })   // draw one hop now
     HOOP.arcs.setSource(function (emit) { ... })          // replace the random driver; call emit(a, b)
     HOOP.arcs.stop()                                      // turn the arcs off

   The repeater list arrives from home.js as window.HOOP.repeaters plus a "hoop:repeaters" event.
   Off on narrow screens and under prefers-reduced-motion. */
(function () {
  var svg = document.getElementById("mapsvg"), legend = document.getElementById("arcLegend");
  if (!svg || !window.HOOP || typeof HOOP.project !== "function") return;
  var NS = "http://www.w3.org/2000/svg";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var narrow = window.matchMedia && window.matchMedia("(max-width: 760px)").matches;
  var layer = document.createElementNS(NS, "g"); layer.setAttribute("id", "lyr-arcs"); layer.setAttribute("fill", "none");
  var nets = document.getElementById("lyr-nets"); svg.insertBefore(layer, nets);
  var hops = [], running = false, source = null, stopSource = null, last = 0, hidden = false;
  var MAX_KM = 45;   /* a typical repeater-to-repeater distance; rarer long hops look wrong */

  function km(a, b) {
    var R = 6371, dLat = (b[0] - a[0]) * Math.PI / 180, dLon = (b[1] - a[1]) * Math.PI / 180, la = a[0] * Math.PI / 180, lb = b[0] * Math.PI / 180;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(la) * Math.cos(lb) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function hop(a, b, opts) {
    opts = opts || {};
    var p = HOOP.project(a[0], a[1]), q = HOOP.project(b[0], b[1]);
    var mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy) || 1;
    var cx = mx - dy / len * len * 0.28, cy = my + dx / len * len * 0.28;   /* bow the arc to one side */
    var path = document.createElementNS(NS, "path");
    path.setAttribute("d", "M" + p[0].toFixed(1) + "," + p[1].toFixed(1) + " Q" + cx.toFixed(1) + "," + cy.toFixed(1) + " " + q[0].toFixed(1) + "," + q[1].toFixed(1));
    path.setAttribute("stroke", opts.color || "#FFD8A8"); path.setAttribute("stroke-width", "2.2"); path.setAttribute("stroke-linecap", "round");
    layer.appendChild(path);
    var L = path.getTotalLength(); path.setAttribute("stroke-dasharray", L); path.setAttribute("stroke-dashoffset", L);
    var dot = document.createElementNS(NS, "circle"); dot.setAttribute("r", "3.4"); dot.setAttribute("fill", "#FFFFFF"); layer.appendChild(dot);
    hops.push({ path: path, dot: dot, L: L, t: 0, ttl: opts.ttl || 3 });
  }

  function frame(now) {
    if (!running) return;
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
    if (!hidden) for (var i = hops.length - 1; i >= 0; i--) {
      var h = hops[i]; h.t += dt; var f = h.t / h.ttl;
      if (f >= 1) { h.path.remove(); h.dot.remove(); hops.splice(i, 1); continue; }
      var drawn = Math.min(1, f * 1.6);                     /* the line draws itself in the first 60% */
      h.path.setAttribute("stroke-dashoffset", (h.L * (1 - drawn)).toFixed(1));
      h.path.setAttribute("stroke-opacity", (f < 0.6 ? 0.9 : 0.9 * (1 - (f - 0.6) / 0.4)).toFixed(2));
      var pt = h.path.getPointAtLength(h.L * drawn); h.dot.setAttribute("cx", pt.x.toFixed(1)); h.dot.setAttribute("cy", pt.y.toFixed(1));
      h.dot.setAttribute("opacity", drawn < 1 ? "1" : "0");
    }
    requestAnimationFrame(frame);
  }

  /* Decorative driver: a hop every second or so between two repeaters within MAX_KM, heard in 30 days. */
  function randomDriver(emit) {
    var timer, list = (HOOP.repeaters || []).filter(function (r) { return r.in && (Date.now() - Date.parse(r.seen)) < 30 * 86400000; });
    var pairs = [];
    for (var i = 0; i < list.length; i++) for (var j = i + 1; j < list.length; j++) {
      var a = [list[i].lat, list[i].lon], b = [list[j].lat, list[j].lon], d = km(a, b);
      if (d > 3 && d < MAX_KM) pairs.push([a, b]);
    }
    if (!pairs.length) return function () {};
    function tick() {
      var pr = pairs[Math.floor(Math.random() * pairs.length)];
      if (Math.random() < 0.5) emit(pr[0], pr[1]); else emit(pr[1], pr[0]);
      timer = setTimeout(tick, 250 + Math.random() * 700);
    }
    tick();
    return function () { clearTimeout(timer); };
  }

  function start() {
    if (running || reduce || narrow) return;
    running = true; last = 0; requestAnimationFrame(frame);
    stopSource = (source || randomDriver)(hop);
    if (legend) legend.hidden = false;
  }
  function stop() { running = false; if (stopSource) stopSource(); stopSource = null; hops.forEach(function (h) { h.path.remove(); h.dot.remove(); }); hops = []; if (legend) legend.hidden = true; }

  HOOP.arcs = { hop: hop, start: start, stop: stop, setSource: function (fn) { source = fn; if (running) { stop(); start(); } } };
  document.addEventListener("visibilitychange", function () { hidden = document.hidden; last = 0; });
  if (HOOP.repeaters) start(); else window.addEventListener("hoop:repeaters", start, { once: true });
})();
