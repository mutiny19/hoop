/* Follows the system theme; a visitor's own choice is remembered. Loaded in <head> so it runs before paint. */
(function () { var t; try { t = localStorage.getItem("ioc-theme"); } catch (e) {} document.documentElement.setAttribute("data-theme", t === "light" || t === "dark" ? t : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")); })();
