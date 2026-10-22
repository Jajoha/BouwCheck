-- ─────────────────────────────────────────────────────────────
-- Aanvraagformulier op /prijzen: ook Offertecheck en Teamvoorstel als onderwerp.
-- Oude onderwerpen blijven toegestaan voor bestaande aanvragen.
-- ─────────────────────────────────────────────────────────────

alter table interest_leads drop constraint if exists interest_leads_lead_type_check;
alter table interest_leads add constraint interest_leads_lead_type_check
  check (lead_type in ('offertecheck', 'teamvoorstel', 'selectie', 'renovatieselectie', 'projectpas', 'pro', 'portfolio', 'contact'));
