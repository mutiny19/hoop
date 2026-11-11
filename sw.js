/* HOOP offline support. Pages: the current version when online, the saved copy when offline or slow.
   Scripts, styles, fonts and images: the saved copy at once, refreshed in the background.
   data/*.json: network first, saved copy when offline. Anything on another site (weather, maps) is left alone.
   Bump CACHE when the list below changes, and whenever a script or stylesheet changes. */
var CACHE = "hoop-v15";
var PRECACHE = ["./", "meshcore/", "meshnet/", "emergency/", "live/", "projects/", "channels/",
  "assets/site.css", "assets/site.js", "assets/theme.js", "assets/home.js", "assets/nets.js", "assets/chirps.js",
  "assets/fonts/archivo.woff2", "assets/fonts/plex-mono-400.woff2", "assets/fonts/plex-mono-500.woff2",
  "assets/favicon.svg", "assets/mark.svg", "assets/meshnet-invite.png", "assets/meshnet-invite-utc.png", "assets/meshnet-channel-qr.svg", "assets/net-card-thumb.png",
  "resources/indy-metro-net-card.pdf", "resources/host-a-repeater-guide.pdf",
  "data/meshnet/log.json", "data/meshcore-nodes.json", "data/meshcore-history.json", "data/nws-zones.json", "data/nets.json", "data/nwr-indiana.json", "data/channels.json"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(PRECACHE.map(function (u) { return c.add(new Request(u, { cache: "reload" })).catch(function () {}); }));   // one missing file must not stop the rest
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  var isData = /\/data\//.test(u.pathname), key = isData ? new Request(u.origin + u.pathname) : r;   // data is saved without its ?t= cache-buster
  e.respondWith(caches.open(CACHE).then(function (c) {
    var save = function (res) { if (res && res.ok) c.put(key, res.clone()); return res; };
    if (isData) return fetch(r).then(save).catch(function () { return c.match(key); });
    /* Pages: check for the current version first, and show the saved copy only when there is no answer within 3 seconds or no network. */
    if (r.mode === "navigate") {
      var fresh = fetch(r).then(save);
      var slow = new Promise(function (ok) { setTimeout(ok, 3000); }).then(function () { return c.match(r, { ignoreSearch: true }); });
      return Promise.race([fresh, slow.then(function (hit) { return hit || fresh; })]).catch(function () { return c.match(r, { ignoreSearch: true }); });
    }
    /* An exact match first, so a new ?v= on a script or stylesheet is fetched fresh and never answered with the older saved file.
       The saved copy under any other ?v= is only a fallback for when the network fails. */
    return c.match(r).then(function (hit) {
      var net = fetch(r).then(save);
      if (hit) { e.waitUntil(net.catch(function () {})); return hit; }
      return net.catch(function () { return c.match(r, { ignoreSearch: true }); });
    });
  }));
});
