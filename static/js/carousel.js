(() => {
  const tracks = [...document.querySelectorAll("[data-carousel-track]")];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  tracks.forEach((track) => {
    const section = track.closest("section");
    if (!section) return;

    const prev = section.querySelector("[data-carousel-prev]");
    const next = section.querySelector("[data-carousel-next]");
    if (!prev || !next) return;

    const update = () => {
      prev.disabled = track.scrollLeft <= 1;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
    };

    const step = (direction) => {
      const item = track.firstElementChild;
      if (!item) return;

      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      track.scrollBy({
        left: direction * (item.getBoundingClientRect().width + gap),
        behavior: reduceMotion.matches ? "auto" : "smooth",
      });
    };

    prev.addEventListener("click", () => step(-1));
    next.addEventListener("click", () => step(1));
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  });
})();
