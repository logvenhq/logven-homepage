// The footer wordmark's light: a soft glow in the palette that shows inside the letters only.
// It follows the pointer over the footer, easing after it, and drifts slowly along the word when
// the pointer is elsewhere or on touch screens. It only moves while the footer is on screen, and
// stays still in the middle of the word with reduced motion.
(() => {
  const svg = document.querySelector("[data-wordmark]");
  const light = svg && svg.querySelector("[data-wordmark-light]");
  if (!light) return;
  const footer = svg.closest("footer") || svg.parentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // The word's ink box, from the viewBox.
  const { x: left, y: top, width, height } = svg.viewBox.baseVal;
  const middle = { x: left + width * 0.55, y: top + height * 0.5 };
  const position = { ...middle };
  let pointer = null;
  let visible = false;
  let frame = 0;

  const place = () => {
    light.setAttribute("cx", position.x.toFixed(1));
    light.setAttribute("cy", position.y.toFixed(1));
  };

  // Where the light wanders when nobody's pointing: slowly back and forth along the word.
  const drift = (now) => {
    const t = now / 1000;
    return {
      x: left + width * (0.5 + 0.42 * Math.sin(t * 0.22)),
      y: top + height * (0.5 + 0.18 * Math.sin(t * 0.37)),
    };
  };

  const tick = (now) => {
    const target = pointer || drift(now);
    position.x += (target.x - position.x) * 0.06;
    position.y += (target.y - position.y) * 0.06;
    place();
    frame = requestAnimationFrame(tick);
  };

  const update = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    if (reduceMotion.matches) {
      Object.assign(position, middle);
      place();
    } else if (visible) {
      frame = requestAnimationFrame(tick);
    }
  };

  footer.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    pointer = { x: point.x, y: point.y };
  });
  footer.addEventListener("pointerleave", () => {
    pointer = null;
  });

  new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    if (visible) svg.classList.add("is-lit");
    update();
  }).observe(svg);

  reduceMotion.addEventListener("change", update);
  place();
})();
