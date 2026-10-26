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
