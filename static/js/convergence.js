(() => {
  const section = document.querySelector("[data-convergence]");
  const markPath = document.querySelector("#logven-mark path");

  if (!section || !markPath) return;

  const canvas = section.querySelector(".convergence__canvas");
  const caption = section.querySelector(".convergence__caption");
  const steps = [...section.querySelectorAll(".convergence__step")];
  const context = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const darkScheme = window.matchMedia("(prefers-color-scheme: dark)");

  // One state per step: work → analyse → consolidate → harden → converge.
  const lastState = steps.length - 1;
  const particleTarget = 680;
  const markSize = { width: 114, height: 125 };

  // Seeded so the scene keeps its shape across resizes and reloads.
  let seed = 20260101;
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const gaussian = () => {
    const radius = Math.sqrt(-2 * Math.log(1 - random()));
    const angle = 2 * Math.PI * random();
    return [radius * Math.cos(angle), radius * Math.sin(angle)];
  };
  const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);
  const smoothstep = (edge0, edge1, value) => {
    const amount = clamp((value - edge0) / (edge1 - edge0));
    return amount * amount * (3 - 2 * amount);
  };
  const easeInOut = (value) =>
    value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;

  // Converge: the Logven mark, filled with a hexagonal grid of points in reading order.
  const sampleMark = () => {
    const probe = document.createElement("canvas").getContext("2d");
    const path = new Path2D(markPath.getAttribute("d"));
    const sampleAt = (spacing) => {
      const points = [];
      const rowHeight = spacing * 0.866;

      for (let row = 0, y = rowHeight / 2; y < markSize.height; row += 1, y += rowHeight) {
        for (let x = row % 2 ? spacing : spacing / 2; x < markSize.width; x += spacing) {
          if (probe.isPointInPath(path, x, y)) points.push([x, y]);
        }
      }

      return points;
    };

    let spacing = 2.4;
    let points = sampleAt(spacing);

    while (points.length > particleTarget * 1.04) {
      spacing += 0.05;
      points = sampleAt(spacing);
    }

    return { points, spacing };
  };

  const mark = sampleMark();
  const count = mark.points.length;

  // Harden: lines of code made of tokens, with indentation and the odd blank line.
  const buildCode = () => {
    const slots = [];
    let row = 0;
    let indent = 0;

    while (slots.length < count) {
      if (row > 0 && random() < 0.07) {
        row += 1;
        indent = Math.max(0, indent - 1);
        continue;
      }

      const limit = 26 + Math.floor(random() * 22);
      const tokens = 2 + Math.floor(random() * 6);
      let column = indent * 2;

      for (let token = 0; token < tokens && slots.length < count; token += 1) {
        const length = 2 + Math.floor(random() * 5);
        if (column + length > limit) break;

        for (let index = 0; index < length && slots.length < count; index += 1) {
          slots.push({ column: column + index, row });
        }

        column += length + 1;
      }

      row += 1;
      indent = clamp(indent + [-1, 0, 0, 1][Math.floor(random() * 4)], 0, 3);
    }

    const columns = Math.max(...slots.map((slot) => slot.column)) + 1;
    return { slots, columns, rows: row };
  };

  const code = buildCode();

  // Work and analyse: random runs, grouped by similarity into clusters.
  // Cluster centres are scattered with best-candidate sampling: spread out, but never on a grid.
  const clusterCenters = [];
  while (clusterCenters.length < 10) {
    let best = null;
    let bestDistance = -1;
    for (let candidate = 0; candidate < 12; candidate += 1) {
      const point = [0.06 + random() * 0.88, 0.08 + random() * 0.84];
      const distance = Math.min(
        Infinity,
        ...clusterCenters.map(([x, y]) => Math.hypot((point[0] - x) * 1.6, point[1] - y)),
      );
      if (distance > bestDistance) {
        best = point;
        bestDistance = distance;
      }
    }
    clusterCenters.push(best);
  }

  // Each cluster has its own size, stretch and tilt.
  const clusterShapes = clusterCenters.map(() => ({
    scale: 0.55 + random() * 0.95,
    stretch: 0.6 + random() * 0.9,
    angle: random() * Math.PI,
  }));

  const particles = Array.from({ length: count }, () => {
    const [offsetX, offsetY] = gaussian();
    return {
      u: random(),
      v: random(),
      offsetX,
      offsetY,
      delay: random(),
      phase: random() * Math.PI * 2,
      speed: 0.6 + random() * 0.8,
      size: 0.75 + random() * 0.5,
      cluster: 0,
      group: 0,
      disc: 0,
      slot: 0,
      pushX: 0,
      pushY: 0,
    };
  });

  particles.forEach((particle) => {
    let nearest = Infinity;
    clusterCenters.forEach(([x, y], index) => {
      const distance = Math.hypot(particle.u - x, particle.v - y);
      if (distance < nearest) {
        nearest = distance;
        particle.cluster = index;
      }
    });
    // Shape the run's offset to its cluster; a few runs stray well outside it.
    const shape = clusterShapes[particle.cluster];
    const spread = shape.scale * (random() < 0.08 ? 2.2 : 1);
    const stretchedX = particle.offsetX * shape.stretch * spread;
    const stretchedY = (particle.offsetY / shape.stretch) * spread;
    particle.offsetX = stretchedX * Math.cos(shape.angle) - stretchedY * Math.sin(shape.angle);
    particle.offsetY = stretchedX * Math.sin(shape.angle) + stretchedY * Math.cos(shape.angle);

    // Consolidate: clusters merge into three canonical groups, left to right.
    particle.group = Math.min(2, Math.floor(clusterCenters[particle.cluster][0] * 3));
  });

  // Each group packs into a sunflower disc, inner runs to the centre.
  const groups = [0, 1, 2].map((group) => particles.filter((particle) => particle.group === group));
  groups.forEach((members) => {
    members
      .map((particle) => ({
        particle,
        distance: Math.hypot(
          clusterCenters[particle.cluster][0] - particle.u,
          clusterCenters[particle.cluster][1] - particle.v,
        ),
      }))
      .sort((a, b) => a.distance - b.distance)
      .forEach(({ particle }, index) => {
        particle.disc = index;
      });
  });

  // Code and mark slots are both in reading order, so the listing folds into the mark top to bottom.
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  particles
    .map((particle) => ({
      particle,
      key: particle.group * 10 + Math.sqrt(particle.disc / groups[particle.group].length) *
        Math.sin(particle.disc * goldenAngle),
    }))
    .sort((a, b) => a.key - b.key)
    .forEach(({ particle }, index) => {
      particle.slot = index;
    });

  // Links drawn between neighbours: similarity while analysing, token runs once hardened.
  const similarityLinks = [];
  particles.forEach((particle, index) => {
    particles
      .map((other, otherIndex) => ({ other, otherIndex }))
      .filter(({ other, otherIndex }) => other.cluster === particle.cluster && otherIndex !== index)
      .map(({ other, otherIndex }) => ({
        otherIndex,
        distance: Math.hypot(other.offsetX - particle.offsetX, other.offsetY - particle.offsetY),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2)
      .forEach(({ otherIndex, distance }) => {
        if (distance < 1.1 && otherIndex > index) similarityLinks.push([index, otherIndex]);
      });
  });

  // Bridges join neighbouring clusters: runs on facing edges of two clusters are linked,
  // so the clusters read as one graph of related work rather than islands.
  // Each cluster bridges to its two nearest neighbours, with one or two links per pair.
  const clusterEdges = [];
  clusterCenters.forEach(([x, y], from) => {
    clusterCenters
      .map(([otherX, otherY], to) => ({ to, distance: Math.hypot(otherX - x, otherY - y) }))
      .filter(({ to }) => to !== from)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2)
      .forEach(({ to }) => {
        const exists = clusterEdges.some(([a, b]) => (a === to && b === from) || (a === from && b === to));
        if (!exists) clusterEdges.push([from, to, 1 + Math.floor(random() * 2)]);
      });
  });
  const bridgeLinks = [];
  const facing = (cluster, towardsX, towardsY) =>
    particles
      .map((particle, index) => ({ particle, index }))
      .filter(({ particle }) => particle.cluster === cluster)
      .sort(
        (a, b) =>
          b.particle.offsetX * towardsX + b.particle.offsetY * towardsY -
          (a.particle.offsetX * towardsX + a.particle.offsetY * towardsY),
      )
      .map(({ index }) => index);

  clusterEdges.forEach(([from, to, bridges]) => {
    const deltaX = clusterCenters[to][0] - clusterCenters[from][0];
    const deltaY = clusterCenters[to][1] - clusterCenters[from][1];
    const length = Math.hypot(deltaX, deltaY);
    const fromEdge = facing(from, deltaX / length, deltaY / length);
    const toEdge = facing(to, -deltaX / length, -deltaY / length);

    for (let bridge = 0; bridge < bridges; bridge += 1) {
      // Skip the outermost runs, which are often strays far from their cluster.
      const pick = 4 + bridge * 4 + Math.floor(random() * 4);
      const offset = random();
      if (pick < Math.min(fromEdge.length, toEdge.length)) bridgeLinks.push([fromEdge[pick], toEdge[pick], offset]);
    }
  });

  const slotOwner = [];
  particles.forEach((particle, index) => {
    slotOwner[particle.slot] = index;
  });
  const codeLinks = [];
  code.slots.forEach((slot, index) => {
    const next = code.slots[index + 1];
    if (next && next.row === slot.row && next.column === slot.column + 1) {
      codeLinks.push([slotOwner[index], slotOwner[index + 1]]);
    }
  });

  // Pixel positions per state, rebuilt on resize.
  const positions = Array.from({ length: lastState + 1 }, () => new Float32Array(count * 2));
  const current = new Float32Array(count * 2);
  const markShade = new Float32Array(count);
  let width = 0;
  let height = 0;
  let dotRadius = 2;
  let linkReach = { similarity: 40, code: 12, bridge: 400 };
  let markBounds = { left: 0, top: 0, size: 1 };

  // The scene fills the canvas above the step captions, which overlay its bottom edge.
  const layout = () => {
    const captionBounds = caption.getBoundingClientRect();
    const canvasBounds = canvas.getBoundingClientRect();
    const overlaid = section.classList.contains("is-scrollytelling");
    const top = overlaid ? height * 0.07 : 0;
    const bottom = overlaid ? Math.min(height, captionBounds.top - canvasBounds.top - 24) : height;
    const sceneHeight = Math.max(bottom - top, height * 0.4);
    const middle = top + sceneHeight / 2;
    const narrow = width < sceneHeight;
    const short = Math.min(width, sceneHeight);
    const [work, analyse, consolidate, harden, converge] = positions;
    const clusterRadius = short * 0.075;
    // Three discs side by side (stacked when narrow), each about 2·√n pitches across.
    const discDiameter = 2 * Math.sqrt(Math.max(...groups.map((members) => members.length)));
    const discPitch = Math.min(
      12,
      ((narrow ? sceneHeight : width) * 0.82) / (3.6 * discDiameter),
      ((narrow ? width : sceneHeight) * 0.8) / discDiameter,
    );
    const codeUnit = Math.min(11, (width * 0.86) / code.columns, (sceneHeight * 0.9) / (code.rows * 2.1));
    const codeLeft = (width - code.columns * codeUnit) / 2;
    const codeTop = middle - (code.rows * 2.1 * codeUnit) / 2;
    const markScale = Math.min((width * 0.78) / markSize.width, (sceneHeight * 0.92) / markSize.height);
    const markLeft = (width - markSize.width * markScale) / 2;
    const markTop = middle - (markSize.height * markScale) / 2;

    linkReach = {
      similarity: clusterRadius * 1.6,
      code: codeUnit * 1.5,
      bridge: Math.hypot(width, sceneHeight) * 0.4,
    };
    dotRadius = Math.max(1.4, Math.min(codeUnit * 0.34, mark.spacing * markScale * 0.36));
    markBounds = { left: markLeft, top: markTop, size: (markSize.width + markSize.height) * markScale };

    particles.forEach((particle, index) => {
      const x = index * 2;
      const y = x + 1;
      // On tall screens the 4 × 2 cluster grid turns into 2 × 4.
      const [centerU, centerV] = narrow
        ? [...clusterCenters[particle.cluster]].reverse()
        : clusterCenters[particle.cluster];
      const discRadius = discPitch * Math.sqrt(particle.disc + 0.5);
      const discAngle = particle.disc * goldenAngle;
      const groupCenter = narrow
        ? [width / 2, top + sceneHeight * (0.22 + particle.group * 0.28)]
        : [width * (0.2 + particle.group * 0.3), middle];
      const slot = code.slots[particle.slot];
      const [markX, markY] = mark.points[particle.slot];

      // Work spans the whole canvas, edge to edge, before anything is grouped.
      work[x] = width * (0.01 + particle.u * 0.98);
      work[y] = height * (0.02 + particle.v * 0.96);
      const [offsetX, offsetY] = narrow
        ? [particle.offsetY, particle.offsetX]
        : [particle.offsetX, particle.offsetY];
      analyse[x] = width * centerU + offsetX * clusterRadius;
      analyse[y] = top + sceneHeight * centerV + offsetY * clusterRadius;
      consolidate[x] = groupCenter[0] + Math.cos(discAngle) * discRadius;
      consolidate[y] = groupCenter[1] + Math.sin(discAngle) * discRadius;
      harden[x] = codeLeft + slot.column * codeUnit;
      harden[y] = codeTop + slot.row * 2.1 * codeUnit;
      converge[x] = markLeft + markX * markScale;
      converge[y] = markTop + markY * markScale;
      markShade[index] = clamp((markX + markY) / (markSize.width + markSize.height));
    });
  };

  // Colours come from the --convergence-* tokens in style.css, as RGB triplets.
  let palette = {};
  let isDark = darkScheme.matches;
  const readPalette = () => {
    const styles = getComputedStyle(section);
    const triplet = (name) => styles.getPropertyValue(name).trim().split(/\s+/).map(Number);
    palette = {
      dot: triplet("--convergence-dot"),
      line: triplet("--convergence-line"),
      start: triplet("--convergence-start"),
      end: triplet("--convergence-end"),
    };
  };
  const mix = (from, to, amount) => from.map((channel, index) => channel + (to[index] - channel) * amount);

  // Scroll position → scene time, eased so the particles have some weight.
  let target = 0;
  let time = 0;
  let previousFrame = 0;
  let animationFrame = 0;
  let isNearViewport = false;
  let sweepStartedAt = -Infinity;
  const pointer = { x: 0, y: 0, active: false };

  const readScroll = () => {
    const bounds = section.getBoundingClientRect();
    const travel = bounds.height - window.innerHeight;
    const progress = travel > 0 ? clamp(-bounds.top / travel) : 1;
    target = clamp((progress - 0.04) / 0.88) * lastState;
  };

  const updateSteps = () => {
    const active = clamp(Math.round(time), 0, lastState);
    steps.forEach((step, index) => {
      step.classList.toggle("is-active", index === active);
      step.style.setProperty("--fill", index === 0 ? 1 : clamp(time - index + 1).toFixed(3));
    });
  };

  const jitterStops = [16, 6, 2.5, 0.4, 0];
  const jitterAt = (value) => {
    const index = Math.min(Math.floor(value), lastState - 1);
    return jitterStops[index] + (jitterStops[index + 1] - jitterStops[index]) * (value - index);
  };

  const draw = (now) => {
    if (darkScheme.matches !== isDark) {
      isDark = darkScheme.matches;
      readPalette();
    }

    const segment = Math.min(Math.floor(time), lastState - 1);
    const local = time - segment;
    const from = positions[segment];
    const to = positions[segment + 1];
    const jitter = jitterAt(time);
    const reactivity = 1 - smoothstep(0.5, 2.6, time);
    const toFinal = smoothstep(3, 4, time);
    const sweep = (now - sweepStartedAt) / 1100;

    context.clearRect(0, 0, width, height);

    particles.forEach((particle, index) => {
      const x = index * 2;
      const y = x + 1;
      const move = easeInOut(clamp((local - 0.12 - particle.delay * 0.34) / 0.42));
      let px = from[x] + (to[x] - from[x]) * move;
      let py = from[y] + (to[y] - from[y]) * move;

      px += Math.sin(now * 0.00055 * particle.speed + particle.phase) * jitter;
      py += Math.cos(now * 0.00047 * particle.speed + particle.phase * 1.7) * jitter;

      // Runs that are still variable scatter from the cursor; hardened code holds still.
      let pushX = 0;
      let pushY = 0;
      if (pointer.active && reactivity > 0) {
        const deltaX = px - pointer.x;
        const deltaY = py - pointer.y;
        const distance = Math.hypot(deltaX, deltaY);
        if (distance < 110 && distance > 0.01) {
          const force = (1 - distance / 110) ** 2 * 34 * reactivity;
          pushX = (deltaX / distance) * force;
          pushY = (deltaY / distance) * force;
        }
      }
      particle.pushX += (pushX - particle.pushX) * 0.14;
      particle.pushY += (pushY - particle.pushY) * 0.14;

      current[x] = px + particle.pushX;
      current[y] = py + particle.pushY;
    });

    // Links only connect particles that have arrived, so nothing stretches across the canvas mid-flight.
    const strokeLinks = (links, alpha, lineWidth, reach) => {
      if (alpha <= 0.01) return;
      context.beginPath();
      links.forEach(([a, b]) => {
        const ax = current[a * 2];
        const ay = current[a * 2 + 1];
        const bx = current[b * 2];
        const by = current[b * 2 + 1];
        if (Math.hypot(bx - ax, by - ay) > reach) return;
        context.moveTo(ax, ay);
        context.lineTo(bx, by);
      });
      context.lineWidth = lineWidth;
      context.strokeStyle = `rgb(${palette.line.join(" ")} / ${alpha})`;
      context.stroke();
    };

    const bridgeAlpha = 0.28 * clamp(1 - Math.abs(time - 1.3) / 0.9);
    strokeLinks(bridgeLinks, bridgeAlpha, 1, linkReach.bridge);
    strokeLinks(similarityLinks, 0.5 * clamp(1 - Math.abs(time - 1.15) / 0.85), 1, linkReach.similarity);

    // A pulse travels along each bridge, like results passing between related runs.
    if (bridgeAlpha > 0.01) {
      context.fillStyle = `rgb(${palette.dot.join(" ")} / ${clamp(bridgeAlpha * 3)})`;
      bridgeLinks.forEach(([a, b, offset]) => {
        const ax = current[a * 2];
        const ay = current[a * 2 + 1];
        const bx = current[b * 2];
        const by = current[b * 2 + 1];
        if (Math.hypot(bx - ax, by - ay) > linkReach.bridge) return;
        const travel = (now * 0.00028 + offset) % 1;
        const along = travel < 0.5 ? travel * 2 : 2 - travel * 2;
        context.beginPath();
        context.arc(ax + (bx - ax) * along, ay + (by - ay) * along, 1.6, 0, Math.PI * 2);
        context.fill();
      });
    }
    strokeLinks(codeLinks, 0.75 * clamp(1 - Math.abs(time - 3) / 0.45), dotRadius * 1.1, linkReach.code);

    particles.forEach((particle, index) => {
      const x = current[index * 2];
      const y = current[index * 2 + 1];
      const shade = mix(palette.start, palette.end, markShade[index]);
      const colour = mix(palette.dot, shade, toFinal);
      const flicker = time < 1 ? 0.55 + 0.45 * Math.sin(now * 0.003 * particle.speed + particle.phase) : 1;
      const alpha = (0.45 + 0.5 * smoothstep(0, 2, time)) * (flicker + (1 - flicker) * smoothstep(0, 1, time));

      // A highlight sweeps across the mark once it settles.
      const diagonal = (x - markBounds.left + (y - markBounds.top)) / markBounds.size;
      const sheen = toFinal * clamp(1 - Math.abs(diagonal - (sweep * 1.4 - 0.2)) / 0.12);
      const radius = dotRadius * (time < 2 ? particle.size + (1 - particle.size) * time * 0.5 : 1) * (1 + sheen * 0.55);

      context.fillStyle = `rgb(${colour.map(Math.round).join(" ")} / ${clamp(alpha + sheen * 0.4)})`;
      if (time > 2.5) {
        context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      } else {
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }
    });
  };

  const animate = (now) => {
    const elapsed = Math.min(now - (previousFrame || now), 64);
    const before = time;

    previousFrame = now;
    time += (target - time) * (1 - Math.exp(-elapsed / 160));
    if (Math.abs(target - time) < 0.0005) time = target;
    if (before < 3.9 && time >= 3.9) sweepStartedAt = now;

    updateSteps();
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

  // Reduced motion keeps a short section with the finished mark and every step shown.
  const applyMotionPreference = () => {
    section.classList.toggle("is-scrollytelling", !reduceMotion.matches);

    if (reduceMotion.matches) {
      time = target = lastState;
      steps.forEach((step) => {
        step.classList.add("is-active");
        step.style.setProperty("--fill", 1);
      });
    } else {
      readScroll();
      time = target;
      updateSteps();
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
  canvas.addEventListener("pointermove", (event) => {
    const bounds = canvas.getBoundingClientRect();
    pointer.x = event.clientX - bounds.left;
    pointer.y = event.clientY - bounds.top;
    pointer.active = event.pointerType === "mouse";
  });
  canvas.addEventListener("pointerleave", () => {
    pointer.active = false;
  });
  darkScheme.addEventListener("change", () => {
    isDark = darkScheme.matches;
    readPalette();
    draw(performance.now());
  });
  reduceMotion.addEventListener("change", applyMotionPreference);
})();
