// The hero ribbon: a soft band of spectral light behind the ledger.
// A small fragment shader draws it, so the band can sway, twist and shimmer continuously.
// Where it turns edge-on it pinches and its light gathers, like a ribbon catching the sun.
(() => {
  const canvas = document.querySelector("[data-ribbon]");
  if (!canvas) return;

  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false, alpha: true });
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

    const float PI = 3.14159265;

    // Peach, pink, violet, blue, sky, aqua, butter: across the band, top to bottom.
    vec3 spectrum(float s) {
      s = clamp(s, 0.0, 1.0) * 6.0;
      vec3 c = mix(vec3(0.97, 0.72, 0.61), vec3(0.93, 0.61, 0.80), clamp(s, 0.0, 1.0));
      c = mix(c, vec3(0.64, 0.56, 0.96), clamp(s - 1.0, 0.0, 1.0));
      c = mix(c, vec3(0.36, 0.51, 0.94), clamp(s - 2.0, 0.0, 1.0));
      c = mix(c, vec3(0.43, 0.78, 0.96), clamp(s - 3.0, 0.0, 1.0));
      c = mix(c, vec3(0.65, 0.93, 0.90), clamp(s - 4.0, 0.0, 1.0));
      return mix(c, vec3(0.96, 0.91, 0.65), clamp(s - 5.0, 0.0, 1.0));
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / resolution;
      float x = uv.x;
      float t = time;

      // The centre line rises from lower left to upper right and sways on slow, unrelated waves.
      float rise = smoothstep(0.25, 1.1, x);
      float centre = 0.40 + 0.26 * rise * rise
        + 0.035 * sin(x * 4.2 + t * 0.21)
        + 0.022 * sin(x * 7.9 - t * 0.33 + 1.3)
        + 0.012 * sin(x * 13.0 + t * 0.47);

      // The twist wanders back and forth, so the pinch drifts along the band.
      float pinch = 0.48 + 0.09 * sin(t * 0.11) + 0.04 * sin(t * 0.07 + 2.0);
      float d = x - pinch;
      float width = 0.055 + 0.085 * pow(abs(d) / 0.6, 1.2);
      float twist = PI * 0.5 + d * PI * (1.35 + 0.12 * sin(t * 0.09));
      float facing = cos(twist);
      float h = width * facing;
      h = sign(h + 1e-4) * max(abs(h), 0.011);

      float offset = uv.y - centre;
      float v = offset / h;
      float edgeOn = 1.0 - abs(facing);

      // The band: soft edges, colour across it, with a slow shimmer travelling along it.
      float shimmer = 0.07 * sin(x * 5.0 - t * 0.6) + 0.04 * sin(x * 11.0 + t * 0.4);
      vec3 colour = spectrum(v * 0.5 + 0.5 + shimmer);
      float band = 1.0 - smoothstep(0.55, 1.15, abs(v));
      float glint = exp(-pow((v - 0.25) * 3.2, 2.0)) * (0.35 + 0.25 * sin(x * 6.0 - t * 0.8));
      colour = mix(colour, vec3(1.0), clamp(glint, 0.0, 0.6) * band);
      band *= 0.82 + 0.35 * edgeOn;

      // A wide haze around the band, tinted by the colour nearest to it. Where the band turns
      // over, the tint settles on violet, so the haze doesn't flip colour at the twist.
      float spread = abs(h) + 0.09;
      float haze = exp(-pow(offset / spread, 2.0)) * 0.22;
      vec3 hazeColour = mix(spectrum(0.4), spectrum(clamp(v * 0.5 + 0.5, 0.0, 1.0)), smoothstep(0.0, 0.5, abs(facing)));

      float alpha = clamp(band + haze * (1.0 - band), 0.0, 1.0);
      vec3 rgb = mix(hazeColour, colour, band / max(alpha, 1e-3));
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

  const resolution = gl.getUniformLocation(program, "resolution");
  const time = gl.getUniformLocation(program, "time");

  // Start at a random moment so the ribbon isn't in the same pose on every visit.
  const offset = Math.random() * 600;
  let frame = 0;
  let visible = true;

  const resize = () => {
    const width = Math.max(1, Math.round(canvas.clientWidth * SCALE));
    const height = Math.max(1, Math.round(canvas.clientHeight * SCALE));
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    gl.uniform2f(resolution, width, height);
  };

  const draw = (now) => {
    resize();
    gl.uniform1f(time, offset + now / 1000);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const loop = (now) => {
    draw(now);
    frame = requestAnimationFrame(loop);
  };

  const update = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    if (reduceMotion.matches) {
      draw(0);
    } else if (visible) {
      frame = requestAnimationFrame(loop);
    }
  };

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    update();
  }).observe(canvas);

  new ResizeObserver(() => {
    if (!frame) draw(performance.now());
  }).observe(canvas);

  reduceMotion.addEventListener("change", update);
  draw(performance.now());
  canvas.classList.add("is-ready");
  update();
})();
