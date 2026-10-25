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