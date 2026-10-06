(() => {
  const section = document.querySelector("[data-plant-field]");
  const markPath = document.querySelector("#logven-mark path");

  if (!section) return;

  const canvas = section.querySelector(".plants__canvas");
  const caption = section.querySelector(".plants__caption");
  const phases = [...section.querySelectorAll(".plants__phase")];
  const context = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const darkScheme = window.matchMedia("(prefers-color-scheme: dark)");
  const markShape = markPath ? new Path2D(markPath.getAttribute("d")) : null;

  // Three acts: plants reported by hand → reports flow into one state → anomalies handled in the system.
  const lastPhase = phases.length - 1;

  let seed = 36;
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);
  const smoothstep = (edge0, edge1, value) => {
    const amount = clamp((value - edge0) / (edge1 - edge0));
    return amount * amount * (3 - 2 * amount);
  };

  // The plants sit in three geothermal fields, around the system at the centre of the map.
  const system = [0.5, 0.56];
  const fields = [
    [0.22, 0.36, 0.11],
    [0.66, 0.24, 0.1],
    [0.76, 0.72, 0.11],
    [0.3, 0.78, 0.07],
  ];
  const plants = [];
  for (let attempt = 0; plants.length < 36 && attempt < 5000; attempt += 1) {
    const [fieldU, fieldV, spread] = fields[plants.length % fields.length];
    const angle = random() * Math.PI * 2;
    const radius = spread * Math.sqrt(random()) * 1.4;
    const u = clamp(fieldU + Math.cos(angle) * radius, 0.05, 0.95);
    const v = clamp(fieldV + Math.sin(angle) * radius * 1.2, 0.08, 0.92);
    const crowded = plants.some((plant) => Math.hypot((plant.u - u) * 1.6, plant.v - v) < 0.045);
    const nearSystem = Math.hypot((system[0] - u) * 1.6, system[1] - v) < 0.12;

    if (crowded || nearSystem) continue;

    plants.push({
      u,
      v,
      label: `GT-${String(plants.length + 1).padStart(2, "0")}`,
      heat: 0.7 + random() * 0.55,
      phase: random() * Math.PI * 2,
      frequency: 0.6 + random() * 0.9,
      bend: (random() - 0.5) * 0.5,
      nextReportAt: random() * 3000,
      anomaly: null,
      resolvedAt: -Infinity,
      scale: 1,
      x: 0,
      y: 0,
      amplitude: 0,
    });
  }

  let width = 0;
  let height = 0;
  let cell = 12;
  let columns = 0;
  let rows = 0;
  let field = new Float32Array(0);
  let sigma = 50;
  let systemPoint = [0, 0];
  let showLabels = true;
  let packets = [];

  const layout = () => {
    const captionBounds = caption.getBoundingClientRect();
    const canvasBounds = canvas.getBoundingClientRect();
    const overlaid = section.classList.contains("is-scrollytelling");
    const bottom = overlaid ? Math.min(height, captionBounds.top - canvasBounds.top) : height;
    const sceneHeight = Math.max(bottom, height * 0.5);
    const narrow = width < sceneHeight;
    const place = (u, v) => {
      const [across, down] = narrow ? [v, u] : [u, v];
      return [across * width, sceneHeight * (0.06 + down * 0.9)];
    };

    cell = width < 700 ? 9 : 12;
    columns = Math.ceil(width / cell) + 1;
    rows = Math.ceil(height / cell) + 1;
    field = new Float32Array(columns * rows);
    sigma = Math.min(width, sceneHeight) * 0.05;
    systemPoint = place(...system);
    showLabels = width >= 700;

    plants.forEach((plant) => {
      [plant.x, plant.y] = place(plant.u, plant.v);
    });
  };

  // Colours come from the --topo-line token (an RGB triplet) and the page's ink and muted text.
  let palette = {};
  let isDark = darkScheme.matches;
  const readPalette = () => {
    const styles = getComputedStyle(section);
    palette = {
      line: styles.getPropertyValue("--topo-line").trim(),
      ink: styles.getPropertyValue("--ink").trim(),
      muted: styles.getPropertyValue("--muted").trim(),
    };
  };

  // Scroll → scene time, eased like the convergence scene.
  let target = 0;
  let time = 0;
  let simulationTime = 0;
  let previousFrame = 0;
  let animationFrame = 0;
  let isNearViewport = false;

  const readScroll = () => {
    const bounds = section.getBoundingClientRect();
    const travel = bounds.height - window.innerHeight;
    const progress = travel > 0 ? clamp(-bounds.top / travel) : 1;
    target = clamp((progress - 0.05) / 0.85) * lastPhase;
  };

  const updateCaption = () => {
    const active = clamp(Math.round(time), 0, lastPhase);
    phases.forEach((phase, index) => phase.classList.toggle("is-active", index === active));
  };

  // Each plant's report travels a gentle curve to the system.
  const streamPoint = (plant, amount) => {
    const [endX, endY] = systemPoint;
    const controlX = (plant.x + endX) / 2 - (endY - plant.y) * plant.bend;
    const controlY = (plant.y + endY) / 2 + (endX - plant.x) * plant.bend;
    const rest = 1 - amount;
    return [
      rest * rest * plant.x + 2 * rest * amount * controlX + amount * amount * endX,
      rest * rest * plant.y + 2 * rest * amount * controlY + amount * amount * endY,
    ];
  };

  const simulate = (now, elapsed, streams, calm) => {
    simulationTime += elapsed * (1 - calm * 0.75);

    // Keep a backlog in the manual act, so the map never starts out quiet.
    const open = plants.filter((plant) => plant.anomaly).length;
    const urgency = calm < 0.3 && open < 4 ? 8 : 1;

    plants.forEach((plant) => {
      // Once the system takes over, it clears the backlog left from the manual act.
      if (plant.anomaly && calm > 0.6) {
        plant.anomaly.endsAt = Math.min(plant.anomaly.endsAt, now + 250 + random() * 900);
      }

      // Anomalies stay open for seconds when handled by hand, and close almost at once in the system.
      if (plant.anomaly && now >= plant.anomaly.endsAt) {
        plant.anomaly = null;
        plant.resolvedAt = now;
      }

      if (!plant.anomaly && !reduceMotion.matches && random() < ((elapsed * urgency) / 38000) * (1 - calm * 0.35)) {
        plant.anomaly = {
          startedAt: now,
          endsAt: now + (1 - calm) * (5000 + random() * 5000) + calm * (450 + random() * 350),
        };
      }

      const flicker = Math.sin(simulationTime * 0.0011 * plant.frequency + plant.phase);
      const spike = plant.anomaly ? smoothstep(0, 500, now - plant.anomaly.startedAt) * 1.1 : 0;
      const settling = Math.max(0, 1 - (now - plant.resolvedAt) / 900) * 0.6;
      plant.scale += ((plant.anomaly ? 1.5 : 1) - plant.scale) * (1 - Math.exp(-elapsed / 180));
      plant.amplitude = plant.heat * (1 + flicker * 0.32 * (1 - calm)) + spike + settling;

      if (streams > 0.3 && now >= plant.nextReportAt) {
        packets.push({ plant, startedAt: now, duration: 1600 + random() * 1400 });
        plant.nextReportAt = now + 1800 + random() * 4200;
      }
    });

    packets = packets.filter((packet) => now - packet.startedAt < packet.duration);
  };

  // Height field: drifting terrain plus a heat bump per plant, each added only within reach.
  const computeField = () => {
    const drift = simulationTime * 0.00005;
    const waveX = (Math.PI * 2) / Math.max(width * 0.7, 1);
    const waveY = (Math.PI * 2) / Math.max(height * 0.8, 1);

    for (let row = 0; row < rows; row += 1) {
      const y = row * cell;
      for (let column = 0; column < columns; column += 1) {
        const x = column * cell;
        field[row * columns + column] =
          0.2 * Math.sin(x * waveX + drift) * Math.cos(y * waveY - drift * 0.7) +
          0.12 * Math.sin((x * 1.7 + y * 1.3) * waveX - drift * 1.3) +
          0.07 * Math.sin((x * 3.1 - y * 2.3) * waveX + drift * 2.1);
      }
    }

    const reach = sigma * 3;
    const spread = 2 * sigma * sigma;

    plants.forEach((plant) => {
      const firstColumn = Math.max(0, Math.floor((plant.x - reach) / cell));
      const lastColumn = Math.min(columns - 1, Math.ceil((plant.x + reach) / cell));
      const firstRow = Math.max(0, Math.floor((plant.y - reach) / cell));
      const lastRow = Math.min(rows - 1, Math.ceil((plant.y + reach) / cell));

      for (let row = firstRow; row <= lastRow; row += 1) {
        const deltaY = row * cell - plant.y;
        for (let column = firstColumn; column <= lastColumn; column += 1) {
          const deltaX = column * cell - plant.x;
          field[row * columns + column] +=
            plant.amplitude * Math.exp(-(deltaX * deltaX + deltaY * deltaY) / spread);
        }
      }
    });
  };

  // Marching squares. Corners are numbered top-left 8, top-right 4, bottom-right 2, bottom-left 1;
  // edges are 0 top, 1 right, 2 bottom, 3 left.
  const segments = [
    [], [[3, 2]], [[2, 1]], [[3, 1]], [[0, 1]], [[0, 1], [3, 2]], [[0, 2]], [[3, 0]],
    [[3, 0]], [[0, 2]], [[3, 0], [2, 1]], [[0, 1]], [[3, 1]], [[2, 1]], [[3, 2]], [],
  ];

  const traceLevel = (level) => {
    const point = (edge, x, y, a, b, c, d) => {
      if (edge === 0) return [x + (cell * (level - a)) / (b - a), y];
      if (edge === 1) return [x + cell, y + (cell * (level - b)) / (c - b)];
      if (edge === 2) return [x + (cell * (level - d)) / (c - d), y + cell];
      return [x, y + (cell * (level - a)) / (d - a)];
    };

    for (let row = 0; row < rows - 1; row += 1) {
      for (let column = 0; column < columns - 1; column += 1) {
        const index = row * columns + column;
        const a = field[index];
        const b = field[index + 1];
        const c = field[index + columns + 1];
        const d = field[index + columns];
        const shape = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);

        if (shape === 0 || shape === 15) continue;

        const x = column * cell;
        const y = row * cell;
        segments[shape].forEach(([from, to]) => {
          const [startX, startY] = point(from, x, y, a, b, c, d);
          const [endX, endY] = point(to, x, y, a, b, c, d);
          context.moveTo(startX, startY);
          context.lineTo(endX, endY);
        });
      }
    }
  };

  const draw = (now) => {
    if (darkScheme.matches !== isDark) {
      isDark = darkScheme.matches;
      readPalette();
    }

    const streams = smoothstep(0.45, 1.15, time);
    const calm = smoothstep(1.2, 1.9, time);

    context.clearRect(0, 0, width, height);
    computeField();

    // Contours: every fifth level is an index contour, drawn heavier.
    const levels = 18;
    for (let step = 0; step < levels; step += 1) {
      const level = -0.28 + step * 0.15;
      const isIndex = step % 5 === 0;
      context.beginPath();
      traceLevel(level);
      context.lineWidth = isIndex ? 1.3 : 0.8;
      context.strokeStyle = `rgb(${palette.line} / ${(isIndex ? 0.5 : 0.24) + (step / levels) * 0.35})`;
      context.stroke();
    }

    // Report streams: dashed lines flowing towards the system, with packets riding them.
    if (streams > 0.01) {
      context.save();
      context.setLineDash([2, 6]);
      context.lineDashOffset = -now * 0.02;
      context.lineWidth = 1;
      context.strokeStyle = `rgb(${palette.line} / ${0.5 * streams})`;
      context.beginPath();
      plants.forEach((plant) => {
        for (let step = 0; step <= 16; step += 1) {
          const [x, y] = streamPoint(plant, step / 16);
          if (step === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
      });
      context.stroke();
      context.restore();

      context.fillStyle = palette.ink;
      context.globalAlpha = streams;
      packets.forEach((packet) => {
        const travel = clamp((now - packet.startedAt) / packet.duration);
        const [x, y] = streamPoint(packet.plant, travel * travel * (3 - 2 * travel));
        context.fillRect(x - 2, y - 2.5, 4, 5);
      });
      context.globalAlpha = 1;

      // The system: the Logven mark, where every report lands.
      if (markShape) {
        const size = Math.min(width, height) * 0.045 + 14;
        const [systemX, systemY] = systemPoint;

        context.save();
        context.globalAlpha = streams;
        context.translate(systemX - size * 0.4, systemY - size * 0.44);
        context.scale((size * 0.8) / 114, (size * 0.8) / 114);
        context.fillStyle = palette.ink;
        context.fill(markShape);
        context.restore();
      }
    }

    // Plants: map triangles with labels. A plant with an open anomaly grows slightly.
    context.font = `500 10px Geist, system-ui, sans-serif`;
    context.textBaseline = "middle";
    context.fillStyle = palette.ink;

    plants.forEach((plant) => {
      const { x, y, scale } = plant;

      context.beginPath();
      context.moveTo(x, y - 4.5 * scale);
      context.lineTo(x + 4.5 * scale, y + 3.5 * scale);
      context.lineTo(x - 4.5 * scale, y + 3.5 * scale);
      context.closePath();
      context.fillStyle = palette.ink;
      context.fill();

      if (showLabels) {
        context.fillStyle = plant.anomaly ? palette.ink : palette.muted;
        context.fillText(plant.label, x + 4 + 4.5 * scale, y);
      }
    });

    updateCaption();
  };

  const animate = (now) => {
    const elapsed = Math.min(now - (previousFrame || now), 64);

    previousFrame = now;
    time += (target - time) * (1 - Math.exp(-elapsed / 160));
    if (Math.abs(target - time) < 0.0005) time = target;

    simulate(now, elapsed, smoothstep(0.45, 1.15, time), smoothstep(1.2, 1.9, time));
    draw(now);

    if (isNearViewport && !document.hidden && !reduceMotion.matches) {
      animationFrame = requestAnimationFrame(animate);
    } else {
      animationFrame = 0;
      previousFrame = 0;
    }
  };

  const start = () => {
    if (!animationFrame && isNearViewport && !document.hidden && !reduceMotion.matches) {
      animationFrame = requestAnimationFrame(animate);
    }
  };

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    width = bounds.width;
    height = bounds.height;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    layout();
    simulate(performance.now(), 0, 0, smoothstep(1.2, 1.9, time));
    draw(performance.now());
  };

  // Reduced motion keeps a short section showing the final, calm map.
  const applyMotionPreference = () => {
    section.classList.toggle("is-scrollytelling", !reduceMotion.matches);

    if (reduceMotion.matches) {
      time = target = lastPhase;
      phases.forEach((phase) => phase.classList.add("is-active"));
    } else {
      readScroll();
      time = target;
    }

    resize();
    start();
  };

  readPalette();
  section.classList.add("is-enhanced");
  applyMotionPreference();

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resizeObserver.observe(caption);
  new IntersectionObserver(
    ([entry]) => {
      isNearViewport = entry.isIntersecting;
      start();
    },
    { rootMargin: "25% 0px" },
  ).observe(section);

  window.addEventListener("scroll", readScroll, { passive: true });
  window.addEventListener("resize", readScroll);
  document.addEventListener("visibilitychange", start);
  darkScheme.addEventListener("change", () => {
    isDark = darkScheme.matches;
    readPalette();
    draw(performance.now());
  });
  reduceMotion.addEventListener("change", applyMotionPreference);
})();
