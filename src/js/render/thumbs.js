// Thumbnails for the database. One shared offscreen renderer draws each part type from six
// angles and caches the PNG, so 1,200 rows need at most 72 renders, and only when a card is
// scrolled into view. Requires three.js and render/parts3d.js.
(function (G) {
  const CACHE_MAX = 240;
  // Six yaw angles (radians). All stay under 60 degrees, so a flat part such as a door panel
  // is never seen edge-on.
  const ANGLES = [0.2, 0.5, 0.8, -0.3, -0.6, 0.35];
  const cache = new Map();
  let renderer = null;

  function getRenderer() {
    if (renderer) return renderer;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(300, 240);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    return renderer;
  }

  // variant 0..5 picks one of six viewing angles
  function thumb(type, variant) {
    const key = type + ':' + variant;
    if (cache.has(key)) return cache.get(key);
    const r = getRenderer();
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfff3ea, 0x1a0c0e, 1.1));
    const key1 = new THREE.DirectionalLight(0xffffff, 1.7); key1.position.set(4, 6, 6); scene.add(key1);
    const rim = new THREE.DirectionalLight(0xC8102E, 1.1); rim.position.set(-5, -2, -4); scene.add(rim);

    const g = G.render.parts[type]();
    const box = new THREE.Box3().setFromObject(g);
    const size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3());
    g.position.sub(centre);
    g.scale.setScalar(2.7 / Math.max(size.x, size.y, size.z, 0.01));
    g.rotation.set(-0.45, ANGLES[variant % ANGLES.length], 0.08);
    scene.add(g);

    const cam = new THREE.PerspectiveCamera(32, 300 / 240, 0.1, 100);
    cam.position.set(0, 0, 7.5);
    r.render(scene, cam);
    const url = r.domElement.toDataURL('image/png');
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });

    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(key, url);
    return url;
  }

  G.render = G.render || {};
  G.render.thumb = thumb;
})(globalThis.GENE = globalThis.GENE || {});
