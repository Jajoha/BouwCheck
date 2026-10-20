-- ─────────────────────────────────────────────────────────────
-- Offertecheck: offertes uploaden, door AI op één scope gezet,
-- door een beheerder beoordeeld en als rapport verstuurd.
-- Geen account nodig; toegang tot het rapport via een willekeurig token.
-- ─────────────────────────────────────────────────────────────

create table offerte_checks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- concept = bestanden worden nog geüpload; de 48-uursbelofte loopt vanaf submitted_at
  status text not null default 'concept'
    check (status in ('concept', 'ingediend', 'in_analyse', 'review', 'verstuurd', 'verwijderd')),
  submitted_at timestamptz,
  naam text,
  email text,
  telefoon text,
  projectomschrijving text,
  provincie text,
  consent_contact boolean not null default false,
  consent_benchmark boolean not null default false,
  -- gehasht geheim waarmee de browser bestanden aan dit concept mag toevoegen
  upload_secret_hash text,
  analyse_gestart_op timestamptz,
  analyse_fout text,
  -- rapport zoals de beheerder het heeft goedgekeurd (zie src/lib/domain/offertecheck.ts)
  rapport_json jsonb,
  rapport_token text unique,
  rapport_verstuurd_op timestamptz,
  beoordeeld_door uuid references users(id) on delete set null,
  -- doorklik naar een teamvoorstel
  user_id uuid references users(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  verwijderd_op timestamptz,
  -- verplicht vinkje bij indienen
  constraint offerte_checks_contact_consent check (status in ('concept', 'verwijderd') or consent_contact)
);
create index offerte_checks_status_idx on offerte_checks(status, submitted_at);
create index offerte_checks_email_idx on offerte_checks(lower(email), created_at);

create table offerte_bestanden (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references offerte_checks(id) on delete cascade,
  -- zelfde conventie als project_attachments: 'blob:'-voorvoegsel voor Vercel Blob
  storage_path text not null,
  bestandsnaam text not null,
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  grootte int not null check (grootte > 0),
  volgorde smallint not null default 0,
  created_at timestamptz not null default now()
);
create index offerte_bestanden_check_idx on offerte_bestanden(check_id);

create table offerte_regels (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references offerte_checks(id) on delete cascade,
  bestand_id uuid not null references offerte_bestanden(id) on delete cascade,
  -- alleen intern (beheer); komt nooit in benchmarks
  aannemer_naam text,
  omschrijving text not null,
  vakgebied text not null references specialties(id),
  hoeveelheid numeric(12,2),
  eenheid text check (eenheid is null or eenheid in ('m2', 'uur', 'stuk', 'meter', 'project')),
  bedrag_excl_btw numeric(12,2),
  type text not null check (type in ('post', 'stelpost', 'uitsluiting', 'voorwaarde')),
  zekerheid text not null check (zekerheid in ('hoog', 'middel', 'laag')),
  toelichting text,
  -- sleutel van de scope-post waaraan deze regel is gekoppeld
  scope_post text,
  volgorde int not null default 0
);
create index offerte_regels_check_idx on offerte_regels(check_id);

-- Geanonimiseerd: geen namen, adressen, aannemers of koppeling naar de check.
create table benchmark_regels (
  id uuid primary key default gen_random_uuid(),
  vakgebied text not null references specialties(id),
  eenheid text not null check (eenheid in ('m2', 'uur', 'stuk', 'meter', 'project')),
  prijs_per_eenheid numeric(12,2) not null check (prijs_per_eenheid > 0),
  regio text,
  maand date not null,
  created_at timestamptz not null default now()
);
create index benchmark_regels_idx on benchmark_regels(vakgebied, eenheid, regio, maand);

alter table ai_usage drop constraint if exists ai_usage_feature_check;
alter table ai_usage add constraint ai_usage_feature_check check (feature in ('intake', 'registercontrole', 'offertecheck'));
alter table ai_usage add column offerte_check_id uuid references offerte_checks(id) on delete set null;

do $$
declare t text;
begin
  foreach t in array array['offerte_checks', 'offerte_bestanden', 'offerte_regels', 'benchmark_regels'] loop
    execute format('alter table %I enable row level security', t);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on table %I from anon', t);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('revoke all on table %I from authenticated', t);
    end if;
  end loop;
end $$;
