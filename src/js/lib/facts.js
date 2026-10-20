// Facts for an item, computed from the parts it really uses. Estimates, labelled as such in the UI.
(function (G) {
  const CAT = G.parts;
  const RATE = 95;          // QAR per labour hour
  const PER_PART = 60;      // QAR per part for cleaning and fitting
  const TRANSPORT = 1500;   // QAR flat for delivery

  function summarize(slots) {
    const counts = {};
    for (const s of slots) counts[s.type] = (counts[s.type] || 0) + 1;
    const parts = slots.length;
    const bom = Object.keys(counts)
      .map(type => ({ type, count: counts[type], name: CAT[type].name, plural: CAT[type].plural, material: CAT[type].material }))
      .sort((a, b) => b.count - a.count);
    const kg = slots.reduce((sum, s) => sum + CAT[s.type].kg, 0);
    const co2Kg = slots.reduce((sum, s) => sum + CAT[s.type].kg * CAT[s.type].co2PerKg, 0);
    const hours = 4 + 1.5 * parts;
    return {
      parts,
      bom,
      kg: Math.round(kg),
      co2Kg: Math.round(co2Kg),
      costQAR: Math.round(hours * RATE + parts * PER_PART + TRANSPORT),
      weeks: 1 + Math.ceil(parts / 10)
    };
  }

  // "8 steel pipes · 4 steel I-beams · 3 concrete blocks"
  function bomText(f) {
    return f.bom.map(b => b.count + ' ' + (b.count === 1 ? b.name.toLowerCase() : b.plural)).join(' · ');
  }

  const assumptions = 'Estimates. Carbon: kg CO₂e of virgin material avoided per kg reused (steel 1.9, concrete 0.12, rubber 2.8). ' +
    'Cost: labour at ' + RATE + ' QAR/h, ' + PER_PART + ' QAR per part, ' + TRANSPORT + ' QAR transport. ' +
    'Time: one week plus one per ten parts.';

  G.facts = { summarize, bomText, assumptions, RATE, PER_PART, TRANSPORT };
})(globalThis.GENE = globalThis.GENE || {});
