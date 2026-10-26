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
    track.addEventListener("keydown", (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const links = [...track.querySelectorAll(".card__link")];
      const index = links.indexOf(document.activeElement);
      if (index < 0) return;
      const target = links[index + (event.key === "ArrowRight" ? 1 : -1)];
      if (!target) return;
      event.preventDefault();
      target.focus({ preventScroll: true });
      track.scrollTo({
        left: target.closest(".carousel__item").offsetLeft - track.firstElementChild.offsetLeft,
        behavior: reduceMotion.matches ? "auto" : "smooth",
      });
    });
    window.addEventListener("resize", update);
    update();
  });
})();
