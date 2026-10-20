// Waste-part catalogue: one entry per part type. Names, material, planning mass and the
// virgin-material carbon that reuse avoids. Shared by the generator, the facts and the database.
//   kg       planning mass of one salvaged part at the size shown in the 3D model
//   co2PerKg kg CO2e avoided per kg of virgin material (steel 1.9, concrete 0.12, rubber 2.8)
(function (G) {
  G.parts = {
    ibeam:  { name: 'Steel I-beam',   plural: 'steel I-beams',   material: 'structural steel', kg: 40, co2PerKg: 1.9 },
    pipe:   { name: 'Steel pipe',     plural: 'steel pipes',     material: 'steel',            kg: 18, co2PerKg: 1.9 },
    block:  { name: 'Concrete block', plural: 'concrete blocks', material: 'C30 concrete',     kg: 25, co2PerKg: 0.12 },
    brick:  { name: 'Clay brick',     plural: 'clay bricks',     material: 'fired clay',       kg: 3,  co2PerKg: 0.2 },
    tyre:   { name: 'Tyre',           plural: 'tyres',           material: 'rubber',           kg: 9,  co2PerKg: 2.8 },
    door:   { name: 'Car door panel', plural: 'car door panels', material: 'sheet steel',      kg: 14, co2PerKg: 1.9 },
    rebar:  { name: 'Rebar',          plural: 'rebar lengths',   material: 'steel',            kg: 4,  co2PerKg: 1.9 },
    bumper: { name: 'Bumper section', plural: 'bumper sections', material: 'polymer',          kg: 4,  co2PerKg: 3.0 },
    engine: { name: 'Engine block',   plural: 'engine blocks',   material: 'cast iron',        kg: 90, co2PerKg: 1.8 },
    hubcap: { name: 'Hubcap',         plural: 'hubcaps',         material: 'steel',            kg: 3,  co2PerKg: 1.9 },
    rim:    { name: 'Wheel rim',      plural: 'wheel rims',      material: 'aluminium alloy',  kg: 8,  co2PerKg: 8.0 },
    fender: { name: 'Fender arc',     plural: 'fender arcs',     material: 'steel',            kg: 6,  co2PerKg: 1.9 }
  };
  G.partTypes = Object.keys(G.parts);
})(globalThis.GENE = globalThis.GENE || {});
