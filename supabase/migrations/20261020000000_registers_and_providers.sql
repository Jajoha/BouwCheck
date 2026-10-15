-- ─────────────────────────────────────────────────────────────
-- 1. Uitvoerders: niet alleen aannemersbedrijven, ook zelfstandige
--    vakmensen (zzp) en allround klussers.
-- 2. Registercontrole: een AI-agent zoekt in openbare registers;
--    bevindingen zijn voorstellen tot een beheerder ze goedkeurt.
-- ─────────────────────────────────────────────────────────────

alter table contractors add column provider_type text not null default 'bedrijf'
  check (provider_type in ('bedrijf', 'zzp', 'klusser'));

insert into specialties (id, name, sort_order) values
  ('klusser', 'Allround klusser (kleine klussen)', 14)
on conflict (id) do nothing;

-- AI-verbruik: ook registercontroles, inclusief betaalde webzoekopdrachten
alter table ai_usage drop constraint if exists ai_usage_feature_check;
alter table ai_usage add constraint ai_usage_feature_check check (feature in ('intake', 'registercontrole'));
alter table ai_usage add column web_search_requests int not null default 0 check (web_search_requests >= 0);
alter table ai_usage add column contractor_id uuid references contractors(id) on delete set null;
-- geplande (automatische) registercontroles hebben geen gebruiker
alter table ai_usage alter column user_id drop not null;

-- Eén rij per uitgevoerde controle (ook als er niets gevonden is: "gecontroleerd op <datum>")
create table register_checks (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references contractors(id) on delete cascade,
  status text not null check (status in ('voltooid', 'mislukt')),
  kvk_number text,
  -- bevestigde een officiële bron dat dit KvK-nummer bij deze uitvoerder hoort?
  kvk_confirmed boolean not null default false,
  summary text,
  sources_checked jsonb not null default '[]'::jsonb,
  findings_count int not null default 0,
  model text,
  error_message text,
  -- null = automatische (geplande) controle
  requested_by uuid references users(id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index register_checks_contractor_idx on register_checks(contractor_id, created_at desc);

-- Feiten uit openbare registers. Bewust een eigen tabel: dit zijn geen meldingen van gebruikers (flags).
create table register_signals (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references contractors(id) on delete cascade,
  check_id uuid references register_checks(id) on delete set null,
  kind text not null check (kind in (
    'faillissement', 'surseance', 'kvk_uitgeschreven',
    'jonge_inschrijving', 'doorstart_zelfde_adres', 'rechterlijke_uitspraak', 'overig')),
  effect text not null check (effect in ('uitsluiting', 'waarschuwing')),
  -- hoe de bron aan deze uitvoerder is gekoppeld
  match_basis text not null check (match_basis in ('kvk_nummer', 'naam_en_adres', 'naam')),
  title text not null check (char_length(title) between 3 and 200),
  summary text not null check (char_length(summary) between 3 and 2000),
  source_name text not null,
  source_url text not null check (source_url ~ '^https?://'),
  event_date date,
  status text not null default 'voorgesteld' check (status in ('voorgesteld', 'goedgekeurd', 'afgewezen', 'ingetrokken')),
  reviewed_by uuid references users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  contractor_response text check (contractor_response is null or char_length(contractor_response) between 10 and 2000),
  responded_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  -- Beleid, afgedwongen in de database: uitsluiten alleen bij een juridisch feit dat op KvK-nummer is gekoppeld
  check (effect <> 'uitsluiting' or (kind in ('faillissement', 'surseance', 'kvk_uitgeschreven') and match_basis = 'kvk_nummer')),
  -- elke beslissing heeft een beoordelaar en tijdstip
  check (status = 'voorgesteld' or (reviewed_at is not null)),
  unique (contractor_id, kind, source_url)
);
create index register_signals_contractor_idx on register_signals(contractor_id, status);
create index register_signals_pending_idx on register_signals(created_at) where status = 'voorgesteld';

do $$
declare t text;
begin
  foreach t in array array['register_checks', 'register_signals'] loop
    execute format('alter table %I enable row level security', t);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on table %I from anon', t);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('revoke all on table %I from authenticated', t);
    end if;
  end loop;
end $$;
