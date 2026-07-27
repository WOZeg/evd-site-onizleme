/* The audit field — one fixed WebGL layer behind the whole page.
   Scroll = the audit: the field starts hot and turbulent, cools and settles
   into a contoured engineering drawing by the end. Pointer = IR probe. */
(() => {
  const canvas = document.getElementById("field");
  if (!canvas) return;

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const noHover = matchMedia("(hover: none)").matches;

  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false });
  if (!gl) { document.documentElement.classList.add("no-gl"); return; }

  const VERT = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;

  const FRAG = `
    precision highp float;
    uniform vec2 uRes;
    uniform float uTime;
    uniform float uCool;
    uniform vec2 uProbe;
    uniform float uProbeAmt;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
                 mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p = p * 2.03 + vec2(11.3, 7.7);
        a *= 0.5;
      }
      return v;
    }
    float blob(vec2 uv, vec2 c, float s) {
      vec2 d = (uv - c) / s;
      return exp(-dot(d, d));
    }
    vec3 ironbow(float t) {
      vec3 c0 = vec3(0.039, 0.051, 0.075);
      vec3 c1 = vec3(0.165, 0.055, 0.369);
      vec3 c2 = vec3(0.761, 0.145, 0.361);
      vec3 c3 = vec3(0.969, 0.404, 0.027);
      vec3 c4 = vec3(1.0, 0.831, 0.231);
      vec3 c5 = vec3(1.0, 0.953, 0.839);
      vec3 col = mix(c0, c1, smoothstep(0.0, 0.3, t));
      col = mix(col, c2, smoothstep(0.3, 0.55, t));
      col = mix(col, c3, smoothstep(0.55, 0.78, t));
      col = mix(col, c4, smoothstep(0.78, 0.93, t));
      col = mix(col, c5, smoothstep(0.93, 1.0, t));
      return col;
    }

    void main() {
      vec2 px = gl_FragCoord.xy;
      vec2 uv = px / uRes;
      vec2 asp = vec2(uRes.x / uRes.y, 1.0);
      float cool = clamp(uCool, 0.0, 1.0);

      /* turbulent hot field settles into a long calm swell */
      vec2 drift = vec2(uTime * 0.02, uTime * -0.012) * (1.0 - cool * 0.9);
      float hot = fbm(uv * asp * 3.1 + drift);
      float calm = fbm(uv * asp * 1.5 + vec2(3.7, 9.2));
      float field = mix(hot, calm, cool * 0.85);

      /* leak spots: repaired as the audit completes */
      float leaks = 0.5 * blob(uv * asp, vec2(0.72, 0.66) * asp, 0.15)
                  + 0.4  * blob(uv * asp, vec2(0.26, 0.30) * asp, 0.12)
                  + 0.32 * blob(uv * asp, vec2(0.55, 0.14) * asp, 0.10);
      field += leaks * (1.0 - cool);

      /* IR probe under the pointer */
      vec2 pn = uProbe / uRes;
      field += 0.5 * blob(uv * asp, pn * asp, 0.055) * uProbeAmt * (1.0 - 0.45 * cool);

      float heat = clamp(field, 0.0, 1.0) * (1.0 - 0.62 * cool);
      vec3 col = ironbow(heat);

      /* the drawing emerges: isotherm contours + drafting grid sharpen as it cools */
      float nlines = mix(12.0, 22.0, cool);
      float contour = abs(fract(field * nlines) - 0.5);
      float cstr = mix(0.045, 0.13, cool);
      col += vec3(0.38, 0.47, 0.64) * smoothstep(0.07, 0.0, contour) * cstr;
      vec2 g = fract(px / 56.0);
      float grid = (step(g.x, 0.018) + step(g.y, 0.018)) * mix(0.02, 0.065, cool);
      col += vec3(0.4, 0.48, 0.65) * grid;

      float vig = smoothstep(1.42, 0.5, length((uv - 0.5) * vec2(1.55, 1.25)));
      col *= mix(0.74, 1.0, vig);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("field shader:", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { document.documentElement.classList.add("no-gl"); return; }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  for (const n of ["uRes", "uTime", "uCool", "uProbe", "uProbeAmt"]) {
    U[n] = gl.getUniformLocation(prog, n);
  }

  let dpr = 1;
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1.25 : 1.5);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  addEventListener("resize", resize);

  const baseCool = Math.min(0.9, Math.max(0, parseFloat(document.body.dataset.cool || "0")));
  const state = {
    cool: reduceMotion ? 0.55 : baseCool,
    coolTarget: reduceMotion ? 0.55 : baseCool,
    px: innerWidth * 0.7,
    py: innerHeight * 0.35,
    tx: innerWidth * 0.7,
    ty: innerHeight * 0.35,
    probe: 0,
    probeTarget: 0,
  };

  if (!reduceMotion) {
    if (!noHover) {
      addEventListener("pointermove", (e) => {
        state.tx = e.clientX;
        state.ty = e.clientY;
        state.probeTarget = 1;
      }, { passive: true });
      addEventListener("pointerleave", () => { state.probeTarget = 0; });
    }
    addEventListener("scroll", () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = max > 0 ? scrollY / max : 0;
      state.coolTarget = baseCool + (1 - baseCool) * p;
    }, { passive: true });
  }

  const t0 = performance.now();
  let raf = 0;

  function frame() {
    raf = 0;
    const k = 0.06;
    state.cool += (state.coolTarget - state.cool) * k;
    state.px += (state.tx - state.px) * 0.09;
    state.py += (state.ty - state.py) * 0.09;
    state.probe += (state.probeTarget - state.probe) * 0.05;

    const t = reduceMotion ? 40 : (performance.now() - t0) / 1000;
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, t);
    gl.uniform1f(U.uCool, state.cool);
    gl.uniform2f(U.uProbe, state.px * dpr, canvas.height - state.py * dpr);
    gl.uniform1f(U.uProbeAmt, state.probe);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!document.hidden) raf = requestAnimationFrame(frame);
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !raf) raf = requestAnimationFrame(frame);
  });

  raf = requestAnimationFrame(frame);
})();
