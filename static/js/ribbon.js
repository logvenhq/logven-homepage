// The ribbon: a soft band of coloured light. A small fragment shader draws it, so the band
// can sway, twist and shimmer continuously. Where it turns edge-on it pinches and its light
// gathers, like a ribbon catching the sun.
//
// Every <canvas data-ribbon> on the page gets one: the model cards, the model pages and the call
// to action. One WebGL context renders them all and copies each frame into the visible canvases.
// Optional attributes change a ribbon's pose and colours:
//   data-ribbon-pose="centre rise pinch width"  where the band sits, how far it climbs to the
//                                                right, where it twists, and how wide it is
//   data-ribbon-hue="start span"                which stretch of the palette it shows (0 to 1,
//                                                wrapping), and how much of it
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

    vec3 band(float s) {
      return spectrum(hue.x + clamp(s, 0.0, 1.0) * hue.y);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / resolution;
      float x = uv.x;
      float t = time;

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

      float offset = uv.y - centre;
      float v = offset / h;
      float edgeOn = 1.0 - abs(facing);

      // The band: soft edges, colour across it, with a slow shimmer travelling along it.
      float shimmer = 0.07 * sin(x * 5.0 - t * 0.6) + 0.04 * sin(x * 11.0 + t * 0.4);
      vec3 colour = band(v * 0.5 + 0.5 + shimmer);
      float body = 1.0 - smoothstep(0.55, 1.15, abs(v));
      float glint = exp(-pow((v - 0.25) * 3.2, 2.0)) * (0.35 + 0.25 * sin(x * 6.0 - t * 0.8));
      colour = mix(colour, vec3(1.0), clamp(glint, 0.0, 0.6) * body);
      body *= 0.82 + 0.35 * edgeOn;

      // A wide haze around the band, tinted by the colour nearest to it. Where the band turns
      // over, the tint settles on the middle of its stretch, so the haze doesn't flip at the twist.
      float spread = abs(h) + 0.09 * pose.w;
      float haze = exp(-pow(offset / spread, 2.0)) * 0.22;
      vec3 hazeColour = mix(band(0.4), band(v * 0.5 + 0.5), smoothstep(0.0, 0.5, abs(facing)));

      float alpha = clamp(body + haze * (1.0 - body), 0.0, 1.0);
      vec3 rgb = mix(hazeColour, colour, body / max(alpha, 1e-3));
      gl_FragColor = vec4(rgb * alpha, alpha);
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
      // Start each one at a random moment, so no two share a pose and none repeats between visits.
      offset: Math.random() * 600,
      visible: false,
    }))
    .filter((ribbon) => ribbon.context);

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
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // WebGL draws from the bottom-left corner, so the frame is the bottom strip of the buffer.
    context.clearRect(0, 0, width, height);
    context.drawImage(glCanvas, 0, glCanvas.height - height, width, height, 0, 0, width, height);
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
