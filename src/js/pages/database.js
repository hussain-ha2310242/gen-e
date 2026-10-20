// Materials database page. A paged gallery over the parts in the embedded dataset, with totals,
// search, filters and sort. Thumbnails are rendered from the same 3D models, only when a card
// scrolls into view. Opening a card shows its full record in a side sheet.
// Requires geom, parts-meta, recipes, parts3d and thumbs (see the build), and the JSON in #data.
(function (G) {
  const PAGE = 24;
  const DATA = JSON.parse(document.getElementById('data').textContent);
  const PARTS = DATA.parts;
  const BY_ID = new Map(PARTS.map(p => [p.id, p]));
  const CONTRIB = new Map(DATA.contributors.map(c => [c.id, c]));
  const TYPE_KEYS = G.partTypes;
  const TYPES = G.parts;

  const SAFETY = { cleared: { label: 'Cleared', cls: 'ok' }, review: { label: 'In review', cls: 'pend' }, rejected: { label: 'Rejected', cls: 'rej' } };
  const STATUS = { available: { label: 'Available', cls: 'ok' }, reserved: { label: 'Reserved', cls: 'pend' }, used: { label: 'Used', cls: '' }, held: { label: 'Held', cls: 'rej' } };
  const SORTS = {
    added: (a, b) => b.added.localeCompare(a.added) || a.id.localeCompare(b.id),
    kg: (a, b) => b.kg - a.kg || a.id.localeCompare(b.id),
    co2: (a, b) => b.co2 - a.co2 || a.id.localeCompare(b.id),
    type: (a, b) => TYPE_KEYS.indexOf(a.type) - TYPE_KEYS.indexOf(b.type) || a.id.localeCompare(b.id)
  };

  const $ = id => document.getElementById(id);
  const els = {
    kpis: $('kpis'), q: $('q'), type: $('type'), status: $('status'), safety: $('safety'), sort: $('sort'),
    grid: $('grid'), count: $('count'), pager: $('pager'), sheet: $('sheet')
  };
  const state = { q: '', type: '', status: '', safety: '', sort: 'added', page: 1 };
  let sheetPart = null, sheetTurn = 0;

  // ---------- helpers ----------
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const dims = d => d.join(' × ') + ' mm';
  const variant = p => parseInt(p.id.slice(-5), 10) % 6;     // one of six viewing angles, stable per part
  const contributor = p => CONTRIB.get(p.contributor);

  PARTS.forEach(p => {
    const t = TYPES[p.type], c = contributor(p);
    p._hay = [p.id, t.name, t.material, p.colour.name, p.zone, c.name, c.kind, p.tags.join(' ')].join(' ').toLowerCase();
  });

  // ---------- totals ----------
  function renderKpis() {
    const cleared = PARTS.filter(p => p.safety === 'cleared');
    const stock = PARTS.filter(p => p.status === 'available' && p.safety === 'cleared');
    const kg = stock.reduce((s, p) => s + p.kg, 0);
    const co2 = stock.reduce((s, p) => s + p.co2, 0);
    const tiles = [
      [fmt(PARTS.length), 'Parts catalogued'],
      [fmt(stock.length), 'Available & cleared'],
      [fmt(kg) + ' kg', 'Stock mass'],
      [fmt(co2), 'kg CO₂e avoidable'],
      [fmt(DATA.contributors.length), 'Contributors'],
      [Math.round(cleared.length / PARTS.length * 100) + '%', 'Cleared for reuse']
    ];
    els.kpis.innerHTML = tiles.map(([v, l]) => '<div><b>' + v + '</b><span>' + l + '</span></div>').join('');
  }

  // ---------- filters and sort ----------
  function matches(p) {
    if (state.type && p.type !== state.type) return false;
    if (state.status && p.status !== state.status) return false;
    if (state.safety && p.safety !== state.safety) return false;
    return !state.q || p._hay.includes(state.q);
  }

  // ---------- cards ----------
  function card(p) {
    const t = TYPES[p.type], c = contributor(p), s = SAFETY[p.safety], st = STATUS[p.status];
    return '<article class="gcard" tabindex="0" role="button" data-id="' + p.id + '" aria-label="' + esc(t.name) + ' ' + p.id + '">' +
      '<div class="thumb"><img alt="" data-type="' + p.type + '" data-v="' + variant(p) + '"><span class="nothumb">' + esc(t.name) + '</span></div>' +
      '<div class="body">' +
        '<div class="top"><span class="id">' + p.id + '</span><span class="pill ' + s.cls + '">' + s.label + '</span></div>' +
        '<h3>' + esc(t.name) + '</h3>' +
        '<dl>' +
          '<div><dt>Size</dt><dd>' + dims(p.dims) + '</dd></div>' +
          '<div><dt>Colour</dt><dd><i class="sw" style="--c:' + p.colour.hex + '"></i>' + esc(p.colour.name) + '</dd></div>' +
          '<div><dt>From</dt><dd>' + esc(c.name) + '</dd></div>' +
          '<div><dt>Stock</dt><dd>' + st.label + ' · ' + p.kg + ' kg</dd></div>' +
        '</dl>' +
      '</div></article>';
  }

  // ---------- lazy thumbnails ----------
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); loadThumb(e.target); } }), { rootMargin: '240px 0px' })
    : null;

  function loadThumb(img) {
    if (img.getAttribute('src')) return;
    try {
      img.src = G.render.thumb(img.dataset.type, Number(img.dataset.v));
    } catch (err) {
      // no WebGL: show the type name instead of an empty box
      img.closest('.thumb').classList.add('nofig');
    }
  }

  function observeThumbs() {
    if (io) io.disconnect();
    els.grid.querySelectorAll('img[data-type]').forEach(img => (io ? io.observe(img) : loadThumb(img)));
  }

  // ---------- pager ----------
  function renderPager(pages) {
    if (pages <= 1) { els.pager.innerHTML = ''; return; }
    const cur = state.page;
    const shown = [...new Set([1, pages, cur - 1, cur, cur + 1])].filter(n => n >= 1 && n <= pages).sort((a, b) => a - b);
    let html = '<button class="pg" data-page="' + (cur - 1) + '" aria-label="Previous page"' + (cur === 1 ? ' disabled' : '') + '>‹</button>';
    let prev = 0;
    for (const n of shown) {
      if (n - prev > 1) html += '<span class="gap" aria-hidden="true">…</span>';
      html += '<button class="pg' + (n === cur ? ' on' : '') + '" data-page="' + n + '"' + (n === cur ? ' aria-current="page"' : '') + '>' + n + '</button>';
      prev = n;
    }
    html += '<button class="pg" data-page="' + (cur + 1) + '" aria-label="Next page"' + (cur === pages ? ' disabled' : '') + '>›</button>';
    els.pager.innerHTML = html;
  }

  // ---------- list ----------
  function render() {
    const list = PARTS.filter(matches).sort(SORTS[state.sort]);
    const pages = Math.max(1, Math.ceil(list.length / PAGE));
    state.page = Math.min(Math.max(1, state.page), pages);
    const start = (state.page - 1) * PAGE;
    const slice = list.slice(start, start + PAGE);

    els.count.textContent = list.length
      ? 'Showing ' + fmt(start + 1) + '–' + fmt(start + slice.length) + ' of ' + fmt(list.length) + ' parts'
      : 'No parts match these filters';
    els.grid.innerHTML = slice.length
      ? slice.map(card).join('')
      : '<div class="empty">Nothing matches. <button class="pg" type="button" data-reset>Clear filters</button></div>';
    renderPager(pages);
    observeThumbs();
  }

  // ---------- detail sheet ----------
  function checksFor(p) {
    // The demo shows safety checks from the safety status. In the database they are rows in safety_checks.
    const r = { cleared: ['pass', 'pass', 'pass', 'pass'], review: ['pass', 'pass', 'pending', 'pending'], rejected: ['fail', 'pass', 'fail', 'pending'] }[p.safety];
    const names = ['Contamination', 'Corrosion & wear', 'Load', 'Fire'];
    const cls = { pass: 'ok', pending: 'pend', fail: 'rej' };
    return names.map((n, i) => '<div><dt>' + n + '</dt><dd><span class="pill ' + cls[r[i]] + '">' + r[i] + '</span></dd></div>').join('');
  }

  function openSheet(id) {
    const p = BY_ID.get(id);
    if (!p) return;
    sheetPart = p;
    sheetTurn = variant(p);
    const t = TYPES[p.type], c = contributor(p), s = SAFETY[p.safety], st = STATUS[p.status];
    const fits = G.items.filter(it => it.slots.some(sl => sl.type === p.type)).map(it => it.title);
    els.sheet.innerHTML =
      '<button class="close" type="button" data-close>Close</button>' +
      '<p class="kicker">' + p.id + ' · ' + st.label + '</p>' +
      '<h2 id="sheet-title">' + esc(t.name) + '</h2>' +
      '<p class="sid">' + esc(t.material) + ' · ' + esc(p.zone) + '</p>' +
      '<div class="shot"><img alt="' + esc(t.name) + ' 3D view" id="sheet-img"></div>' +
      '<div class="row-btn"><button class="pg" type="button" data-turn>Turn</button><span class="note">six angles</span></div>' +
      '<h3>Record</h3>' +
      '<dl class="rec">' +
        '<div><dt>Size (L×W×H)</dt><dd>' + dims(p.dims) + '</dd></div>' +
        '<div><dt>Mass</dt><dd>' + p.kg + ' kg</dd></div>' +
        '<div><dt>CO₂e avoided</dt><dd>' + p.co2 + ' kg</dd></div>' +
        '<div><dt>Condition</dt><dd>' + p.condition + '</dd></div>' +
        '<div><dt>Safety</dt><dd><span class="pill ' + s.cls + '">' + s.label + '</span></dd></div>' +
        '<div><dt>Stock</dt><dd><span class="pill ' + st.cls + '">' + st.label + '</span></dd></div>' +
        '<div><dt>Contributor</dt><dd>' + esc(c.name) + ' · ' + esc(c.kind) + '</dd></div>' +
        '<div><dt>Zone</dt><dd>' + esc(p.zone) + '</dd></div>' +
        '<div><dt>Added</dt><dd>' + p.added + '</dd></div>' +
      '</dl>' +
      '<h3>Colour</h3>' +
      '<p class="swatch"><i style="background:' + p.colour.hex + '"></i>' + esc(p.colour.name) + ' · ' + p.colour.hex + '</p>' +
      '<h3>Tags</h3>' +
      '<div class="chips">' + p.tags.map(tag => '<span class="pill">' + esc(tag) + '</span>').join('') + '</div>' +
      '<h3>Safety checks</h3>' +
      '<dl class="rec">' + checksFor(p) + '</dl>' +
      '<h3>Fits builds</h3>' +
      '<p class="note" style="margin-top:0">' + (fits.length ? fits.map(esc).join(' · ') : 'No current build uses this type.') + '</p>' +
      '<p class="note">Mass is the planning mass for this type, varied per piece. CO₂e uses the virgin-material factor for the material.</p>';
    els.sheet.hidden = false;
    turnSheet();
    els.sheet.querySelector('[data-close]').focus();
  }

  function turnSheet() {
    if (!sheetPart) return;
    const img = $('sheet-img');
    try {
      img.src = G.render.thumb(sheetPart.type, sheetTurn);
    } catch (err) {
      img.closest('.shot').textContent = TYPES[sheetPart.type].name;
    }
  }

  function closeSheet() {
    if (els.sheet.hidden) return;
    const id = sheetPart && sheetPart.id;
    els.sheet.hidden = true;
    sheetPart = null;
    const card = id && els.grid.querySelector('[data-id="' + id + '"]');
    if (card) card.focus();
  }

  // ---------- wiring ----------
  // one pass, so "All types" is the default selection
  els.type.innerHTML = '<option value="">All types</option>' + TYPE_KEYS.map(k => {
    const plural = TYPES[k].plural;
    return '<option value="' + k + '">' + esc(plural.charAt(0).toUpperCase() + plural.slice(1)) + '</option>';
  }).join('');

  function resetFilters() {
    Object.assign(state, { q: '', type: '', status: '', safety: '', sort: 'added', page: 1 });
    els.q.value = ''; els.type.value = ''; els.status.value = ''; els.safety.value = ''; els.sort.value = 'added';
    render();
  }

  els.q.addEventListener('input', () => { state.q = els.q.value.trim().toLowerCase(); state.page = 1; render(); });
  els.type.addEventListener('change', () => { state.type = els.type.value; state.page = 1; render(); });
  els.status.addEventListener('change', () => { state.status = els.status.value; state.page = 1; render(); });
  els.safety.addEventListener('change', () => { state.safety = els.safety.value; state.page = 1; render(); });
  els.sort.addEventListener('change', () => { state.sort = els.sort.value; state.page = 1; render(); });

  els.pager.addEventListener('click', e => {
    const b = e.target.closest('[data-page]');
    if (!b || b.disabled) return;
    state.page = Number(b.dataset.page);
    render();
    window.scrollTo({ top: els.count.getBoundingClientRect().top + scrollY - 72, behavior: 'smooth' });
  });

  els.grid.addEventListener('click', e => {
    if (e.target.closest('[data-reset]')) return resetFilters();
    const c = e.target.closest('.gcard');
    if (c) openSheet(c.dataset.id);
  });
  els.grid.addEventListener('keydown', e => {
    const c = e.target.closest('.gcard');
    if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openSheet(c.dataset.id); }
  });

  els.sheet.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) closeSheet();
    if (e.target.closest('[data-turn]')) { sheetTurn = (sheetTurn + 1) % 6; turnSheet(); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

  renderKpis();
  render();
})(globalThis.GENE = globalThis.GENE || {});
