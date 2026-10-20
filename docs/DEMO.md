# Demo script (about 4 minutes)

Open `dist/index.html` on a laptop. Run `npm run build` first if `dist/` is missing. The phone layout works too.

## 1. The problem (30 s), home page

- The headline: *Most of Qatar's waste is buried, not reused.*
- Read the four numbers: 4.5 M t of construction and demolition waste, 1.3 M t of household waste sent to landfill, 11.5% of construction waste treated, and 7,144 abandoned vehicles removed in 2025. Each has its source underneath.

## 2. How it works (30 s), home page

Scroll to the diagram. Left to right:

1. **Who**: contributors (demolition, scrap), the city and regulators, designers and planners, makers and crews.
2. **AI agents**: intake (photo to 3D and information), safety (flags, clears only), generation (forms urban items), and manual creation (a person edits and the agent suggests).
3. **Core**: the agent orchestrator, the materials database, and the impact agent (CO₂e, QAR, weeks).
4. **What gets built**: parks and play, transit and shade, squares and steps, bridges and walls.

The dots show the flow. The loop along the bottom shows the build coming back to the city.

## 3. Generate (90 s)

Click **Generate**.

- The scan: 72 salvaged parts float on the yard, and the prompt types a request.
- A structure forms. The parts it uses travel to their places, the rest shrink back, and the card shows:
  - parts reused, kg CO₂e avoided, estimated QAR cost, weeks to build
  - the bill of materials, which lists the real parts used
  - who makes it and where it is delivered
- Type **a footbridge over the road** and press Enter. Then type **pizza oven**. The prompt answers *Not in the catalogue* and lists what it can build. It does not invent something.
- Use the shortcuts under the prompt to step through all eight structures. Each one shows its own parts.

## 4. Database (60 s)

Click **Database**.

- The totals: 1,200 parts, 679 available and cleared, 9,271 kg in stock, and 15,930 kg CO₂e avoidable. These are demo figures, and the note on the page says so.
- Filter to **Steel I-beams**, then sort by **Heaviest first**. Search for an ID such as `PRT-00033`.
- Open a card. Show the size, colour, contributor, safety checks, and the builds the part fits. Press **Turn** to see another angle.
- Mention the data model at the bottom of the page. It maps onto `db/schema.sql`.

## Questions to expect

- **How do you know the numbers?** They are planning estimates from the stated factors. The assumptions line on the generate page lists them, and the carbon factors are virgin-material factors.
- **Are the parts real?** The 3D models are stylised at real proportions. The database is synthetic. The next step is a pilot with a real contributor.
- **Is it safe to build?** Nothing leaves the yard without a cleared safety status, and the footbridge needs structural sign-off.
- **Does it scale?** The schema is in place and was loaded into PostgreSQL with 1,200 parts. The seed script takes any size.
