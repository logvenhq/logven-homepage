/* System of record: a field of small squares in the activity scale, like a contribution graph.
   It flows in from the card's right edge and fades out before the copy (on phones it fills a band
   under the copy instead). The layout is seeded, so it never jumps between loads; while on screen
   a few squares slowly change level. Static under reduced motion. */
(() => {
  const field = document.querySelector("[data-record-grid]");
  if (!field) return;

  const canvas = field.querySelector("canvas");
  const card = field.parentElement;
  const copy = card.querySelector("[data-record-clear]");
  const swatches = [...field.querySelectorAll("[data-level]")];
  const context = canvas.getContext("2d");
  if (!context) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const fadeDuration = 1600;

  let colors = [];
  let cells = [];
  let changing = new Set();
  let size = 10;
  let radius = 2;
  let width = 0;
  let height = 0;
  let animationFrame = 0;
  let isVisible = false;
  let nextChangeAt = 0;

  // Small seeded generator (mulberry32): the same field on every load.
  const seeded = (seed) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  const smooth = (edge0, edge1, value) => {
    const t = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1);
    return t * t * (3 - 2 * t);
  };

  // Soft, low-frequency variation so the field gathers in loose clusters rather than a ramp.
  const wave = (x, y) =>
    0.5 + 0.25 * Math.sin(x * 0.011 + y * 0.004) + 0.25 * Math.sin(y * 0.017 - x * 0.006 + 1.7);

  const readColors = () => {
    colors = swatches.map((swatch) => getComputedStyle(swatch).color);
  };

  // A level for a square at a given depth into the field: deeper squares are lit more often, brighter.
  const pickLevel = (depth, random) => {
    const intensity = random() ** 1.8 * (0.3 + 0.65 * depth);
    return Math.min(4, 1 + Math.floor(intensity * 4));
  };

  const build = () => {
    const bounds = card.getBoundingClientRect();
    const copyBounds = copy.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const random = seeded(20261025);
    // Wide card: the field comes in from the right. Narrow card (matches the CSS): a band below the copy.
    const isBand = bounds.width <= 1024;

    width = bounds.width;
    height = bounds.height;
    size = bounds.width < 700 ? 7 : 9;
    radius = 2;
    const gap = 3;
    const pitch = size + gap;

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    // Where the field begins: clear of the copy's right edge, or of its foot on phones.
    const start = isBand
      ? copyBounds.bottom - bounds.top + 28
      : copyBounds.right - bounds.left + Math.min(96, width * 0.07);
    const end = isBand ? height : width;

    // Anchor to the right and top edges, part of a square past each, so the field bleeds off.
    const columns = Math.ceil(width / pitch) + 1;
    const rows = Math.ceil(height / pitch) + 1;
    const offsetX = Math.round(width - columns * pitch + gap + size * 0.45);
    const offsetY = Math.round(-size * 0.55);

    cells = [];
    changing = new Set();

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x = offsetX + column * pitch;
        const y = offsetY + row * pitch;
        const position = isBand ? y + size / 2 : x + size / 2;
        // A ragged, wave-shaped edge where the field begins, rather than a straight line.
        const edge = start + (wave(y, x) - 0.5) * Math.min(120, (end - start) * 0.25);
        const across = isBand ? 0.35 + 0.65 * smooth(0, width, x + size / 2) : 1;
        const ramp = smooth(edge, end, position) * across;
        if (ramp <= 0) continue;

        const depth = Math.min(1, ramp * (0.7 + 0.45 * wave(x, y)));
        const base = smooth(edge, edge + (end - start) * 0.6, position);
        const litChance = 0.006 + 0.3 * depth ** 2;
        const level = random() < litChance ? pickLevel(depth, random) : 0;
        cells.push({ x, y, depth, base, level, from: level, changedAt: -Infinity });
      }
    }

    drawAll();
  };

  const square = (cell) => {
    context.beginPath();
    context.roundRect(cell.x, cell.y, size, size, radius);
    context.fill();
  };

  const drawCell = (cell, time) => {
    const blend = Math.min((time - cell.changedAt) / fadeDuration, 1);
    const eased = blend * blend * (3 - 2 * blend);

    // Empty squares stay quieter than the lit ones, so the field reads as light, not as a wall.
    context.globalAlpha = cell.base * 0.7;
    context.fillStyle = colors[0];
    square(cell);

    if (cell.from > 0 && eased < 1) {
      context.globalAlpha = cell.base * (1 - eased);
      context.fillStyle = colors[cell.from];
      square(cell);
    }

    if (cell.level > 0) {
      context.globalAlpha = cell.base * eased;
      context.fillStyle = colors[cell.level];
      square(cell);
    }

    context.globalAlpha = 1;
    return blend >= 1;
  };

  const drawAll = () => {
    const time = performance.now();
    context.clearRect(0, 0, width, height);
    cells.forEach((cell) => drawCell(cell, time));
  };

  // One lit square goes dark and one dark square lights up, so the density stays even.
  const change = (time) => {
    const lit = cells.filter((cell) => cell.level > 0 && !changing.has(cell));
    const dark = cells.filter((cell) => cell.level === 0 && cell.depth > 0.25 && !changing.has(cell));
    if (!lit.length || !dark.length) return;

    const off = lit[Math.floor(Math.random() * lit.length)];
    off.from = off.level;
    off.level = Math.random() < 0.35 ? pickLevel(off.depth, Math.random) : 0;
    off.changedAt = time;
    changing.add(off);

    for (let tries = 0; tries < 12; tries += 1) {
      const on = dark[Math.floor(Math.random() * dark.length)];
      if (Math.random() > on.depth) continue;
      on.from = 0;
      on.level = pickLevel(on.depth, Math.random);
      on.changedAt = time;
      changing.add(on);
      break;
    }
  };

  const animate = (time) => {
    if (!isVisible || document.hidden || reduceMotion.matches) {
      animationFrame = 0;
      return;
    }

    if (time >= nextChangeAt) {
      change(time);
      nextChangeAt = time + 260 + Math.random() * 380;
    }

    changing.forEach((cell) => {
      context.clearRect(cell.x - 0.5, cell.y - 0.5, size + 1, size + 1);
      if (drawCell(cell, time)) changing.delete(cell);
    });

    animationFrame = requestAnimationFrame(animate);
  };

  const start = () => {
    if (!animationFrame && isVisible && !document.hidden && !reduceMotion.matches) {
      animationFrame = requestAnimationFrame(animate);
    }
  };

  let initialized = false;
  const resizeObserver = new ResizeObserver(build);
  const initialize = () => {
    if (initialized) return;
    initialized = true;
    readColors();
    resizeObserver.observe(card);
    resizeObserver.observe(copy);
  };

  const buildObserver = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    initialize();
    buildObserver.disconnect();
  }, { rootMargin: "200px" });
  buildObserver.observe(card);

  new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;
    if (isVisible) initialize();
    start();
  }).observe(card);

  document.addEventListener("visibilitychange", start);
  document.addEventListener("logven:themechange", () => {
    if (!initialized) return;
    readColors();
    drawAll();
  });
  reduceMotion.addEventListener("change", () => {
    if (!initialized) return;
    drawAll();
    start();
  });
})();
