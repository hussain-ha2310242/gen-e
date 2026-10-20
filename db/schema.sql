-- GEN-E materials database. PostgreSQL 14 or later.
--
-- One row per salvaged part. Dimensions, colours, tags, assets and safety checks hang off the
-- part. Only parts that are cleared and available can be drawn on by a generator; see the
-- available_stock view. Load with:
--   psql "$DATABASE_URL" -f db/schema.sql -f db/seed.sql

begin;

-- Part catalogue: one row per type of part. Planning mass and the carbon factor live here.
create table part_types (
  type         text primary key,                      -- ibeam, pipe, block, brick, tyre, door, rebar, bumper, engine, hubcap, rim, fender
  name         text not null,
  plural       text not null,
  material     text not null,
  planning_kg  numeric(7,2) not null check (planning_kg > 0),
  co2_per_kg   numeric(4,2) not null check (co2_per_kg > 0)   -- kg CO2e avoided per kg of virgin material
);

-- Companies and businesses that contribute parts.
create table contributors (
  id          text primary key,
  name        text not null,
  kind        text not null check (kind in ('scrap yard', 'demolition contractor', 'car dealer', 'fleet operator', 'tyre workshop', 'construction site')),
  zone        text not null,
  created_at  timestamptz not null default now()
);

-- One row per salvaged part.
create table parts (
  id              text primary key,                   -- PRT-00001
  type            text not null references part_types (type),
  contributor_id  text not null references contributors (id),
  zone            text not null,
  condition       text not null check (condition in ('good', 'fair', 'worn')),
  safety          text not null default 'review' check (safety in ('cleared', 'review', 'rejected')),
  status          text not null default 'held' check (status in ('available', 'reserved', 'used', 'held')),
  kg              numeric(7,2) not null check (kg > 0),
  added_on        date not null default current_date,
  -- a part that is not cleared is held back and never reaches stock
  constraint cleared_or_held check (safety = 'cleared' or status = 'held')
);

-- Outer size of one piece, in millimetres.
create table part_dimensions (
  part_id     text primary key references parts (id) on delete cascade,
  length_mm   integer not null check (length_mm > 0),
  width_mm    integer not null check (width_mm > 0),
  height_mm   integer not null check (height_mm > 0)
);

-- Colours of a part. share lets one part carry more than one colour (paint over rust, two-tone).
create table part_colours (
  part_id     text not null references parts (id) on delete cascade,
  hex         char(7) not null check (hex ~ '^#[0-9A-Fa-f]{6}$'),
  name        text not null,
  share       numeric(4, 3) not null default 1 check (share > 0 and share <= 1),
  primary key (part_id, hex)
);

create table part_tags (
  part_id     text not null references parts (id) on delete cascade,
  tag         text not null,
  primary key (part_id, tag)
);

-- Photos, 3D meshes and thumbnails, stored as URIs in object storage.
create table part_assets (
  part_id     text not null references parts (id) on delete cascade,
  kind        text not null check (kind in ('photo', 'mesh', 'thumb')),
  uri         text not null,
  primary key (part_id, kind)
);

-- Safety checks. The review agent and staff write one row per check.
create table safety_checks (
  id          bigint generated always as identity primary key,
  part_id     text not null references parts (id) on delete cascade,
  check_name  text not null check (check_name in ('contamination', 'corrosion', 'load', 'fire')),
  result      text not null check (result in ('pass', 'pending', 'fail')),
  checked_by  text,                                   -- reviewer name or agent id
  checked_at  timestamptz not null default now()
);

create index parts_type_idx         on parts (type);
create index parts_stock_idx        on parts (status, safety);
create index parts_contributor_idx  on parts (contributor_id);
create index parts_added_idx        on parts (added_on desc);
create index part_tags_tag_idx      on part_tags (tag);
create index safety_checks_part_idx on safety_checks (part_id, checked_at desc);

-- What a generator may draw on: cleared, available parts, per type.
create view available_stock as
select t.type,
       t.name,
       count(*)                            as parts,
       round(sum(p.kg), 1)                 as kg,
       round(sum(p.kg * t.co2_per_kg), 1)  as co2e_avoidable_kg
from parts p
join part_types t on t.type = p.type
where p.status = 'available' and p.safety = 'cleared'
group by t.type, t.name;

-- Impact of each part, for the database page and the impact agent.
create view part_impact as
select p.id,
       p.type,
       p.kg,
       round(p.kg * t.co2_per_kg, 1) as co2e_avoidable_kg
from parts p
join part_types t on t.type = p.type;

commit;
