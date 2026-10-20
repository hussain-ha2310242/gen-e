// Maps what someone types to a catalogue item. Nothing matching is reported as a miss, so the
// generator says so instead of building something unrelated.
(function (G) {
  function resolve(text, items) {
    const list = items || G.items;
    const t = (text || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!t) return { index: -1, empty: true };
    const index = list.findIndex(it => it.match.test(t));
    return index >= 0 ? { index } : { index: -1, suggestions: list.map(it => it.title) };
  }

  G.intent = { resolve };
})(globalThis.GENE = globalThis.GENE || {});
