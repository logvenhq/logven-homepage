// The orb: soft, blurred colour drifting slowly inside a flat disc, lit from below left.
// It fills the data lake's spheres: the lake, the hub in how it works and Birdseye. The tools
// badges keep their plain black marks.
//
// Use the orb macro (templates/macros/orb.html): it places a <canvas data-orb="selector"> next to
// the shape it covers. The selector finds that shape (an SVG circle or any element) inside the
// canvas's parent, and the canvas follows its size and position, so the shape underneath stays
// as the fallback without WebGL or JavaScript.
//   data-orb-tone="light"  pale smoke on white, for dark sections; ink smoke on ink by default
//
// One WebGL context draws them all and copies each frame into the visible canvases. They only
// animate on screen, and hold one still frame with reduced motion.
(() => {
  const canvases = [...document.querySelectorAll("canvas[data-orb]")];
  if (!canvases.length) return;

  const glCanvas = document.createElement("canvas");
  const gl = glCanvas.getContext("webgl", { premultipliedAlpha: true, antialias: false, alpha: true });
  if (!gl) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const MAX_SCALE = 2;
  const BLEED = 1;

  const vertex = `
    attribute vec2 position;
    void main() { gl_Position = vec4(position, 0.0, 1.0); }
  `;

  const fragment = `
    precision highp float;
    uniform vec2 resolution;
    uniform float time;
    uniform vec3 base;
    uniform vec3 smoke;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }

    // Two broad octaves only: soft, out-of-focus shapes rather than fine wisps.
    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.6;
      mat2 turn = mat2(0.8, 0.6, -0.6, 0.8);
      for (int i = 0; i < 2; i++) {
        value += amplitude * noise(p);
        p = turn * p * 1.9 + 3.1;
        amplitude *= 0.45;
      }
      return value / 0.87;
    }

    void main() {
      // -1 to 1 across the disc, y up. Flat: no bend over a sphere.
      vec2 p = (gl_FragCoord.xy / resolution) * 2.0 - 1.0;
      float r = length(p);
      float t = time * 0.05;

      // One gentle warp at a low frequency, so the colour drifts in large, blurred masses.
      vec2 a = vec2(fbm(p * 0.7 + vec2(t, -t * 0.7)), fbm(p * 0.7 + vec2(5.2 - t * 0.6, 1.3 + t)));
      float density = fbm(p * 0.8 + 1.6 * a + vec2(1.7, 9.2) + t * 0.3);

      // Light from below left: the colour is strongest there and fades into the base at the top.
      // A wide ramp, so nothing inside has a hard edge.
      float light = smoothstep(0.9, -0.9, p.y * 0.85 - p.x * 0.35);
      float shade = smoothstep(0.2, 1.0, density + 0.6 * light - 0.2);
      vec3 colour = mix(base, smoke, shade);

      // A crisp, anti-aliased edge; outside the circle stays transparent.
      float edge = 1.0 - smoothstep(1.0 - 2.0 / resolution.x, 1.0, r);
      gl_FragColor = vec4(colour * edge, edge);
    }
  `;

  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };

  const vs = compile(gl.VERTEX_SHADER, vertex);
  const fs = compile(gl.FRAGMENT_SHADER, fragment);
  if (!vs || !fs) return;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniform = (name) => gl.getUniformLocation(program, name);
  const resolution = uniform("resolution");
  const time = uniform("time");
  const base = uniform("base");
  const smoke = uniform("smoke");

  // Ink smoke on ink, or pale smoke on white.
  const INK = [0.114, 0.125, 0.153];
  const MIST = [0.86, 0.87, 0.89];
  const TONES = {
    dark: { base: INK, smoke: MIST },
    light: { base: [1, 1, 1], smoke: [0.62, 0.64, 0.69] },
  };

  const orbs = canvases
    .map((canvas) => ({
      canvas,
      context: canvas.getContext("2d"),
      target: canvas.parentElement.querySelector(canvas.dataset.orb),
      tone: TONES[canvas.dataset.orbTone] || TONES.dark,
      // A random start, so no two orbs share a shape and none opens on the same one.
      offset: Math.random() * 400,
      visible: false,
      box: "",
    }))
    .filter((orb) => orb.context && orb.target);

  // Lay the canvas exactly over its shape, in the coordinates of the box it's positioned in.
  const fit = (orb) => {
    const { canvas, target } = orb;
    const frame = canvas.offsetParent;
    if (!frame) return false;
    const outer = frame.getBoundingClientRect();
    const box = target.getBoundingClientRect();
    if (!box.width) return false;
    // A pixel of bleed on every side, so the shape's soft edge stays under the orb's solid one
    // instead of showing through as a thin ring.
    const left = box.left - outer.left - frame.clientLeft - BLEED;
    const top = box.top - outer.top - frame.clientTop - BLEED;
    const width = box.width + 2 * BLEED;
    const key = `${left.toFixed(1)} ${top.toFixed(1)} ${width.toFixed(1)}`;
    if (key !== orb.box) {
      orb.box = key;
      canvas.style.left = `${left}px`;
      canvas.style.top = `${top}px`;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${width}px`;
    }
    const size = Math.max(1, Math.round(width * Math.min(window.devicePixelRatio || 1, MAX_SCALE)));
    if (canvas.width !== size) {
      canvas.width = size;
      canvas.height = size;
    }
    return true;
  };

  const draw = (orb, now) => {
    if (!fit(orb)) return;
    const { canvas, context, tone } = orb;
    const size = canvas.width;
    if (glCanvas.width < size || glCanvas.height < size) {
      glCanvas.width = Math.max(glCanvas.width, size);
      glCanvas.height = Math.max(glCanvas.height, size);
    }
    gl.viewport(0, 0, size, size);
    gl.uniform2f(resolution, size, size);
    gl.uniform1f(time, orb.offset + now / 1000);
    gl.uniform3f(base, ...tone.base);
    gl.uniform3f(smoke, ...tone.smoke);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // WebGL draws from the bottom-left corner, so the frame is the bottom square of the buffer.
    context.clearRect(0, 0, size, size);
    context.drawImage(glCanvas, 0, glCanvas.height - size, size, size, 0, 0, size, size);
    canvas.classList.add("is-ready");
  };

  let frame = 0;
  const loop = (now) => {
    orbs.forEach((orb) => orb.visible && draw(orb, now));
    frame = requestAnimationFrame(loop);
  };

  const update = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    if (reduceMotion.matches) orbs.forEach((orb) => draw(orb, 0));
    else if (orbs.some((orb) => orb.visible)) frame = requestAnimationFrame(loop);
  };

  const byCanvas = new Map(orbs.map((orb) => [orb.canvas, orb]));
  const visibility = new IntersectionObserver((entries) => {
    entries.forEach((entry) => (byCanvas.get(entry.target).visible = entry.isIntersecting));
    update();
  });
  // Between frames (or always, with reduced motion) a resize redraws at the new size.
  const sizes = new ResizeObserver(() => {
    if (frame) return;
    orbs.forEach((orb) => draw(orb, reduceMotion.matches ? 0 : performance.now()));
  });

  orbs.forEach((orb) => {
    draw(orb, reduceMotion.matches ? 0 : performance.now());
    visibility.observe(orb.canvas);
    sizes.observe(orb.canvas.parentElement);
  });

  reduceMotion.addEventListener("change", update);
})();
