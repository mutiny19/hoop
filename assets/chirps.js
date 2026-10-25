/* Background behind the map band's headline: an SDR waterfall with a sparse mesh constellation over it.
   Modelled on real receiver displays: grainy blue noise floor, carriers as hot vertical columns, wide smears,
   and short bursts that stand in for LoRa packets. Decoration only, nothing here is real traffic.
   Pauses in hidden tabs; draws one still frame under prefers-reduced-motion. */
(function () {
  var wfCanvas = document.getElementById("bgChirps"), meshCanvas = document.getElementById("bgMesh");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 2), hidden = false;
  document.addEventListener("visibilitychange", function () { hidden = document.hidden; });
  function light() { return document.documentElement.getAttribute("data-theme") === "light"; }

  /* ---------------- waterfall ---------------- */
  /* Modelled on a real receiver display (SDR++, Gqrx): a grainy deep-blue noise floor, carriers as sharp
     vertical columns that burn yellow and red at the centre and halo out to cyan, a few wide smears that
     come and go, and short bursts standing in for LoRa packets. 2-pixel bins, painted as image data. */
  if (wfCanvas) (function () {
    var ctx = wfCanvas.getContext("2d"), W = 0, H = 0, BIN = 2, ROW = 2, N = 0, acc = 0, last = 0;
    var SPEED = 22;                                       /* rows per second */
    var DARK = [[3, 6, 22], [8, 28, 110], [18, 78, 200], [40, 160, 230], [110, 230, 210], [250, 232, 90], [255, 125, 40], [255, 50, 40], [255, 250, 240]];
    var LIGHT = [[243, 241, 234], [222, 228, 240], [190, 210, 236], [150, 200, 228], [110, 196, 190], [230, 190, 60], [232, 110, 30], [200, 50, 30], [90, 20, 10]];
    var carriers = [], smears = [], bursts = [], floor = null, buf = null, vals = null;
    function pal() { return light() ? LIGHT : DARK; }
    function fit() {
      var r = wfCanvas.getBoundingClientRect(); W = Math.round(r.width); H = Math.round(r.height);
      wfCanvas.width = Math.floor(W * DPR); wfCanvas.height = Math.floor(H * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      N = Math.ceil(W / BIN); floor = new Float32Array(N); vals = new Float32Array(N); buf = ctx.createImageData(W, 1);
      for (var i = 0; i < N; i++) floor[i] = Math.random();
    }
    function seed() {
      carriers = []; for (var i = 0; i < 9; i++) carriers.push({ f: Math.random(), w: (0.6 + Math.random() * 1.6) / N, a: 0.45 + Math.random() * 0.55, drift: (Math.random() - 0.5) * 0.00012, flick: Math.random() });
      smears = []; bursts = [];
    }
    function row() {
      var i, k, p, x;
      for (i = 0; i < N; i++) { floor[i] += (Math.random() - 0.5) * 0.12 + (0.5 - floor[i]) * 0.03; vals[i] = 0.04 + floor[i] * 0.12 + Math.random() * 0.16; }
      /* sharp carriers with a halo */
      for (k = 0; k < carriers.length; k++) {
        p = carriers[k]; p.f += p.drift; if (p.f < 0.02 || p.f > 0.98) p.drift *= -1;
        p.flick += (Math.random() - 0.5) * 0.3; p.flick = Math.max(0, Math.min(1, p.flick));
        var amp = p.a * (0.55 + 0.45 * p.flick), c = p.f * N, span = Math.ceil(p.w * N * 4) + 3;
        for (i = Math.max(0, Math.floor(c - span)); i <= Math.min(N - 1, Math.ceil(c + span)); i++) {
          var d = (i - c) / N; vals[i] += amp * Math.exp(-(d * d) / (2 * p.w * p.w)) + amp * 0.22 * Math.exp(-(d * d) / (2 * (p.w * 4) * (p.w * 4)));
        }
      }
      /* wide smears, like a voice or data signal keying up for a while */
      if (Math.random() < 0.012 && smears.length < 3) smears.push({ f: Math.random(), w: 0.015 + Math.random() * 0.035, a: 0.25 + Math.random() * 0.35, rows: 40 + Math.floor(Math.random() * 160) });
      for (k = smears.length - 1; k >= 0; k--) {
        p = smears[k]; var a2 = p.a * (0.7 + Math.random() * 0.6);
        for (i = 0; i < N; i++) { x = i / N - p.f; if (Math.abs(x) < p.w * 3) vals[i] += a2 * Math.exp(-(x * x) / (2 * p.w * p.w)) * (0.6 + Math.random() * 0.8); }
        if (--p.rows <= 0) smears.splice(k, 1);
      }
      /* bursts: a packet on a few bins for a handful of rows */
      if (Math.random() < 0.08) bursts.push({ b0: Math.floor(Math.random() * (N - 6)), n: 2 + Math.floor(Math.random() * 4), rows: 4 + Math.floor(Math.random() * 14), a: 0.6 + Math.random() * 0.5 });
      for (k = bursts.length - 1; k >= 0; k--) { p = bursts[k]; for (i = p.b0; i < p.b0 + p.n; i++) vals[i] += p.a * (0.7 + Math.random() * 0.4); if (--p.rows <= 0) bursts.splice(k, 1); }
      /* colour the row */
      var P = pal(), d8 = buf.data, M = P.length - 1;
      for (x = 0; x < W; x++) {
        var v = vals[Math.min(N - 1, (x / BIN) | 0)]; v = v < 0 ? 0 : v > 1 ? 1 : v;
        var t = v * M, j = t | 0, f = t - j, A = P[j], B = P[Math.min(j + 1, M)], o = x * 4;
        d8[o] = A[0] + (B[0] - A[0]) * f; d8[o + 1] = A[1] + (B[1] - A[1]) * f; d8[o + 2] = A[2] + (B[2] - A[2]) * f; d8[o + 3] = 255;
      }
      ctx.putImageData(buf, 0, 0); if (ROW > 1) ctx.drawImage(wfCanvas, 0, 0, wfCanvas.width, DPR, 0, 1, W, ROW - 1);
    }
    function shift() { ctx.drawImage(wfCanvas, 0, 0, wfCanvas.width, wfCanvas.height, 0, ROW, W, H); }
    function prefill() { for (var y = 0; y < H; y += ROW) { shift(); row(); } }
    function frame(now) {
      if (!hidden) {
        var dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now; acc += dt * SPEED;
        while (acc >= 1) { shift(); row(); acc -= 1; }
      } else last = 0;
      if (!reduce) requestAnimationFrame(frame);
    }
    fit(); seed(); prefill();
    var lastW = W;
    window.addEventListener("resize", function () { var w = wfCanvas.getBoundingClientRect().width; if (Math.abs(w - lastW) < 2) return; lastW = w; fit(); seed(); prefill(); }, { passive: true });
    var lastTheme = light();
    new MutationObserver(function () { if (light() !== lastTheme) { lastTheme = light(); prefill(); } }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    if (!reduce) requestAnimationFrame(frame);
  })();

  /* ---------------- constellation ---------------- */
  if (meshCanvas) (function () {
    var ctx = meshCanvas.getContext("2d"), W = 0, H = 0, nodes = [], pulses = [], LINK = 150, last = 0;
    function fit() { var r = meshCanvas.getBoundingClientRect(); W = Math.round(r.width); H = Math.round(r.height); meshCanvas.width = Math.floor(W * DPR); meshCanvas.height = Math.floor(H * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
    function seed() { nodes = []; var n = Math.max(14, Math.min(48, Math.round(W * H / 26000))); for (var i = 0; i < n; i++) nodes.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, r: 1.3 + Math.random() * 1.8 }); }
    function frame(now) {
      if (!hidden) {
        var dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
        var ink = light() ? "19, 32, 28" : "214, 236, 230";
        ctx.clearRect(0, 0, W, H);
        nodes.forEach(function (n) { n.x += n.vx * dt; n.y += n.vy * dt; if (n.x < 0 || n.x > W) n.vx *= -1; if (n.y < 0 || n.y > H) n.vy *= -1; });
        ctx.lineWidth = 1;
        for (var i = 0; i < nodes.length; i++) for (var j = i + 1; j < nodes.length; j++) {
          var a = nodes[i], b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK) { ctx.strokeStyle = "rgba(" + ink + "," + ((1 - d / LINK) * 0.2).toFixed(3) + ")"; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        }
        nodes.forEach(function (n) { ctx.fillStyle = "rgba(" + ink + ",0.8)"; ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill(); });
        if (!reduce && Math.random() < dt * 1.2 && nodes.length > 1) {
          var p = nodes[Math.floor(Math.random() * nodes.length)], near = nodes.filter(function (q) { return q !== p && Math.hypot(p.x - q.x, p.y - q.y) < LINK * 1.4; });
          if (near.length) pulses.push({ a: p, b: near[Math.floor(Math.random() * near.length)], t: 0 });
        }
        for (var k = pulses.length - 1; k >= 0; k--) {
          var u = pulses[k]; u.t += dt * 0.8; if (u.t >= 1) { pulses.splice(k, 1); continue; }
          var x = u.a.x + (u.b.x - u.a.x) * u.t, y = u.a.y + (u.b.y - u.a.y) * u.t;
          ctx.fillStyle = "#E8590C"; ctx.shadowColor = "#E8590C"; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        }
      } else last = 0;
      if (!reduce) requestAnimationFrame(frame);
    }
    fit(); seed();
    var lastW = W;
    window.addEventListener("resize", function () { var w = meshCanvas.getBoundingClientRect().width; if (Math.abs(w - lastW) < 2) return; lastW = w; fit(); seed(); }, { passive: true });
    requestAnimationFrame(frame);
  })();
})();
