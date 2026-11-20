// Parallax: every [data-parallax] gets --p, how far it has travelled through the viewport, from -1
// as it enters at the bottom to 1 as it leaves at the top. Stylesheets turn it into a small
// shift per layer (the "How it works" windows, the tools capture), so back layers trail the front.
// Skipped for reduced motion, where --p stays unset and everything rests at 0.
(() => {
  const items = [...document.querySelectorAll("[data-parallax]")];
  if (!items.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const visible = new Set();
  let queued = false;

  const update = () => {
    queued = false;
    const height = window.innerHeight;
    visible.forEach((item) => {
      const box = item.getBoundingClientRect();
      const share = (height / 2 - (box.top + box.height / 2)) / (height / 2 + box.height / 2);
      item.style.setProperty("--p", Math.max(-1, Math.min(1, share)).toFixed(3));
    });
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => (entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target)));
    queue();
  });
  items.forEach((item) => observer.observe(item));
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
})();
