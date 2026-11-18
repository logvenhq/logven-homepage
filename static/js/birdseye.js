// Birdseye: the data lake seen from above. A white orb sits in the middle (orb.js); hair-thin
// rings spread out from it like water, and faint spokes mark the company's departments. Soft
// packets in the hero's hues orbit along the rings, the inner ones faster than the outer, so the
// activity settles into a pattern.
// Drawn at the size it's shown.
(() => {
  const root = document.querySelector("[data-birdseye]");
  if (!root) return;
  const svg = root.querySelector("[data-birdseye-art]");
  const NS = "http://www.w3.org/2000/svg";

  // Ring radii, as shares of half the drawing's height.
  const RINGS = [0.2, 0.31, 0.44, 0.59, 0.76, 0.95, 1.16, 1.4];
  const SPHERE = 0.12;
  const SPOKES = 12;
  // Packets per ring and their hue; rings without an entry stay quiet.
  const ORBITS = [
    { ring: 0, hue: "#a291f5", count: 1 },
    { ring: 1, hue: "#6f8ff2", count: 2 },
    { ring: 2, hue: "#69c2f0", count: 1 },
    { ring: 3, hue: "#7fdccf", count: 2 },
    { ring: 4, hue: "#ecd273", count: 1 },
    { ring: 5, hue: "#f2ab8a", count: 2 },
    { ring: 6, hue: "#ea94c7", count: 1 },
  ];
  const TAILS = [0.4, 0.8, 1.3, 1.9, 2.6, 3.4];
  const LAYER_OPACITY = 0.26;

  const el = (name, attributes = {}, parent = svg) => {
    const node = document.createElementNS(NS, name);
    for (const key in attributes) node.setAttribute(key, attributes[key]);
    parent.appendChild(node);
    return node;
  };
  const r1 = (value) => Math.round(value * 10) / 10;
  const circle = (cx, cy, r) => `M${r1(cx + r)} ${r1(cy)}A${r1(r)} ${r1(r)} 0 1 1 ${r1(cx - r)} ${r1(cy)}A${r1(r)} ${r1(r)} 0 1 1 ${r1(cx + r)} ${r1(cy)}`;

  const draw = () => {
    const { width: W, height: H } = svg.getBoundingClientRect();
    if (!W || !H) return;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.replaceChildren();
    const cx = W / 2;
    const cy = H / 2;
    const u = H / 2;
    root.style.setProperty("--sphere", `${r1(SPHERE * u * 2)}px`);

    const lines = el("g", { class: "birdseye__lines" });
    for (let i = 0; i < SPOKES; i += 1) {
      const a = (i / SPOKES) * Math.PI * 2 - Math.PI / 2;
      const from = SPHERE * u + 10;
      const to = Math.hypot(W, H);
      el("path", {
        class: "birdseye__spoke",
        d: `M${r1(cx + Math.cos(a) * from)} ${r1(cy + Math.sin(a) * from)}L${r1(cx + Math.cos(a) * to)} ${r1(cy + Math.sin(a) * to)}`,
      }, lines);
    }
    RINGS.forEach((share, index) => {
      el("circle", { class: `birdseye__ring${index < 3 ? " birdseye__ring--inner" : ""}`, cx, cy, r: r1(share * u) }, lines);
    });

    // Orbits: each ring's packets turn at a constant speed, slower the further out they are.
    const packets = el("g");
    ORBITS.forEach(({ ring, hue, count }, index) => {
      const r = RINGS[ring] * u;
      const length = 2 * Math.PI * r;
      const period = length / count;
      const duration = 14 * (RINGS[ring] / RINGS[0]) ** 0.75;
      const d = circle(cx, cy, r);
      TAILS.forEach((tailShare) => {
        const tail = r1(tailShare * 14);
        const path = el("path", { d, class: "birdseye__packet" }, packets);
        path.style.cssText = `stroke:${hue};stroke-opacity:${LAYER_OPACITY};stroke-dasharray:${tail} ${r1(period - tail)};--tail:${tail}px;--period:${r1(period)}px;--duration:${r1(duration)}s;--delay:-${r1((index * 2.3) % duration)}s`;
      });
    });

  };

  new ResizeObserver(draw).observe(root);
})();
