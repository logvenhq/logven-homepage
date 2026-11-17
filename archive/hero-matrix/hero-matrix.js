(() => {
  const canvas = document.querySelector("[data-hero-matrix]");

  if (!canvas) return;

  const context = canvas.getContext("2d");
  if (!context) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const initialDensity = 0.16;

  let cells = [];
  let matrixColor = "";
  let cellSize = 18;
  let columns = 0;
  let rows = 0;
  let nextCell = 0;
  let nextRevealAt = 0;
  let cycleEndsAt = Infinity;
  let cycleOpacity = 1;
  let animationFrame = 0;
  let isVisible = true;

  const shuffle = (items) => {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
    }

    return items;
  };

  const createCells = (seedInitialGrid = false) => {
    const now = performance.now();

    cells = shuffle(
      Array.from({ length: columns * rows }, (_, index) => ({
        column: index % columns,
        row: Math.floor(index / columns),
        revealedAt: Infinity,
        strength: 0.025 + Math.random() * 0.045,
      })),
    );

    const initialCellCount = seedInitialGrid ? Math.floor(cells.length * initialDensity) : 0;

    cells.slice(0, initialCellCount).forEach((cell) => {
      cell.revealedAt = now - 2400;
    });

    nextCell = initialCellCount;
    nextRevealAt = now + 900;
    cycleEndsAt = Infinity;
    cycleOpacity = 1;
  };

  const refreshColor = () => {
    const channels = getComputedStyle(canvas).color.match(/[\d.]+/g);
    if (channels?.length >= 3) matrixColor = channels.slice(0, 3).join(", ");
  };

  const resize = () => {
    refreshColor();
    const bounds = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    // Follows the root size, which is 90% on wider screens.
    const unit = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
    cellSize = (bounds.width / unit < 600 ? 14 : 18) * unit;
    columns = Math.ceil(bounds.width / cellSize);
    rows = Math.ceil(bounds.height / cellSize);
    canvas.width = Math.round(bounds.width * pixelRatio);
    canvas.height = Math.round(bounds.height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    createCells(true);

    if (reduceMotion.matches) {
      cells.forEach((cell, index) => {
        if (index < cells.length * 0.38) cell.revealedAt = 0;
      });
      draw(performance.now());
    }
  };

  const draw = (time) => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    context.clearRect(0, 0, width, height);

    cells.forEach((cell) => {
      if (cell.revealedAt > time) return;

      const fadeIn = Math.min((time - cell.revealedAt) / 2400, 1);
      // A slow, symmetric ease, so squares surface rather than pop.
      const easedFade = fadeIn * fadeIn * (3 - 2 * fadeIn);
      const restingX = cell.column * cellSize;
      const restingY = cell.row * cellSize;
      const x = restingX;
      const y = restingY;
      const opacity = cell.strength * easedFade * cycleOpacity;
      const gradient = context.createLinearGradient(x, y, x + cellSize, y + cellSize);

      gradient.addColorStop(0, `rgba(${matrixColor}, ${opacity * 0.68})`);
      gradient.addColorStop(0.52, `rgba(${matrixColor}, ${opacity})`);
      gradient.addColorStop(1, `rgba(${matrixColor}, ${opacity * 0.78})`);
      context.fillStyle = gradient;
      context.fillRect(x, y, cellSize, cellSize);
    });
  };

  const animate = (time) => {
    if (!isVisible || document.hidden || reduceMotion.matches) {
      animationFrame = 0;
      return;
    }

    if (nextCell < cells.length && time >= nextRevealAt) {
      const batchSize = Math.max(1, Math.round(cells.length / 1100));

      for (let count = 0; count < batchSize && nextCell < cells.length; count += 1) {
        cells[nextCell].revealedAt = time + count * 320;
        nextCell += 1;
      }

      nextRevealAt = time + 1100 + Math.random() * 900;

      if (nextCell === cells.length) cycleEndsAt = time + 6000;
    }

    if (time >= cycleEndsAt) {
      cycleOpacity = Math.max(0, 1 - (time - cycleEndsAt) / 3200);

      if (cycleOpacity === 0) createCells();
    }

    draw(time);
    animationFrame = requestAnimationFrame(animate);
  };

  const start = () => {
    if (!animationFrame && isVisible && !document.hidden && !reduceMotion.matches) {
      animationFrame = requestAnimationFrame(animate);
    }
  };

  const observer = new IntersectionObserver(
    ([entry]) => {
      isVisible = entry.isIntersecting;
      start();
    },
    { threshold: 0.01 },
  );

  new ResizeObserver(resize).observe(canvas);
  observer.observe(canvas);
  document.addEventListener("visibilitychange", start);
  document.addEventListener("logven:themechange", () => {
    refreshColor();
    draw(performance.now());
  });
  reduceMotion.addEventListener("change", () => {
    resize();
    start();
  });
})();
