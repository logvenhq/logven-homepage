// The ribbon: a soft band of coloured light. A small fragment shader draws it, so the band
// can sway, twist and shimmer continuously. Where it turns edge-on it pinches and its light
// gathers, like a ribbon catching the sun.
//
// Every <canvas data-ribbon> on the page gets one: the hero, the model cards and the call to
// action. One WebGL context renders them all and copies each frame into the visible canvases.
// After each frame a canvas fires "ribbon:frame" with a function that says how strongly the band
// covers any point of it, so other drawings can react to it (the hero ledger's rules and labels deepen over it).
// Optional attributes change a ribbon's pose and colours:
//   data-ribbon-pose="centre rise pinch width"  where the band sits, how far it climbs to the
//                                                right, where it twists, and how wide it is
//   data-ribbon-hue="start span"                which stretch of the palette it shows (0 to 1,
//                                                wrapping), and how much of it
//   data-ribbon-weave                           two coordinated, interlacing bands
(() => {
  const targets = [...document.querySelectorAll("canvas[data-ribbon]")];
  if (!targets.length) return;

  const glCanvas = document.createElement("canvas");
  const gl = glCanvas.getContext("webgl", { premultipliedAlpha: true, antialias: false, alpha: true });
  if (!gl) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  // The light is soft, so a low-resolution buffer is enough; the browser scales it up smoothly.
  const SCALE = 0.5;

  const vertex = `
    attribute vec2 position;
    void main() { gl_Position = vec4(position, 0.0, 1.0); }
  `;

  const fragment = `
    precision mediump float;
    uniform vec2 resolution;
    uniform float time;
    uniform vec4 pose;
    uniform vec2 hue;
    uniform float weave;

    const float PI = 3.14159265;

    // The palette in ribbon order (PALETTE below), back to the first so a stretch can wrap.
    uniform vec3 palette[7];
    vec3 spectrum(float s) {
      s = fract(s) * 7.0;
      vec3 c = mix(palette[0], palette[1], clamp(s, 0.0, 1.0));
      c = mix(c, palette[2], clamp(s - 1.0, 0.0, 1.0));
      c = mix(c, palette[3], clamp(s - 2.0, 0.0, 1.0));
      c = mix(c, palette[4], clamp(s - 3.0, 0.0, 1.0));
      c = mix(c, palette[5], clamp(s - 4.0, 0.0, 1.0));
      c = mix(c, palette[6], clamp(s - 5.0, 0.0, 1.0));
      return mix(c, palette[0], clamp(s - 6.0, 0.0, 1.0));
    }

    vec3 band(float s, vec2 colours) {
      return spectrum(colours.x + clamp(s, 0.0, 1.0) * colours.y);
    }

    vec4 lightBand(vec2 uv, float t, float centre, float h, float facing, float scale, vec2 colours) {
      float x = uv.x;
      float offset = uv.y - centre;
      float v = offset / h;
      float edgeOn = 1.0 - abs(facing);

      // Soft edges, colour across the ribbon, and a slow travelling shimmer.
      float shimmer = 0.07 * sin(x * 5.0 - t * 0.6) + 0.04 * sin(x * 11.0 + t * 0.4);
      vec3 colour = band(v * 0.5 + 0.5 + shimmer, colours);
      float body = 1.0 - smoothstep(0.55, 1.15, abs(v));
      float glint = exp(-pow((v - 0.25) * 3.2, 2.0)) * (0.35 + 0.25 * sin(x * 6.0 - t * 0.8));
      colour = mix(colour, vec3(1.0), clamp(glint, 0.0, 0.6) * body);
      body *= 0.82 + 0.35 * edgeOn;

      // The haze keeps its middle tint as the ribbon turns edge-on.
      float spread = abs(h) + 0.09 * scale;
      float haze = exp(-pow(offset / spread, 2.0)) * 0.22;
      vec3 hazeColour = mix(band(0.4, colours), band(v * 0.5 + 0.5, colours), smoothstep(0.0, 0.5, abs(facing)));
      float alpha = clamp(body + haze * (1.0 - body), 0.0, 1.0);
      vec3 rgb = mix(hazeColour, colour, body / max(alpha, 1e-3));
      return vec4(rgb * alpha, alpha);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / resolution;
      float x = uv.x;
      float t = time;

      if (weave > 0.5) {
        // A quiet, wide entrance tightens into an irregular braid on the right.
        // Both strands share a clock, so they keep meeting as they drift.
        float play = smoothstep(0.18, 0.62, x);
        float phase = 11.0 * pow(x, 2.25) - 0.3
          + play * (0.42 * sin(x * 8.0 - t * 0.09) + 0.18 * sin(t * 0.13));
        float middle = 0.5 + play * (0.045 * sin(x * 7.0 + t * 0.08)
          + 0.025 * sin(x * 13.0 - t * 0.11));
        float reach = mix(0.35, 0.17, smoothstep(0.25, 0.72, x));
        float blueCentre = middle - reach * cos(phase);
        float warmCentre = middle + reach * cos(phase + 0.28 * play * sin(x * 9.0 + 0.6));
        float blueFacing = cos(phase * 0.73 + 0.4);
        float warmFacing = cos(phase * 0.67 + 1.5);
        float width = 0.085 - 0.018 * play;
        float blueH = sign(blueFacing + 1e-4) * max(width * abs(blueFacing), 0.016);
        float warmH = sign(warmFacing + 1e-4) * max(width * abs(warmFacing), 0.016);
        vec4 blue = lightBand(uv, t, blueCentre, blueH, blueFacing, 0.72, vec2(0.86, 0.30));
        vec4 warm = lightBand(uv, t + 3.0, warmCentre, warmH, warmFacing, 0.72, vec2(0.58, 0.14));
        // Premultiplied layers swap depth between crossings, like a loose braid.
        gl_FragColor = mix(warm + blue * (1.0 - warm.a), blue + warm * (1.0 - blue.a),
          smoothstep(-0.25, 0.25, sin(phase)));
        return;
      }

      // The centre line rises towards the right and sways on slow, unrelated waves.
      float rise = smoothstep(0.25, 1.1, x);
      float centre = pose.x + pose.y * rise * rise
        + 0.035 * sin(x * 4.2 + t * 0.21)
        + 0.022 * sin(x * 7.9 - t * 0.33 + 1.3)
        + 0.012 * sin(x * 13.0 + t * 0.47);

      // The twist wanders back and forth, so the pinch drifts along the band.
      float pinch = pose.z + 0.09 * sin(t * 0.11) + 0.04 * sin(t * 0.07 + 2.0);
      float d = x - pinch;
      float width = (0.055 + 0.085 * pow(abs(d) / 0.6, 1.2)) * pose.w;
      float twist = PI * 0.5 + d * PI * (1.35 + 0.12 * sin(t * 0.09));
      float facing = cos(twist);
      float h = width * facing;
      h = sign(h + 1e-4) * max(abs(h), 0.011 * pose.w);

      gl_FragColor = lightBand(uv, t, centre, h, facing, pose.w, hue);
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

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniform = (name) => gl.getUniformLocation(program, name);
  const resolution = uniform("resolution");
  const time = uniform("time");
  const pose = uniform("pose");
  const hue = uniform("hue");
  const weave = uniform("weave");

  // The palette from _tokens.scss, in the order the band runs through it. Each ribbon's stretch
  // (data-ribbon-hue) should stay off amber-to-sky, which mixes muddy.
  const PALETTE = ["azure", "blue", "indigo", "violet", "orange", "amber", "sky"];
  const styles = getComputedStyle(document.documentElement);
  gl.uniform3fv(uniform("palette"), PALETTE.flatMap((name) => {
    const hex = styles.getPropertyValue(`--${name}`).trim().slice(1);
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  }));

  const numbers = (value, fallback) => {
    const parsed = (value || "").trim().split(/\s+/).filter(Boolean).map(Number);
    return fallback.map((n, i) => (Number.isFinite(parsed[i]) ? parsed[i] : n));
  };

  const ribbons = targets
    .map((canvas) => ({
      canvas,
      context: canvas.getContext("2d"),
      pose: numbers(canvas.dataset.ribbonPose, [0.4, 0.26, 0.48, 1]),
      hue: numbers(canvas.dataset.ribbonHue, [0, 6 / 7]),
      weave: canvas.hasAttribute("data-ribbon-weave"),
      // Start each one at a random moment, so no two share a pose and none repeats between visits.
      offset: Math.random() * 600,
      visible: false,
    }))
    .filter((ribbon) => ribbon.context);

  // The shader's band, in JavaScript: how opaque the ribbon is at a point of its canvas (x and y
  // from 0 to 1, y up), at a given time. It follows main() below line for line.
  const smoothstep = (a, b, v) => {
    const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  const bandCoverage = (offset, h, facing, scale) => {
    let body = 1 - smoothstep(0.55, 1.15, Math.abs(offset / h));
    body *= 0.82 + 0.35 * (1 - Math.abs(facing));
    const spread = Math.abs(h) + 0.09 * scale;
    const haze = Math.exp(-((offset / spread) ** 2)) * 0.22;
    return Math.min(1, Math.max(0, body + haze * (1 - body)));
  };

  const weaveCoverage = (x, y, t) => {
    const play = smoothstep(0.18, 0.62, x);
    const phase = 11 * x ** 2.25 - 0.3
      + play * (0.42 * Math.sin(x * 8 - t * 0.09) + 0.18 * Math.sin(t * 0.13));
    const middle = 0.5 + play * (0.045 * Math.sin(x * 7 + t * 0.08)
      + 0.025 * Math.sin(x * 13 - t * 0.11));
    const reach = 0.35 - 0.18 * smoothstep(0.25, 0.72, x);
    const blueCentre = middle - reach * Math.cos(phase);
    const warmCentre = middle + reach * Math.cos(phase + 0.28 * play * Math.sin(x * 9 + 0.6));
    const width = 0.085 - 0.018 * play;
    const alpha = (centre, facing) => {
      const h = Math.sign(facing + 1e-4) * Math.max(width * Math.abs(facing), 0.016);
      return bandCoverage(y - centre, h, facing, 0.72);
    };
    const blue = alpha(blueCentre, Math.cos(phase * 0.73 + 0.4));
    const warm = alpha(warmCentre, Math.cos(phase * 0.67 + 1.5));
    return blue + warm * (1 - blue);
  };

  const coverage = ([px, py, pz, pw], x, y, t) => {
    const rise = smoothstep(0.25, 1.1, x);
    const centre = px + py * rise * rise
      + 0.035 * Math.sin(x * 4.2 + t * 0.21)
      + 0.022 * Math.sin(x * 7.9 - t * 0.33 + 1.3)
      + 0.012 * Math.sin(x * 13.0 + t * 0.47);
    const pinch = pz + 0.09 * Math.sin(t * 0.11) + 0.04 * Math.sin(t * 0.07 + 2.0);
    const d = x - pinch;
    const width = (0.055 + 0.085 * Math.pow(Math.abs(d) / 0.6, 1.2)) * pw;
    const facing = Math.cos(Math.PI * 0.5 + d * Math.PI * (1.35 + 0.12 * Math.sin(t * 0.09)));
    let h = width * facing;
    h = Math.sign(h + 1e-4) * Math.max(Math.abs(h), 0.011 * pw);
    return bandCoverage(y - centre, h, facing, pw);
  };

  const draw = (ribbon, now) => {
    const { canvas, context } = ribbon;
    const width = Math.max(1, Math.round(canvas.clientWidth * SCALE));
    const height = Math.max(1, Math.round(canvas.clientHeight * SCALE));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    if (glCanvas.width < width || glCanvas.height < height) {
      glCanvas.width = Math.max(glCanvas.width, width);
      glCanvas.height = Math.max(glCanvas.height, height);
    }

    gl.viewport(0, 0, width, height);
    gl.uniform2f(resolution, width, height);
    gl.uniform1f(time, ribbon.offset + now / 1000);
    gl.uniform4f(pose, ...ribbon.pose);
    gl.uniform2f(hue, ...ribbon.hue);
    gl.uniform1f(weave, ribbon.weave ? 1 : 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // WebGL draws from the bottom-left corner, so the frame is the bottom strip of the buffer.
    context.clearRect(0, 0, width, height);
    context.drawImage(glCanvas, 0, glCanvas.height - height, width, height, 0, 0, width, height);

    // The latest frame's coverage stays on the canvas too, for scripts that start after it.
    const t = ribbon.offset + now / 1000;
    canvas.ribbonCoverage = ribbon.weave
      ? (x, y) => weaveCoverage(x, y, t)
      : (x, y) => coverage(ribbon.pose, x, y, t);
    canvas.dispatchEvent(new CustomEvent("ribbon:frame", { detail: canvas.ribbonCoverage }));
  };

  let frame = 0;

  const loop = (now) => {
    ribbons.forEach((ribbon) => ribbon.visible && draw(ribbon, now));
    frame = requestAnimationFrame(loop);
  };

  const update = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    if (reduceMotion.matches) {
      ribbons.forEach((ribbon) => draw(ribbon, 0));
    } else if (ribbons.some((ribbon) => ribbon.visible)) {
      frame = requestAnimationFrame(loop);
    }
  };

  const byCanvas = new Map(ribbons.map((ribbon) => [ribbon.canvas, ribbon]));

  const visibility = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      byCanvas.get(entry.target).visible = entry.isIntersecting;
    });
    update();
  });

  const sizes = new ResizeObserver((entries) => {
    if (frame) return;
    entries.forEach((entry) => draw(byCanvas.get(entry.target), reduceMotion.matches ? 0 : performance.now()));
  });

  ribbons.forEach((ribbon) => {
    draw(ribbon, reduceMotion.matches ? 0 : performance.now());
    ribbon.canvas.classList.add("is-ready");
    visibility.observe(ribbon.canvas);
    sizes.observe(ribbon.canvas);
  });

  reduceMotion.addEventListener("change", update);
})();
