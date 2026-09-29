// Template: degradês animados (WebGL) guiados pela rolagem, mais as bolinhas nos fundos claros.
// Quando a página desce, a animação avança; quando sobe, ela volta, como um vídeo.
// As cores vêm do CSS (variáveis --flow-* e --glow-colors em :root): para trocar a marca,
// edite só o style.css. Os valores abaixo são o padrão caso a variável não exista.
(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var PX_PER_STEP = 1400; // pixels de rolagem para avançar uma unidade de tempo da animação
  var DRIFT = 0.09;       // movimento contínuo: o degradê flui mesmo com a página parada
  var UNIT_PX = 560;      // tamanho (px de tela) de uma unidade do desenho

  var DEFAULTS = {
    // escuro, médio, destaque, brilho
    main: ["#0b2317", "#1f5a33", "#3b8429", "#a6dc8a"],
    fire: ["#2a0806", "#a52414", "#e8531f", "#ffb074"],
    water: ["#04201f", "#0d5552", "#1f8a7a", "#9be8d6"],
    olive: ["#161f0a", "#44561a", "#7a8f2a", "#dbe89a"]
  };
  var rootStyle = getComputedStyle(document.documentElement);
  // lê --flow-<nome>-<0..3> do CSS; se faltar, usa o padrão
  function palette(name) {
    var base = DEFAULTS[name] || DEFAULTS.main;
    return base.map(function (d, i) {
      var v = rootStyle.getPropertyValue("--flow-" + name + "-" + i).trim();
      return /^#[0-9a-f]{6}$/i.test(v) ? v : d;
    });
  }

  var VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";

  var FRAG = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH",
    "precision highp float;",
    "#else",
    "precision mediump float;",
    "#endif",
    "uniform vec2 u_res;",
    "uniform float u_t;",
    "uniform float u_seed;",
    "uniform float u_unit;",
    "uniform vec3 u_c0, u_c1, u_c2, u_c3;",
    "float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}",
    "float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);",
    "  return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}",
    "float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);",
    "  for(int i=0;i<4;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}",
    // campo com deformação em camadas: dá o aspecto de tecido/fumaça em movimento
    "void warp(vec2 p,float t,out vec2 q,out vec2 r){",
    "  q=vec2(fbm(p+vec2(0.,t*.9)),fbm(p+vec2(5.2,1.3)-t*.7));",
    "  r=vec2(fbm(p+2.2*q+vec2(1.7,9.2)+t*.5),fbm(p+2.2*q+vec2(8.3,2.8)-t*.6));}",
    "void main(){",
    "  vec2 uv=gl_FragCoord.xy/u_res;",
    "  vec2 p=gl_FragCoord.xy/u_unit+u_seed;",
    "  vec2 q,r;",
    "  warp(p,u_t,q,r);",
    "  float f=fbm(p+2.4*r);",
    "  float e=.02;",
    "  float fx=fbm(p+vec2(e,0.)+2.4*r);",
    "  float fy=fbm(p+vec2(0.,e)+2.4*r);",
    // relevo 3D: normal da superfície e luz suave vinda de cima
    "  vec3 n=normalize(vec3((f-fx)/e,(f-fy)/e,1.4));",
    "  float light=clamp(dot(n,normalize(vec3(-.35,.55,.75))),0.,1.);",
    "  vec3 col=mix(u_c0,u_c1,smoothstep(.2,.8,f));",
    "  col=mix(col,u_c2,smoothstep(.45,1.15,length(q))*.75);",
    "  col*=.7+.45*light;",
    "  col+=u_c3*pow(light,8.)*.3;",
    "  col=mix(col,u_c0,(1.-uv.y)*.25);",
    "  gl_FragColor=vec4(col,1.);",
    "}"
  ].join("\n");

  function hexToRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }

  function Flow(canvas, palette, seed, scale) {
    this.ok = false;
    var gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false }) ||
             canvas.getContext("experimental-webgl");
    if (!gl) return;
    function shader(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var vs = shader(gl.VERTEX_SHADER, VERT), fs = shader(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    ["u_c0", "u_c1", "u_c2", "u_c3"].forEach(function (name, i) {
      var c = hexToRgb(palette[i]);
      gl.uniform3f(gl.getUniformLocation(prog, name), c[0], c[1], c[2]);
    });
    gl.uniform1f(gl.getUniformLocation(prog, "u_seed"), seed);

    this.gl = gl;
    this.canvas = canvas;
    this.scale = scale;
    this.uRes = gl.getUniformLocation(prog, "u_res");
    this.uT = gl.getUniformLocation(prog, "u_t");
    this.uUnit = gl.getUniformLocation(prog, "u_unit");
    this.visible = true;
    this.lastT = null;
    this.ok = true;
    this.resize();
  }
  Flow.prototype.resize = function () {
    // desenha em resolução reduzida: o degradê é suave e o navegador amplia sem perda visível
    var w = Math.max(1, Math.round(this.canvas.clientWidth * this.scale));
    var h = Math.max(1, Math.round(this.canvas.clientHeight * this.scale));
    this.canvas.width = w;
    this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
    this.gl.uniform2f(this.uRes, w, h);
    this.gl.uniform1f(this.uUnit, UNIT_PX * this.scale); // mesmo tamanho de "dobra" em qualquer canvas
    this.lastT = null;
  };
  Flow.prototype.draw = function (t) {
    if (!this.visible || t === this.lastT) return;
    this.gl.uniform1f(this.uT, t);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    this.lastT = t;
    // só aparece depois do primeiro desenho (evita um quadro preto ao entrar na tela)
    if (!this.shown) { this.shown = true; this.canvas.classList.add("is-ready"); }
  };

  // Só desenha enquanto alguma das áreas indicadas está na tela
  function watch(flow, targets) {
    if (!("IntersectionObserver" in window) || !targets.length) return;
    var onScreen = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) onScreen.add(e.target); else onScreen.delete(e.target);
      });
      flow.visible = onScreen.size > 0;
      flow.lastT = null;
    });
    Array.prototype.forEach.call(targets, function (el) { io.observe(el); });
  }

  var flows = [];

  // Fundo da página: aparece nas partes translúcidas (.hero, .section--dark e .cta)
  var bg = document.getElementById("bg-scene");
  if (bg) {
    var bgFlow = new Flow(bg, palette("main"), 0, 0.5);
    if (bgFlow.ok) {
      flows.push(bgFlow);
      watch(bgFlow, document.querySelectorAll(".hero, .section--dark, .cta"));
    }
  }

  // Blocos em destaque: <canvas data-flow="main|fire|water|olive"> (nomes definidos no CSS)
  Array.prototype.forEach.call(document.querySelectorAll("canvas[data-flow]"), function (c, i) {
    var flow = new Flow(c, palette(c.getAttribute("data-flow") || "main"), 7.3 + i * 3.1, 0.6);
    if (flow.ok) {
      flows.push(flow);
      watch(flow, [c]);
    }
  });

  if (!flows.length) return;

  var current = window.scrollY;
  function frame(now) {
    requestAnimationFrame(frame);
    var target = window.scrollY;
    var diff = target - current;
    // suaviza a rolagem para a animação "rodar" como um vídeo, para frente e para trás
    current = reduceMotion || Math.abs(diff) < 0.5 ? target : current + diff * 0.1;
    var t = reduceMotion ? 0 : current / PX_PER_STEP + (now / 1000) * DRIFT;
    flows.forEach(function (f) { f.draw(t); });
  }

  var resizeQueued = false;
  window.addEventListener("resize", function () {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(function () {
      resizeQueued = false;
      flows.forEach(function (f) { f.resize(); });
    });
  });

  requestAnimationFrame(frame);
})();

// Bolinhas coloridas em degradê nos fundos claros: cada uma surge em um ponto, cresce um
// pouco, quase não se move e desaparece; depois nasce em outro lugar. O ciclo corre sozinho
// com a tela parada e também é guiado pela rolagem (desce = avança, sobe = volta).
(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // cores das bolinhas: --glow-colors no CSS, trios "r,g,b" separados por "|"
  var glowVar = getComputedStyle(document.documentElement).getPropertyValue("--glow-colors").replace(/["']/g, "").trim();
  var COLORS = glowVar ? glowVar.split("|") : ["166,220,138", "90,166,63", "127,209,174", "204,236,110", "59,132,41", "143,227,176"];
  var PX_PER_CYCLE = 1600; // pixels de rolagem para uma bolinha completar um ciclo

  var sections = Array.prototype.slice.call(document.querySelectorAll(".section:not(.section--dark)"));
  if (!sections.length) return;

  // número pseudoaleatório fixo para (bolinha, ciclo): ao subir a página, as mesmas bolinhas voltam
  function rand(a, b) { var n = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return n - Math.floor(n); }

  var layers = sections.map(function (sec, s) {
    var layer = document.createElement("div");
    layer.className = "glow";
    layer.setAttribute("aria-hidden", "true");
    sec.insertBefore(layer, sec.firstChild);
    sec.classList.add("has-glow");
    return { sec: sec, layer: layer, index: s, blobs: [], visible: true };
  });

  // quantidade de bolinhas proporcional à área da seção, para a densidade ser parecida em todas
  function build(l) {
    var w = l.w = l.sec.offsetWidth, h = l.h = l.sec.offsetHeight;
    var n = Math.max(5, Math.min(28, Math.round(w * h / 75000)));
    if (n === l.blobs.length) return;
    l.layer.textContent = "";
    l.blobs = [];
    for (var i = 0; i < n; i++) {
      var seed = l.index * 100 + i;
      var el = document.createElement("span");
      l.layer.appendChild(el);
      l.blobs.push({
        el: el,
        seed: seed,
        offset: rand(seed, 1),              // em que ponto do ciclo começa
        period: 5 + rand(seed, 2) * 5       // 5 a 10 s para surgir e desaparecer
      });
    }
  }
  layers.forEach(build);

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        layers.forEach(function (l) { if (l.sec === e.target) l.visible = e.isIntersecting; });
      });
    });
    layers.forEach(function (l) { io.observe(l.sec); });
  }

  // refaz as medidas quando a seção muda de tamanho (tela girada, dúvida aberta, fontes carregadas)
  if ("ResizeObserver" in window) {
    var ro = new ResizeObserver(function () { layers.forEach(build); });
    layers.forEach(function (l) { ro.observe(l.sec); });
  } else {
    window.addEventListener("resize", function () { layers.forEach(build); });
  }

  var current = window.scrollY;
  function frame(now) {
    requestAnimationFrame(frame);
    var diff = window.scrollY - current;
    current = reduceMotion || Math.abs(diff) < 0.5 ? window.scrollY : current + diff * 0.1;
    var t = reduceMotion ? 0 : now / 1000;
    var scroll = reduceMotion ? 0 : current / PX_PER_CYCLE;
    layers.forEach(function (l) {
      if (!l.visible) return;
      var w = l.w, h = l.h; // medidas guardadas em build(), para não recalcular o layout a cada quadro
      var k = Math.max(0.7, Math.min(1, w / 1200)); // bolinhas um pouco menores no celular
      l.blobs.forEach(function (b) {
        var phase = reduceMotion ? 0.5 : t / b.period + scroll + b.offset;
        var cyc = Math.floor(phase), f = phase - cyc;
        if (b.cyc !== cyc) {
          // novo ciclo: a bolinha nasce em outro lugar, com outro tamanho e outra cor
          b.cyc = cyc;
          var c = b.seed * 7 + cyc * 13;
          b.size = (26 + rand(c, 3) * 74) * k;
          b.x = rand(c, 4) * w - b.size / 2;
          b.y = rand(c, 5) * h - b.size / 2;
          b.dx = (rand(c, 6) - 0.5) * 16;
          b.el.style.width = b.el.style.height = b.size.toFixed(0) + "px";
          b.el.style.background = "radial-gradient(circle, rgba(" + COLORS[(b.seed + cyc) % COLORS.length] +
            ",.7) 0%, rgba(" + COLORS[(b.seed + cyc + 2) % COLORS.length] + ",.3) 45%, transparent 70%)";
        }
        var life = Math.sin(Math.PI * f);            // 0 ao surgir, 1 no auge, 0 ao desaparecer
        var op = reduceMotion ? 0.55 : life * life * 0.85;
        var sc = 0.5 + 0.5 * life;
        var x = b.x + b.dx * f, y = b.y - 18 * f;     // deriva bem pequena
        b.el.style.opacity = op.toFixed(3);
        b.el.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0) scale(" + sc.toFixed(3) + ")";
      });
    });
  }
  requestAnimationFrame(frame);
})();
