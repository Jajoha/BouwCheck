-- Vaste referentiedata: vakgebieden
insert into specialties (id, name, sort_order) values
  ('hoofdaannemer', 'Hoofdaannemer', 1),
  ('sloopwerk', 'Sloopwerk', 2),
  ('elektricien', 'Elektricien', 3),
  ('loodgieter', 'Loodgieter', 4),
  ('stukadoor', 'Stukadoor', 5),
  ('schilder', 'Schilder', 6),
  ('tegelzetter', 'Tegelzetter', 7),
  ('timmerman', 'Timmerman', 8),
  ('keukeninstallateur', 'Keukeninstallateur', 9),
  ('badkamerinstallateur', 'Badkamerinstallateur', 10),
  ('dakdekker', 'Dakdekker', 11),
  ('vloerenlegger', 'Vloerenlegger', 12),
  ('isolatiespecialist', 'Isolatiespecialist', 13)
on conflict (id) do nothing;
