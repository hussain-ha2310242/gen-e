// Small vector helpers on plain [x, y, z] arrays. No three.js here, so the domain code
// can run in the browser and in Node tests alike. Attaches to globalThis.GENE.
(function (G) {
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]);
  const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  // Make b perpendicular to unit vector a (Gram-Schmidt), then normalise.
  const orth = (a, b) => norm(sub(b, mul(a, dot(a, b))));
  // Some unit vector perpendicular to a.
  const perp = a => norm(Math.abs(a[1]) < 0.9 ? cross(a, [0, 1, 0]) : cross(a, [1, 0, 0]));
  const UP = [0, 1, 0], X = [1, 0, 0], Z = [0, 0, 1];
  G.geom = { add, sub, mul, dot, cross, len, norm, orth, perp, UP, X, Z };
})(globalThis.GENE = globalThis.GENE || {});
