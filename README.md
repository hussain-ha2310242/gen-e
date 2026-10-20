# GEN-E

**WALL-E for the city.** GEN-E turns car and construction waste in Qatar into urban public items: outdoor gyms, play domes, shade canopies, steps, bus shelters, skate bowls, mural walls and footbridges.

This repository is a working prototype. It has three pages (a pitch home page, a generator that forms each item from a stock of salvaged parts, and a materials database), a domain core with tests, a seeded demo dataset, and the Postgres schema the data would live in.

## Quick start

Requires Node.js 18 or later. No install step: there are no runtime dependencies.

```sh
npm test          # domain and data tests (16)
npm run build     # writes dist/ (self-contained pages)
open dist/index.html
```

`dist/` holds three pages that open straight from disk: `index.html` (home), `generate.html` and `database.html`. Each one inlines its CSS, icons, data and scripts, so it needs no server. Fonts load from Google Fonts when online and fall back to system fonts otherwise.

## Pages

| Page | What it shows |
| --- | --- |
| Home (`index.html`) | Problem statistics from Qatar sources, and the system diagram: contributors, AI agents, the core, and what gets built. |
| Generate (`generate.html`) | A stock of 72 salvaged parts. Pick a structure (type it, or use a shortcut) and the matching parts travel to their places in the structure. The panel shows parts reused, CO₂e avoided, estimated cost in QAR, time, bill of materials, maker and delivery. |
| Database (`database.html`) | A paged gallery of 1,200 parts with totals, search, filters and sort. Each card has a 3D thumbnail. Opening a card shows the full record, safety checks and the builds the part fits. |

## Repository layout

```
src/
  html/        page templates with placeholders (the build fills them)
  css/         base, home, generate, database
  svg/         icon sprite and the home diagram
  js/lib/      pure domain code: geometry, catalogue, stock, recipes, facts, intent
  js/render/   three.js models, thumbnails, the generator
  js/pages/    the database page
data/          parts.json, the demo dataset (generated)
db/            schema.sql (Postgres) and seed.sql (generated)
scripts/       generate-parts.mjs (dataset), seed-sql.mjs (SQL)
build/         build.mjs (inlines everything into dist/)
test/          node:test suites
vendor/three/  three.js r160 (MIT, see LICENSE)
docs/          ARCHITECTURE.md, DEMO.md
```

## The data

`data/parts.json` is **synthetic**. `scripts/generate-parts.mjs` writes it from the same part catalogue the generator uses (`src/js/lib/parts-meta.js`), so mass and carbon agree everywhere. The run is seeded, so the same command always writes the same file.

```sh
npm run data                       # 1,200 parts, 60 contributors
node scripts/generate-parts.mjs 5000   # any size, for load tests
node scripts/seed-sql.mjs          # writes db/seed.sql
psql "$DATABASE_URL" -f db/schema.sql -f db/seed.sql
```

Contributor names are placeholders. Mass and carbon are planning values, and the carbon factors are virgin-material factors (steel 1.9, concrete 0.12, rubber 2.8 kg CO₂e per kg). See the assumptions line on the generate page.

## Checks

- `npm test` runs the domain tests: stock totals, every recipe fits the stock, each part has its own slot, geometry (orthonormal axes, no overlaps, nothing below ground, posts vertical, rails level), facts, intent matching, and the data integrity of `parts.json`.
- `db/schema.sql` was loaded into PostgreSQL 16 with `db/seed.sql`. Row counts match the dataset, and the constraints reject a cleared-only violation and a malformed colour.

## Status and limits

- Prototype estimates. The impact figures are not verified, and the cost model is a planning model.
- The 3D parts are stylised models at real proportions, not scans.
- The safety checks on the database page are shown from each part's safety status. In the database they are rows in `safety_checks`.
- Structures need structural sign-off before they are built (the footbridge recipe says so).

See `docs/ARCHITECTURE.md` for how the parts are chosen and placed, and `docs/DEMO.md` for a demo script.
