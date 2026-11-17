// How it works: draws the wires between the connectors, the data lake and the company model at
// the size they're shown, so the packets travelling along them keep a fixed length in pixels.
// Each packet is a stack of translucent dashes of growing length with one shared head, which
// reads as a short gradient fading towards its tail.
// Without the script the template's stretched wires still show, just without packets.
(() => {
  const root = document.querySelector("[data-system]");
  if (!root) return;

  // Dash lengths in pixels, head first; each layer adds a little opacity near the head.
  const TAILS = [5, 10, 16, 23, 31, 40];
  const LAYER_OPACITY = 0.26;
  const svgs = root.querySelectorAll(".system__wires");

  // Turn each template packet into its stack of layers, once.
  root.querySelectorAll(".system__packet").forEach((packet) => {
    TAILS.forEach((tail, index) => {
      const layer = index ? packet.cloneNode() : packet;
      layer.dataset.tail = tail;
      layer.style.setProperty("--tail", `${tail}px`);
      layer.style.strokeOpacity = LAYER_OPACITY;
      if (index) packet.after(layer);
    });
  });

  const draw = () => {
    let drawn = false;
    svgs.forEach((svg) => {
      const { width, height } = svg.getBoundingClientRect();
      if (!width || !height) return;
      drawn = true;
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.setAttribute("preserveAspectRatio", "none");
      svg.querySelectorAll("path[data-y]").forEach((path) => {
        const [from, to] = path.dataset.y.split(" ").map((y) => Number(y) * height);
        path.setAttribute("d", `M0 ${from}C${width * 0.55} ${from} ${width * 0.45} ${to} ${width} ${to}`);
        if (path.dataset.tail) {
          const length = path.getTotalLength();
          // The head runs from the start of the wire to just past its end, so the tail clears it.
          path.style.strokeDasharray = `${path.dataset.tail} ${length + 100}`;
          path.style.setProperty("--packet-length", `${length + TAILS[TAILS.length - 1]}px`);
        }
      });
    });
    root.classList.toggle("is-drawn", drawn);
  };

  new ResizeObserver(draw).observe(root);
})();
