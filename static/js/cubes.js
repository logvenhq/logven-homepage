(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Isometric axes and cube faces, taken from the product's 14×14 cube icons.
  const AXIS_I = [5.92, 3.29];
  const AXIS_J = [-5.92, 3.29];
  const RISE = 6.83;
  const GAP = 1.06;
  const BASE = [7, 10.42];
  const FACES = [
    "M7 6.88L7 13.71Q6.74 13.71 6.48 13.57L1.47 10.77Q0.95 10.48 0.95 9.88L0.95 4.11Q0.95 3.81 1.08 3.59Z",
    "M7 6.88L12.92 3.59Q13.05 3.81 13.05 4.11L13.05 9.88Q13.05 10.48 12.53 10.77L7.52 13.57Q7.26 13.71 7 13.71Z",
    "M7 6.88L1.08 3.59Q1.21 3.36 1.47 3.22L6.48 0.43Q7 0.14 7.52 0.43L12.53 3.22Q12.79 3.36 12.92 3.59Z",
  ];
  const COLORS = {
    sheets: ["#A7E3B9", "#3FA46A", "#6CCB8E"],
    workers: ["#A9CBF7", "#4A80DC", "#6FA6EE"],
    models: ["#FCC48C", "#E5761C", "#F99A45"],
  };

  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const key = (i, j) => `${i},${j}`;
  const cell = (id) => id.split(",").map(Number);
  const clamp = (t) => Math.min(Math.max(t, 0), 1);
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const apart = (list, [i, j], gap) => list.every(([a, b]) => Math.max(Math.abs(a - i), Math.abs(b - j)) > gap);
  const range = (a, b) => Array.from({ length: Math.abs(b - a) + 1 }, (_, n) => a + n * Math.sign(b - a));
  const shuffle = (list, random) => {
    for (let n = list.length - 1; n > 0; n -= 1) {
      const m = Math.floor(random() * (n + 1));
      [list[n], list[m]] = [list[m], list[n]];
    }
    return list;
  };

  // The plane fills the card (u = i - j runs across, v = i + j runs down); builds stay off the faded rim.
  const inBounds = (i, j) => Math.abs(i - j) <= 16 && i + j >= -13 && i + j <= 19;
  const inner = (i, j) => Math.abs(i - j) <= 12 && i + j >= -9 && i + j <= 15;
  const CELLS = [];
  for (let i = -15; i <= 18; i += 1) for (let j = -15; j <= 18; j += 1) if (inBounds(i, j)) CELLS.push([i, j]);
  const outside = (i, j) => DIRS.map(([di, dj]) => [i + di, j + dj]).find(([a, b]) => !inBounds(a, b));
  const spots = (random, count, gap, test = inner) => {
    const picked = [];
    shuffle(CELLS.filter(([i, j]) => test(i, j)), random).forEach((p) => picked.length < count && apart(picked, p, gap) && picked.push(p));
    return picked;
  };

  // Shapes are lists of [i, j, k] cubes. Most are placed anywhere free; `fixed` ones lay themselves out.
  const columns = (list) => list.flatMap(([i, j, h]) => Array.from({ length: h }, (_, k) => [i, j, k]));
  const block = (i0, j0, w, d, h) =>
    columns(Array.from({ length: w * d }, (_, n) => [i0 + (n % w), j0 + Math.floor(n / w), h]));
  const fixed = (make) => Object.assign(make, { fixed: true });
  const constellation = fixed((random) => columns(spots(random, 9, 2).map((p, n) => [...p, n < 3 ? 2 : 1])));
  const PARTS = [[[0, 0, 0], [1, 0, 0], [0, 1, 0]], [[0, 0, 0], [0, 0, 1], [1, 0, 0]], [[0, 0, 0], [0, 1, 0], [0, 1, 1]], [[0, 0, 0], [1, 0, 0], [2, 0, 0]]];
  const clusters = fixed((random) => {
    const [ci, cj] = spots(random, 1, 0)[0];
    for (const reach of [6, 99]) {
      const fits = (i, j) => inner(i, j) && inner(i + 2, j + 1) && Math.max(Math.abs(i - ci), Math.abs(j - cj)) <= reach;
      const anchors = spots(random, 4, 3, fits);
      if (anchors.length === 4) return anchors.flatMap(([ai, aj], n) => PARTS[n].map(([i, j, k]) => [ai + i, aj + j, k]));
    }
    return [];
  });

  // Workers walk one long lane: back along the front row, a queue round the corner, a station, the stack.
  const LINE = [[-10, 3], [-10, 2], ...range(-10, 10).map((i) => [i, 1])];
  const STATION = 12;
  const RETURN = [...range(10, -10).map((i) => [i, 4]), ...LINE.slice(0, STATION)];

  const SCENES = {
    // The state: tables, bar charts and tidy grids forming in two places at once.
    sheets: {
      crews: 2, size: 8, ambient: 4, scatter: true,
      shapes: [
        () => block(0, 0, 4, 2, 1),
        (random) => columns(shuffle([1, 2, 3, 2], random).map((h, n) => [n, 0, h])),
        () => columns([0, 1, 2, 3].flatMap((a) => [0, 1].map((b) => [a * 2, b * 2, 1]))),
      ],
    },
    // The functions: whatever comes off the line is stacked at its end, as a tower, a wall or steps.
    workers: {
      crews: 1, size: 12, ambient: 5, line: true,
      shapes: [
        () => block(11, 0, 2, 2, 3),
        () => block(11, -1, 1, 4, 3),
        () => columns([[11, -2, 1], [11, -1, 2], [11, 0, 3], [11, 1, 3], [11, 2, 2], [11, 3, 1]]),
      ],
    },
    // The overview: a map spread over the plane, a stepped pyramid, then converging clusters.
    models: {
      crews: 1, size: 12, ambient: 6,
      shapes: [constellation, () => [...block(0, 0, 4, 2, 1), ...block(1, 0, 2, 2, 1).map(([i, j]) => [i, j, 1])], constellation, clusters],
    },
  };

  // The simulation knows nothing about the DOM: cubes, stacks per cell, crews that build, and passers-by.
  const createSim = (name, random = Math.random) => {
    const scene = SCENES[name];
    const cols = new Map();
    const locks = new Set();
    const lane = new Set(scene.line ? [...RETURN, ...LINE].map(([i, j]) => key(i, j)) : []);
    const crews = Array.from({ length: scene.crews }, (_, n) => ({ n, cycle: n, cubes: [], upcoming: null, holdUntil: -1 }));
    const cubes = Array.from({ length: scene.crews * scene.size + scene.ambient }, (_, id) => {
      const crew = crews[Math.floor(id / scene.size)] || null;
      const c = { crew, i: 0, j: 0, k: 0, dir: [1, 0], plan: [], slot: null, move: null, next: 0, blocked: 0, away: false };
      if (crew) crew.cubes.push(c);
      return c;
    });
    let now = 0;

    const pile = (i, j) => cols.get(key(i, j)) || [];
    const height = (i, j) => pile(i, j).length;
    const top = (i, j) => pile(i, j)[height(i, j) - 1];
    const ground = (i, j) => inBounds(i, j) && !locks.has(key(i, j)) && !height(i, j);
    const at = (c, i, j, k) => c.i === i && c.j === j && c.k === k;
    const put = (c) => cols.set(key(c.i, c.j), [...pile(c.i, c.j), c]);
    const take = (c) => cols.set(key(c.i, c.j), pile(c.i, c.j).slice(0, -1));
    const filled = (i, j, k) => {
      const c = pile(i, j)[k];
      return Boolean(c && !c.plan.length && c.slot && at(c.slot, i, j, k));
    };
    // Building sites, current and next, plus a one-cell margin round them.
    const zoned = (i, j) => crews.some((cr) => cr.stage.zone.has(key(i, j)) || (cr.upcoming && cr.upcoming.zone.has(key(i, j))));
    const open = (i, j) => ground(i, j) && !zoned(i, j);
    const targets = () => cubes.flatMap((c) => c.plan.map((g) => (g.slot ? key(g.slot.i, g.slot.j) : key(g.i, g.j))));

    const structure = (cells) => {
      const foot = new Set(cells.map(([i, j]) => key(i, j)));
      const zone = new Set();
      cells.forEach(([i, j]) => [[0, 0], ...DIRS].forEach(([di, dj]) => zone.add(key(i + di, j + dj))));
      const nb = (i, j) => DIRS.filter(([di, dj]) => foot.has(key(i + di, j + dj))).length;
      // Lower layers first, enclosed cells before those around them; workers fill the far side first.
      const far = (s) => (scene.line ? Math.abs(s.i - 10) + Math.abs(s.j - 1) : 0);
      const slots = cells.map(([i, j, k]) => ({ i, j, k, nb: nb(i, j) }));
      return { slots: slots.sort((a, b) => a.k - b.k || b.nb - a.nb || far(b) - far(a)), zone };
    };

    // A new site goes anywhere on the plane that is clear of other crews, and away from this crew's last one.
    const place = (crew, cells) => {
      const busy = new Set(targets());
      crews.forEach((o) => o !== crew && [o.stage, o.upcoming].forEach((s) => s && s.zone.forEach((z) => busy.add(z))));
      cubes.forEach((c) => c.crew && c.crew !== crew && busy.add(key(c.i, c.j)));
      for (const strict of [true, false]) {
        for (const [ai, aj] of shuffle(CELLS.slice(), random)) {
          const moved = cells.map(([i, j, k]) => [i + ai, j + aj, k]);
          if (!moved.every(([i, j]) => inner(i, j))) continue;
          const site = structure(moved);
          const clash = [...site.zone].some((z) => busy.has(z) || (strict && crew.stage && crew.stage.zone.has(z)));
          if (!clash) return site;
        }
      }
      return structure(cells);
    };
    const shape = (crew) => {
      const make = scene.shapes[crew.cycle++ % scene.shapes.length];
      const cells = make(random);
      return make.fixed || scene.line ? structure(cells) : place(crew, cells);
    };

    // Greedy nearest pairing of cubes and targets; a cube already in place keeps its spot.
    const pair = (list, goals, give) => {
      const used = new Set();
      list
        .flatMap((c) => goals.map((t) => [Math.abs(c.i - t.i) + Math.abs(c.j - t.j) + Math.abs(c.k - t.k) + random() / 2, c, t]))
        .sort((a, b) => a[0] - b[0])
        .forEach(([, c, t]) => !used.has(c) && !used.has(t) && give(c, t, used.add(c).add(t)));
    };

    const begin = (crew, kind, hold, { slots = [], zone = new Set() } = {}) => {
      crew.stage = { kind, hold, slots, zone, start: now };
    };
    const build = (crew, next) => {
      begin(crew, "build", 1300 + random() * 700, next);
      crew.upcoming = null;
      pair(crew.cubes, next.slots, (c, s) => Object.assign(c, { slot: s, plan: [{ slot: s, spread: true }] }));
    };
    const scatter = (crew, next) => {
      crew.upcoming = next;
      const avoid = new Set([...targets(), ...crew.stage.slots.map((s) => key(s.i, s.j))]);
      const picked = spots(random, scene.size, 1, (i, j) => inner(i, j) && open(i, j) && !avoid.has(key(i, j)));
      begin(crew, "scatter", 250);
      pair(crew.cubes, picked.map(([i, j]) => ({ i, j, k: 0 })), (c, t) => Object.assign(c, { slot: null, plan: [{ ...t, loose: true }] }));
    };
    const produce = (crew, next) => {
      begin(crew, "build", 1500 + random() * 500, next);
      const index = (c) => LINE.findIndex(([i, j]) => i === c.i && j === c.j);
      const path = LINE.map(([i, j], n) => ({ i, j, lift: n === STATION }));
      crew.cubes.slice().sort((a, b) => index(b) - index(a)).forEach((c, n) => {
        c.slot = next.slots[n];
        c.plan = [...path.slice(index(c) + 1), { slot: c.slot }];
      });
    };
    const reset = (crew) => {
      begin(crew, "reset", 500);
      crew.cubes.forEach((c) => Object.assign(c, { slot: null, plan: RETURN.map(([i, j], n) => ({ i, j, queue: n > 0 })) }));
    };
    const advance = (crew) => {
      crew.holdUntil = -1;
      if (scene.line) return crew.stage.kind === "reset" ? produce(crew, shape(crew)) : reset(crew);
      if (scene.scatter && crew.stage.kind === "build") return scatter(crew, shape(crew));
      return build(crew, crew.stage.kind === "scatter" ? crew.upcoming : shape(crew));
    };

    // A step reserves both cells until it lands, so nothing else can enter or leave them meanwhile.
    const move = (c, i, j, k, mode) => {
      if (!c.away) take(c);
      locks.add(key(c.i, c.j)).add(key(i, j));
      if (mode !== "lift") c.dir = [i - c.i, j - c.j];
      const dur = mode === "lift" ? 800 : 380 + random() * 170 + 170 * Math.abs(k - c.k) + (mode ? 300 : 0);
      Object.assign(c, { move: { from: [c.i, c.j, c.k], to: [i, j, k], t0: now, dur, mode }, blocked: 0 });
    };
    const finish = (c) => {
      const [i, j, k] = c.move.to;
      locks.delete(key(c.i, c.j));
      locks.delete(key(i, j));
      Object.assign(c, { i, j, k, away: c.move.mode === "out", move: null });
      if (!c.away) put(c);
      // Short, uneven pauses keep the cubes out of lockstep; those that left come back a little later.
      c.next = now + (c.away ? 600 + random() * 3000 : 60 + random() * 220 + (random() < 0.12 ? 400 + random() * 500 : 0));
    };
    const step = (c, next, k = 0) => (next ? move(c, next[0], next[1], k) : undefined);

    const flood = (starts, pass) => {
      const dist = new Map(starts.map(([i, j]) => [key(i, j), 0]));
      for (let n = 0; n < starts.length; n += 1) {
        const [i, j] = starts[n];
        DIRS.forEach(([di, dj]) => {
          if (dist.has(key(i + di, j + dj)) || !pass(i + di, j + dj)) return;
          dist.set(key(i + di, j + dj), dist.get(key(i, j)) + 1);
          starts.push([i + di, j + dj]);
        });
      }
      return dist;
    };
    // Distances to the goal over passable ground, then one step downhill, preferring to keep going straight.
    const route = (c, isGoal, pass = ground) => {
      const dist = flood(CELLS.filter(([i, j]) => isGoal(i, j)), pass);
      let best = null;
      [c.dir, ...shuffle(DIRS.slice(), random)].forEach(([di, dj]) => {
        const d = dist.get(key(c.i + di, c.j + dj));
        if (d !== undefined && (!best || d < best[2])) best = [c.i + di, c.j + dj, d];
      });
      return best;
    };

    const stuck = (c, goal) => {
      c.blocked += 1;
      if (goal.loose && c.blocked > 4 && !c.k && !zoned(c.i, c.j)) c.plan = [];
      else if (c.blocked > 6) {
        const out = shuffle(DIRS.slice(), random).find(([di, dj]) => ground(c.i + di, c.j + dj));
        if (out) move(c, c.i + out[0], c.j + out[1], 0);
      }
    };

    const seek = (c, goal) => {
      const { i, j, k, nb } = goal.slot;
      // A slot opens once the cube below it is in place (ground slots: once the more enclosed ones are).
      const slots = c.crew.stage.slots;
      const below = k ? filled(i, j, k - 1) : slots.every((s) => s.k || s.nb <= nb || filled(s.i, s.j, 0));
      if (below && height(i, j) === k && !locks.has(key(i, j))) {
        const next = route(c, (a, b) => a === i && b === j);
        return next ? step(c, next, next[0] === i && next[1] === j ? k : 0) : stuck(c, goal);
      }
      if (!goal.spread) return undefined;
      // Cubes that must wait step off every building site so they never wall one in.
      if (c.k || zoned(c.i, c.j)) {
        const next = route(c, open);
        return next ? step(c, next) : stuck(c, goal);
      }
      if (Math.abs(c.i - i) + Math.abs(c.j - j) <= 3) return undefined;
      const next = route(c, (a, b) => a === i && b === j);
      return next && open(next[0], next[1]) ? step(c, next) : undefined;
    };

    const reached = (c, g) =>
      g.slot ? at(c, g.slot.i, g.slot.j, g.slot.k) && (!g.slot.k || filled(g.slot.i, g.slot.j, g.slot.k - 1)) : at(c, g.i, g.j, 0);

    const decide = (c) => {
      // A cube that wandered onto a later waypoint (never past the station) carries on from there.
      const skip = c.plan.findIndex((g) => !g.slot && at(c, g.i, g.j, 0));
      if (skip > 0 && !c.plan.slice(0, skip).some((g) => g.lift)) c.plan.splice(0, skip);
      while (c.plan.length && reached(c, c.plan[0])) {
        if (c.plan.shift().lift) return move(c, c.i, c.j, 0, "lift");
      }
      const goal = c.plan[0];
      c.next = now + 150 + random() * 250;
      if (!goal || top(c.i, c.j) !== c || locks.has(key(c.i, c.j))) return undefined;
      if (goal.slot) return seek(c, goal);
      const holder = top(goal.i, goal.j);
      if (goal.queue && holder && holder.crew === c.crew && !holder.plan.length) return void (c.plan = []);
      if (!ground(goal.i, goal.j)) return goal.loose ? stuck(c, goal) : undefined;
      const next = route(c, (a, b) => a === goal.i && b === goal.j);
      return next ? step(c, next) : stuck(c, goal);
    };

    // Passers-by: stroll to a random spot, linger, sometimes leave through the rim and come back elsewhere.
    const wander = (c) => {
      c.next = now + 150 + random() * 250;
      if (c.away) {
        const gates = CELLS.filter(([i, j]) => open(i, j) && !lane.has(key(i, j)) && outside(i, j) && !locks.has(key(...outside(i, j))));
        if (!gates.length) return undefined;
        const [i, j] = gates[Math.floor(random() * gates.length)];
        [c.i, c.j] = outside(i, j);
        return move(c, i, j, 0, "in");
      }
      if (zoned(c.i, c.j)) return step(c, route(c, open));
      const goal = c.plan[0];
      if (goal && at(c, goal.i, goal.j, 0)) {
        const gate = goal.exit && outside(c.i, c.j);
        if (gate && locks.has(key(...gate))) return undefined;
        c.plan = [];
        if (gate) return move(c, gate[0], gate[1], 0, "out");
        c.next = now + 300 + random() * 2200;
        return undefined;
      }
      if (!goal) {
        const exit = random() < 0.3;
        const options = [...flood([[c.i, c.j]], open)].filter(
          ([id, d]) => d >= 4 && d <= 18 && !lane.has(id) && (!exit || outside(...cell(id))),
        );
        if (!options.length) return undefined;
        const [i, j] = cell(options[Math.floor(random() * options.length)][0]);
        c.plan = [{ i, j, exit }];
        return undefined;
      }
      const next = open(goal.i, goal.j) && route(c, (a, b) => a === goal.i && b === goal.j, open);
      if (next) return step(c, next);
      if ((c.blocked += 1) > 3) c.plan = [];
      return undefined;
    };

    const update = (dt) => {
      now += dt;
      cubes.forEach((c) => c.move && now >= c.move.t0 + c.move.dur && finish(c));
      cubes.forEach((c) => !c.move && now >= c.next && (c.crew ? decide(c) : wander(c)));
      crews.forEach((crew) => {
        if (crew.cubes.some((c) => c.move || c.plan.length)) {
          crew.holdUntil = -1;
          // Safety valve: a stage that somehow cannot finish just moves on.
          if (now - crew.stage.start > 90000) advance(crew);
        } else if (crew.holdUntil < 0) crew.holdUntil = now + crew.stage.hold;
        else if (now >= crew.holdUntil) advance(crew);
      });
    };

    // Interpolated position, opacity, and a depth cell: the farther-forward cell while sliding between two.
    const view = (c) => {
      const m = c.move;
      if (!m) return { pos: [c.i, c.j, c.k], depth: c.i + c.j, alpha: c.away ? 0 : 1 };
      const t = clamp((now - m.t0) / m.dur);
      const [[fi, fj, fk], [ti, tj, tk]] = [m.from, m.to];
      if (m.mode === "lift") return { pos: [fi, fj, fk + 0.225 * (1 - Math.cos(2 * Math.PI * t))], depth: fi + fj, alpha: 1 };
      // Climbing rises before sliding over; stepping down slides off first, then settles.
      const [up, down] = [tk > fk, tk < fk];
      const h = ease(clamp(up ? (t - 0.35) / 0.65 : down ? t / 0.6 : t));
      const v = ease(clamp(up ? t / 0.45 : down ? (t - 0.55) / 0.45 : t));
      const pos = [fi + (ti - fi) * h, fj + (tj - fj) * h, fk + (tk - fk) * v];
      const alpha = m.mode === "in" ? h : m.mode === "out" ? 1 - h : 1;
      return { pos, alpha, depth: h <= 0 ? fi + fj : h >= 1 ? ti + tj : Math.max(fi + fj, ti + tj) };
    };

    crews.forEach((crew) => begin(crew, "build", 0));
    crews.forEach((crew) => {
      const first = shape(crew);
      first.slots.forEach((s, n) => put(Object.assign(crew.cubes[n], { i: s.i, j: s.j, k: s.k, slot: s })));
      begin(crew, "build", 1500 + crew.n * 4000, first);
    });
    const strollers = cubes.filter((c) => !c.crew);
    spots(random, strollers.length, 1, (i, j) => open(i, j) && !lane.has(key(i, j))).forEach(([i, j], n) =>
      put(Object.assign(strollers[n], { i, j })),
    );

    return { cubes, update, view };
  };

  const project = ([i, j, k]) => [
    (i * AXIS_I[0] + j * AXIS_J[0]) * GAP,
    (i * AXIS_I[1] + j * AXIS_J[1]) * GAP - k * RISE * GAP,
  ];

  const element = (name, attributes) => {
    const node = document.createElementNS(SVG_NS, name);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  };

  // A soft isometric grid whose lines run between the cube cells.
  const drawGrid = (svg) => {
    const grid = element("g", { class: "cubes__grid" });
    const reach = 24;
    for (let m = -reach; m <= reach; m += 1) {
      [[AXIS_I, AXIS_J], [AXIS_J, AXIS_I]].forEach(([along, across]) => {
        const [ox, oy] = [0, 1].map((n) => BASE[n] + (m + 0.5) * across[n] * GAP);
        const [dx, dy] = [0, 1].map((n) => reach * along[n] * GAP);
        grid.append(element("line", { x1: ox - dx, y1: oy - dy, x2: ox + dx, y2: oy + dy }));
      });
    }
    svg.append(grid);
  };

  const build = (svg) => {
    const name = svg.dataset.cubes;
    if (!SCENES[name]) return;

    const symbol = element("g", { id: `cube-${name}` });
    COLORS[name].forEach((fill, index) => symbol.append(element("path", { d: FACES[index], fill })));
    const defs = element("defs", {});
    defs.append(symbol);
    svg.append(defs);
    drawGrid(svg);
    const layer = element("g", {});
    svg.append(layer);

    const sim = createSim(name);
    const nodes = sim.cubes.map(() => layer.appendChild(element("use", { href: `#cube-${name}` })));
    const placed = [];
    const faded = [];
    let order = [];

    // Paint back to front: depth cell, then the exact diagonal, then height. Re-append only on change.
    const render = () => {
      const views = sim.cubes.map(sim.view);
      views.forEach(({ pos, alpha }, n) => {
        const [x, y] = project(pos);
        const transform = `translate(${x.toFixed(2)} ${y.toFixed(2)})`;
        const opacity = alpha.toFixed(2);
        if (placed[n] !== transform) nodes[n].setAttribute("transform", (placed[n] = transform));
        if (faded[n] !== opacity) nodes[n].setAttribute("opacity", (faded[n] = opacity));
      });
      const diagonal = (n) => views[n].pos[0] + views[n].pos[1];
      const sorted = views
        .map((_, n) => n)
        .sort((a, b) => views[a].depth - views[b].depth || diagonal(a) - diagonal(b) || views[a].pos[2] - views[b].pos[2] || a - b);
      if (sorted.some((n, m) => n !== order[m])) {
        sorted.forEach((n) => layer.append(nodes[n]));
        order = sorted;
      }
    };

    render();
    let [visible, running, request, last] = [false, false, 0, 0];
    const tick = (time) => {
      sim.update(Math.min(time - last, 50));
      last = time;
      render();
      request = requestAnimationFrame(tick);
    };

    // Animate only while the card is on screen and the tab is visible.
    const sync = () => {
      const shouldRun = visible && !document.hidden && !reduceMotion.matches;
      if (running === shouldRun) return;
      running = shouldRun;
      cancelAnimationFrame(request);
      if (running) request = requestAnimationFrame((time) => tick((last = time)));
    };
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }).observe(svg);
    document.addEventListener("visibilitychange", sync);
    reduceMotion.addEventListener("change", sync);
  };

  document.querySelectorAll("svg[data-cubes]").forEach(build);
})();
