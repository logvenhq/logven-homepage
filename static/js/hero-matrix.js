(() => {
  const canvas = document.querySelector("[data-hero-matrix]");
  const logo = document.querySelector(".hero__logo");

  if (!canvas) return;

  const context = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const colors = ["104, 135, 173", "119, 151, 188", "144, 169, 199"];
  const initialDensity = 0.16;

  let cells = [];
  let cellSize = 32;
  let columns = 0;
  let rows = 0;
  let nextCell = 0;
  let nextRevealAt = 0;
  let cycleEndsAt = Infinity;
  let cycleOpacity = 1;
  let animationFrame = 0;
  let isVisible = true;
  let flightIsActive = false;
  let flightSettledAt = -Infinity;

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
        strength: 0.12 + Math.random() * 0.16,
        color: colors[Math.floor(Math.random() * colors.length)],
        wakeX: 0,
        wakeY: 0,
        wakeInfluence: 0,
      })),
    );

    const initialCellCount = seedInitialGrid ? Math.floor(cells.length * initialDensity) : 0;

    cells.slice(0, initialCellCount).forEach((cell) => {
      cell.revealedAt = now - 650;
    });

    nextCell = initialCellCount;
    nextRevealAt = now + 350;
    cycleEndsAt = Infinity;
    cycleOpacity = 1;
  };

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    cellSize = bounds.width < 600 ? 26 : 32;
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
    const canvasBounds = canvas.getBoundingClientRect();
    const logoBounds = logo?.getBoundingClientRect();
    const wakeFade = flightIsActive ? 1 : Math.max(0, 1 - (time - flightSettledAt) / 1800);
    const wakeCenter = logoBounds
      ? {
          x: logoBounds.left + logoBounds.width / 2 - canvasBounds.left,
          y: logoBounds.top + logoBounds.height / 2 - canvasBounds.top,
        }
      : null;

    context.clearRect(0, 0, width, height);

    cells.forEach((cell) => {
      if (cell.revealedAt > time) return;

      const fadeIn = Math.min((time - cell.revealedAt) / 650, 1);
      const easedFade = 1 - (1 - fadeIn) ** 3;
      const restingX = cell.column * cellSize;
      const restingY = cell.row * cellSize;
      const centerX = restingX + cellSize / 2;
      const centerY = restingY + cellSize / 2;
      let targetWakeX = 0;
      let targetWakeY = 0;
      let targetWakeInfluence = 0;

      if (wakeCenter && wakeFade > 0) {
        const deltaX = centerX - wakeCenter.x;
        const deltaY = centerY - wakeCenter.y;
        const trailLength = 10 * cellSize;
        const isInTrail = deltaY > -2.5 * cellSize && deltaY < trailLength;
        const trailWidth = 7 * cellSize;

        if (isInTrail && Math.abs(deltaX) < trailWidth) {
          const horizontalFalloff = 1 - Math.abs(deltaX) / trailWidth;
          const verticalFalloff = 1 - Math.max(deltaY, 0) / trailLength;
          const smoothHorizontal = horizontalFalloff ** 2 * (3 - 2 * horizontalFalloff);
          const smoothVertical = verticalFalloff ** 2 * (3 - 2 * verticalFalloff);
          const influence = smoothHorizontal * smoothVertical * wakeFade;
          const direction = deltaX === 0 ? (cell.column % 2 ? 1 : -1) : Math.sign(deltaX);

          targetWakeX = direction * cellSize * 0.38 * influence;
          targetWakeY = cellSize * 0.08 * influence;
          targetWakeInfluence = influence;
        }
      }

      const wakeEase = targetWakeInfluence > 0 ? 0.025 : 0.008;
      cell.wakeX += (targetWakeX - cell.wakeX) * wakeEase;
      cell.wakeY += (targetWakeY - cell.wakeY) * wakeEase;
      cell.wakeInfluence += (targetWakeInfluence - cell.wakeInfluence) * wakeEase;

      const x = restingX + cell.wakeX;
      const y = restingY + cell.wakeY;
      const opacity = cell.strength * easedFade * cycleOpacity * (1 + cell.wakeInfluence * 0.18);
      const gradient = context.createLinearGradient(x, y, x + cellSize, y + cellSize);

      gradient.addColorStop(0, `rgba(${cell.color}, ${opacity * 0.68})`);
      gradient.addColorStop(0.52, `rgba(${cell.color}, ${opacity})`);
      gradient.addColorStop(1, `rgba(${cell.color}, ${opacity * 0.78})`);
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
      const batchSize = 1;

      for (let count = 0; count < batchSize && nextCell < cells.length; count += 1) {
        cells[nextCell].revealedAt = time + count * 45;
        nextCell += 1;
      }

      nextRevealAt = time + 260 + Math.random() * 220;

      if (nextCell === cells.length) cycleEndsAt = time + 2400;
    }

    if (time >= cycleEndsAt) {
      cycleOpacity = Math.max(0, 1 - (time - cycleEndsAt) / 1400);

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
  logo?.addEventListener("animationstart", ({ animationName }) => {
    if (animationName !== "hero-logo-entrance") return;
    flightIsActive = true;
    flightSettledAt = Infinity;
  });
  logo?.addEventListener("animationend", ({ animationName }) => {
    if (animationName !== "hero-logo-entrance") return;
    flightIsActive = false;
    flightSettledAt = performance.now();
  });
  reduceMotion.addEventListener("change", () => {
    resize();
    start();
  });
})();
