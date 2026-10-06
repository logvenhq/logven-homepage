(() => {
  const section = document.querySelector("[data-hardware]");

  if (!section) return;

  const canvas = section.querySelector(".scene__canvas");
  const caption = section.querySelector(".scene__caption");
  const phases = [...section.querySelectorAll(".scene__phase")];
  const context = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const darkScheme = window.matchMedia("(prefers-color-scheme: dark)");

  // Four acts: a large model in the cloud → steps leave it as code → a smaller model → it fits on the rack.
  const lastPhase = phases.length - 1;

  let seed = 7;
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
  const lerp = (from, to, amount) => from + (to - from) * amount;

  // World units, z up. The rack stands on the floor at the origin.
  const rack = { x0: -1.5, x1: 1.5, y0: -1.2, y1: 1.2, height: 5.6, slots: 7 };
  const slotHeight = rack.height / rack.slots;
  const blocksPerSlot = 3;
  const fillDuration = 0.32;

  // Steps leave the model one by one as code, filling the rack from the bottom slot up.
  const blockCount = rack.slots * blocksPerSlot;
  const blocks = Array.from({ length: blockCount }, (_, index) => ({
    departsAt: 0.55 + (index / (blockCount - 1)) * 1.15,
    slot: Math.floor(index / blocksPerSlot),
  }));
  const codeLines = Array.from({ length: rack.slots * 3 }, () => 0.7 + random() * 1.5);

  const departed = (time) =>
    blocks.reduce((sum, block) => sum + clamp((time - block.departsAt) / fillDuration), 0) / blockCount;
  // The model starts far larger than the rack and loses size with every step that leaves it.
  const sphereRadius = (time) => lerp(13 - 7 * departed(time), 1.05, smoothstep(1.85, 2.5, time));
  const sphereCenter = (time) => {
    const radius = sphereRadius(time);
    const gap = lerp(1.6, 0, smoothstep(2.45, 2.95, time));
    return [0, 0, rack.height + gap + radius];
  };

  let width = 0;
  let height = 0;
  let scale = 30;
  let originX = 0;
  let originY = 0;
  let floorPaths = [];

  // Isometric projection: x runs down-right, y down-left, z up; (1, 1, 1) points at the viewer.
  const project = ([x, y, z]) => [originX + (x - y) * 0.866 * scale, originY + ((x + y) * 0.5 - z) * scale];

  const layout = () => {
    const captionBounds = caption.getBoundingClientRect();
    const canvasBounds = canvas.getBoundingClientRect();
    const overlaid = section.classList.contains("is-scrollytelling");
    const sceneHeight = overlaid ? Math.max(captionBounds.top - canvasBounds.top, height * 0.5) : height;

    scale = Math.min(width / 18, sceneHeight * 0.042);
    originX = width / 2;
    originY = sceneHeight * 0.74;

    // The floor grid fades with distance from the rack, so it is baked into a few alpha bands.
    const extent = 26;
    floorPaths = Array.from({ length: 5 }, () => new Path2D());
    for (let line = -extent; line <= extent; line += 1) {
      for (let step = -extent; step < extent; step += 1) {
        [
          [[line, step, 0], [line, step + 1, 0]],
          [[step, line, 0], [step + 1, line, 0]],
        ].forEach(([from, to]) => {
          const distance = Math.hypot((from[0] + to[0]) / 2, (from[1] + to[1]) / 2) / extent;
          if (distance >= 1) return;
          const band = Math.min(4, Math.floor(distance * 5));
          const [startX, startY] = project(from);
          const [endX, endY] = project(to);
          floorPaths[band].moveTo(startX, startY);
          floorPaths[band].lineTo(endX, endY);
        });
      }
    }
  };

  let palette = {};
  let isDark = darkScheme.matches;
  const readPalette = () => {
    const styles = getComputedStyle(section);
    palette = {
      ink: styles.getPropertyValue("--ink").trim(),
      paper: styles.getPropertyValue("--paper").trim(),
      line: styles.getPropertyValue("--topo-line").trim(),
    };
  };

  const polyline = (points) => {
    context.beginPath();
    points.forEach((point, index) => {
      const [x, y] = project(point);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
  };
  const polygon = (points) => {
    polyline(points);
    context.closePath();
  };

  // A box shows its top and its two front faces, each filled over the paper so nothing shows through.
  const drawBox = (x0, x1, y0, y1, z0, z1) => {
    const faces = [
      [[[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], 0.03],
      [[[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], 0.07],
      [[[x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [x1, y0, z0]], 0.13],
    ];

    faces.forEach(([points, shade]) => {
      polygon(points);
      context.fillStyle = palette.paper;
      context.fill();
      context.globalAlpha = shade;
      context.fillStyle = palette.ink;
      context.fill();
      context.globalAlpha = 0.85;
      context.strokeStyle = palette.ink;
      context.lineWidth = 1;
      context.stroke();
    });
    context.globalAlpha = 1;
  };

  const drawSphere = (center, radius, now) => {
    const [centerX, centerY] = project(center);
    const outline = radius * scale * 1.2247;
    const spin = reduceMotion.matches ? 0.4 : now * 0.00012;
    const bands = Array.from({ length: 4 }, () => new Path2D());
    const point = (latitude, longitude) => [
      center[0] + Math.cos(latitude) * Math.cos(longitude) * radius,
      center[1] + Math.cos(latitude) * Math.sin(longitude) * radius,
      center[2] + Math.sin(latitude) * radius,
    ];
    const segment = (from, to) => {
      const depth =
        (from[0] + to[0] - 2 * center[0] + from[1] + to[1] - 2 * center[1] + from[2] + to[2] - 2 * center[2]) /
        (2 * Math.sqrt(3) * radius);
      const band = Math.min(3, Math.floor((depth + 1) * 2));
      const [startX, startY] = project(from);
      const [endX, endY] = project(to);
      bands[band].moveTo(startX, startY);
      bands[band].lineTo(endX, endY);
    };

    // A paper disc gives the wireframe body, hiding the floor and rack behind it.
    context.beginPath();
    context.arc(centerX, centerY, outline, 0, Math.PI * 2);
    context.globalAlpha = 0.9;
    context.fillStyle = palette.paper;
    context.fill();
    context.globalAlpha = 1;

    const rings = 11;
    const meridians = 14;
    for (let ring = 1; ring <= rings; ring += 1) {
      const latitude = -Math.PI / 2 + (ring * Math.PI) / (rings + 1);
      for (let step = 0; step < 64; step += 1) {
        segment(
          point(latitude, (step / 64) * Math.PI * 2 + spin),
          point(latitude, ((step + 1) / 64) * Math.PI * 2 + spin),
        );
      }
    }
    for (let meridian = 0; meridian < meridians; meridian += 1) {
      const longitude = (meridian / meridians) * Math.PI * 2 + spin;
      for (let step = 0; step < 32; step += 1) {
        segment(
          point(-Math.PI / 2 + (step / 32) * Math.PI, longitude),
          point(-Math.PI / 2 + ((step + 1) / 32) * Math.PI, longitude),
        );
      }
    }

    context.strokeStyle = palette.ink;
    context.lineWidth = 1;
    [0.06, 0.14, 0.3, 0.55].forEach((alpha, band) => {
      context.globalAlpha = alpha;
      context.stroke(bands[band]);
    });

    context.beginPath();
    context.arc(centerX, centerY, outline, 0, Math.PI * 2);
    context.globalAlpha = 0.7;
    context.stroke();
    context.globalAlpha = 1;
  };

  const draw = (now) => {
    if (darkScheme.matches !== isDark) {
      isDark = darkScheme.matches;
      readPalette();
    }

    const radius = sphereRadius(time);
    const center = sphereCenter(time);

    context.clearRect(0, 0, width, height);

    // Floor and the building's footprint.
    context.strokeStyle = `rgb(${palette.line})`;
    context.lineWidth = 1;
    [0.3, 0.22, 0.15, 0.09, 0.04].forEach((alpha, band) => {
      context.globalAlpha = alpha;
      context.stroke(floorPaths[band]);
    });
    context.globalAlpha = 0.5;
    context.setLineDash([4, 5]);
    context.strokeStyle = palette.ink;
    polygon([[-6, -5, 0], [6, -5, 0], [6, 5, 0], [-6, 5, 0]]);
    context.stroke();
    context.setLineDash([]);
    context.globalAlpha = 1;

    // The rack, its slots, and the code that has landed in each.
    drawBox(rack.x0, rack.x1, rack.y0, rack.y1, 0, rack.height);

    context.strokeStyle = palette.ink;
    for (let slot = 0; slot < rack.slots; slot += 1) {
      const z = slot * slotHeight;

      if (slot > 0) {
        polyline([[rack.x0, rack.y1, z], [rack.x1, rack.y1, z], [rack.x1, rack.y0, z]]);
        context.globalAlpha = 0.4;
        context.lineWidth = 1;
        context.stroke();
      }

      const filled =
        blocks
          .filter((block) => block.slot === slot)
          .reduce((sum, block) => sum + clamp((time - block.departsAt) / fillDuration), 0) /
        blocksPerSlot;

      if (filled > 0) {
        context.globalAlpha = 0.9;
        context.lineWidth = 1.5;
        context.beginPath();
        for (let line = 0; line < 3; line += 1) {
          const lineZ = z + slotHeight * (0.28 + line * 0.22);
          const length = codeLines[slot * 3 + line] * filled;
          const [startX, startY] = project([rack.x0 + 0.3, rack.y1, lineZ]);
          const [endX, endY] = project([rack.x0 + 0.3 + length, rack.y1, lineZ]);
          context.moveTo(startX, startY);
          context.lineTo(endX, endY);
        }
        context.stroke();

        const [lightX, lightY] = project([rack.x1, rack.y0 + 0.35, z + slotHeight / 2]);
        context.beginPath();
        context.arc(lightX, lightY, 1.8, 0, Math.PI * 2);
        context.globalAlpha = filled;
        context.fillStyle = palette.ink;
        context.fill();
      }
    }
    context.globalAlpha = 1;

    drawSphere(center, radius, now);

    const active = clamp(Math.round(time), 0, lastPhase);
    phases.forEach((phase, index) => phase.classList.toggle("is-active", index === active));
  };

  // Scroll → scene time, eased like the other scenes.
  let target = 0;
  let time = 0;
  let previousFrame = 0;
  let animationFrame = 0;
  let isNearViewport = false;

  const readScroll = () => {
    const bounds = section.getBoundingClientRect();
    const travel = bounds.height - window.innerHeight;
    const progress = travel > 0 ? clamp(-bounds.top / travel) : 1;
    target = clamp((progress - 0.04) / 0.88) * lastPhase;
  };

  const animate = (now) => {
    const elapsed = Math.min(now - (previousFrame || now), 64);

    previousFrame = now;
    time += (target - time) * (1 - Math.exp(-elapsed / 160));
    if (Math.abs(target - time) < 0.0005) time = target;
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
    draw(performance.now());
  };

  // Reduced motion keeps a short section showing the model settled on the rack.
  const applyMotionPreference = () => {
    section.classList.toggle("is-scrollytelling", !reduceMotion.matches);

    if (reduceMotion.matches) {
      time = target = lastPhase;
    } else {
      readScroll();
      time = target;
    }

    resize();
    if (reduceMotion.matches) phases.forEach((phase) => phase.classList.add("is-active"));
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
    layout();
    draw(performance.now());
  });
  reduceMotion.addEventListener("change", applyMotionPreference);
})();
