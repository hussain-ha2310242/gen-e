// three.js models for every part type, at the sizes in lib/recipes.js. Each linear part runs
// along local X; sheets run in X and Y with their thickness along Z; rings lie in X and Y.
// Requires three.js (THREE) loaded first. Attaches to globalThis.GENE.render.parts.
(function (G) {
  const seg = 40;
  const matRed = new THREE.MeshPhysicalMaterial({ color: 0xC8102E, roughness: 0.38, metalness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  const matDark = new THREE.MeshStandardMaterial({ color: 0x5c0816, roughness: 0.55, metalness: 0.35 });
  const matHi = new THREE.MeshPhysicalMaterial({ color: 0xE23B4A, roughness: 0.42, metalness: 0.15, clearcoat: 0.3 });
  const matSteel = new THREE.MeshStandardMaterial({ color: 0x8a2030, roughness: 0.3, metalness: 0.6 });

  const M = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    return m;
  };
  const grp = (...kids) => { const g = new THREE.Group(); kids.forEach(k => g.add(k)); return g; };

  // A car door: a flat panel with a window cut out of it.
  function doorGeo() {
    const s = new THREE.Shape();
    s.moveTo(-0.75, -0.5); s.lineTo(0.75, -0.5); s.lineTo(0.75, 0.5); s.lineTo(-0.75, 0.5); s.closePath();
    const hole = new THREE.Path();
    hole.moveTo(-0.5, 0.0); hole.lineTo(0.5, 0.0); hole.lineTo(0.5, 0.38); hole.lineTo(-0.5, 0.38); hole.closePath();
    s.holes.push(hole);
    return new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.02, bevelSegments: 3, curveSegments: 12 });
  }

  // A structural I-beam: two flanges and a web, length along X.
  function ibeam() {
    const L = 2.4, H = 0.5, W = 0.42, t = 0.07, w = 0.04;
    return grp(
      M(new THREE.BoxGeometry(L, t, W), matRed, 0, H / 2 - t / 2, 0),
      M(new THREE.BoxGeometry(L, t, W), matRed, 0, -H / 2 + t / 2, 0),
      M(new THREE.BoxGeometry(L, H - 2 * t, w), matRed, 0, 0, 0));
  }

  // A steel tube, 2.2 long, with a collar at each end.
  function pipe() {
    const cap = () => M(new THREE.CylinderGeometry(0.19, 0.19, 0.05, 28), matDark, 0, 0, 0, 0, 0, Math.PI / 2);
    const c1 = cap(), c2 = cap();
    c1.position.x = -1.1; c2.position.x = 1.1;
    return grp(M(new THREE.CylinderGeometry(0.14, 0.14, 2.2, 28), matSteel, 0, 0, 0, 0, 0, Math.PI / 2), c1, c2);
  }

  // A hollow concrete block, 1.2 x 0.6 x 0.6, with two cores along its length.
  function block() {
    const g = grp(M(new THREE.BoxGeometry(1.2, 0.6, 0.6), matHi));
    for (const z of [-0.16, 0.16]) g.add(M(new THREE.CylinderGeometry(0.1, 0.1, 1.22, 18), matDark, 0, 0, z, 0, 0, Math.PI / 2));
    return g;
  }

  function brick() {
    const g = grp(M(new THREE.BoxGeometry(0.9, 0.4, 0.45), matHi));
    g.add(M(new THREE.BoxGeometry(0.5, 0.06, 0.3), matDark, 0, 0.2, 0));
    return g;
  }

  function tyre() {
    return grp(M(new THREE.TorusGeometry(0.5, 0.2, 28, seg), matDark),
               M(new THREE.TorusGeometry(0.33, 0.035, 14, seg), matSteel));
  }

  // The rest of the catalogue, used by the database thumbnails.
  const PARTS = {
    ibeam, pipe, block, brick, tyre,
    door: () => grp(M(doorGeo(), matRed, 0, 0, -0.04),
                    M(new THREE.BoxGeometry(1.5, 0.1, 0.14), matDark, 0, 0.56, 0.02),
                    M(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 16), matSteel, 0.6, -0.2, 0.08, Math.PI / 2, 0, 0)),
    rim: () => {
      const g = grp(M(new THREE.CylinderGeometry(0.5, 0.5, 0.14, seg), matSteel, 0, 0, 0, Math.PI / 2, 0, 0),
                    M(new THREE.CylinderGeometry(0.17, 0.17, 0.2, 32), matDark, 0, 0, 0, Math.PI / 2, 0, 0));
      for (let k = 0; k < 5; k++) g.add(M(new THREE.BoxGeometry(0.7, 0.09, 0.12), matRed,
        Math.cos(k * 1.2566) * 0.3, Math.sin(k * 1.2566) * 0.3, 0.06, 0, 0, k * 1.2566));
      return g;
    },
    bumper: () => grp(M(new THREE.TorusGeometry(1.1, 0.16, 20, 96, Math.PI * 0.9), matRed, 0, 0, 0, 0, 0, -Math.PI * 0.05),
                      M(new THREE.TorusGeometry(1.1, 0.04, 10, 96, Math.PI * 0.9), matDark, 0, 0, 0.14, 0, 0, -Math.PI * 0.05)),
    engine: () => {
      const g = grp(M(new THREE.BoxGeometry(1.2, 0.7, 0.8), matDark));
      [-0.4, -0.13, 0.13, 0.4].forEach(x => {
        g.add(M(new THREE.CylinderGeometry(0.13, 0.13, 0.4, 32), matSteel, x, 0.55, 0));
        g.add(M(new THREE.TorusGeometry(0.13, 0.02, 10, 32), matRed, x, 0.75, 0, Math.PI / 2, 0, 0));
      });
      g.add(M(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 24), matSteel, 0.72, -0.05, 0, 0, 0, Math.PI / 2));
      return g;
    },
    fender: () => grp(M(new THREE.TorusGeometry(0.9, 0.12, 20, 96, Math.PI * 0.7), matRed),
                      M(new THREE.TorusGeometry(0.9, 0.03, 10, 96, Math.PI * 0.7), matDark, 0, 0, 0.12)),
    rebar: () => {
      const g = grp(M(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 20), matSteel, 0, 0, 0, 0, 0, Math.PI / 2));
      for (let x = -0.8; x <= 0.81; x += 0.2) g.add(M(new THREE.TorusGeometry(0.058, 0.014, 8, 20), matDark, x, 0, 0, 0, Math.PI / 2, 0));
      return g;
    },
    hubcap: () => grp(M(new THREE.SphereGeometry(0.45, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), matSteel, 0, 0, 0, Math.PI / 2, 0, 0),
                      M(new THREE.TorusGeometry(0.45, 0.03, 12, 48), matDark, 0, 0, 0))
  };

  G.render = G.render || {};
  G.render.parts = PARTS;
})(globalThis.GENE = globalThis.GENE || {});
