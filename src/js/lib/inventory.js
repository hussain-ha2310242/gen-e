// The yard: how many of each salvaged part the generator can draw on. The total (72) is the
// number of parts on stage. Counts are set so that every item's recipe fits in stock.
(function (G) {
  const POOL = { tyre: 16, brick: 20, block: 12, pipe: 10, ibeam: 6, door: 8 };

  // A typed list of stock parts: [{ id, type }], in a stable order.
  function stock() {
    const list = [];
    for (const type of Object.keys(POOL)) {
      for (let i = 0; i < POOL[type]; i++) {
        list.push({ id: type + '-' + String(i + 1).padStart(2, '0'), type });
      }
    }
    return list;
  }

  // Give every slot a real part of its own type. Free parts are picked at random, so repeat
  // builds draw on different stock. Returns the stock index for each slot, in slot order.
  function allocate(slots, list, rand = Math.random) {
    const used = new Set(), picks = [];
    for (const s of slots) {
      const free = [];
      for (let k = 0; k < list.length; k++) if (!used.has(k) && list[k].type === s.type) free.push(k);
      if (!free.length) throw new Error('Not enough ' + s.type + ' in stock');
      const k = free[Math.floor(rand() * free.length)];
      used.add(k);
      picks.push(k);
    }
    return picks;
  }

  G.inventory = {
    POOL,
    SIZE: Object.values(POOL).reduce((a, b) => a + b, 0),
    stock,
    allocate
  };
})(globalThis.GENE = globalThis.GENE || {});
