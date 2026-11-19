// A small scroll lag for the comment cards; the mockup windows stay fixed.
(() => {
  const stage = document.querySelector(".mock__stage");
  if (!stage) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const notes = [...stage.querySelectorAll(".mock__note")];
  const weights = [0.48, 0.7, 1];
  let visible = false;
  let frame = 0;
  let previous = scrollY;
  let lag = 0;
  let offset = 0;
  let lastTime = 0;

  const paint = () => notes.forEach((note, i) => {
    const value = `0 ${(offset * weights[i]).toFixed(2)}px`;
    note.style.translate = value;
  });

  const reset = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    lag = offset = 0;
    previous = scrollY;
    paint();
  };

  const tick = (now) => {
    const dt = Math.min(48, now - lastTime);
    lastTime = now;
    lag *= Math.exp(-dt / 180);
    offset += (lag - offset) * (1 - Math.exp(-dt / 85));
    paint();
    if (Math.abs(lag) + Math.abs(offset) > 0.05) {
      frame = requestAnimationFrame(tick);
    } else reset();
  };

  addEventListener("scroll", () => {
    const delta = scrollY - previous;
    previous = scrollY;
    if (!visible || reduce.matches) return;
    lag = Math.max(-22, Math.min(22, lag + delta * 0.16));
    if (!frame) {
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }, { passive: true });

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) reset();
  }).observe(stage);
  reduce.addEventListener("change", reset);
})();
