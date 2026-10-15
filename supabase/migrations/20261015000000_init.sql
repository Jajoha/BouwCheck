-- BouwCheck — initieel datamodel
-- Werkt op PostgreSQL 15+ (Supabase) en op PGlite (lokale demo-modus).
-- Geldbedragen: numeric(12,2) met expliciete valuta (EUR) en btw-status.
-- Datums: date. Doorlooptijden: hele kalenderdagen (integer).

-- ─────────────────────────────────────────────────────────────
-- Gebruikers & authenticatie
-- ─────────────────────────────────────────────────────────────
create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  name text not null check (char_length(name) between 2 and 120),
  password_hash text not null,
  role text not null default 'flipper'
    check (role in ('flipper', 'investeerder', 'aannemer', 'beheerder')),
  company_name text,
  region text,
  project_types text[] not null default '{}',
  onboarded_at timestamptz,
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sessions (
  id text primary key, -- sha256-hash van het sessietoken; het token zelf wordt nooit opgeslagen
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index sessions_user_idx on sessions(user_id);

create table password_reset_tokens (
  id text primary key, -- sha256-hash
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Vakgebieden & aannemers
-- ─────────────────────────────────────────────────────────────
create table specialties (
  id text primary key, -- slug, bijv. 'elektricien'
  name text not null unique,
  sort_order int not null default 0
);

create table contractors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  company_name text not null check (char_length(company_name) between 2 and 120),
  description text not null default '',
  city text,
  hq_province text,
  kvk_number text,
  email text,
  phone text,
  website text,
  price_level text not null default 'onbekend'
    check (price_level in ('budget', 'midden', 'premium', 'onbekend')),
  availability_status text not null default 'onbekend'
    check (availability_status in ('direct', 'binnen_1_maand', 'binnen_3_maanden', 'later', 'vol', 'onbekend')),
  available_from date,
  availability_updated_at timestamptz,
  team_size int check (team_size is null or team_size between 1 and 5000),
  founded_year int check (founded_year is null or founded_year between 1850 and 2100),
  project_types text[] not null default '{}',
  status text not null default 'in_beoordeling'
    check (status in ('in_beoordeling', 'actief', 'gedeactiveerd')),
  owner_user_id uuid references users(id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contractors_status_idx on contractors(status);
create index contractors_owner_idx on contractors(owner_user_id);

-- Niet-openbare bedrijfsgegevens (alleen beheer en eigenaar)
create table contractor_private (
  contractor_id uuid primary key references contractors(id) on delete cascade,
  contact_person_name text,
  contact_person_email text,
  internal_notes text,
  updated_at timestamptz not null default now()
);

create table contractor_specialties (
  contractor_id uuid not null references contractors(id) on delete cascade,
  specialty_id text not null references specialties(id),
  is_primary boolean not null default false,
  primary key (contractor_id, specialty_id)
);
create index contractor_specialties_specialty_idx on contractor_specialties(specialty_id);

create table contractor_service_areas (
  contractor_id uuid not null references contractors(id) on delete cascade,
  province text not null,
  primary key (contractor_id, province)
);
create index contractor_service_areas_province_idx on contractor_service_areas(province);

-- Indicatieve tarieven: altijd zelf opgegeven door het bedrijf
create table contractor_rates (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references contractors(id) on delete cascade,
  specialty_id text not null references specialties(id),
  description text not null,
  unit text not null check (unit in ('m2', 'uur', 'stuk', 'meter', 'project')),
  price_min numeric(12,2) not null check (price_min >= 0),
  price_max numeric(12,2) not null,
  currency text not null default 'EUR' check (currency = 'EUR'),
  vat_included boolean not null default false,
  materials_included boolean,
  source text not null default 'zelf_opgegeven' check (source in ('zelf_opgegeven')),
  updated_at timestamptz not null default now(),
  check (price_max >= price_min)
);
create index contractor_rates_contractor_idx on contractor_rates(contractor_id);

-- Referentieprojecten: zelf opgegeven portfolio (geen prestatiegegevens)
create table contractor_references (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references contractors(id) on delete cascade,
  title text not null,
  city text,
  property_type text,
  renovation_type text,
  year int check (year is null or year between 1950 and 2100),
  description text not null default '',
  work_items text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index contractor_references_contractor_idx on contractor_references(contractor_id);

-- ─────────────────────────────────────────────────────────────
-- Renovatieprojecten
-- ─────────────────────────────────────────────────────────────
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 120),
  location text not null,
  province text,
  property_type text not null,
  renovation_type text not null,
  area_m2 numeric(8,1) check (area_m2 is null or area_m2 > 0),
  budget_amount numeric(12,2) check (budget_amount is null or budget_amount >= 0),
  budget_currency text not null default 'EUR' check (budget_currency = 'EUR'),
  budget_vat_included boolean not null default false,
  desired_start_date date,
  desired_completion_date date,
  status text not null default 'concept'
    check (status in ('concept', 'orienteren', 'offertes', 'in_uitvoering', 'opgeleverd', 'geannuleerd')),
  description text not null default '',
  material_preferences text,
  extra_requirements text,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (desired_completion_date is null or desired_start_date is null or desired_completion_date >= desired_start_date)
);
create index projects_user_idx on projects(user_id);

create table project_specialties (
  project_id uuid not null references projects(id) on delete cascade,
  specialty_id text not null references specialties(id),
  primary key (project_id, specialty_id)
);

create table project_contractors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  contractor_id uuid not null references contractors(id) on delete cascade,
  status text not null default 'shortlist'
    check (status in ('shortlist', 'offerte_aangevraagd', 'geselecteerd', 'afgewezen')),
  notes text,
  created_at timestamptz not null default now(),
  unique (project_id, contractor_id)
);

create table project_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  event_type text not null,
  message text not null,
  created_at timestamptz not null default now()
);
create index project_events_project_idx on project_events(project_id, created_at desc);

create table project_attachments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  kind text not null check (kind in ('foto', 'plattegrond', 'offerte', 'overig')),
  file_name text not null,
  mime_type text not null,
  size_bytes int not null check (size_bytes > 0),
  storage_path text not null,
  created_at timestamptz not null default now()
);
create index project_attachments_project_idx on project_attachments(project_id);

-- ─────────────────────────────────────────────────────────────
-- Offerteaanvragen & offertes
-- ─────────────────────────────────────────────────────────────
create table quote_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  contractor_id uuid not null references contractors(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  work_description text not null,
  specialty_ids text[] not null default '{}',
  budget_indication numeric(12,2) check (budget_indication is null or budget_indication >= 0),
  budget_currency text not null default 'EUR' check (budget_currency = 'EUR'),
  budget_vat_included boolean not null default false,
  desired_start_date date,
  desired_completion_date date,
  additional_notes text,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  status text not null default 'concept'
    check (status in ('concept', 'klaar', 'verzonden', 'reactie', 'afgerond', 'geannuleerd')),
  -- 'platform' = zichtbaar in het aannemersportaal; 'demo' = NIET echt verzonden
  delivery_channel text check (delivery_channel in ('platform', 'demo')),
  sent_at timestamptz,
  contractor_response text,
  responded_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quote_requests_user_idx on quote_requests(user_id);
create index quote_requests_contractor_idx on quote_requests(contractor_id);
create index quote_requests_project_idx on quote_requests(project_id);

create table quote_request_attachments (
  quote_request_id uuid not null references quote_requests(id) on delete cascade,
  attachment_id uuid not null references project_attachments(id) on delete cascade,
  primary key (quote_request_id, attachment_id)
);

create table quotes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  contractor_id uuid not null references contractors(id) on delete cascade,
  quote_request_id uuid references quote_requests(id) on delete set null,
  -- indicatief = richtprijs; offerte = concrete offerte; overeengekomen = definitief afgesproken bedrag
  price_type text not null check (price_type in ('indicatief', 'offerte', 'overeengekomen')),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  vat_included boolean not null default false,
  materials_included boolean,
  scope_specialty_ids text[] not null default '{}',
  scope_description text not null default '',
  inclusions text,
  exclusions text,
  estimated_duration_days int check (estimated_duration_days is null or estimated_duration_days > 0),
  earliest_start_date date,
  validity_date date,
  status text not null default 'ontvangen'
    check (status in ('ontvangen', 'in_overweging', 'geaccepteerd', 'afgewezen', 'verlopen')),
  source text not null check (source in ('opdrachtgever', 'aannemer')),
  created_by uuid references users(id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quotes_project_idx on quotes(project_id);
create index quotes_contractor_idx on quotes(contractor_id);

-- ─────────────────────────────────────────────────────────────
-- Projectresultaten & reviews
-- ─────────────────────────────────────────────────────────────
create table project_outcomes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  contractor_id uuid not null references contractors(id) on delete cascade,
  submitted_by uuid references users(id) on delete set null,
  source text not null check (source in ('opdrachtgever', 'aannemer', 'beheer')),
  property_type text,
  renovation_type text,
  city text,
  province text,
  work_specialty_ids text[] not null default '{}',
  start_date date,
  initial_budget numeric(12,2) check (initial_budget is null or initial_budget > 0),
  final_cost numeric(12,2) check (final_cost is null or final_cost > 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  amounts_vat_included boolean not null default false,
  extra_costs_reason text,
  planned_completion_date date,
  actual_completion_date date,
  rework_required boolean,
  rework_description text,
  verification_status text not null default 'niet_gecontroleerd'
    check (verification_status in ('niet_gecontroleerd', 'opdrachtgever_bevestigd', 'documentatie_gecontroleerd', 'betwist', 'afgewezen')),
  evidence_reference text,
  moderation_status text not null default 'in_behandeling'
    check (moderation_status in ('in_behandeling', 'goedgekeurd', 'afgewezen')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index project_outcomes_contractor_idx on project_outcomes(contractor_id);
-- Eén resultaat per aannemer per project: voorkomt dat scores worden opgepompt
create unique index project_outcomes_project_contractor_uq
  on project_outcomes(project_id, contractor_id) where project_id is not null;

create table reviews (
  id uuid primary key default gen_random_uuid(),
  outcome_id uuid not null unique references project_outcomes(id) on delete cascade,
  contractor_id uuid not null references contractors(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  user_id uuid references users(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  quality_rating smallint check (quality_rating between 1 and 5),
  communication_rating smallint check (communication_rating between 1 and 5),
  reliability_rating smallint check (reliability_rating between 1 and 5),
  review_text text not null default '',
  verification_status text not null default 'niet_gecontroleerd'
    check (verification_status in ('niet_gecontroleerd', 'opdrachtgever_bevestigd', 'gecontroleerd')),
  moderation_status text not null default 'in_behandeling'
    check (moderation_status in ('in_behandeling', 'gepubliceerd', 'afgewezen')),
  contractor_response text,
  contractor_response_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, contractor_id, project_id)
);
create index reviews_contractor_idx on reviews(contractor_id);

-- ─────────────────────────────────────────────────────────────
-- Favorieten & vergelijkingen
-- ─────────────────────────────────────────────────────────────
create table favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  contractor_id uuid not null references contractors(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, contractor_id)
);

create table comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index comparisons_user_idx on comparisons(user_id);

create table comparison_items (
  comparison_id uuid not null references comparisons(id) on delete cascade,
  contractor_id uuid not null references contractors(id) on delete cascade,
  position smallint not null check (position between 0 and 3),
  primary key (comparison_id, contractor_id)
);

-- ─────────────────────────────────────────────────────────────
-- Verificatie, meldingen, beheer
-- ─────────────────────────────────────────────────────────────
create table verification_events (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references contractors(id) on delete cascade,
  project_outcome_id uuid references project_outcomes(id) on delete cascade,
  verification_type text not null
    check (verification_type in ('bedrijfsgegevens', 'projectgegevens', 'opdrachtgever_bevestiging')),
  status text not null default 'aangevraagd'
    check (status in ('aangevraagd', 'goedgekeurd', 'afgewezen', 'ingetrokken')),
  evidence_reference text,
  notes text,
  requested_by uuid references users(id) on delete set null,
  reviewed_by uuid references users(id) on delete set null,
  reviewed_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  -- een goedgekeurde verificatie heeft altijd een beoordelaar en bewijsreferentie
  check (status <> 'goedgekeurd' or (reviewed_at is not null and evidence_reference is not null))
);
create index verification_events_contractor_idx on verification_events(contractor_id);

create table flags (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('aannemer', 'review', 'projectresultaat')),
  entity_id uuid not null,
  contractor_id uuid references contractors(id) on delete cascade,
  reason text not null check (reason in ('onjuiste_gegevens', 'verdachte_review', 'betwist_resultaat', 'privacy', 'overig')),
  details text not null,
  reporter_user_id uuid references users(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'in_behandeling', 'opgelost', 'afgewezen')),
  resolution text,
  resolved_by uuid references users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index flags_status_idx on flags(status);

create table admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index admin_actions_created_idx on admin_actions(created_at desc);

create table interest_leads (
  id uuid primary key default gen_random_uuid(),
  lead_type text not null check (lead_type in ('selectie', 'renovatieselectie', 'pro', 'contact')),
  name text not null,
  email text not null,
  company text,
  phone text,
  message text,
  user_id uuid references users(id) on delete set null,
  status text not null default 'nieuw' check (status in ('nieuw', 'opgevolgd', 'gesloten')),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- De applicatie benadert de database uitsluitend server-side met een eigen
-- databaseverbinding en dwingt autorisatie af in de servercode.
-- RLS staat aan zonder policies: via de publieke Supabase API (anon /
-- authenticated keys) is daardoor géén enkele rij leesbaar of schrijfbaar.
-- ─────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'users','sessions','password_reset_tokens','specialties','contractors','contractor_private',
    'contractor_specialties','contractor_service_areas','contractor_rates','contractor_references',
    'projects','project_specialties','project_contractors','project_events','project_attachments',
    'quote_requests','quote_request_attachments','quotes','project_outcomes','reviews','favorites',
    'comparisons','comparison_items','verification_events','flags','admin_actions','interest_leads'
  ] loop
    execute format('alter table %I enable row level security', t);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on table %I from anon', t);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('revoke all on table %I from authenticated', t);
    end if;
  end loop;
end $$;
