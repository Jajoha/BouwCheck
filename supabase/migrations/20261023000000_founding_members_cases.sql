-- ─────────────────────────────────────────────────────────────
-- Founding members (plekken per regio uit de database, niet hardcoded),
-- cases voor de homepage, en de nieuwe onderwerpen van interesse-aanvragen.
-- ─────────────────────────────────────────────────────────────

alter table interest_leads drop constraint if exists interest_leads_lead_type_check;
alter table interest_leads add constraint interest_leads_lead_type_check
  check (lead_type in ('selectie', 'renovatieselectie', 'projectpas', 'pro', 'portfolio', 'contact'));

create table founding_member_regios (
  regio text primary key,
  plekken int not null default 25 check (plekken between 0 and 1000),
  sort_order smallint not null default 0
);
insert into founding_member_regios (regio, sort_order) values
  ('Drenthe', 1), ('Flevoland', 2), ('Friesland', 3), ('Gelderland', 4), ('Groningen', 5), ('Limburg', 6),
  ('Noord-Brabant', 7), ('Noord-Holland', 8), ('Overijssel', 9), ('Utrecht', 10), ('Zeeland', 11), ('Zuid-Holland', 12)
on conflict (regio) do nothing;

create table founding_member_reserveringen (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  naam text not null,
  email text not null,
  regio text not null references founding_member_regios(regio),
  projecten_per_jaar int not null check (projecten_per_jaar between 0 and 500),
  -- interesse = formulier ingevuld; gereserveerd = plek bezet (na aanbetaling of handmatig door beheer)
  status text not null default 'interesse' check (status in ('interesse', 'gereserveerd', 'terugbetaald', 'geannuleerd')),
  user_id uuid references users(id) on delete set null,
  notitie text,
  updated_at timestamptz not null default now()
);
create index founding_member_reserveringen_regio_idx on founding_member_reserveringen(regio, status);

create table cases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  titel text not null,
  regio text,
  samenvatting text not null,
  resultaat text,
  gepubliceerd boolean not null default false,
  -- alleen echte cases; de homepage toont het blok pas als er gepubliceerde cases zijn
  sort_order int not null default 0
);

do $$
declare t text;
begin
  foreach t in array array['founding_member_regios', 'founding_member_reserveringen', 'cases'] loop
    execute format('alter table %I enable row level security', t);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on table %I from anon', t);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('revoke all on table %I from authenticated', t);
    end if;
  end loop;
end $$;
