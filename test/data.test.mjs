// Data checks: the materials dataset is well formed and agrees with the part catalogue.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(join(ROOT, 'data/parts.json'), 'utf8'));

globalThis.GENE = {};
await import('../src/js/lib/parts-meta.js');
const CAT = globalThis.GENE.parts;

const STATUS = ['available', 'reserved', 'used', 'held'];
const SAFETY = ['cleared', 'review', 'rejected'];
const CONDITION = ['good', 'fair', 'worn'];

test('dataset size and ids', () => {
  assert.equal(data.parts.length, data.meta.count);
  assert.ok(data.parts.length >= 1000);
  assert.equal(new Set(data.parts.map(p => p.id)).size, data.parts.length, 'ids are unique');
});

test('every part has a known type, contributor and valid enums', () => {
  const contributors = new Set(data.contributors.map(c => c.id));
  for (const p of data.parts) {
    assert.ok(CAT[p.type], 'type ' + p.type);
    assert.ok(contributors.has(p.contributor), 'contributor ' + p.contributor);
    assert.ok(STATUS.includes(p.status), p.id + ' status');
    assert.ok(SAFETY.includes(p.safety), p.id + ' safety');
    assert.ok(CONDITION.includes(p.condition), p.id + ' condition');
  }
});

test('only cleared parts can leave the yard', () => {
  for (const p of data.parts) {
    if (p.safety !== 'cleared') assert.equal(p.status, 'held', p.id);
  }
});

test('sizes, mass and carbon are positive and agree with the catalogue', () => {
  for (const p of data.parts) {
    assert.ok(p.dims.every(d => d > 0), p.id + ' dims');
    assert.ok(p.kg > 0, p.id + ' kg');
    const expect = Math.round(p.kg * CAT[p.type].co2PerKg * 10) / 10;
    assert.ok(Math.abs(p.co2 - expect) < 0.11, p.id + ' co2 ' + p.co2 + ' vs ' + expect);
    // planning mass varies by at most 15% either way from the catalogue
    assert.ok(p.kg >= CAT[p.type].kg * 0.84 && p.kg <= CAT[p.type].kg * 1.16, p.id + ' mass');
  }
});

test('every part type appears, and the data is marked synthetic', () => {
  const seen = new Set(data.parts.map(p => p.type));
  for (const type of Object.keys(CAT)) assert.ok(seen.has(type), type + ' missing');
  assert.equal(data.meta.synthetic, true);
});
