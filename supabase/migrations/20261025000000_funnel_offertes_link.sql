-- ─────────────────────────────────────────────────────────────
-- Funnel-event voor een klik op "Heb je al offertes?" op de homepage.
-- ─────────────────────────────────────────────────────────────

alter table funnel_events drop constraint if exists funnel_events_event_check;
alter table funnel_events add constraint funnel_events_event_check check (event in (
  'offertecheck_gestart', 'offertecheck_ingediend', 'offertecheck_rapport_verstuurd',
  'offertecheck_link_geklikt',
  'teamvoorstel_gestart', 'teamvoorstel_ontvangen',
  'founding_member_interesse', 'founding_member_gereserveerd',
  'projectpas_interesse', 'pro_interesse'
));
