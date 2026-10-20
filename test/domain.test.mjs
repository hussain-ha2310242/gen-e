// Domain tests: recipes, stock, geometry and facts. Runs in Node with no dependencies.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../src/js/lib/geom.js';
import '../src/js/lib/parts-meta.js';
import '../src/js/lib/inventory.js';
import '../src/js/lib/recipes.js';
import '../src/js/lib/facts.js';
import '../src/js/lib/intent.js';

const G = globalThis.GENE;
const byKey = k => G.items[G.itemIndex(k)];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

test('stock totals 72 parts and matches the pool', () => {
  const stock = G.inventory.stock();
  assert.equal(stock.length, 72);
  assert.equal(G.inventory.SIZE, 72);
  for (const type of Object.keys(G.inventory.POOL)) {
    assert.equal(stock.filter(s => s.type === type).length, G.inventory.POOL[type], type);
  }
});

test('every item fits in stock and each slot gets its own part', () => {
  const stock = G.inventory.stock();
  for (const it of G.items) {
    const picks = G.inventory.allocate(it.slots, stock, () => 0.5);
    assert.equal(new Set(picks).size, picks.length, it.key + ' reuses a part');
    picks.forEach((k, j) => assert.equal(stock[k].type, it.slots[j].type, it.key + ' slot ' + j));
  }
});

test('part counts are realistic and in the expected range', () => {
  const expect = { gym: 19, play: 24, shade: 22, steps: 12, shelter: 16, skate: 12, mural: 20, bridge: 18 };
  for (const [key, n] of Object.entries(expect)) assert.equal(byKey(key).slots.length, n, key);
});

test('axes are orthonormal and positions are finite', () => {
  for (const it of G.items) for (const s of it.slots) {
    assert.ok(s.p.every(Number.isFinite), it.key + ' position');
    assert.ok(near(dot(s.ax, s.ax), 1, 1e-6), it.key + ' ax unit');
    assert.ok(near(dot(s.ay, s.ay), 1, 1e-6), it.key + ' ay unit');
    assert.ok(near(dot(s.ax, s.ay), 0, 1e-6), it.key + ' axes perpendicular');
  }
});

test('no two parts in one item occupy the same spot', () => {
  for (const it of G.items) {
    for (let i = 0; i < it.slots.length; i++) for (let j = i + 1; j < it.slots.length; j++) {
      const a = it.slots[i].p, b = it.slots[j].p;
      const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      assert.ok(d > 0.25, `${it.key}: slots ${i} and ${j} are ${d.toFixed(3)} apart`);
    }
  }
});

test('realism: posts stand vertical, beams and rails run level', () => {
  const gym = byKey('gym').slots;
  for (const s of gym.filter(s => s.role === 'posts')) assert.ok(Math.abs(s.ax[1]) > 0.999, 'gym post is vertical');
  for (const s of gym.filter(s => s.role === 'top rails')) assert.ok(Math.abs(s.ax[1]) < 1e-6, 'gym rail is level');
  const shelter = byKey('shelter').slots;
  for (const s of shelter.filter(s => s.role === 'frame posts')) assert.ok(Math.abs(s.ax[1]) > 0.999, 'shelter post is vertical');
  const shade = byKey('shade').slots;
  for (const s of shade.filter(s => s.role === 'roof beams')) assert.ok(Math.abs(s.ax[1]) < 1e-6, 'roof beam is level');
});

// Half-size of each part along its own axes (ax, ay, normal). World half-height of a box is
// hx|ax.y| + hy|ay.y| + hz|n.y|, which gives the true lowest point of a rotated part.
const HALF = { pipe: [1.1, 0.14, 0.14], ibeam: [1.2, 0.25, 0.21], block: [0.6, 0.3, 0.3], brick: [0.45, 0.2, 0.225], tyre: [0.7, 0.7, 0.2], door: [0.75, 0.5, 0.04] };
function halfY(s) {
  const n = [s.ax[1] * s.ay[2] - s.ax[2] * s.ay[1], s.ax[2] * s.ay[0] - s.ax[0] * s.ay[2], s.ax[0] * s.ay[1] - s.ax[1] * s.ay[0]];
  const [hx, hy, hz] = HALF[s.type];
  return hx * Math.abs(s.ax[1]) + hy * Math.abs(s.ay[1]) + hz * Math.abs(n[1]);
}

test('realism: nothing is built below the ground line', () => {
  for (const it of G.items) for (const s of it.slots) {
    const lowest = s.p[1] - halfY(s);
    assert.ok(lowest >= -2.2 - 1e-6, `${it.key} ${s.role} sits ${lowest.toFixed(2)}`);
  }
});

test('realism: steps rise towards the back, arches clear the deck', () => {
  const steps = byKey('steps').slots;
  const ys = [0, 1, 2].map(t => steps.find((s, i) => Math.floor(i / 4) === t).p[1]);
  assert.ok(ys[0] < ys[1] && ys[1] < ys[2], 'tiers rise');
  const bridge = byKey('bridge').slots.filter(s => s.role === 'arch ribs');
  const deck = byKey('bridge').slots.find(s => s.role === 'deck panels').p[1];
  for (const s of bridge) assert.ok(s.p[1] >= deck - 1e-6, 'arch rib above deck');
});

test('the dome tyres lie on the dome surface, with their normal pointing outward', () => {
  const tyres = byKey('play').slots.filter(s => s.type === 'tyre');
  for (const s of tyres) {
    const n = [s.ax[1] * s.ay[2] - s.ax[2] * s.ay[1], s.ax[2] * s.ay[0] - s.ax[0] * s.ay[2], s.ax[0] * s.ay[1] - s.ax[1] * s.ay[0]];
    const radial = [s.p[0], s.p[1] + 2.2, s.p[2]];
    const r = Math.hypot(...radial);
    assert.ok(near(r, 3.0, 1e-6), 'tyre sits on the 3.0 sphere');
    assert.ok(dot(n, radial) / r > 0.999, 'normal points outward');
  }
});

test('facts agree with the parts used', () => {
  for (const it of G.items) {
    const f = G.facts.summarize(it.slots);
    assert.equal(f.parts, it.slots.length, it.key);
    assert.equal(f.bom.reduce((a, b) => a + b.count, 0), f.parts, it.key + ' BOM sums to parts');
    assert.ok(f.co2Kg > 0 && f.costQAR > 0 && f.weeks >= 1, it.key + ' facts are positive');
    assert.ok(G.facts.bomText(f).length > 0, it.key + ' has a bill of materials');
  }
});

test('intent maps prompts to items and reports misses instead of guessing', () => {
  const at = t => G.intent.resolve(t).index;
  assert.equal(G.items[at('build an outdoor gym station')].key, 'gym');
  assert.equal(G.items[at('make a play dome for kids')].key, 'play');
  assert.equal(G.items[at('a bus shelter for the stop')].key, 'shelter');
  assert.equal(G.items[at('a skate bowl for the square')].key, 'skate');
  assert.equal(G.items[at('a footbridge over the road')].key, 'bridge');
  const miss = G.intent.resolve('turn the moon into cheese');
  assert.equal(miss.index, -1);
  assert.equal(miss.suggestions.length, G.items.length, 'a miss lists what can be built');
  assert.equal(G.intent.resolve('   ').empty, true);
});
