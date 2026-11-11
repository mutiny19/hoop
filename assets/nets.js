/* Net schedule helpers shared by the home page and the Channel lists page (its full schedule). Reads data/nets.json; all times are Indiana (Eastern). */
(function (global) {
  "use strict";
  var TZ = "America/Indiana/Indianapolis";
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var fmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", hourCycle: "h23", weekday: "short" });

  function partsIn(date) {
    var o = {};
    fmt.formatToParts(date).forEach(function (p) { o[p.type] = p.value; });
    return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, wd: o.weekday };
  }
  /* A wall-clock time in Indiana -> a real Date. */
  function zoned(y, m, d, h, mi) {
    var guess = Date.UTC(y, m - 1, d, h, mi), p = partsIn(new Date(guess));
    var off = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - guess;
    return new Date(guess - off);
  }
  /* Every scheduled start between `from` and `to` (Dates), soonest first. */
  function occurrences(data, from, to) {
    var out = [], start = partsIn(new Date(from.getTime() - 86400000));
    for (var i = 0; i < 40; i++) {
      var dayStart = zoned(start.y, start.m, start.d + i, 12, 0), p = partsIn(dayStart);
      if (zoned(p.y, p.m, p.d, 0, 0) > to) break;
      var nth = Math.ceil(p.d / 7);
      var add = function (n, monthly) {
        var hm = n.time.split(":"), t = zoned(p.y, p.m, p.d, +hm[0], +hm[1]);
        if (t >= new Date(from.getTime() - (data.default_minutes || 60) * 60000) && t <= to) out.push({ net: n, start: t, monthly: monthly });
      };
      (data.weekly || []).forEach(function (n) { if (n.day === p.wd) add(n, false); });
      (data.monthly || []).forEach(function (n) { if (n.day === p.wd && n.weeks.indexOf(nth) >= 0) add(n, true); });
    }
    return out.sort(function (a, b) { return a.start - b.start; });
  }
  function timeLabel(hhmm) {
    var hm = hhmm.split(":"), h = +hm[0], ap = h >= 12 ? "PM" : "AM";
    return ((h + 11) % 12 + 1) + ":" + hm[1] + " " + ap;
  }
  function whenLabel(date) {
    return date.toLocaleString("en-US", { timeZone: TZ, weekday: "short", hour: "numeric", minute: "2-digit" });
  }
  function load(url) { return fetch(url, { cache: "no-cache" }).then(function (r) { return r.json(); }); }
  function monthlyLabel(n) {
    var ord = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th" };
    return n.weeks.map(function (w) { return ord[w]; }).join(" & ") + " " + n.day;
  }
  /* A net's own page (data/nets.json "link"), or the prefilled issue that asks for one. base is "" on the home page and "../" on the others. */
  function addLinkUrl(n) {
    return "https://github.com/mutiny19/hoop/issues/new?template=channel-listing.yml&title=" + encodeURIComponent("[channels] Link for " + n.name) +
      "&what=" + encodeURIComponent("Add a link or website to a listing") + "&name=" + encodeURIComponent(n.name) + "&freq=" + encodeURIComponent(n.freq || "");
  }
  function linkOf(n, base) {
    if (!n.link) return { has: false, ext: true, href: addLinkUrl(n) };
    var ext = /^https?:/.test(n.link);
    return { has: true, ext: ext, href: ext ? n.link : (base || "") + n.link };
  }
  global.Nets = { TZ: TZ, DAYS: DAYS, occurrences: occurrences, timeLabel: timeLabel, whenLabel: whenLabel, load: load, monthlyLabel: monthlyLabel, linkOf: linkOf };
})(window);
