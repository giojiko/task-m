-- Flips module: separate tables, RLS locked to service-role only
-- anon and authenticated roles get no access; only the server (service_role) can read/write.

-- ─── flips ────────────────────────────────────────────────────────────────────
create table if not exists flips (
  id              uuid primary key default gen_random_uuid(),
  title           text not null default '',
  address         text not null default '',
  district        text not null default '',
  sqm             numeric(8,2) not null default 0,
  buy_price       numeric(12,2) not null default 0,
  buy_date        date,
  buy_extra       numeric(12,2) not null default 0,
  status          text not null default 'bought'
                  check (status in ('bought','reno','ready','sold')),
  ready_date      date,
  ask_price       numeric(12,2) not null default 0,
  sale_price      numeric(12,2) not null default 0,
  sale_date       date,
  broker_mode     text not null default 'pct' check (broker_mode in ('pct','amt')),
  broker_pct      numeric(6,3) not null default 2,
  broker_amt      numeric(12,2) not null default 0,
  other_sale_cost numeric(12,2) not null default 0,
  tax_pct         numeric(5,2) not null default 20
                  check (tax_pct in (0, 5, 15, 20)),
  notes           text not null default '',
  investor_deal_id uuid,
  scenario_id     uuid,
  version         integer not null default 1,
  created_by      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table flips enable row level security;
create policy "no_access_anon" on flips for all to anon using (false);
create policy "no_access_auth" on flips for all to authenticated using (false);

-- ─── flip_expenses ────────────────────────────────────────────────────────────
create table if not exists flip_expenses (
  id         uuid primary key default gen_random_uuid(),
  flip_id    uuid not null references flips(id) on delete cascade,
  category   text not null,
  kind       text not null check (kind in ('mat','lab')),
  amount     numeric(12,2) not null default 0,
  note       text not null default '',
  date       date not null default current_date,
  created_by text,
  created_at timestamptz not null default now()
);

alter table flip_expenses enable row level security;
create policy "no_access_anon" on flip_expenses for all to anon using (false);
create policy "no_access_auth" on flip_expenses for all to authenticated using (false);

-- ─── flip_categories ─────────────────────────────────────────────────────────
create table if not exists flip_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table flip_categories enable row level security;
create policy "no_access_anon" on flip_categories for all to anon using (false);
create policy "no_access_auth" on flip_categories for all to authenticated using (false);

insert into flip_categories (name, sort_order) values
  ('ელექტროობა', 1),
  ('სანტექნიკა', 2),
  ('კედლები და ჭერი', 3),
  ('მალიარკა', 4),
  ('იატაკი', 5),
  ('ფილა', 6),
  ('კარები და ფანჯრები', 7),
  ('სამზარეულო', 8),
  ('ავეჯი', 9),
  ('ტექნიკა', 10),
  ('განათება', 11),
  ('ნაგვის გატანა და დასუფთავება', 12),
  ('სხვა', 13)
on conflict (name) do nothing;

-- ─── flip_scenarios ───────────────────────────────────────────────────────────
create table if not exists flip_scenarios (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  params     jsonb not null default '{}',
  created_by text,
  created_at timestamptz not null default now()
);

alter table flip_scenarios enable row level security;
create policy "no_access_anon" on flip_scenarios for all to anon using (false);
create policy "no_access_auth" on flip_scenarios for all to authenticated using (false);

-- ─── investor_deals ───────────────────────────────────────────────────────────
create table if not exists investor_deals (
  id                      uuid primary key default gen_random_uuid(),
  investor_name           text not null,
  amount                  numeric(12,2) not null default 0,
  term_months             integer not null default 12,
  payout_mode             text not null default 'hybrid'
                          check (payout_mode in ('fixed','share','hybrid','manual','service')),
  payout_amount           numeric(12,2) not null default 0,
  payout_frequency_months integer not null default 2,
  start_date              date not null default current_date,
  notes                   text not null default '',
  created_by              text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table investor_deals enable row level security;
create policy "no_access_anon" on investor_deals for all to anon using (false);
create policy "no_access_auth" on investor_deals for all to authenticated using (false);

-- ─── investor_payouts ────────────────────────────────────────────────────────
create table if not exists investor_payouts (
  id         uuid primary key default gen_random_uuid(),
  deal_id    uuid not null references investor_deals(id) on delete cascade,
  date       date not null default current_date,
  amount     numeric(12,2) not null default 0,
  type       text not null check (type in ('dividend','principal')),
  note       text not null default '',
  created_by text,
  created_at timestamptz not null default now()
);

alter table investor_payouts enable row level security;
create policy "no_access_anon" on investor_payouts for all to anon using (false);
create policy "no_access_auth" on investor_payouts for all to authenticated using (false);

-- ─── flips_access ────────────────────────────────────────────────────────────
create table if not exists flips_access (
  user_id    text primary key,
  granted_by text not null,
  granted_at timestamptz not null default now(),
  level      text not null check (level in ('view','edit'))
);

alter table flips_access enable row level security;
create policy "no_access_anon" on flips_access for all to anon using (false);
create policy "no_access_auth" on flips_access for all to authenticated using (false);

-- ─── flips_audit ─────────────────────────────────────────────────────────────
create table if not exists flips_audit (
  id         uuid primary key default gen_random_uuid(),
  actor_id   text not null,
  action     text not null,
  target_id  text,
  meta       jsonb,
  created_at timestamptz not null default now()
);

alter table flips_audit enable row level security;
create policy "no_access_anon" on flips_audit for all to anon using (false);
create policy "no_access_auth" on flips_audit for all to authenticated using (false);

-- ─── updated_at trigger ───────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger flips_updated_at before update on flips
  for each row execute function set_updated_at();
create trigger investor_deals_updated_at before update on investor_deals
  for each row execute function set_updated_at();
