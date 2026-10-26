(() => {
  const textElements = [...document.querySelectorAll("[data-reveal]")];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const reveal = (element) => {
    element.classList.add("is-visible");
  };

  const revealAll = () => {
    textElements.forEach(reveal);
  };

  if (reduceMotion.matches) {
    revealAll();
    return;
  }

  if (!textElements.length) return;

  const viewportHeight = window.innerHeight;
  // Read every position before changing styles: interleaving these operations
  // forced a full layout for each element. Keep the first viewport visible.
  const laterElements = textElements.filter((element) => element.getBoundingClientRect().top >= viewportHeight);
  laterElements.forEach((element) => { element.dataset.revealText = ""; });
  const pendingRevealTimers = new Set();

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries
        .filter((entry) => entry.isIntersecting)
        .forEach((entry, index) => {
          revealObserver.unobserve(entry.target);
          const timer = window.setTimeout(() => {
            reveal(entry.target);
            pendingRevealTimers.delete(timer);
          }, index * 90);
          pendingRevealTimers.add(timer);
        });
    },
    { rootMargin: "0px 0px -8%" },
  );

  laterElements.forEach((element) => revealObserver.observe(element));

  reduceMotion.addEventListener("change", (event) => {
    if (!event.matches) return;

    pendingRevealTimers.forEach((timer) => window.clearTimeout(timer));
    pendingRevealTimers.clear();
    revealObserver.disconnect();
    revealAll();
  });
})();
