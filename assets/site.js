/* Shared behaviour for every page: nav menu, theme button, background toggle, and Copy buttons that carry data-copy="<id>". */
(function () {
  var m = document.getElementById("navMenu"), more = document.getElementById("navMore");
  if (m) m.addEventListener("click", function () { var open = m.getAttribute("aria-expanded") === "true"; m.setAttribute("aria-expanded", String(!open)); more.classList.toggle("open", !open); });
})();
(function () {
  var b = document.getElementById("themeBtn"), root = document.documentElement;
  if (!b) return;
  function sync() { var dark = root.getAttribute("data-theme") !== "light", l = dark ? "Switch to light mode" : "Switch to dark mode"; b.setAttribute("aria-label", l); b.title = l; }
  b.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("ioc-theme", next); } catch (e) {}
    sync();
  });
  sync();
})();
(function () {
  var b = document.getElementById("bgBtn"), root = document.documentElement;
  if (!b) return;
  function sync() { var off = root.getAttribute("data-bg") === "off", l = off ? "Turn the background animation back on" : "Turn off the background animation"; b.setAttribute("aria-label", l); b.title = l; b.setAttribute("aria-pressed", String(off)); }
  b.addEventListener("click", function () {
    var next = root.getAttribute("data-bg") === "off" ? "on" : "off";
    if (next === "off") root.setAttribute("data-bg", "off"); else root.removeAttribute("data-bg");
    try { localStorage.setItem("hoop-bg", next); } catch (e) {}
    sync();
  });
  sync();
})();
document.querySelectorAll("button.copy[data-copy]").forEach(function (btn) {
  btn.addEventListener("click", function () {
    var el = document.getElementById(btn.dataset.copy);
    var text = el.textContent;
    function selectIt() {
      var r = document.createRange(); r.selectNodeContents(el);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      btn.textContent = "Selected: press Ctrl/Cmd+C";
    }
    try {
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = "Copied";
        setTimeout(function () { btn.textContent = "Copy"; }, 1800);
      }, selectIt);
    } catch (e) { selectIt(); }
  });
});

/* #meshnet clock, written once: Sundays and Thursdays 7:00 to 7:10 PM US Eastern (change with data/nets.json, tools/meshnet_log.py and meshnet.yml).
   HOOP.net.at7 and .parts are used by the #meshnet page's time-zone list; the slim "Next #meshnet" bar below shows on every other page. */
(function () {
  var NET = "America/Indiana/Indianapolis", DAYS = { Sun: 1, Thu: 1 };
  window.HOOP = window.HOOP || {};
  function parts(d, tz) { var o = {}; new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short" }).formatToParts(d).forEach(function (x) { o[x.type] = x.value; }); return o; }
  function at7(y, m, d) { /* the instant it is 19:00 on y-m-d in Indiana */
    var t = Date.UTC(y, m - 1, d, 24, 0);
    for (var i = 0; i < 2; i++) { var q = parts(new Date(t), NET), seen = Date.UTC(+q.year, +q.month - 1, +q.day, +q.hour % 24, +q.minute); t += Date.UTC(y, m - 1, d, 19, 0) - seen; }
    return new Date(t);
  }
  /* the net start nearest to now in direction dir (+1: the one in progress or next; -1: the latest that has ended) */
  function find(now, dir) {
    for (var k = 0; k < 9; k++) {
      var q = parts(new Date(now.getTime() + dir * k * 864e5), NET);
      if (!DAYS[q.weekday]) continue;
      var s = at7(+q.year, +q.month, +q.day);
      if (dir > 0 ? s.getTime() + 10 * 6e4 > now.getTime() : s.getTime() + 10 * 6e4 <= now.getTime()) return s;
    }
    return null;
  }
  HOOP.net = { tz: NET, parts: parts, at7: at7, next: function (now) { return find(now || new Date(), 1); }, last: function (now) { return find(now || new Date(), -1); } };

  var notice = document.querySelector(".site-notice");
  if (!notice || /\/meshnet\/?$/.test(location.pathname) || !window.Intl) return;
  var me = document.querySelector('script[src*="assets/site.js"]'), root = me ? me.getAttribute("src").replace(/assets\/site\.js.*$/, "") : "";
  var bar = document.createElement("a");
  bar.className = "nextnet"; bar.href = root + "meshnet/";
  notice.appendChild(bar);
  var logged = null;   // { date, n } for the net that ended in the last 24 hours, once its log is in
  function dayName(d) { return new Intl.DateTimeFormat("en-US", { timeZone: NET, weekday: "long" }).format(d); }
  function render() {
    var now = new Date(), nx = HOOP.net.next(now), t;
    if (!nx) { bar.hidden = true; return; }
    var ms = nx - now;
    if (ms <= 0) t = "<b>#meshnet is on now</b> (7:00 to 7:10 PM US Eastern). Check in";
    else {
      var m = Math.round(ms / 6e4), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60), mi = m % 60;
      var left = d ? d + " d " + h + " h" : h ? h + " h " + mi + " min" : mi + " min";
      t = "<b>Next #meshnet:</b> " + dayName(nx) + " 7:00 PM US Eastern, in " + left;
    }
    if (logged && ms > 0) t = "<b>#meshnet logged:</b> " + logged + (logged === 1 ? " check-in" : " check-ins") + " last time. " + t.replace("<b>Next #meshnet:</b> ", "Next: ");
    bar.innerHTML = t + ' <span aria-hidden="true">→</span>';
  }
  render(); setInterval(render, 30000);
  var last = HOOP.net.last(), now0 = new Date();
  if (last && now0 - last < 24 * 36e5 + 10 * 6e4) {
    var q = parts(last, NET), iso = q.year + "-" + q.month + "-" + q.day;
    fetch(root + "data/meshnet/log.json").then(function (r) { return r.json(); }).then(function (d) {
      var n = (d.nets || []).filter(function (x) { return x.date === iso; })[0];
      if (n) { logged = (n.checkins || []).length; render(); }
    }).catch(function () {});
  }
})();

/* Offline: register the service worker (sw.js at the site root) and say so when the page is a saved copy. */
(function () {
  var me = document.querySelector('script[src*="assets/site.js"]'), root = me ? me.getAttribute("src").replace(/assets\/site\.js.*$/, "") : "";
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register(root + "sw.js").catch(function () {});
  var bar = null;
  function show() {
    if (navigator.onLine !== false) { if (bar) bar.hidden = true; return; }
    if (!bar) { bar = document.createElement("div"); bar.className = "offbar"; bar.setAttribute("role", "status"); var n = document.querySelector(".site-notice"); if (n) n.insertBefore(bar, n.firstChild); else document.body.insertBefore(bar, document.body.firstChild); }
    bar.hidden = false; bar.textContent = "You're offline. This is the copy saved on this device.";
    fetch(location.href).then(function (r) { var d = r.headers.get("date"); if (d) bar.textContent = "You're offline. This is the copy saved on this device, from " + new Date(d).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + "."; }).catch(function () {});
  }
  window.addEventListener("offline", show); window.addEventListener("online", show); show();
})();
