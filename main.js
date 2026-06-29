/* ============================================================
   main.js — Three.js Neural Network + GSAP Animations
   ============================================================ */

'use strict';

// ─── GSAP Plugin Registration ────────────────────────────────
gsap.registerPlugin(ScrollTrigger);

// ─── CUSTOM CURSOR ───────────────────────────────────────────
(function initCursor() {
  const dot = document.querySelector('.cursor');
  const ring = document.querySelector('.cursor-follower');
  if (!dot || !ring) return;

  let rx = 0, ry = 0;

  document.addEventListener('mousemove', (e) => {
    dot.style.left  = e.clientX + 'px';
    dot.style.top   = e.clientY + 'px';

    rx += (e.clientX - rx) * 0.14;
    ry += (e.clientY - ry) * 0.14;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
  });

  // Grow cursor over interactive elements
  document.querySelectorAll('a, button, .project-card, .stat-card').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      dot.style.transform  = 'translate(-50%, -50%) scale(2)';
      ring.style.transform = 'translate(-50%, -50%) scale(1.5)';
      ring.style.opacity   = '0.25';
    });
    el.addEventListener('mouseleave', () => {
      dot.style.transform  = 'translate(-50%, -50%) scale(1)';
      ring.style.transform = 'translate(-50%, -50%) scale(1)';
      ring.style.opacity   = '0.5';
    });
  });
})();

// ─── THREE.JS NEURAL NETWORK ─────────────────────────────────
(function initThree() {
  const canvas   = document.getElementById('bg-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 38;

  // --- Particles -----------------------------------------------
  const COUNT = 200;
  const pos   = new Float32Array(COUNT * 3);

  // Distribute on a hollow sphere shell for an organic network feel
  for (let i = 0; i < COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = 16 + Math.random() * 14;         // shell depth: 16–30

    pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);
  }

  const pointGeo = new THREE.BufferGeometry();
  pointGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const pointMat = new THREE.PointsMaterial({
    color:           0x06b6d4,
    size:            0.22,
    transparent:     true,
    opacity:         0.9,
    sizeAttenuation: true,
  });

  const pointsMesh = new THREE.Points(pointGeo, pointMat);
  scene.add(pointsMesh);

  // --- Connections ---------------------------------------------
  const MAX_DIST = 9;
  const lineVerts = [];

  for (let i = 0; i < COUNT; i++) {
    for (let j = i + 1; j < COUNT; j++) {
      const dx = pos[i*3]   - pos[j*3];
      const dy = pos[i*3+1] - pos[j*3+1];
      const dz = pos[i*3+2] - pos[j*3+2];
      if (dx*dx + dy*dy + dz*dz < MAX_DIST * MAX_DIST) {
        lineVerts.push(
          pos[i*3], pos[i*3+1], pos[i*3+2],
          pos[j*3], pos[j*3+1], pos[j*3+2]
        );
      }
    }
  }

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lineVerts), 3));

  const lineMat = new THREE.LineBasicMaterial({
    color:       0x8b5cf6,
    transparent: true,
    opacity:     0.1,
  });

  const linesMesh = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(linesMesh);

  // A second, sparser ring of nodes in a contrasting colour (pink accent)
  const COUNT2 = 40;
  const pos2   = new Float32Array(COUNT2 * 3);
  for (let i = 0; i < COUNT2; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = 28 + Math.random() * 6;
    pos2[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    pos2[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    pos2[i*3+2] = r * Math.cos(phi);
  }
  const pointGeo2 = new THREE.BufferGeometry();
  pointGeo2.setAttribute('position', new THREE.BufferAttribute(pos2, 3));
  const pointMat2 = new THREE.PointsMaterial({
    color: 0xec4899, size: 0.18, transparent: true, opacity: 0.5, sizeAttenuation: true,
  });
  scene.add(new THREE.Points(pointGeo2, pointMat2));

  // --- Mouse tracking ------------------------------------------
  let targetRotX = 0;
  let targetRotY = 0;

  document.addEventListener('mousemove', (e) => {
    targetRotX = (e.clientY / window.innerHeight - 0.5) * 0.35;
    targetRotY = (e.clientX / window.innerWidth  - 0.5) * 0.5;
  });

  // --- Resize --------------------------------------------------
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // --- Render loop ---------------------------------------------
  const clock = new THREE.Clock();

  (function animate() {
    requestAnimationFrame(animate);

    const t = clock.getElapsedTime();

    // Smooth lerp toward mouse
    pointsMesh.rotation.y += (targetRotY * 0.8 + t * 0.05 - pointsMesh.rotation.y) * 0.02;
    pointsMesh.rotation.x += (targetRotX * 0.5 + t * 0.02 - pointsMesh.rotation.x) * 0.02;
    linesMesh.rotation.copy(pointsMesh.rotation);

    // Pulse opacity on connections and expose value for scroll sync
    const pulse = 0.07 + 0.05 * Math.sin(t * 0.6);
    lineMat.opacity = pulse;
    window.__networkPulse = pulse;   // range ≈ 0.02–0.12 → remap to scroll range

    renderer.render(scene, camera);
  })();
})();

// ─── GLITCH: stamp data-text on name element ────────────────
(function initGlitch() {
  const nameEl = document.querySelector('.hero-name');
  if (!nameEl) return;
  nameEl.setAttribute('data-text', nameEl.textContent);
})();

// ─── TYPEWRITER ──────────────────────────────────────────────
(function initTypewriter() {
  const el     = document.getElementById('typewriter');
  if (!el) return;

  const roles  = ['ML Engineer', 'IoT Builder', 'Hackathon Winner'];
  let roleIdx  = 0;
  let charIdx  = 0;
  let deleting = false;
  let started  = false;

  const TYPE_SPEED   = 80;   // ms per char while typing
  const DELETE_SPEED = 45;   // ms per char while deleting
  const PAUSE_END    = 1800; // ms pause at full word
  const PAUSE_START  = 400;  // ms pause before typing next word

  function tick() {
    const word = roles[roleIdx];

    if (!deleting) {
      el.textContent = word.slice(0, charIdx + 1);
      charIdx++;
      if (charIdx === word.length) {
        deleting = true;
        setTimeout(tick, PAUSE_END);
        return;
      }
      setTimeout(tick, TYPE_SPEED);
    } else {
      el.textContent = word.slice(0, charIdx - 1);
      charIdx--;
      if (charIdx === 0) {
        deleting = false;
        roleIdx  = (roleIdx + 1) % roles.length;
        setTimeout(tick, PAUSE_START);
        return;
      }
      setTimeout(tick, DELETE_SPEED);
    }
  }

  // Start after hero entrance animation reveals the element
  setTimeout(() => { tick(); }, 1600);
})();

// ─── SCROLL LINE — sync with neural network pulse ────────────
(function initScrollSync() {
  const line = document.querySelector('.scroll-line');
  if (!line) return;

  // lineMat.opacity range: 0.02 – 0.12 → remap to scroll line 0.15 – 1.0
  const remap = (v, inMin, inMax, outMin, outMax) =>
    outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);

  function syncLoop() {
    requestAnimationFrame(syncLoop);
    const raw  = window.__networkPulse || 0.07;
    const opc  = remap(raw, 0.02, 0.12, 0.15, 1.0);
    const scl  = remap(raw, 0.02, 0.12, 0.85, 1.1);
    line.style.opacity   = opc.toFixed(3);
    line.style.transform = `scaleY(${scl.toFixed(3)})`;
  }
  syncLoop();
})();

// ─── NAVBAR SCROLL STATE ─────────────────────────────────────
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// ─── HERO ENTRANCE ANIMATION ─────────────────────────────────
gsap.timeline({ delay: 0.25 })
  .to('.hero-greeting', { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' })
  .to('.hero-name',     { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, '-=0.55')
  .to('.hero-title',    { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.5')
  .to('.hero-sub',      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.45')
  .to('.hero-cta',      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.4')
  .to('.scroll-indicator', { opacity: 1, duration: 0.8, ease: 'power3.out' }, '-=0.2');

// ─── SCROLL REVEAL — single elements ─────────────────────────
document.querySelectorAll('.reveal').forEach((el) => {
  gsap.to(el, {
    scrollTrigger: {
      trigger:       el,
      start:         'top 88%',
      toggleActions: 'play none none none',
    },
    opacity:  1,
    y:        0,
    duration: 0.75,
    ease:     'power3.out',
  });
});

// ─── SCROLL REVEAL — staggered children ──────────────────────
document.querySelectorAll('.reveal-stagger').forEach((container) => {
  gsap.fromTo(
    Array.from(container.children),
    { opacity: 0, y: 32 },
    {
      scrollTrigger: {
        trigger:       container,
        start:         'top 85%',
        toggleActions: 'play none none none',
      },
      opacity:  1,
      y:        0,
      duration: 0.65,
      stagger:  0.1,
      ease:     'power3.out',
    }
  );
});

// ─── TERMINAL STATS ANIMATION ────────────────────────────────
(function initTerminal() {
  const body = document.getElementById('terminal-body');
  if (!body) return;

  // Sequence: { kind: 'type'|'print'|'cursor', text/html, cls, charDelay, postDelay }
  const SEQ = [
    { kind: 'type',   text: '$ cat stats.json', cls: 't-green', charDelay: 72, postDelay: 280 },
    { kind: 'print',  text: '{',                 cls: 't-dim',   postDelay: 70 },
    { kind: 'print',  html: '  <span class="t-key">"hackathon_podiums"</span>  :  <span class="t-val">3+</span> ,', postDelay: 55 },
    { kind: 'print',  html: '  <span class="t-key">"major_projects"</span>     :  <span class="t-val">5+</span> ,', postDelay: 55 },
    { kind: 'print',  html: '  <span class="t-key">"certifications"</span>     :  <span class="t-val">8</span>  ,',  postDelay: 55 },
    { kind: 'print',  html: '  <span class="t-key">"toeic_score"</span>        :  <span class="t-val">980/990</span>',  postDelay: 55 },
    { kind: 'print',  text: '}',                 cls: 't-dim',   postDelay: 220 },
    { kind: 'print',  text: '[Process exited 0]',cls: 't-muted', postDelay: 160 },
    { kind: 'cursor', text: '$ ',                cls: 't-green' },
  ];

  function makeLine(cls) {
    const s = document.createElement('span');
    s.className = 't-line' + (cls ? ' ' + cls : '');
    body.appendChild(s);
    body.appendChild(document.createElement('br'));
    return s;
  }

  function runSeq(idx) {
    if (idx >= SEQ.length) return;
    const step = SEQ[idx];

    if (step.kind === 'type') {
      const span = makeLine(step.cls);
      const caret = document.createElement('span');
      caret.className = 't-caret';
      span.appendChild(caret);
      let i = 0;
      function typeChar() {
        span.textContent = step.text.slice(0, i + 1);
        span.appendChild(caret);
        i++;
        if (i < step.text.length) {
          setTimeout(typeChar, step.charDelay + Math.random() * 30);
        } else {
          caret.remove();
          setTimeout(() => runSeq(idx + 1), step.postDelay);
        }
      }
      typeChar();

    } else if (step.kind === 'print') {
      const span = makeLine(step.cls || '');
      if (step.html) span.innerHTML = step.html;
      else           span.textContent = step.text;
      setTimeout(() => runSeq(idx + 1), step.postDelay);

    } else if (step.kind === 'cursor') {
      const span = makeLine(step.cls);
      span.textContent = step.text;
      const caret = document.createElement('span');
      caret.className = 't-caret';
      span.appendChild(caret);
    }
  }

  let fired = false;
  ScrollTrigger.create({
    trigger: '#terminal-body',
    start:   'top 85%',
    once:    true,
    onEnter: () => { if (!fired) { fired = true; runSeq(0); } },
  });
})();

// ─── SVG RADAR CHART ─────────────────────────────────────────
(function initRadarChart() {
  const svg = document.getElementById('skill-radar');
  if (!svg) return;

  const NS    = 'http://www.w3.org/2000/svg';
  const CX    = 200, CY = 200, R = 145;
  const RINGS = 4;
  const skills = [
    { label: 'Python',           value: 0.93 },
    { label: 'Deep Learning',    value: 0.87 },
    { label: 'IoT / Embedded',   value: 0.80 },
    { label: 'Data Engineering', value: 0.74 },
    { label: 'Hackathons',       value: 0.96 },
    { label: 'Leadership',       value: 0.88 },
  ];
  const N = skills.length;

  function angle(i)  { return (2 * Math.PI * i / N) - Math.PI / 2; }
  function pt(i, r)  { return [CX + r * Math.cos(angle(i)), CY + r * Math.sin(angle(i))]; }
  function ptsStr(p) { return p.map(([x, y]) => x.toFixed(2) + ',' + y.toFixed(2)).join(' '); }

  function el(tag, attrs, text) {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    if (text != null) e.textContent = text;
    return e;
  }

  // Gradient
  const defs = el('defs', {});
  const grad = el('linearGradient', { id: 'radar-grad', x1: '0%', y1: '0%', x2: '100%', y2: '100%' });
  grad.appendChild(el('stop', { offset: '0%',   'stop-color': '#06b6d4' }));
  grad.appendChild(el('stop', { offset: '100%', 'stop-color': '#8b5cf6' }));
  defs.appendChild(grad);
  svg.appendChild(defs);

  // Grid rings
  for (let r = 1; r <= RINGS; r++) {
    const pts = Array.from({ length: N + 1 }, (_, i) => pt(i % N, R * r / RINGS));
    svg.appendChild(el('polyline', {
      points: ptsStr(pts),
      fill: 'none', stroke: 'rgba(255,255,255,0.07)', 'stroke-width': '1',
    }));
  }

  // Axis lines
  for (let i = 0; i < N; i++) {
    const [x, y] = pt(i, R);
    svg.appendChild(el('line', {
      x1: CX, y1: CY, x2: x, y2: y,
      stroke: 'rgba(255,255,255,0.09)', 'stroke-width': '1',
    }));
  }

  // Data polygon (starts collapsed at center)
  const polygon = el('polygon', {
    points: Array.from({ length: N }, () => CX + ',' + CY).join(' '),
    fill: 'rgba(6,182,212,0.10)',
    stroke: 'url(#radar-grad)',
    'stroke-width': '2',
    'stroke-linejoin': 'round',
  });
  svg.appendChild(polygon);

  // Vertex dots
  const dots = skills.map(() => {
    const d = el('circle', { cx: CX, cy: CY, r: '4', fill: '#06b6d4', opacity: '0' });
    svg.appendChild(d);
    return d;
  });

  // Labels
  skills.forEach((s, i) => {
    const [lx, ly] = pt(i, R + 20);
    svg.appendChild(el('text', {
      x: lx.toFixed(1), y: ly.toFixed(1),
      'font-family': 'JetBrains Mono, monospace',
      'font-size': '10.5',
      fill: 'rgba(255,255,255,0.5)',
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
    }, s.label));
  });

  // Scroll-triggered draw animation
  ScrollTrigger.create({
    trigger: svg,
    start:   'top 85%',
    once:    true,
    onEnter: () => {
      const state = { t: 0 };
      gsap.to(state, {
        t: 1, duration: 1.6, ease: 'power2.out',
        onUpdate() {
          const progress = state.t;
          const pts = skills.map((s, i) => pt(i, R * s.value * progress));
          polygon.setAttribute('points', ptsStr(pts));
          dots.forEach((d, i) => {
            d.setAttribute('cx', pts[i][0].toFixed(2));
            d.setAttribute('cy', pts[i][1].toFixed(2));
            d.setAttribute('opacity', (progress * 0.9).toFixed(2));
          });
        },
      });
    },
  });
})();

// ─── PROJECT FILTERS ─────────────────────────────────────────
(function initFilters() {
  const btns  = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.project-card');
  if (!btns.length) return;

  btns.forEach((btn) => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter');
      cards.forEach((card) => {
        const tags  = (card.getAttribute('data-filters') || '').split(' ');
        const match = filter === 'all' || tags.includes(filter);
        card.dataset.orbitHidden = match ? '' : 'true';
        gsap.to(card, {
          opacity:  match ? 1    : 0.05,
          scale:    match ? 1    : 0.5,
          duration: 0.4,
          ease:     'power2.out',
        });
        card.style.pointerEvents = match ? '' : 'none';
      });
    });
  });
})();

// ─── ORBIT ────────────────────────────────────────────────────
(function initOrbit() {
  const stage  = document.getElementById('orbit-stage');
  const panel  = document.getElementById('orbit-panel');
  const pBody  = document.getElementById('orbit-panel-body');
  const pClose = document.getElementById('orbit-panel-close');
  if (!stage || !panel) return;

  const cards  = Array.from(stage.querySelectorAll('.project-card'));
  // One full revolution every 28 s
  const SPEED  = (2 * Math.PI) / 28000;
  let   angle  = -Math.PI / 2;   // start at 12 o'clock
  let   paused = false;
  let   active = null;
  let   lastTs = null;

  // Ellipse semi-axes as fractions of stage size
  const RX_FRAC = 0.44;   // wide  (horizontal)
  const RY_FRAC = 0.26;   // tight (vertical  ) — creates the oval tilt illusion

  // Depth scale: cards at the back shrink and fade
  const SCALE_BACK  = 0.62;
  const SCALE_FRONT = 1.08;
  const ALPHA_BACK  = 0.25;
  const ALPHA_FRONT = 1.0;

  // Init: all cards invisible at stage centre
  cards.forEach((c) => {
    c.style.position = 'absolute';
    c.style.left     = '0px';
    c.style.top      = '0px';
    c.style.opacity  = '0';
  });

  function visible()  { return cards.filter(c => c.dataset.orbitHidden !== 'true'); }
  function isMobile() { return window.innerWidth <= 768; }

  // Map sin(a) from [-1,+1] to [min,max]
  function lerp(t, min, max) { return min + (t + 1) / 2 * (max - min); }

  // rAF loop
  function loop(ts) {
    const dt = lastTs ? ts - lastTs : 0;
    lastTs = ts;

    if (!isMobile()) {
      if (!paused) angle += SPEED * dt;

      const sw  = stage.offsetWidth;
      const sh  = stage.offsetHeight;
      const cx  = sw / 2;
      const cy  = sh / 2;
      const Rx  = sw * RX_FRAC;
      const Ry  = sh * RY_FRAC;
      const vis = visible();

      vis.forEach((card, i) => {
        const a     = angle + (i / vis.length) * Math.PI * 2;
        const cosA  = Math.cos(a);
        const sinA  = Math.sin(a);   // −1 = back, +1 = front

        // Ellipse position
        const x = cx + Rx * cosA - card.offsetWidth  / 2;
        const y = cy + Ry * sinA - card.offsetHeight / 2;

        // Depth values
        const sc  = lerp(sinA, SCALE_BACK,  SCALE_FRONT);
        const opc = lerp(sinA, ALPHA_BACK,  ALPHA_FRONT);
        const zi  = Math.round(lerp(sinA, 1, 20));

        card.style.left      = x.toFixed(1) + 'px';
        card.style.top       = y.toFixed(1) + 'px';
        card.style.transform = `scale(${sc.toFixed(3)})`;
        card.style.zIndex    = zi;

        // Don't override opacity while panel is open (GSAP handles it)
        if (!active) card.style.opacity = opc.toFixed(3);
      });

      // Filtered-out cards collapse to hub centre
      cards.filter(c => c.dataset.orbitHidden === 'true').forEach((card) => {
        card.style.left      = (cx - card.offsetWidth  / 2) + 'px';
        card.style.top       = (cy - card.offsetHeight / 2) + 'px';
        card.style.transform = 'scale(0.4)';
        card.style.zIndex    = '0';
      });
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  // Hover: pause orbit
  cards.forEach((card) => {
    card.addEventListener('mouseenter', () => { paused = true; });
    card.addEventListener('mouseleave', () => { if (active !== card) paused = false; });
    card.addEventListener('click',      () => { active === card ? closePanel() : openPanel(card); });
  });

  // Open detail panel
  function openPanel(card) {
    paused = true;
    active = card;

    cards.forEach((c) => {
      if (c.dataset.orbitHidden === 'true') return;
      gsap.to(c, {
        opacity:  c === card ? 1    : 0.08,
        scale:    c === card ? 1.12 : 0.82,
        duration: 0.4, ease: 'power2.out',
      });
    });

    // Populate — content is static HTML, safe from XSS
    const meta  = card.querySelector('.project-meta');
    const title = card.querySelector('.project-title');
    const desc  = card.querySelector('.project-desc');
    const tags  = card.querySelector('.project-tags');
    pBody.innerHTML =
      '<div class="op-meta">'  + (meta  ? meta.innerHTML    : '') + '</div>' +
      '<div class="op-title">' + (title ? title.textContent : '') + '</div>' +
      '<p   class="op-desc">'  + (desc  ? desc.innerHTML    : '') + '</p>'   +
      '<div class="op-tags">'  + (tags  ? tags.innerHTML    : '') + '</div>';

    panel.style.display  = 'block';
    panel.style.overflow = 'hidden';
    gsap.fromTo(panel,
      { height: 0, opacity: 0 },
      { height: 'auto', opacity: 1, duration: 0.45, ease: 'power3.out' }
    );
    panel.setAttribute('aria-hidden', 'false');
    setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
  }

  // Close detail panel
  function closePanel() {
    active = null;
    paused = false;
    cards.forEach((c) => {
      if (c.dataset.orbitHidden === 'true') return;
      // Let the rAF loop reclaim opacity/scale naturally
      c.style.opacity  = '';
      c.style.transform = '';
    });
    panel.style.overflow = 'hidden';
    gsap.to(panel, {
      height: 0, opacity: 0, duration: 0.3, ease: 'power2.in',
      onComplete() {
        panel.style.display = 'none';
        panel.style.overflow = '';
        panel.setAttribute('aria-hidden', 'true');
        pBody.innerHTML = '';
      },
    });
  }

  if (pClose) pClose.addEventListener('click', closePanel);

  // Entrance: cards fly out from hub when section enters view
  ScrollTrigger.create({
    trigger: stage,
    start:   'top 82%',
    once:    true,
    onEnter: () => {
      cards.forEach((card, i) => {
        gsap.fromTo(card,
          { opacity: 0, scale: 0.1 },
          { opacity: 1, scale: 1, duration: 0.8, delay: i * 0.12, ease: 'back.out(1.6)',
            onComplete() {
              // hand opacity back to the rAF loop
              if (!active) card.style.opacity = '';
            }
          }
        );
      });
    },
  });

  window.addEventListener('resize', () => { lastTs = null; }, { passive: true });
})();

// ─── JOURNEY TIMELINE ────────────────────────────────────────
(function initJourney() {
  // Runs independently for each .journey-wrap (experience + achievements)
  document.querySelectorAll('.journey-wrap').forEach((wrap) => {
    const track = wrap.querySelector('.journey-track');
    const nodes = wrap.querySelectorAll('.journey-node');
    const cards = wrap.querySelectorAll('.journey-card');
    if (!track) return;

    gsap.to(track, {
      scaleY: 1,
      ease:   'none',
      scrollTrigger: {
        trigger: wrap,
        start:   'top 78%',
        end:     'bottom 80%',
        scrub:   0.6,
      },
    });

    nodes.forEach((node) => {
      gsap.to(node, {
        scale:    1,
        opacity:  1,
        duration: 0.55,
        ease:     'back.out(1.8)',
        scrollTrigger: { trigger: node, start: 'top 87%', once: true },
      });
    });

    cards.forEach((card) => {
      gsap.to(card, {
        opacity:  1,
        x:        0,
        duration: 0.6,
        ease:     'power3.out',
        scrollTrigger: { trigger: card, start: 'top 87%', once: true },
      });
    });
  });
})();

// ─── TROPHY CARDS ────────────────────────────────────────────
(function initTrophyCards() {
  const cards = document.querySelectorAll('.trophy-card');
  if (!cards.length) return;

  cards.forEach((card, i) => {
    gsap.to(card, {
      opacity:  1,
      y:        0,
      duration: 0.7,
      delay:    i * 0.14,
      ease:     'back.out(1.5)',
      scrollTrigger: { trigger: card, start: 'top 88%', once: true },
    });
  });
})();

// ─── MAP SCAN LINE ───────────────────────────────────────────
(function initMap() {
  const line = document.getElementById('map-scan-line');
  if (!line) return;
  gsap.fromTo(line,
    { attr: { y1: -2, y2: -2 } },
    { attr: { y1: 502, y2: 502 }, duration: 9, ease: 'none', repeat: -1 }
  );
})();

// ─── SIGNAL FORM ──────────────────────────────────────────────
(function initSignalForm() {
  const form   = document.getElementById('signal-form');
  const btn    = document.getElementById('signal-btn');
  const status = document.getElementById('signal-status');
  const ring1  = btn && btn.querySelector('.pulse-ring-1');
  const ring2  = btn && btn.querySelector('.pulse-ring-2');
  if (!form || !btn) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name  = document.getElementById('sig-name').value.trim();
    const email = document.getElementById('sig-email').value.trim();
    const msg   = document.getElementById('sig-msg').value.trim();
    if (!name || !email || !msg) return;

    // Outward pulse rings
    if (ring1 && ring2) {
      [ring1, ring2].forEach((ring, i) => {
        gsap.fromTo(ring,
          { opacity: 0.9, scale: 1 },
          { opacity: 0,   scale: 3.2, duration: 0.75,
            delay: i * 0.18, ease: 'power2.out',
            transformOrigin: '50% 50%' }
        );
      });
    }

    // Button text flash
    gsap.to(btn, { scale: 0.96, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.inOut' });

    // After animation — open mailto
    setTimeout(() => {
      const sub  = encodeURIComponent('Message from ' + name);
      const body = encodeURIComponent(msg + '\n\nFrom: ' + name + ' <' + email + '>');
      window.location.href =
        'mailto:youssef.soula@supcom.tn?subject=' + sub + '&body=' + body;

      // Status feedback
      if (status) {
        status.textContent = '✓ Signal transmitted';
        status.style.opacity = '1';
        setTimeout(() => { status.style.opacity = '0'; }, 3500);
      }
    }, 650);
  });
})();
