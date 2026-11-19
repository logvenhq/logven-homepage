// Housekeeping: hair-thin grey wires run in from the left edge of the window, unevenly spaced:
// one sits in the wrong lane and crosses over to its own, two copies of a list run side by side
// and merge, and one wire that nobody uses fades out, dashed. A thin dark line in the middle
// is the nightly check. Past it the wires run on as even, parallel lanes to the right edge.
// Packets drift along the left side in the connectors' hues, each at its own pace; on the right
// they all move at one steady speed, and the automated lanes carry trains of black dots.
// Small hairline ticks, like the hero ledger's rules, tie each finding to its note.
// Everything is drawn at the size it's shown, so lines, dots and dashes stay crisp. Below 720px
// the notes become a plain list under the drawing.
(() => {
  const root = document.querySelector("[data-tidy]");
  if (!root) return;
  const svg = root.querySelector("[data-tidy-art]");
  const marks = {};
  root.querySelectorAll("[data-mark]").forEach((mark) => (marks[mark.dataset.mark] = mark));
  const NS = "http://www.w3.org/2000/svg";

  // Heights as shares of the drawing; x positions as shares of the content column.
  const LANES = [0.22, 0.33, 0.44, 0.55, 0.66, 0.77];
  const GATE = 0.56;
  const SETTLE = 0.38; // where the wires have found their lane
  // Each incoming wire: where it starts, which lane it ends in, its hue and its pace.
  const WIRES = [
    { from: 0.25, lane: 0, hue: "orange", duration: 6.2, delay: 0.4 },
    { from: 0.3, lane: 1, hue: "violet", duration: 7.6, delay: 3.1 },
    { from: 0.4, lane: 2, hue: "indigo", duration: 5.4, delay: 1.2 },
    { from: 0.49, lane: 2, hue: "blue", duration: 6.8, delay: 4.4, merge: true },
    { from: 0.6, lane: 3, hue: "sky", duration: 5.9, delay: 2.2 },
    { from: 0.09, lane: 4, hue: "azure", duration: 7.1, delay: 0.9, moved: true },
    { from: 0.8, lane: 5, hue: "amber", duration: 6.5, delay: 5.3 },
  ];
  const STALE = { from: 0.9, end: 0.33 };
  const AUTOMATED = [1, 5];
  const PACKET_LENGTH = 34;
  // On the right everything moves at this speed, in pixels per second.
  const SPEED = 46;

  const el = (name, attributes = {}, parent = svg) => {
    const node = document.createElementNS(NS, name);
    for (const key in attributes) node.setAttribute(key, attributes[key]);
    parent.appendChild(node);
    return node;
  };
  const r = (value) => Math.round(value * 10) / 10;

  // One crisp short line, matching the packets used throughout the other section graphics.
  const packet = (parent, d, className, style) => {
    const path = el("path", { d, class: className }, parent);
    path.style.cssText = style(PACKET_LENGTH);
    path.style.setProperty("--tail", `${PACKET_LENGTH}px`);
  };

  const draw = () => {
    const box = svg.getBoundingClientRect();
    const W = Math.round(box.width);
    const H = Math.round(box.height);
    if (!W || !H) return;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.replaceChildren();

    // The content column inside the full-bleed drawing.
    const container = root.parentElement;
    const column = container.getBoundingClientRect();
    const style = getComputedStyle(container);
    const x0 = column.left + parseFloat(style.paddingLeft) - box.left;
    const cw = column.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const X = (f) => r(x0 + f * cw);
    const Y = (f) => r(f * H);
    const gate = X(GATE);
    const wide = W >= 720;
    root.classList.toggle("is-wide", wide);

    const defs = el("defs");
    const fade = el("linearGradient", { id: "tidy-fade", gradientUnits: "userSpaceOnUse", x1: 0, y1: 0, x2: X(STALE.end), y2: 0 }, defs);
    el("stop", { offset: 0.3, "stop-color": "#c9cbd1", "stop-opacity": 1 }, fade);
    el("stop", { offset: 1, "stop-color": "#c9cbd1", "stop-opacity": 0.35 }, fade);

    const wires = el("g", { class: "tidy__wires" });
    const packets = el("g");
    // Ticks and their dots sit above the wires and packets.
    const ticks = el("g", { class: "tidy__ticks" });

    // Incoming wires, from the window edge into their lanes.
    WIRES.forEach((wire) => {
      const s = Y(wire.from);
      const lane = Y(LANES[wire.lane]);
      const bend = wire.moved
        ? `L${X(0.08)} ${s}C${X(0.24)} ${s} ${X(0.22)} ${lane} ${X(SETTLE)} ${lane}`
        : `L${X(0.12)} ${s}C${X(0.22)} ${s} ${X(0.26)} ${lane} ${X(SETTLE)} ${lane}`;
      const d = `M0 ${s}${bend}L${gate} ${lane}`;
      // A merged copy only runs until it has joined its twin.
      const visible = wire.merge ? `M0 ${s}${bend}L${X(0.44)} ${lane}` : d;
      el("path", { d: visible, class: "tidy__wire" }, wires);
      const length = (() => {
        const probe = el("path", { d: visible }, defs);
        const value = probe.getTotalLength();
        probe.remove();
        return value;
      })();
      packet(packets, visible, "tidy__packet", (tail) =>
        `--hue:var(--${wire.hue});stroke-dasharray:${tail} ${length + 200};--length:${r(length + 40)}px;--duration:${wire.duration}s;--delay:-${wire.delay}s`,
      );
    });

    // The wire nobody uses: dashed, fading, ending in a dashed ring.
    const staleY = Y(STALE.from);
    el("path", { d: `M0 ${staleY}L${X(STALE.end) - 5} ${staleY}`, class: "tidy__wire tidy__wire--stale", stroke: "url(#tidy-fade)" }, wires);
    el("circle", { cx: X(STALE.end), cy: staleY, r: 4.5, class: "tidy__ring" }, wires);

    // Ordered lanes after the check, to the right edge.
    LANES.forEach((laneShare, index) => {
      const y = Y(laneShare);
      const d = `M${gate} ${y}L${W + 40} ${y}`;
      el("path", { d, class: "tidy__wire" }, wires);
      if (AUTOMATED.includes(index)) {
        const period = 66;
        const dots = el("path", { d, class: "tidy__dots" }, packets);
        dots.style.cssText = `stroke-dasharray:0 ${period};--period:${period}px;--duration:${period / SPEED}s`;
      } else {
        const period = 230;
        const offset = (index * 71) % period;
        packet(packets, d, "tidy__beat", (tail) =>
          `stroke-dasharray:${tail} ${period - tail};--period:${period}px;--duration:${period / SPEED}s;--delay:-${r(offset / SPEED)}s`,
        );
      }
      // Where each lane meets the check.
      el("circle", { cx: gate, cy: y, r: 2, class: "tidy__port" }, ticks);
    });

    // The nightly check: a thin dark line.
    el("rect", { x: gate - 0.75, y: Y(0.12), width: 1.5, height: Y(0.76), rx: 0.75, class: "tidy__check" });

    // Notes: a dot on the finding and a hairline up or down to its label.
    const note = (name, x, y, to) => {
      const mark = marks[name];
      if (!mark) return;
      if (!wide) {
        mark.removeAttribute("style");
        return;
      }
      // The hairline goes down first so the dot sits on top of it; at the flagged ring it
      // starts from the ring's edge rather than its centre.
      const end = Y(to);
      const start = name === "flagged" ? y + Math.sign(end - y) * 4.5 : y;
      el("path", { d: `M${x} ${start}L${x} ${end}`, class: "tidy__tick" }, ticks);
      if (!["check", "flagged"].includes(name)) el("circle", { cx: x, cy: y, r: 2.5, class: "tidy__anchor" }, ticks);
      const above = end < y;
      mark.style.left = `${x}px`;
      mark.style.top = above ? `${end}px` : "";
      mark.style.bottom = above ? "" : `${H - end}px`;
      mark.dataset.side = above ? "above" : "below";
    };
    note("moved", X(0.05), Y(0.09), 0.02);
    note("merged", X(0.44), Y(LANES[2]), 0.02);
    note("flagged", X(STALE.end), staleY, 0.98);
    note("check", gate, Y(0.88), 0.98);

    root.classList.add("is-drawn");
  };

  new ResizeObserver(draw).observe(root);
})();
