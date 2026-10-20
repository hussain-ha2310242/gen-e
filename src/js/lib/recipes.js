// Urban items and how each one is built from real parts. A recipe is a list of slots: a part
// type, the role it plays, its centre p, and its two in-plane axes (ax runs along the part,
// ay is its second axis; their cross product is the part's normal).
// Units: a pipe is 2.2 long, a block 1.2, a tyre 1.4 across. The ground is y = GROUND.
// Pure data, no three.js, so the tests can check every recipe.
(function (G) {
  const { add, mul, norm, cross, orth, perp, UP, X, Z } = G.geom;
  const GROUND = -2.2;

  function S(type, role, p, ax, ay) {
    const x = norm(ax);
    return { type, role, p, ax: x, ay: ay ? orth(x, ay) : perp(x) };
  }

  // Posts: two 2.2 pipes stacked on each corner, so the frame stands 4.4 tall.
  function gym() {
    const out = [], b = GROUND;
    for (const x of [-2.2, 2.2]) for (const z of [-1.1, 1.1]) for (const k of [0, 1])
      out.push(S('pipe', 'posts', [x, b + 1.1 + 2.2 * k, z], UP));
    for (const z of [-1.1, 1.1]) for (const x of [-1.2, 1.2])
      out.push(S('ibeam', 'top rails', [x, b + 4.65, z], X, UP));
    for (const x of [-1.4, 1.4]) out.push(S('pipe', 'pull-up bars', [x, b + 3.3, 0], Z));
    for (const x of [-1.2, 0, 1.2]) out.push(S('block', 'bench', [x, b + 0.3, 0], X, UP));
    for (const x of [-3.9, 3.9]) out.push(S('tyre', 'tyre grips', [x, b + 0.2, 0], X, Z));
    return out;
  }

  // A climbing dome: three hoops of tyres on a sphere, staggered so they interlock, on a ring of plinths.
  function playDome() {
    const out = [], R = 3.0;
    const rings = [[0.35, 8], [0.85, 5], [1.25, 3]];   // elevation above ground (rad), tyres per hoop
    for (const [el, n] of rings) for (let i = 0; i < n; i++) {
      const th = (i + (el > 1 ? 0 : 0.5)) / n * 2 * Math.PI;
      const nrm = [Math.cos(el) * Math.cos(th), Math.sin(el), Math.cos(el) * Math.sin(th)];
      const ax = norm(cross(UP, nrm));              // tangent to the dome
      const ay = cross(nrm, ax);                    // ax x ay = nrm, so the tyre lies on the surface
      out.push(S('tyre', 'climbing hoops', add([0, GROUND, 0], mul(nrm, R)), ax, ay));
    }
    for (let i = 0; i < 8; i++) {
      const th = i / 8 * 2 * Math.PI;
      const r = [Math.cos(th), 0, Math.sin(th)];
      out.push(S('block', 'anchor plinths', add([0, GROUND + 0.3, 0], mul(r, 3.1)), [-r[2], 0, r[0]], UP));
    }
    return out;
  }

  // Four posts, six roof beams and eight car-door panels laid flat as the roof.
  function shade() {
    const out = [], b = GROUND, top = b + 4.4;
    for (const x of [-2.9, 2.9]) for (const z of [-0.9, 0.9]) for (const k of [0, 1])
      out.push(S('pipe', 'posts', [x, b + 1.1 + 2.2 * k, z], UP));
    for (const z of [-0.9, 0.9]) for (const x of [-1.9, 0, 1.9])
      out.push(S('ibeam', 'roof beams', [x, top + 0.25, z], X, UP));
    for (const x of [-2.25, -0.75, 0.75, 2.25]) for (const z of [-0.5, 0.5])
      out.push(S('door', 'roof panels', [x, top + 0.54, z], X, Z));
    return out;
  }

  // Three tiers of four blocks, each tier one block-depth further back and one block-height higher.
  function steps() {
    const out = [], b = GROUND;
    for (let t = 0; t < 3; t++) for (const x of [-1.8, -0.6, 0.6, 1.8])
      out.push(S('block', 'seating tiers', [x, b + 0.3 + 0.6 * t, 0.3 - 0.6 * t], X, UP));
    return out;
  }

  // A steel frame, a glazed back wall made of two rows of car doors, and a flat roof.
  function shelter() {
    const out = [], b = GROUND, H = 2.2;
    for (const x of [-1.5, 1.5]) for (const z of [-0.7, 0.7])
      out.push(S('pipe', 'frame posts', [x, b + H / 2, z], UP));
    for (const x of [-0.75, 0.75]) for (const y of [b + 0.5, b + 1.5])
      out.push(S('door', 'back-wall glazing', [x, y, -0.7], X, UP));
    for (const z of [-0.7, 0.7]) for (const x of [-0.75, 0.75])
      out.push(S('ibeam', 'roof beams', [x, b + H + 0.25, z], X, UP));
    for (const x of [-0.75, 0.75]) out.push(S('door', 'roof panels', [x, b + H + 0.54, 0], X, Z));
    for (const x of [-0.6, 0.6]) out.push(S('block', 'bench', [x, b + 0.3, 0.2], X, UP));
    return out;
  }

  // Half-pipe bowl: two rows of blocks following a U curve. Each block's top face sits on the curve.
  function skate() {
    const out = [], R = 2.4, b = GROUND + 0.66, n = 6;   // tilted bottom course rests on the ground
    const step = Math.PI * R / n;
    for (const z of [-0.3, 0.3]) for (let k = 0; k < n; k++) {
      const t = (k + 0.5) * step / R;                                    // angle along the curve, 0..pi
      const c = [R * Math.cos(t), b + R * (1 - Math.sin(t)), z];        // point on the curve
      const tan = norm([-Math.sin(t), -Math.cos(t), 0]);
      const inward = norm([-R * Math.cos(t), R * Math.sin(t), 0]);      // towards the bowl centre
      out.push(S('block', 'bowl walls', add(c, mul(inward, -0.3)), tan, inward));
    }
    return out;
  }

  // Running-bond brick wall, five courses of four bricks, every other course offset by half a brick.
  function mural() {
    const out = [], b = GROUND;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++)
      out.push(S('brick', 'wall courses', [-1.35 + c * 0.9 + (r % 2 ? 0.45 : 0), b + 0.2 + r * 0.4, 0], X, UP));
    return out;
  }

  // Footbridge: two semicircular arches of steel pipe over a deck of car-door panels.
  function bridge() {
    const out = [], R = 3.6, y0 = GROUND + 0.8;
    for (const z of [-1.1, 1.1]) for (let k = 0; k < 5; k++) {
      const th = Math.PI - (k + 0.5) * (Math.PI / 5);
      out.push(S('pipe', 'arch ribs', [R * Math.cos(th), y0 + R * Math.sin(th), z], [-Math.sin(th), Math.cos(th), 0]));
    }
    for (const x of [-2.25, -0.75, 0.75, 2.25]) for (const z of [-0.5, 0.5])
      out.push(S('door', 'deck panels', [x, y0 + 0.04, z], X, Z));
    return out;
  }

  G.items = [
    { key: 'gym', title: 'Outdoor gym station', icon: 'i-dumbbell', build: gym,
      tagline: 'A steel frame with pull-up bars and a concrete bench. Tyres make grips.',
      example: 'build an outdoor gym station',
      match: /gym|fitness|workout|exercise|pull.?up/,
      maker: 'Local steel fabrication partner', delivery: 'Municipal parks and residential compounds' },
    { key: 'play', title: 'Play dome', icon: 'i-ring', build: playDome,
      tagline: 'A climbing dome of stacked tyres on a ring of concrete plinths.',
      example: 'make a play dome for kids',
      match: /play|kids|climb|dome|playground/,
      maker: 'Rubber processing workshop', delivery: 'Schools and community play areas' },
    { key: 'shade', title: 'Shade canopy', icon: 'i-sun', build: shade,
      tagline: 'Four steel posts, roof beams and a roof of salvaged car panels.',
      example: 'add a shade canopy over the court',
      match: /shade|canopy|umbrella|shelter from sun/,
      maker: 'Steel and sheet-metal workshop', delivery: 'Bus stops, parks and open courts' },
    { key: 'steps', title: 'Public steps', icon: 'i-steps', build: steps,
      tagline: 'Three tiers of concrete block for seating at a square or amphitheatre.',
      example: 'public steps for the amphitheatre',
      match: /step|stair|amphitheat|seat|bleacher/,
      maker: 'Concrete block contractor', delivery: 'Public squares and amphitheatres' },
    { key: 'shelter', title: 'Bus shelter', icon: 'i-bus', build: shelter,
      tagline: 'A steel frame with a glazed back wall made from car doors.',
      example: 'a bus shelter for the stop',
      match: /bus|shelter|kiosk/,
      maker: 'Steel frame and glazing shop', delivery: 'Public transit stops' },
    { key: 'skate', title: 'Skate bowl', icon: 'i-bowl', build: skate,
      tagline: 'A half-pipe bowl built from two rows of concrete block.',
      example: 'a skate bowl for the square',
      match: /skate|bowl|half-?pipe|ramp/,
      maker: 'Concrete recycler with finishing crew', delivery: 'Youth centres and public squares' },
    { key: 'mural', title: 'Mural wall', icon: 'i-brush', build: mural,
      tagline: 'A running-bond brick wall, ready to paint on a street facade.',
      example: 'a mural wall on the street',
      match: /mural|graffiti|wall|facade/,
      maker: 'Community art studio with a brick supplier', delivery: 'Street facades and public walls' },
    { key: 'bridge', title: 'Footbridge', icon: 'i-arch', build: bridge,
      tagline: 'Two arched steel ribs over a deck of car-door panels. Needs structural sign-off.',
      example: 'a footbridge over the road',
      match: /bridge|arch|underpass|overpass|crossing/,
      maker: 'Structural steel partner', delivery: 'Pedestrian crossings and campus links' }
  ];

  // Build every recipe once, up front. Slots never change after this.
  G.items.forEach(it => { it.slots = it.build(); });
  G.itemIndex = key => G.items.findIndex(it => it.key === key);
})(globalThis.GENE = globalThis.GENE || {});
