(function () {
  const hero = document.getElementById("hero");
  const nav = document.getElementById("site-nav");
  if (!hero || !nav) return;

  const heroImg = document.getElementById("hero-img");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function onScroll() {
    const threshold = hero.offsetHeight - 72;
    if (window.scrollY > threshold) {
      nav.classList.add("scrolled");
    } else {
      nav.classList.remove("scrolled");
    }
    if (heroImg && !reduceMotion) {
      const shift = Math.min(window.scrollY * 0.22, 140);
      heroImg.style.transform = "translateY(" + shift + "px) scale(1.06)";
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
})();
