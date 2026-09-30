(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const autoplayDelay = 5000;

  document.querySelectorAll("[data-carousel]").forEach((carousel) => {
    const viewport = carousel.querySelector("[data-carousel-viewport]");
    const slides = [...viewport.querySelectorAll(".carousel__slide")];
    const previous = carousel.querySelector("[data-carousel-prev]");
    const next = carousel.querySelector("[data-carousel-next]");
    const progress = carousel.querySelector("[data-carousel-progress]");

    if (!slides.length) return;

    let autoplayTimer = 0;
    let isHovered = false;
    let isVisible = false;
    let userHasTakenOver = false;

    const maxScroll = () => viewport.scrollWidth - viewport.clientWidth;
    const slideStep = () => {
      const [first, second] = slides;
      return second ? second.offsetLeft - first.offsetLeft : first.offsetWidth;
    };

    const sync = () => {
      const max = maxScroll();
      const visibleShare = viewport.clientWidth / viewport.scrollWidth;
      const scrolledShare = max > 0 ? viewport.scrollLeft / max : 1;

      progress?.style.setProperty(
        "--progress",
        (visibleShare + (1 - visibleShare) * scrolledShare).toFixed(3),
      );
      previous.disabled = viewport.scrollLeft <= 2;
      next.disabled = viewport.scrollLeft >= max - 2;
    };

    const scrollBySlides = (direction) => {
      viewport.scrollBy({ left: direction * slideStep(), behavior: "smooth" });
    };

    const stopAutoplay = () => {
      window.clearTimeout(autoplayTimer);
      autoplayTimer = 0;
    };

    const scheduleAutoplay = () => {
      stopAutoplay();
      if (userHasTakenOver || isHovered || !isVisible || document.hidden || reduceMotion.matches) {
        return;
      }

      autoplayTimer = window.setTimeout(() => {
        if (viewport.scrollLeft >= maxScroll() - 2) {
          viewport.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          scrollBySlides(1);
        }
        scheduleAutoplay();
      }, autoplayDelay);
    };

    const takeOver = () => {
      userHasTakenOver = true;
      stopAutoplay();
    };

    previous.addEventListener("click", () => {
      takeOver();
      scrollBySlides(-1);
    });
    next.addEventListener("click", () => {
      takeOver();
      scrollBySlides(1);
    });
    viewport.addEventListener("pointerdown", takeOver, { passive: true });
    viewport.addEventListener("wheel", (event) => {
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) takeOver();
    }, { passive: true });
    viewport.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      takeOver();
      scrollBySlides(event.key === "ArrowRight" ? 1 : -1);
    });
    viewport.addEventListener("scroll", sync, { passive: true });

    carousel.addEventListener("pointerenter", () => {
      isHovered = true;
      stopAutoplay();
    });
    carousel.addEventListener("pointerleave", () => {
      isHovered = false;
      scheduleAutoplay();
    });
    carousel.addEventListener("focusin", takeOver);

    new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible) scheduleAutoplay();
      else stopAutoplay();
    }, { threshold: 0.35 }).observe(carousel);

    new ResizeObserver(sync).observe(viewport);
    document.addEventListener("visibilitychange", scheduleAutoplay);
    reduceMotion.addEventListener("change", scheduleAutoplay);
    sync();
  });
})();
