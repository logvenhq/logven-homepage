// The hero ledger: columns of team figures that drift right to left.
// Every few seconds the whole ledger moves one column to the left. Each column moves on its own
// spring, a moment after its neighbour, and its figure trails slightly behind the line.
// Each figure rolls digit by digit, like an odometer, whenever new work lands.
(() => {
  const root = document.querySelector("[data-ledger]");
  if (!root) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // value is an integer; `decimals` places the point, so 986 with one decimal reads 98.6.
  const metrics = [
    { team: "Sales", caption: "rows merged", value: 48210, step: [12, 140] },
    { team: "Finance", caption: "invoices matched", value: 9384, step: [1, 9] },
    { team: "Operations", caption: "files read", value: 1276, step: [1, 4] },
    { team: "Plant", caption: "sensor readings", value: 2481903, step: [240, 1900] },
    { team: "Quality", caption: "fields mapped", value: 3912, step: [2, 18] },
    { team: "Across teams", caption: "datasets found", value: 214, step: [1, 2], rare: true },
    { team: "Logistics", caption: "records linked", value: 126540, step: [40, 420] },
    { team: "Finance", caption: "of records reconciled", value: 972, decimals: 1, suffix: "%", step: [-3, 3], min: 958, max: 994 },
    { team: "Support", caption: "automations run", value: 18066, step: [3, 26] },
    { team: "Procurement", caption: "duplicates removed", value: 742, step: [1, 3] },
    { team: "HR", caption: "sheets tidied", value: 412, step: [1, 2], rare: true },
  ];

  // Springs: [stiffness, damping]. The column spring is just under critical, so it settles
  // with a hint of overshoot; the digits are critically damped so they land cleanly.
  const COLUMN_SPRING = [38, 11.8];
  const DIGIT_SPRING = [64, 16];
  const STEP_EVERY = [5600, 7400];
  const COLUMN_LAG = 120;
  const DIGIT_LAG = 70;
  const DRAG = 0.018;
  // Rules shorten towards the sides: full height in the middle, this share at the edges.
  const EDGE_REACH = 0.58;
  const DRAW_DURATION = 2200;

  let columns = [];
  let columnWidth = 0;
  let originX = 0;
  let visibleCount = 4;
  let shift = 0;
  let nextStepAt = 0;
  let nextMetric = 0;
  let indexCounter = 0;
  let animationFrame = 0;
  let lastTime = 0;
  let isVisible = true;
  let height = 0;

  const random = (min, max) => min + Math.random() * (max - min);
  const randomInt = (min, max) => Math.floor(random(min, max + 1));

  const format = (value, metric) => {
    const decimals = metric.decimals || 0;
    const digits = String(Math.abs(Math.round(value))).padStart(decimals + 1, "0");
    const whole = digits.slice(0, digits.length - decimals);
    const fraction = digits.slice(digits.length - decimals);
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (decimals ? `${grouped}.${fraction}` : grouped) + (metric.suffix || "");
  };

  const takeMetric = () => {
    const inUse = new Set(columns.map((column) => column.metric));
    for (let attempt = 0; attempt < metrics.length; attempt += 1) {
      const metric = metrics[nextMetric % metrics.length];
      nextMetric += 1;
      if (!inUse.has(metric)) return metric;
    }
    return metrics[nextMetric++ % metrics.length];
  };

  const element = (tag, className, parent) => {
    const node = document.createElement(tag);
    node.className = className;
    if (parent) parent.append(node);
    return node;
  };

  /* Digits */

  const createDigit = (position) => {
    const slot = element("span", "ledger__digit");
    const strip = element("span", "ledger__strip", slot);
    // 0–9 and a second 0, so 9 rolls forward into 0 without a jump.
    for (let digit = 0; digit <= 10; digit += 1) element("span", "", strip).textContent = digit % 10;
    return { slot, strip, position, velocity: 0, target: position, startAt: 0, painted: NaN };
  };

  // Rebuilds the figure's characters when its shape changes (a new digit, a new metric),
  // keeping existing digits, and their momentum, by place value.
  const renderValue = (column, initialPosition) => {
    const text = format(column.value, column.metric);
    const shape = text.replace(/\d/g, "0");
    if (shape === column.shape) return;

    const previous = column.digits;
    const digitCount = (text.match(/\d/g) || []).length;
    const nodes = [];
    column.digits = new Map();
    let place = digitCount;

    for (const character of text) {
      if (/\d/.test(character)) {
        place -= 1;
        const start = initialPosition ?? Math.floor(column.value / 10 ** place);
        const digit = previous.get(place) || createDigit(start);
        column.digits.set(place, digit);
        nodes.push(digit.slot);
      } else {
        const mark = element("span", "ledger__mark");
        mark.textContent = character;
        nodes.push(mark);
      }
    }

    column.valueEl.replaceChildren(...nodes);
    column.shape = shape;
  };

  const aimDigits = (column, time, stagger = DIGIT_LAG) => {
    column.digits.forEach((digit, place) => {
      const target = Math.floor(column.value / 10 ** place);
      const distance = target - digit.position;

      // Long runs are trimmed to under two turns of the wheel. Whole turns look identical,
      // so the jump never shows.
      if (Math.abs(distance) >= 10) {
        digit.position += (Math.trunc(distance / 10) - Math.sign(distance)) * 10;
      }

      digit.target = target;
      // Lower places move first, and the carry ripples up through the higher ones.
      digit.startAt = time + place * stagger;
    });
  };

  /* Columns */

  const createColumn = (slot) => {
    const el = element("div", "ledger__col", root);
    const ruleEl = element("span", "ledger__rule", el);
    const labelEl = element("span", "ledger__label", el);
    const figureEl = element("div", "ledger__figure", el);
    const valueEl = element("div", "ledger__value", figureEl);
    const captionEl = element("span", "ledger__caption", figureEl);
    const indexEl = element("span", "ledger__index", el);

    return {
      el, ruleEl, labelEl, figureEl, valueEl, captionEl, indexEl,
      slot, x: 0, velocity: 0, target: 0, moveAt: 0, drag: NaN, drawAt: -Infinity, reach: NaN,
      metric: null, value: 0, digits: new Map(), shape: "", nextTickAt: 0,
    };
  };

  const assign = (column, time, fromZero = false) => {
    const metric = takeMetric();
    column.metric = metric;
    column.value = metric.value + randomInt(0, Math.max(0, metric.step[1] * 6));
    if (metric.max) column.value = Math.min(column.value, metric.max);
    column.shape = "";
    column.digits = new Map();
    renderValue(column, fromZero ? 0 : undefined);
    column.labelEl.textContent = metric.team;
    column.captionEl.textContent = metric.caption;
    indexCounter += 1;
    column.indexEl.textContent = String(indexCounter).padStart(3, "0");
    column.nextTickAt = time + random(2400, 5200);
  };

  const slotX = (slot) => originX + (slot - shift) * columnWidth;

  const measure = () => {
    const width = root.clientWidth;
    const inset = parseFloat(getComputedStyle(root).paddingLeft) || 0;
    const inner = Math.max(0, width - inset * 2);
    const unit = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

    visibleCount = inner / unit > 60 ? 4 : inner / unit > 36 ? 3 : 2;
    columnWidth = inner / visibleCount;
    originX = inset;
    height = root.clientHeight;
    root.style.setProperty("--ledger-col", `${columnWidth}px`);
  };

  const build = (time) => {
    root.replaceChildren();
    columns = [];
    shift = 0;
    indexCounter = 0;
    nextMetric = randomInt(0, metrics.length - 1);

    // One column waits beyond each edge, and one more on the right to receive recycled columns.
    for (let slot = -1; slot <= visibleCount + 1; slot += 1) {
      const column = createColumn(slot);
      columns.push(column);
      assign(column, time, !reduceMotion.matches);
    }
  };

  const place = (column) => {
    column.target = slotX(column.slot);
    column.x = column.target;
    column.velocity = 0;
    column.el.style.transform = `translate3d(${column.x}px, 0, 0)`;
  };

  /* Ticks */

  const tick = (column, time) => {
    const { metric } = column;
    const [low, high] = metric.step;
    let change = randomInt(low, high);
    if (change === 0) change = 1;
    const next = Math.max(metric.min ?? 0, Math.min(metric.max ?? Infinity, column.value + change));
    change = next - column.value;
    column.nextTickAt = time + (metric.rare ? random(6000, 12000) : random(2400, 5200));
    if (!change) return;

    column.value = next;
    renderValue(column);
    aimDigits(column, time);
  };

  /* Motion */

  const spring = (state, target, [stiffness, damping], dt) => {
    const acceleration = -stiffness * (state.x - target) - damping * state.v;
    state.v += acceleration * dt;
    state.x += state.v * dt;
  };

  const stepLedger = (time) => {
    shift += 1;
    // The leftmost column leaves first and the others follow, each a beat later.
    [...columns]
      .sort((a, b) => a.slot - b.slot)
      .forEach((column, rank) => {
        column.moveAt = time + rank * COLUMN_LAG + random(0, 40);
      });
    nextStepAt = time + random(...STEP_EVERY);
  };

  const update = (time, dt) => {
    if (time >= nextStepAt) stepLedger(time);

    const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / steps;

    columns.forEach((column) => {
      if (time >= column.moveAt) column.target = slotX(column.slot);

      const state = { x: column.x, v: column.velocity };
      for (let index = 0; index < steps; index += 1) spring(state, column.target, COLUMN_SPRING, h);
      column.x = state.x;
      column.velocity = state.v;

      if (Math.abs(column.x - column.target) < 0.05 && Math.abs(column.velocity) < 0.05) {
        column.x = column.target;
        column.velocity = 0;
      }

      // Off the left edge: recycle it as the newest column, out of sight on the right.
      if (column.slot - shift < -1 && column.x < -columnWidth) {
        column.slot += columns.length;
        assign(column, time);
        place(column);
      }

      if (time >= column.nextTickAt) tick(column, time);

      column.digits.forEach((digit) => {
        if (time < digit.startAt || (digit.position === digit.target && digit.velocity === 0)) return;
        const digitState = { x: digit.position, v: digit.velocity };
        for (let index = 0; index < steps; index += 1) spring(digitState, digit.target, DIGIT_SPRING, h);
        digit.position = digitState.x;
        digit.velocity = digitState.v;
        if (Math.abs(digit.position - digit.target) < 0.002 && Math.abs(digit.velocity) < 0.01) {
          digit.position = digit.target;
          digit.velocity = 0;
        }
      });
    });
  };

  /* Over the ribbon: the rules and the small labels at their ends are grey on the page and turn
     white where the ribbon passes behind them. */

  const RULE = [217, 219, 224];
  const SMALL_TEXT = [107, 110, 120];
  const whiten = (rgb, white) => `rgb(${rgb.map((c) => Math.round(c + (255 - c) * white)).join(" ")})`;
  const RULE_SAMPLES = 24;
  const TEXT_SAMPLES = [5, 3];
  const TEXT_PAD = 4;
  const ribbonCanvas = root.parentElement.querySelector(".hero-ribbon canvas");

  const tintRules = (coverage) => {
    const box = ribbonCanvas.getBoundingClientRect();
    if (!box.width || !box.height) return;
    columns.forEach((column) => {
      const rule = column.ruleEl.getBoundingClientRect();
      if (!rule.height) return;
      const x = (rule.left - box.left) / box.width;
      const stops = [];
      for (let i = 0; i < RULE_SAMPLES; i += 1) {
        const share = i / (RULE_SAMPLES - 1);
        const y = 1 - (rule.top + share * rule.height - box.top) / box.height;
        // The ribbon shows at a fraction of its strength, so a little cover is enough to go white.
        const white = smoothstep(0.06, 0.4, coverage(x, y));
        stops.push(`${whiten(RULE, white)} ${(share * 100).toFixed(1)}%`);
      }
      column.ruleEl.style.background = `linear-gradient(to bottom, ${stops.join(", ")})`;

      [column.labelEl, column.indexEl].forEach((text) => {
        const r = text.getBoundingClientRect();
        if (!r.width) return;
        // Sample across the whole label, a little beyond it for the canvas blur, and take the
        // strongest cover: the band often clips only one end of a label.
        let cover = 0;
        for (let i = 0; i < TEXT_SAMPLES[0]; i += 1) {
          for (let j = 0; j < TEXT_SAMPLES[1]; j += 1) {
            const px = r.left - TEXT_PAD + ((r.width + TEXT_PAD * 2) * i) / (TEXT_SAMPLES[0] - 1);
            const py = r.top - TEXT_PAD + ((r.height + TEXT_PAD * 2) * j) / (TEXT_SAMPLES[1] - 1);
            cover = Math.max(cover, coverage((px - box.left) / box.width, 1 - (py - box.top) / box.height));
          }
        }
        // A short ramp above the haze, so a label is grey or white and never a pale grey between.
        const white = smoothstep(0.26, 0.4, cover);
        text.style.color = whiten(SMALL_TEXT, white);
        // The index is dimmed on the page; over the band it shows at full strength.
        if (text === column.indexEl) text.style.opacity = (0.7 + 0.3 * white).toFixed(3);
      });
    });
  };

  if (ribbonCanvas) {
    ribbonCanvas.addEventListener("ribbon:frame", (event) => tintRules(event.detail));
  }

  const smoothstep = (edge0, edge1, value) => {
    const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  };

  // How tall a rule stands at a given x: full through the middle, easing shorter towards the
  // sides, so the frame seems to curve away as columns travel to the edges.
  const reachAt = (x) => {
    const half = (visibleCount * columnWidth) / 2;
    const distance = Math.abs(x - (originX + half)) / half;
    return 1 - (1 - EDGE_REACH) * smoothstep(0.35, 1.2, distance);
  };

  const paint = (time = performance.now()) => {
    columns.forEach((column) => {
      column.el.style.transform = `translate3d(${column.x.toFixed(2)}px, 0, 0)`;

      const drawn = Math.max(0, Math.min(1, (time - column.drawAt) / DRAW_DURATION));
      const reach = reachAt(column.x) * (1 - (1 - drawn) ** 4);
      if (Math.abs(reach - column.reach) > 0.0005 || Number.isNaN(column.reach)) {
        column.reach = reach;
        column.ruleEl.style.transform = `scaleY(${reach.toFixed(4)})`;
        // Label and index ride the ends of the rule, so the column keeps its frame.
        const inset = ((1 - reachAt(column.x)) * height) / 2;
        column.labelEl.style.transform = `translate3d(0, ${inset.toFixed(2)}px, 0)`;
        column.indexEl.style.transform = `translate3d(0, ${(-inset).toFixed(2)}px, 0)`;
      }

      // The figure carries a little inertia: it trails the line as the column moves.
      const drag = Math.max(-16, Math.min(16, -column.velocity * DRAG));
      if (Math.abs(drag - column.drag) > 0.01 || Number.isNaN(column.drag)) {
        column.drag = drag;
        column.figureEl.style.transform = `translate3d(${drag.toFixed(2)}px, 0, 0)`;
      }

      column.digits.forEach((digit) => {
        const turn = ((digit.position % 10) + 10) % 10;
        if (Math.abs(turn - digit.painted) < 0.0005) return;
        digit.painted = turn;
        digit.strip.style.transform = `translate3d(0, ${(-turn / 11) * 100}%, 0)`;
        // A touch of motion blur while a wheel spins fast; none at rest.
        const blur = Math.min(Math.abs(digit.velocity) * 0.05, 1);
        digit.strip.style.filter = blur > 0.08 ? `blur(${blur.toFixed(2)}px)` : "";
      });
    });
  };

  const frame = (time) => {
    if (!isVisible || document.hidden || reduceMotion.matches) {
      animationFrame = 0;
      return;
    }

    const dt = Math.min((time - (lastTime || time)) / 1000, 1 / 20);
    lastTime = time;
    update(time, dt);
    paint(time);
    animationFrame = requestAnimationFrame(frame);
  };

  const start = () => {
    if (animationFrame || !isVisible || document.hidden || reduceMotion.matches) return;
    lastTime = 0;
    // Steps that fell due while the page was hidden would all run at once; push them on.
    const now = performance.now();
    if (nextStepAt < now) nextStepAt = now + random(900, 1800);
    columns.forEach((column) => {
      if (column.nextTickAt < now) column.nextTickAt = now + random(300, 2400);
    });
    animationFrame = requestAnimationFrame(frame);
  };

  const setup = () => {
    const time = performance.now();
    measure();
    build(time);
    columns.forEach(place);

    if (reduceMotion.matches) {
      columns.forEach((column) => {
        column.digits.forEach((digit, placeValue) => {
          digit.position = digit.target = Math.floor(column.value / 10 ** placeValue);
        });
      });
      paint(time);
      if (ribbonCanvas && ribbonCanvas.ribbonCoverage) tintRules(ribbonCanvas.ribbonCoverage);
      root.classList.add("is-ready");
      return;
    }

    // Entrance: the columns slide in from the right and the figures count up from zero.
    [...columns].sort((a, b) => a.slot - b.slot).forEach((column, rank) => {
      column.x += columnWidth * 0.35;
      column.moveAt = time + 250 + rank * 120;
      column.el.style.setProperty("--i", rank);
      column.drawAt = time + 150 + rank * 110;
      aimDigits(column, time + 700 + rank * 140, 110);
      column.nextTickAt = time + random(4800, 7000);
    });
    nextStepAt = time + random(7000, 8200);
    paint(time);
    requestAnimationFrame(() => root.classList.add("is-ready"));
    start();
  };

  let lastWidth = 0;
  new ResizeObserver(() => {
    const width = root.clientWidth;
    if (!width) return;
    if (!lastWidth) {
      lastWidth = width;
      setup();
      return;
    }
    if (Math.abs(width - lastWidth) < 1) return;
    lastWidth = width;
    // Keep the figures; only the geometry changes.
    measure();
    columns.forEach((column) => {
      place(column);
      column.reach = NaN;
    });
    paint();
  }).observe(root);

  new IntersectionObserver(
    ([entry]) => {
      isVisible = entry.isIntersecting;
      start();
    },
    { threshold: 0.01 },
  ).observe(root);

  document.addEventListener("visibilitychange", start);
  reduceMotion.addEventListener("change", () => {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    setup();
  });
})();
