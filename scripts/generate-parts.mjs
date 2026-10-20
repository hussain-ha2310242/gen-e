// Writes data/parts.json: a synthetic materials database for the demo. Records are generated
// from the same part catalogue the generator uses (src/js/lib/parts-meta.js), so mass and
// carbon agree everywhere. The run is seeded, so the same command always writes the same file.
//
//   node scripts/generate-parts.mjs            # 1,200 parts
//   node scripts/generate-parts.mjs 5000       # any size, for load tests
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const COUNT = Number(process.argv[2] || 1200);
const SEED = 20260601;
const GENERATED = '2026-10-21';

// Load the shared catalogue. parts-meta.js is a browser script that attaches to globalThis.GENE.
globalThis.GENE = {};
await import(pathToFileURL(join(ROOT, 'src/js/lib/parts-meta.js')).href);
const CAT = globalThis.GENE.parts;

// ---------- seeded random ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(SEED);
const pick = list => list[Math.floor(rnd() * list.length)];
const weighted = pairs => {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [v, w] of pairs) { if ((r -= w) < 0) return v; }
  return pairs[pairs.length - 1][0];
};
const between = (a, b) => a + rnd() * (b - a);
const pad = (n, w = 2) => String(n).padStart(w, '0');

// ---------- what each part looks like in the yard ----------
// dims are [length, width, height] in mm, the outer envelope of one salvaged piece
const SHAPE = {
  ibeam:  { dims: [2400, 200, 100],  colours: [['#6b6e73', 'steel grey', 3], ['#8a4b3c', 'painted brown', 1]] },
  pipe:   { dims: [2200, 114, 114],  colours: [['#7d8a91', 'galvanised', 3], ['#5b5e63', 'painted dark', 1]] },
  block:  { dims: [400, 200, 200],   colours: [['#9a9a96', 'grey', 3], ['#b8b5ad', 'light grey', 1]] },
  brick:  { dims: [215, 102, 65],    colours: [['#a4442b', 'red', 3], ['#c0653a', 'orange', 2], ['#d8b98f', 'buff', 1]] },
  tyre:   { dims: [650, 650, 205],   colours: [['#1c1c20', 'black', 4], ['#2a2a2e', 'charcoal', 1]] },
  door:   { dims: [1000, 1100, 40],  colours: [['#c8102e', 'red', 2], ['#e8e6e1', 'white', 2], ['#2b4a6b', 'blue', 1], ['#6f7378', 'grey', 2]] },
  rebar:  { dims: [1200, 300, 300],  colours: [['#7a4a2a', 'rust', 3], ['#5d5f63', 'dark steel', 1]] },
  bumper: { dims: [800, 250, 120],   colours: [['#1d1d20', 'black', 2], ['#8e9196', 'silver grey', 2], ['#e6e4df', 'white', 1]] },
  engine: { dims: [600, 500, 450],   colours: [['#3b3d42', 'cast iron', 3], ['#5c5f66', 'grey', 1]] },
  hubcap: { dims: [330, 330, 60],    colours: [['#b9bec4', 'silver', 3], ['#d4a64a', 'gold', 1]] },
  rim:    { dims: [580, 580, 200],   colours: [['#c4c8cc', 'silver', 2], ['#8f969c', 'grey', 2]] },
  fender: { dims: [900, 600, 80],    colours: [['#c8102e', 'red', 2], ['#2f3237', 'charcoal', 2], ['#e8e6e1', 'white', 1]] }
};
// how common each type is in Qatari car and construction waste (weights, not exact shares)
const MIX = [['tyre', 22], ['brick', 14], ['block', 12], ['pipe', 10], ['door', 8], ['bumper', 7],
  ['rebar', 6], ['rim', 5], ['fender', 5], ['ibeam', 5], ['hubcap', 4], ['engine', 2]];

const TAGS = ['UV-tested', 'outdoor-grade', 'indoor-safe', 'cut-to-length', 'stripped', 'painted',
  'galvanised', 'load-tested', 'weatherproof', 'no-paint', 'de-greased', 'tagged at intake'];
const ZONES = ['Industrial Area', 'Al Wakra', 'Umm Salal', 'Al Khor', 'Lusail', 'Mesaieed', 'Doha South', 'Al Rayyan'];
const KINDS = [['scrap yard', 30], ['demolition contractor', 25], ['car dealer', 15], ['fleet operator', 10],
  ['tyre workshop', 10], ['construction site', 10]];

// ---------- contributors: placeholder names, one kind and home zone each ----------
const contributorCount = Math.max(12, Math.round(COUNT / 20));
const contributors = Array.from({ length: contributorCount }, (_, i) => {
  const kind = weighted(KINDS);
  const title = kind.charAt(0).toUpperCase() + kind.slice(1);
  return { id: 'C' + pad(i + 1), name: title + ' ' + pad(i + 1), kind, zone: pick(ZONES) };
});

// ---------- parts ----------
const START = Date.UTC(2025, 2, 1), END = Date.UTC(2026, 9, 15);
const day = ms => new Date(ms).toISOString().slice(0, 10);

function makePart(n) {
  const type = weighted(MIX);
  const shape = SHAPE[type], meta = CAT[type];
  const c = pick(contributors);
  const zone = rnd() < 0.8 ? c.zone : pick(ZONES);

  // safety first: only cleared parts can leave the yard
  const safety = weighted([['cleared', 84], ['review', 12], ['rejected', 4]]);
  let status = 'held';
  if (safety === 'cleared') status = weighted([['available', 70], ['reserved', 12], ['used', 18]]);

  const kg = Math.round(meta.kg * between(0.85, 1.15) * 10) / 10;
  const [hex, colourName] = weighted(shape.colours.map(([h, nm, w]) => [[h, nm], w]));
  const tags = [];
  while (tags.length < 2 + Math.floor(rnd() * 2)) {
    const t = pick(TAGS);
    if (!tags.includes(t)) tags.push(t);
  }
  const dims = shape.dims.map(d => Math.round(d * between(0.97, 1.03)));

  return {
    id: 'PRT-' + pad(n, 5),
    type,
    contributor: c.id,
    zone,
    condition: weighted([['good', 45], ['fair', 40], ['worn', 15]]),
    safety,
    status,
    kg,
    co2: Math.round(kg * meta.co2PerKg * 10) / 10,
    dims,
    colour: { hex, name: colourName },
    tags,
    added: day(between(START, END))
  };
}

const parts = Array.from({ length: COUNT }, (_, i) => makePart(i + 1));

// ---------- write ----------
const data = {
  meta: {
    name: 'GEN-E demo materials database',
    synthetic: true,
    generated: GENERATED,
    seed: SEED,
    count: parts.length,
    units: { dims: 'mm [length, width, height]', kg: 'kg, planning mass', co2: 'kg CO2e avoided' },
    note: 'Synthetic records for the prototype. Contributor names are placeholders.'
  },
  contributors,
  parts
};

const out = join(ROOT, 'data/parts.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(data) + '\n');

const by = k => parts.reduce((m, p) => ((m[p[k]] = (m[p[k]] || 0) + 1), m), {});
console.log(`wrote ${parts.length} parts, ${contributors.length} contributors -> data/parts.json`);
console.log('by safety', by('safety'), 'by status', by('status'));
