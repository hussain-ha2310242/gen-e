// GEN-E generator. A typed stock of 72 real parts floats on the stage. Building a structure
// (typed, or from the shortcuts under the prompt) sends the parts that fit it to the places its
// recipe gives them. Requires three.js, lib/*.js and render/parts3d.js. Each part moves on a
// damped spring, so motion never snaps.
(function (G) {
  const V = THREE.Vector3, Q = THREE.Quaternion, E = THREE.Euler, Mx = THREE.Matrix4;
  const ITEMS = G.items, CAT = G.parts;
  const STOCK = G.inventory.stock();
  const N = STOCK.length;
  const HOLD_D = 9.0;      // seconds a structure stays formed
  const SCAN_D = 3.6;      // first scan at load
  const CHAR_D = 0.05;     // typing speed, seconds per character
  const PRESS_D = 0.45;    // pause on BUILD before forming
  const MAXLINES = 400;
  const SHORT = { gym: 'Gym', play: 'Play dome', shade: 'Shade', steps: 'Steps', shelter: 'Shelter', skate: 'Skate', mural: 'Mural', bridge: 'Bridge' };

  const btn = document.getElementById('go');
  const cmd = document.getElementById('cmd');
  const cmdForm = document.getElementById('cmdform');
  const skipsEl = document.getElementById('skips');
  const skipBtn = document.getElementById('skipTyping');

  // ---------- renderer, camera, stage ----------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);
  scene.fog = new THREE.Fog(0x05060a, 30, 60);

  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 200);
  camera.position.set(0, 1.2, 21);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  document.getElementById('stage').appendChild(renderer.domElement);

  // The view is shifted up so the structures sit clear of the prompt.
  let formZ = 15.5;   // camera distance once a structure is formed
  function applyView() {
    const w = innerWidth, h = innerHeight, phone = w < 700;
    camera.aspect = w / h;
    // on phones the info card sits at the top, so the structure moves down into the clear band
    camera.setViewOffset(w, h, 0, phone ? -h * 0.06 : h * 0.12, w, h);
    formZ = phone ? 17.5 : 15.5;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  applyView();
  addEventListener('resize', applyView);

  scene.add(new THREE.HemisphereLight(0xfff3ea, 0x1a0c0e, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(6, 10, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xC8102E, 1.1);
  rim.position.set(-8, -4, -6);
  scene.add(rim);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.95, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.2;
  scene.add(floor);
  const grid = new THREE.GridHelper(48, 32, 0x2a1418, 0x14161c);
  grid.position.y = -2.19;
  scene.add(grid);

  const world = new THREE.Group();
  scene.add(world);

  // ---------- helpers ----------
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const randQuat = () => new Q().setFromEuler(new E(rand(0, 6.28), rand(0, 6.28), rand(0, 6.28)));
  const tmpQ = new Q(), tmpV = new V();

  // A slot's basis (ax, ay, normal) as a quaternion, so the part's local axes line up with it.
  function basisQuat(ax, ay) {
    const x = new V(ax[0], ax[1], ax[2]);
    const z = new V().crossVectors(x, new V(ay[0], ay[1], ay[2])).normalize();
    const y = new V().crossVectors(z, x).normalize();
    return new Q().setFromRotationMatrix(new Mx().makeBasis(x, y, z));
  }
  ITEMS.forEach(it => {
    it.targets = it.slots.map(s => ({ p: new V(s.p[0], s.p[1], s.p[2]), q: basisQuat(s.ax, s.ay) }));
    it.facts = G.facts.summarize(it.slots);
  });

  // ---------- the stock: one spring-driven body per part ----------
  const parts = STOCK.map(s => {
    const m = G.render.parts[s.type]();
    world.add(m);
    const home = new V(rand(-8, 8), rand(-3.5, 3.5), rand(-4, 4));
    const homeQ = randQuat();
    return {
      m, type: s.type, id: s.id, ph: Math.random() * Math.PI * 2,
      k: rand(2.6, 4.0), spin: rand(-0.5, 0.5), axis: new V(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize(),
      home, homeQ, cur: home.clone(), curQ: homeQ.clone(), tgt: home.clone(), tgtQ: homeQ.clone(),
      standby: true, sc: 1
    };
  });

  // ---------- lines between neighbouring parts of the formed structure ----------
  const linePos = new Float32Array(MAXLINES * 6);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
  lineGeo.setDrawRange(0, 0);
  const lineMat = new THREE.LineBasicMaterial({ color: 0xC8102E, transparent: true, opacity: 0, depthWrite: false });
  world.add(new THREE.LineSegments(lineGeo, lineMat));
  let edges = [], edgesNext = null;

  // each target joins its two nearest neighbours; returns slot-index pairs
  function neighbourEdges(targets) {
    const set = new Set(), out = [];
    for (let i = 0; i < targets.length; i++) {
      const d = [];
      for (let j = 0; j < targets.length; j++) if (j !== i) d.push([targets[i].p.distanceToSquared(targets[j].p), j]);
      d.sort((a, b) => a[0] - b[0]);
      for (let n = 0; n < 2 && n < d.length; n++) {
        const j = d[n][1], a = Math.min(i, j), b = Math.max(i, j), id = a * 1000 + b;
        if (!set.has(id)) { set.add(id); out.push([a, b]); }
      }
    }
    return out.slice(0, MAXLINES);
  }

  const PULSES = 10;
  const pulsePos = new Float32Array(PULSES * 3);
  const pulseGeo = new THREE.BufferGeometry();
  pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePos, 3));
  const pulseMat = new THREE.PointsMaterial({ color: 0xff5a6a, size: 0.16, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  world.add(new THREE.Points(pulseGeo, pulseMat));
  const pulses = Array.from({ length: PULSES }, () => ({ e: 0, t: Math.random(), s: rand(0.3, 0.7) }));

  function updateLines(dt) {
    // fade out, swap to the new structure's edges, then fade back in
    if (edgesNext && lineMat.opacity < 0.02) { edges = edgesNext; edgesNext = null; }
    const on = formIdx >= 0 && !edgesNext;
    lineMat.opacity += ((on ? 0.35 : 0) - lineMat.opacity) * Math.min(1, dt * 4);
    pulseMat.opacity += ((on ? 0.8 : 0) - pulseMat.opacity) * Math.min(1, dt * 4);

    let lc = 0;
    for (let n = 0; n < edges.length; n++) {
      const pa = parts[edges[n][0]].cur, pb = parts[edges[n][1]].cur;
      linePos[lc++] = pa.x; linePos[lc++] = pa.y; linePos[lc++] = pa.z;
      linePos[lc++] = pb.x; linePos[lc++] = pb.y; linePos[lc++] = pb.z;
    }
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.setDrawRange(0, edges.length * 2);

    pulses.forEach((p, k) => {
      p.t += dt * p.s;
      if ((p.t >= 1 || p.e >= edges.length) && edges.length) { p.e = Math.floor(Math.random() * edges.length); p.t = 0; }
      if (!edges.length) return;
      const A = parts[edges[p.e][0]].cur, B = parts[edges[p.e][1]].cur;
      pulsePos[k * 3] = A.x + (B.x - A.x) * p.t;
      pulsePos[k * 3 + 1] = A.y + (B.y - A.y) * p.t;
      pulsePos[k * 3 + 2] = A.z + (B.z - A.z) * p.t;
    });
    pulseGeo.attributes.position.needsUpdate = true;
  }

  // ---------- scan annotations (first scan only) ----------
  const annLayer = document.getElementById('ann');
  const ANN_WINDOW = 1.8;
  const annEls = [0, 1, 2].map(k => {
    const el = document.createElement('div');
    el.className = 'ann';
    el.innerHTML = '<i class="ln"></i><div class="box"><b></b><span></span></div>';
    annLayer.appendChild(el);
    return { el, idx: 0, start: 0.5 + k * 1.0 };
  });
  function pickAnnotations() {
    annEls.forEach(a => {
      a.idx = Math.floor(Math.random() * N);
      const p = parts[a.idx], meta = CAT[p.type];
      a.el.querySelector('b').textContent = meta.name;
      a.el.querySelector('span').textContent = p.id + ' · ' + meta.material + ' · ' + meta.kg + ' kg';
    });
  }
  function updateAnnotations(t) {
    annEls.forEach(a => {
      const u = t - a.start;
      if (formIdx >= 0 || u < 0 || u > ANN_WINDOW) { a.el.style.opacity = 0; return; }
      parts[a.idx].m.getWorldPosition(tmpV).project(camera);
      const x = (tmpV.x + 1) / 2 * innerWidth, y = (-tmpV.y + 1) / 2 * innerHeight;
      a.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      a.el.style.opacity = (Math.min(1, u / 0.25) * Math.min(1, (ANN_WINDOW - u) / 0.4)).toFixed(3);
    });
  }

  // ---------- state pill and info card ----------
  const stateEl = document.getElementById('state');
  const stateText = document.getElementById('state-text');
  function setState(text, cls) {
    stateText.textContent = text;
    stateEl.className = 'state ' + (cls || '');
  }

  const info = document.getElementById('info');
  const kicker = document.getElementById('kicker');
  const tiles = {};
  info.querySelectorAll('.tile').forEach(t => { tiles[t.dataset.k] = t.querySelector('b'); });
  let countTargets = null;
  const fmt = v => Math.round(v).toLocaleString('en-US');

  function fillInfo(it) {
    const f = it.facts;
    info.querySelector('h2').textContent = it.title;
    info.querySelector('.ic-tag').textContent = it.tagline;
    info.querySelector('.ic-badge use').setAttribute('href', '#' + it.icon);
    info.querySelector('[data-k="bom"]').textContent = G.facts.bomText(f);
    info.querySelector('[data-k="maker"]').textContent = it.maker;
    info.querySelector('[data-k="delivery"]').textContent = it.delivery;
    info.querySelector('[data-k="assume"]').textContent = G.facts.assumptions;
    kicker.textContent = 'Formed · ' + f.parts + ' parts';
    countTargets = { parts: f.parts, co2: f.co2Kg, cost: f.costQAR, weeks: f.weeks };
    Object.keys(tiles).forEach(k => { tiles[k].textContent = '0'; });
  }
  function countUp(p) {
    if (!countTargets) return;
    const e = easeOut(p);
    Object.keys(tiles).forEach(k => { tiles[k].textContent = fmt(countTargets[k] * e); });
  }

  // ---------- shortcuts under the prompt ----------
  ITEMS.forEach((it, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'skip';
    b.dataset.i = i;
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#' + it.icon + '"/></svg><span>' + SHORT[it.key] + '</span>';
    skipsEl.appendChild(b);
  });
  skipsEl.addEventListener('click', e => {
    const b = e.target.closest('.skip');
    if (b) skipTo(Number(b.dataset.i));
  });
  function markChips() {
    skipsEl.querySelectorAll('.skip').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.i) === formIdx)));
  }

  // ---------- forming and typing ----------
  let formIdx = -1;
  let formedAt = Infinity;   // when the info card reveals
  let nextAt = 0;            // when the next build starts
  let typing = null;         // { i, start, fast }
  let lastFormed = -1;
  let clockNow = 0;

  function form(idx, now) {
    formIdx = idx;
    const it = ITEMS[idx];
    const picks = G.inventory.allocate(it.slots, STOCK);     // a real part for each slot
    info.classList.remove('on');
    fillInfo(it);
    parts.forEach(p => { p.standby = true; });
    picks.forEach((pi, j) => {
      const p = parts[pi];
      p.tgt.copy(it.targets[j].p);
      p.tgtQ.copy(it.targets[j].q);
      p.standby = false;
    });
    edgesNext = neighbourEdges(it.targets).map(([a, b]) => [picks[a], picks[b]]);
    formedAt = now + 1.4;
    nextAt = formedAt + HOLD_D;
    setState('Forming · ' + it.title, 'busy');
    markChips();
  }

  function startTyping(i, now) {
    if (document.activeElement === cmd) { nextAt = now + 1; return; }   // pause while the user types
    typing = { i, start: now, fast: false };
    cmd.value = '';
    setState('Typing · ' + ITEMS[i].title, 'busy');
  }

  function skipTo(i) {
    typing = null;
    cmd.value = '';
    btn.classList.remove('press');
    form(i, clockNow);
  }

  cmdForm.addEventListener('submit', e => {
    e.preventDefault();
    const text = cmd.value.trim();
    if (!text) return;
    const r = G.intent.resolve(text);
    if (r.index < 0) {
      // say what can be built instead of building something unrelated
      setState('Not in the catalogue · try ' + Object.values(SHORT).join(', ').toLowerCase(), 'warn');
      return;
    }
    skipTo(r.index);
    cmd.blur();
  });

  skipBtn.addEventListener('click', () => { if (typing) typing.fast = true; });

  cmd.addEventListener('focus', () => {
    if (typing) { typing = null; cmd.value = ''; setState('Scanning', ''); }
  });

  // ---------- loop ----------
  const clock = new THREE.Clock();
  let lastNow = 0;

  function frame() {
    const now = clock.getElapsedTime();
    const dt = Math.min(0.05, now - lastNow);
    lastNow = now;
    clockNow = now;

    // scheduler: scan, then type and build each structure in turn, holding each one
    if (!typing) {
      if (formIdx < 0 && now >= SCAN_D) startTyping(0, now);
      else if (formIdx >= 0 && now >= nextAt) startTyping((formIdx + 1) % ITEMS.length, now);
    } else {
      const text = ITEMS[typing.i].example;
      const el = now - typing.start;
      const typeEnd = text.length * CHAR_D;
      if (document.activeElement === cmd && cmd.value) {
        typing = null;                                  // the user took over
      } else if (typing.fast || el >= typeEnd + PRESS_D) {
        const i = typing.i;
        typing = null;
        cmd.value = '';
        btn.classList.remove('press');
        form(i, now);
      } else if (el < typeEnd) {
        cmd.value = text.slice(0, Math.floor(el / CHAR_D) + 1);
      } else {
        cmd.value = text;
        btn.classList.add('press');
      }
    }
    skipBtn.hidden = !typing;

    // formed parts travel to their slots; the rest drift on a slow spin
    parts.forEach(p => {
      if (formIdx < 0 || p.standby) {
        p.tgt.copy(p.home);
        tmpQ.setFromAxisAngle(p.axis, now * p.spin);
        p.tgtQ.copy(p.homeQ).multiply(tmpQ);
      }
      const f = 1 - Math.exp(-p.k * dt);            // damped spring towards the target
      p.cur.lerp(p.tgt, f);
      p.curQ.slerp(p.tgtQ, f);
      // parts not used by the formed structure shrink back, so the structure reads clearly
      p.sc += ((formIdx >= 0 && p.standby ? 0.3 : 1) - p.sc) * f;
      p.m.scale.setScalar(p.sc);
      p.m.position.set(p.cur.x, p.cur.y + Math.sin(now * 0.9 + p.ph) * 0.03, p.cur.z);
      p.m.quaternion.copy(p.curQ);
    });

    // reveal the info card once the structure has settled, then count the numbers up
    if (formIdx >= 0 && now >= formedAt) {
      if (lastFormed !== formIdx) {
        lastFormed = formIdx;
        info.classList.remove('on');
        void info.offsetWidth;
        info.classList.add('on');
        setState('Formed · ' + ITEMS[formIdx].title, 'ok');
      }
      countUp(clamp((now - formedAt) / 1.1));
    }

    updateLines(dt);
    updateAnnotations(now);
    world.rotation.y = Math.sin(now * 0.12) * 0.12;   // gentle sway, so every side reads
    // the camera moves in closer once a structure is formed, and back out while scanning
    camera.position.z += ((formIdx >= 0 ? formZ : 21) - camera.position.z) * (1 - Math.exp(-1.6 * dt));
    renderer.render(scene, camera);
  }

  pickAnnotations();
  setState('Scanning', 'busy');
  renderer.setAnimationLoop(frame);
})(globalThis.GENE = globalThis.GENE || {});
