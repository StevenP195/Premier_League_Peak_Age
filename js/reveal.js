(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // --- scroll-reveal for figures, cards, and quotes ---
  const revealTargets = document.querySelectorAll(
    "section.finding, .chart-card, .callout-stat, .pull-quote, .stat-tile, .globe-card, .pitch-card"
  );

  if (reduceMotion) {
    revealTargets.forEach((el) => el.classList.add("is-visible"));
  } else {
    revealTargets.forEach((el, i) => {
      el.classList.add("reveal");
      el.style.transitionDelay = (i % 3) * 60 + "ms";
    });
    const revealIO = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealTargets.forEach((el) => revealIO.observe(el));
  }

  // --- count-up animation for headline numbers ---
  const countIds = ["stat-matches", "stat-seasons", "stat-players", "stat-peak-age", "callout-value-number"];
  const done = new Set();

  function animateCount(el, target) {
    if (reduceMotion) {
      el.textContent = target.toLocaleString();
      return;
    }
    const duration = 1100;
    const t0 = performance.now();
    function frame(now) {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString();
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = target.toLocaleString();
    }
    requestAnimationFrame(frame);
  }

  function waitAndAnimate(el, attemptsLeft) {
    const raw = el.textContent.trim().replace(/,/g, "");
    const num = parseInt(raw, 10);
    if (!isNaN(num) && raw !== "") {
      done.add(el);
      animateCount(el, num);
    } else if (attemptsLeft > 0) {
      setTimeout(() => waitAndAnimate(el, attemptsLeft - 1), 120);
    }
  }

  const countIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !done.has(entry.target)) {
          waitAndAnimate(entry.target, 30);
        }
      });
    },
    { threshold: 0.4 }
  );

  countIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) countIO.observe(el);
  });
})();
