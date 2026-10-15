-- AI-intake en teamvoorstellen
-- 1. Gestructureerde scope per project (door AI voorgesteld of door gebruiker ingevoerd, altijd door gebruiker bevestigd)
-- 2. AI-gebruik per account (tokens en kosten per aanroep)
-- 3. Handmatig vergelijken is uit het product gehaald

create table project_scope_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  specialty_id text not null references specialties(id),
  description text not null,
  quantity numeric(12,2) check (quantity is null or quantity > 0),
  unit text check (unit in ('m2', 'uur', 'stuk', 'meter', 'project')),
  -- zekerheid van de AI-inschatting; null bij handmatige invoer
  confidence text check (confidence in ('hoog', 'middel', 'laag')),
  source text not null default 'gebruiker' check (source in ('ai', 'gebruiker')),
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  check ((quantity is null) = (unit is null))
);
create index project_scope_items_project_idx on project_scope_items(project_id);

-- Bevindingen uit de intake (risico's, open vragen, staat van de woning)
alter table projects add column ai_summary jsonb;

create table ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  feature text not null check (feature in ('intake')),
  model text not null,
  status text not null check (status in ('ok', 'refusal', 'error', 'max_tokens')),
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cache_read_tokens int not null default 0,
  cache_creation_tokens int not null default 0,
  image_count smallint not null default 0,
  -- kosten in USD volgens de prijstabel in src/lib/ai/pricing.ts op het moment van de aanroep
  cost_usd numeric(12,6) not null default 0,
  error_message text,
  created_at timestamptz not null default now()
);
create index ai_usage_user_created_idx on ai_usage(user_id, created_at desc);

drop table if exists comparison_items;
drop table if exists comparisons;

do $$
declare t text;
begin
  foreach t in array array['project_scope_items', 'ai_usage'] loop
    execute format('alter table %I enable row level security', t);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on table %I from anon', t);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('revoke all on table %I from authenticated', t);
    end if;
  end loop;
end $$;
