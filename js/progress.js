(function () {
  const fill = document.getElementById("scroll-fill");
  if (!fill) return;
  function update() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - window.innerHeight;
    const pct = height > 0 ? Math.min(100, (scrollTop / height) * 100) : 0;
    fill.style.width = pct + "%";
  }
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
})();
