-- ─────────────────────────────────────────────────────────────
-- Fundament voor de Offertecheck-funnel:
-- 1. funnel_events: eigen eventregistratie (geen externe trackers).
-- 2. email_messages: outbox voor transactionele mails en opvolgreeksen.
--    Zonder e-mailprovider blijven berichten zichtbaar als 'niet_geconfigureerd';
--    er wordt nooit gedaan alsof een mail is verzonden.
-- 3. email_unsubscribes: afmeldingen voor opvolgmails.
-- ─────────────────────────────────────────────────────────────

create table funnel_events (
  id uuid primary key default gen_random_uuid(),
  event text not null check (event in (
    'offertecheck_gestart', 'offertecheck_ingediend', 'offertecheck_rapport_verstuurd',
    'teamvoorstel_gestart', 'teamvoorstel_ontvangen',
    'founding_member_interesse', 'founding_member_gereserveerd',
    'projectpas_interesse', 'pro_interesse'
  )),
  -- waar het event over gaat (bijv. een offertecheck of project); vrij te koppelen
  subject_type text,
  subject_id uuid,
  user_id uuid references users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index funnel_events_event_created_idx on funnel_events(event, created_at);
create index funnel_events_subject_idx on funnel_events(subject_type, subject_id);

create table email_messages (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  -- transactioneel = altijd (bijv. rapport klaar); opvolging = alleen met toestemming en zonder afmelding
  kind text not null check (kind in ('transactioneel', 'opvolging')),
  template text not null,
  subject text not null,
  html text not null,
  text_body text not null,
  status text not null default 'gepland'
    -- bezig = opgepakt door een verzendrun (voorkomt dubbel verzenden bij gelijktijdige runs)
    check (status in ('gepland', 'bezig', 'verzonden', 'niet_geconfigureerd', 'mislukt', 'geannuleerd')),
  send_after timestamptz not null default now(),
  sent_at timestamptz,
  provider_message_id text,
  error_message text,
  -- groepeert berichten van één reeks (bijv. 'offertecheck:<id>'), zodat de reeks in één keer te stoppen is
  sequence_key text,
  -- willekeurig token voor de afmeldlink in dit bericht
  unsubscribe_token text not null unique,
  created_at timestamptz not null default now()
);
create index email_messages_due_idx on email_messages(status, send_after);
create index email_messages_sequence_idx on email_messages(sequence_key);
create index email_messages_to_idx on email_messages(lower(to_email));

create table email_unsubscribes (
  email text primary key,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['funnel_events', 'email_messages', 'email_unsubscribes'] loop
    execute format('alter table %I enable row level security', t);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on table %I from anon', t);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('revoke all on table %I from authenticated', t);
    end if;
  end loop;
end $$;
