# Architecture

GEN-E is a static site with a pure domain core. There is no server. The domain code runs in the browser and in Node, so the tests exercise the same code the pages run.

## Layers

```
lib/        pure JS, no DOM, no three.js     -> tested in Node
render/     three.js models and the generator -> browser only
pages/      the database page                 -> browser only
data/       parts.json, generated            -> loaded by the build
db/         Postgres schema and seed         -> the production shape of data/
build/      inlines everything into dist/
```

Every module attaches to one namespace, `globalThis.GENE`. Each file is a plain script (an IIFE), so the same file works in a `<script>` tag and in `import` for Node.

Load order, as the build writes it:

1. `three.min.js` (generate and database pages only)
2. `lib/geom.js`: vector helpers on plain arrays
3. `lib/parts-meta.js`: the part catalogue (name, material, planning mass, carbon factor)
4. `lib/inventory.js`: the stock pool
5. `lib/recipes.js`: the eight items, each as a list of slots
6. `lib/facts.js`: summaries and the assumptions text
7. `lib/intent.js`: prompt matching
8. `render/parts3d.js`, `render/thumbs.js`, `render/generator.js` or `pages/database.js`

## The generator

### Recipes are slots

Each item is a list of slots. A slot is a part type, its role, a centre point `p`, and two in-plane axes `ax` and `ay`:

```js
S('tyre', 'climbing hoops', [x, y, z], axisAlongPart, secondAxis)
```

The normal of the part is `ax × ay`. The generator turns the axes into a basis quaternion, so a tyre lies on the dome's surface and a bench sits flat. Recipes are built once at load (`G.items[i].slots`), and their geometry is checked by the tests:

- every axis set is orthonormal
- no two slots overlap
- posts are vertical and rails are level
- nothing sits below the ground plane
- steps rise and the arches clear the deck
- dome tyres sit on the sphere with outward normals

### Stock is typed

The yard holds 72 real parts (`inventory.js`): 16 tyres, 20 bricks, 12 blocks, 10 pipes, 6 I-beams and 8 car doors. Forming an item calls `allocate(slots, stock)`. Each slot takes a free part of its own type, picked at random, so repeat builds draw on different stock. An item that the stock cannot supply throws, and the tests make sure that never happens.

This replaced an earlier design, which gave parts to targets by index and produced random-looking shapes.

### Motion

Each part is a damped spring: `f = 1 - exp(-k·dt)`, then `position.lerp(target, f)` and `quaternion.slerp(target, f)`. The time step is capped at 0.05 s, so a slow frame does not make the motion jump. Parts not used by the formed structure shrink to 30% and drift, so the structure reads clearly. The camera moves in while a structure is formed, and back out while the scan runs.

### Facts

`facts.js` computes everything from the slots actually used, so the numbers always match the parts on screen:

- parts: the slot count
- CO₂e avoided: the sum of `kg × co2PerKg` per part (kg of virgin material avoided)
- cost: `(4 + 1.5·parts) h × 95 QAR + 60 QAR × parts + 1,500 QAR` transport
- time: `1 + ceil(parts / 10)` weeks

### Prompt matching

`intent.js` maps typed text to an item with one regular expression per item. If nothing matches, the result is a miss, and the generator says what it can build. It never builds an unrelated item, which was the failure in the first version.

## The database page

`pages/database.js` reads the JSON embedded in the page. Its features:

- **Totals** over the full dataset: catalogued, available and cleared, stock mass, CO₂e avoidable, contributors, share cleared.
- **Filters**: type, status, safety, free-text search over id, type, material, colour, zone, contributor and tags. Each part carries a pre-built search string.
- **Sort**: newest, heaviest, most CO₂e avoided, by type.
- **Paging**: 24 per page with a windowed pager, so the DOM stays small at any size.
- **Thumbnails**: rendered from the same three.js models, one shared offscreen renderer, cached (up to 240 images). An `IntersectionObserver` renders a thumbnail only when its card nears the viewport.
- **Detail sheet**: the full record, colour, tags, the four safety checks, the builds the type fits (taken from the recipes), and a turn control that cycles six angles.

Angles are chosen so a flat part is never seen edge-on.

## Data model

`db/schema.sql` (PostgreSQL 14+):

| Table | Holds |
| --- | --- |
| `part_types` | the catalogue: planning mass and carbon factor per type |
| `contributors` | the companies and businesses that contribute parts |
| `parts` | one row per part; `safety` and `status` are constrained, and only cleared parts can leave `held` |
| `part_dimensions` | outer size in millimetres |
| `part_colours` | colour and share, so a part can be two-tone |
| `part_tags` | tags, indexed for lookup |
| `part_assets` | photo, mesh and thumbnail URIs in object storage |
| `safety_checks` | one row per check (contamination, corrosion, load, fire) with result and reviewer |

Views: `available_stock` (what a generator may draw on, per type) and `part_impact` (carbon per part).

The schema has been loaded into PostgreSQL 16 with the seed data. The seed has 1,200 parts, 60 contributors and 2,933 tags. The constraint checks were tested with a violating insert.

## Moving from the demo to real data

| Demo | Production |
| --- | --- |
| `parts.json` embedded in the page | a read API over `parts` with keyset paging on `(added_on, id)` |
| page-side filtering | `WHERE` clauses on `type`, `status`, `safety`, and a `tags` join |
| WebGL thumbnails | a thumbnail or mesh in `part_assets`, rendered once at intake |
| the generator's own 72-part stock | a call to `available_stock` and a reservation (`status = 'reserved'`) for each slot |
| synthetic safety checks | rows in `safety_checks`, written by the review agent and staff |
| placeholder contributors | onboarding and contracts for real contributors |

## Build

`build/build.mjs` writes:

- `dist/index.html`, `dist/generate.html`, `dist/database.html`: complete pages, each with CSS, sprite, data and scripts inlined
- `dist/artifact/index.html`: the home page as a fragment, without its own doctype, html, head or body tags, for hosts that wrap the entry page themselves

Inlined code has `</script` escaped, and every replacement is a function, so a `$` in inlined code is never read as a pattern. The build fails if a placeholder is left unfilled.

## Known limits

- Three.js r160 logs a deprecation notice from its UMD build. It is harmless. Moving to the ES module build would remove it.
- Thumbnails need WebGL. Without it, a card shows the type name.
- The layout is checked at 1440 × 900 and 390 × 844 for overlap and horizontal scroll.
