// How it works: a line drawing at the top of each card. Thin ink strokes around a centre, kept
// regular and calm: even angles, constant slow motion, no randomness.
//   people:     twelve rays at even steps; a soft wave of light travels round, so each one
//               brightens and reaches out in turn, like people each doing their own work.
//   lake:       dashes on evenly spaced spokes stream inward and fade at the centre: scattered
//               data gathering into one place.
//   automation: rays turn slowly together and pack into a dense, ordered fan at the bottom,
//               spreading out again across the top: repeated work bundled into software.
// The SVG viewBox is -150 -90 300 180, centred on the origin. With reduced motion each scene
// shows one still frame.
(() => {
  const svgs = [...document.querySelectorAll("svg[data-rays]")];
  if (!svgs.length) return;

  const NS = "http://www.w3.org/2000/svg";
  const TAU = Math.PI * 2;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const smooth = (t) => t * t * (3 - 2 * t);
  const clamp01 = (t) => Math.min(1, Math.max(0, t));

  const makeLines = (svg, count) =>
    Array.from({ length: count }, () => {
      const line = document.createElementNS(NS, "line");
      svg.append(line);
      return line;
    });

  const set = (line, angle, from, to, opacity) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    line.setAttribute("x1", (cos * from).toFixed(2));
    line.setAttribute("y1", (sin * from).toFixed(2));
    line.setAttribute("x2", (cos * to).toFixed(2));
    line.setAttribute("y2", (sin * to).toFixed(2));
    line.setAttribute("stroke-opacity", opacity.toFixed(3));
  };

  const scenes = {
    people(svg) {
      const COUNT = 12;
      const lines = makeLines(svg, COUNT);
      return (seconds) => {
        // The wave goes round once every eight seconds.
        const head = (seconds / 8) % 1;
        lines.forEach((line, i) => {
          const angle = -Math.PI / 2 + (i / COUNT) * TAU;
          // Distance behind the head of the wave, as a share of the circle (0 = lit now).
          const behind = (head - i / COUNT + 1) % 1;
          const trail = (behind * COUNT) / 2.2;
          const lead = ((1 - behind) * COUNT) / 1.1;
          const light = Math.exp(-trail * trail) + Math.exp(-lead * lead);
          const k = clamp01(light);
          set(line, angle, 20 - 3 * k, 54 + 5 * k, 0.2 + 0.8 * k);
        });
      };
    },

    lake(svg) {
      const SPOKES = 16;
      const INNER = 12;
      const OUTER = 62;
      const PERIOD = 20;
      const DASH = 7;
      const PER_SPOKE = Math.ceil((OUTER - INNER) / PERIOD) + 1;
      const lines = makeLines(svg, SPOKES * PER_SPOKE);
      return (seconds) => {
        // Inward at a constant, unhurried pace.
        const travel = (seconds * 6) % PERIOD;
        let n = 0;
        for (let s = 0; s < SPOKES; s += 1) {
          const angle = -Math.PI / 2 + (s / SPOKES) * TAU;
          const stagger = s % 2 ? PERIOD / 2 : 0;
          for (let d = 0; d < PER_SPOKE; d += 1) {
            const outer = INNER + ((d * PERIOD + stagger - travel + PERIOD * PER_SPOKE) % (PERIOD * PER_SPOKE));
            const inner = Math.max(INNER, outer - DASH);
            // Fade in at the rim and out as they reach the centre.
            const opacity = smooth(clamp01((OUTER - outer) / 14)) * smooth(clamp01((outer - INNER) / 16));
            set(lines[n], angle, inner, Math.min(outer, OUTER), outer > INNER + 0.5 ? opacity : 0);
            n += 1;
          }
        }
      };
    },

    automation(svg) {
      const COUNT = 18;
      const SQUEEZE = 0.78;
      const lines = makeLines(svg, COUNT);
      return (seconds) => {
        // All rays turn together, once every thirty seconds. Their angles pass through a smooth
        // warp that packs them together pointing down and spreads them out pointing up.
        const turn = (seconds / 30) % 1;
        lines.forEach((line, i) => {
          const u = (i / COUNT + turn) % 1;
          const angle = Math.PI / 2 + TAU * u - SQUEEZE * Math.sin(TAU * u);
          // The fan starts on an arc clear of the centre; spread rays start a little further out.
          const packed = (1 + Math.cos(TAU * u)) / 2;
          set(line, angle, 30 - 6 * packed, 60, 1);
        });
      };
    },
  };

  svgs.forEach((svg) => {
    const scene = scenes[svg.dataset.rays];
    if (!scene) return;
    const draw = scene(svg);

    // Time runs faster while the card is hovered, and eases back after.
    let speed = 1;
    let targetSpeed = 1;
    let clock = 12;
    let last = 0;
    let frame = 0;
    let visible = false;

    const tick = (now) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      speed += (targetSpeed - speed) * Math.min(1, dt * 3);
      clock += dt * speed;
      draw(clock);
      frame = requestAnimationFrame(tick);
    };

    const update = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      if (reduceMotion.matches) {
        draw(12);
      } else if (visible && !document.hidden) {
        frame = requestAnimationFrame(tick);
      }
    };

    const card = svg.closest(".blocks__item");
    card?.addEventListener("pointerenter", () => (targetSpeed = 2.2));
    card?.addEventListener("pointerleave", () => (targetSpeed = 1));

    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    }).observe(svg);

    document.addEventListener("visibilitychange", update);
    reduceMotion.addEventListener("change", update);
    draw(clock);
  });
})();
