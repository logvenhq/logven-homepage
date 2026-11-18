// Roots: the discovery section's illustration, edge to edge. Branches come in from the left like
// the roots of a tree or the arms of a river, joining one another until a single thin trunk flares
// into a grey ring around the data lake's sphere at the right edge (orb.js fills it). Soft white
// packets run down the branches into the sphere. The shape is seeded, so it's the same on every
// visit, and it's drawn at the size it's shown.
(() => {
  const root = document.querySelector("[data-roots]");
  if (!root) return;
  const svg = root.querySelector("[data-roots-art]");
  const NS = "http://www.w3.org/2000/svg";

  const SEED = 7;
  const DEPTH = 6;
  // Packets: how many branches carry one at a time, and how fast they run, in px per second.
  const PACKETS = 9;
  const SPEED = 120;
  const TAILS = [0.4, 0.8, 1.3, 1.9, 2.6, 3.4];
  const LAYER_OPACITY = 0.26;

  const el = (name, attributes = {}, parent = svg) => {
    const node = document.createElementNS(NS, name);
    for (const key in attributes) node.setAttribute(key, attributes[key]);
    parent.appendChild(node);
    return node;
  };
  const r1 = (value) => Math.round(value * 10) / 10;

  // A small seeded generator (mulberry32), so the branches never reshuffle.
  const seeded = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // The tree, in shares of the drawing: x runs from the trunk (0) out to the left edge (1), y from
  // the middle (0) to the top or bottom (±1). Built once; draw() maps it to the current size.
  const grow = () => {
    const random = seeded(SEED);
    const nodes = [];
    const add = (x, y, depth, parent) => {
      const node = { x, y, depth, parent, children: [] };
      nodes.push(node);
      if (parent) parent.children.push(node);
      if (depth >= DEPTH) return node;
      // Most branches fork in two, some in three; a few stop short, so the edge isn't even.
      if (depth > 2 && random() < 0.14) return node;
      const count = depth > 0 && random() < 0.22 ? 3 : 2;
      const spread = 0.62 * 0.6 ** depth * (0.8 + random() * 0.4);
      const step = (1 / DEPTH) * (0.75 + random() * 0.5);
      for (let i = 0; i < count; i += 1) {
        const share = count === 1 ? 0 : i / (count - 1) - 0.5;
        const y2 = y + share * 2 * spread + (random() - 0.5) * spread * 0.35;
        add(Math.min(1.08, x + step), Math.max(-1.15, Math.min(1.15, y2)), depth + 1, node);
      }
      return node;
    };
    const trunk = add(0, 0, 0, null);
    // Each branch is as thick as the tips it gathers, like a river's arms.
    const gather = (node) => (node.tips = node.children.length ? node.children.reduce((sum, child) => sum + gather(child), 0) : 1);
    gather(trunk);
    // A little wobble for every edge, drawn once.
    nodes.forEach((node) => {
      node.bend = (random() - 0.5) * 0.08;
      node.lean = 0.35 + random() * 0.3;
    });
    return { nodes, trunk, tips: nodes.filter((node) => !node.children.length), random };
  };

  const tree = grow();

  const draw = () => {
    const { width: W, height: H } = svg.getBoundingClientRect();
    if (!W || !H) return;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.replaceChildren();

    // The sphere sits on the right edge, mostly in view, with a grey ring round it. Narrow
    // screens get a smaller one, so the branches keep most of the width.
    const R = Math.min(H * 0.27, W * 0.13);
    const ring = R * 1.2;
    const cx = W - R * 0.25;
    const cy = H / 2;
    root.style.setProperty("--roots-x", `${r1(cx - R)}px`);
    root.style.setProperty("--roots-y", `${r1(cy - R)}px`);
    root.style.setProperty("--roots-size", `${r1(R * 2)}px`);

    // The trunk starts where the ring's neck ends, and the branches spread from there to the left.
    const neck = cx - ring - R * 1.1;
    const span = neck + W * 0.04;
    // The outermost branches stay inside the drawing, so nothing is cut at the top or bottom.
    const at = (node) => ({ x: neck - node.x * span, y: cy + node.y * H * 0.4 });
    const thick = (node) => Math.min(R * 0.09, 0.9 + 0.55 * Math.sqrt(node.tips));

    // Each edge leaves its parent with a slight wobble and lands level on its child. Packets run
    // it backwards, from the child to the parent.
    const edge = (node) => {
      const a = at(node.parent);
      const b = at(node);
      const dx = a.x - b.x;
      const wobble = node.bend * H;
      return `C${r1(a.x - dx * node.lean)} ${r1(a.y + wobble)} ${r1(b.x + dx * (1 - node.lean))} ${r1(b.y)} ${r1(b.x)} ${r1(b.y)}`;
    };
    const reverse = (node) => {
      const a = at(node.parent);
      const b = at(node);
      const dx = a.x - b.x;
      const wobble = node.bend * H;
      return `C${r1(b.x + dx * (1 - node.lean))} ${r1(b.y)} ${r1(a.x - dx * node.lean)} ${r1(a.y + wobble)} ${r1(a.x)} ${r1(a.y)}`;
    };

    const lines = el("g", { class: "roots__lines" });

    // The ring and its neck: one grey shape from the trunk's width out round the sphere.
    const w = thick(tree.trunk) / 2;
    const angle = (128 * Math.PI) / 180;
    const px = cx + ring * Math.cos(angle);
    const py = ring * Math.sin(angle);
    const tx = Math.sin(angle);
    const ty = Math.cos(angle);
    const pull = R * 0.75;
    el("path", {
      class: "roots__ring",
      d: `M${r1(neck - 1)} ${r1(cy - w)}H${r1(neck)}C${r1(neck + pull)} ${r1(cy - w)} ${r1(px - tx * pull)} ${r1(cy - py - ty * pull)} ${r1(px)} ${r1(cy - py)}`
        + `A${r1(ring)} ${r1(ring)} 0 1 1 ${r1(px)} ${r1(cy + py)}`
        + `C${r1(px - tx * pull)} ${r1(cy + py + ty * pull)} ${r1(neck + pull)} ${r1(cy + w)} ${r1(neck)} ${r1(cy + w)}H${r1(neck - 1)}Z`,
    }, lines);

    // Branches, deepest first, so the thicker ones lie on top where they join.
    [...tree.nodes]
      .filter((node) => node.parent)
      .sort((a, b) => b.depth - a.depth)
      .forEach((node) => {
        const a = at(node.parent);
        el("path", { class: "roots__branch", d: `M${r1(a.x)} ${r1(a.y)}${edge(node)}`, "stroke-width": r1(thick(node)) }, lines);
      });

    // Packets: whole routes from a tip down to the sphere, each with a soft tail.
    const packets = el("g", { class: "roots__packets" });
    const pick = seeded(SEED * 31);
    const routes = [...tree.tips].sort(() => pick() - 0.5).slice(0, PACKETS);
    routes.forEach((tip, index) => {
      let d = `M${r1(at(tip).x)} ${r1(at(tip).y)}`;
      for (let node = tip; node.parent; node = node.parent) d += reverse(node);
      d += `H${r1(cx - R * 0.6)}`;
      const probe = el("path", { d }, packets);
      const length = probe.getTotalLength();
      probe.remove();
      // Each packet runs on past the end of its route, out of sight inside the sphere, so it
      // rests a while before the next one sets off down the same route.
      const run = length * (1.6 + pick() * 0.8);
      const duration = run / SPEED;
      TAILS.forEach((share) => {
        const tail = r1(share * 14);
        const path = el("path", { d, class: "roots__packet" }, packets);
        path.style.cssText = `stroke-opacity:${LAYER_OPACITY};stroke-dasharray:${tail} ${r1(run + tail)};--from:${tail}px;--to:${r1(tail - run)}px;--duration:${r1(duration)}s;--delay:-${r1((index * 2.9) % duration)}s`;
      });
    });
  };

  new ResizeObserver(draw).observe(root);
})();
