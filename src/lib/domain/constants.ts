/** Gedeelde domeinconstanten en Nederlandse labels. Veilig voor client én server. */

export const SPECIALTIES = [
  { id: "hoofdaannemer", name: "Hoofdaannemer" },
  { id: "sloopwerk", name: "Sloopwerk" },
  { id: "elektricien", name: "Elektricien" },
  { id: "loodgieter", name: "Loodgieter" },
  { id: "stukadoor", name: "Stukadoor" },
  { id: "schilder", name: "Schilder" },
  { id: "tegelzetter", name: "Tegelzetter" },
  { id: "timmerman", name: "Timmerman" },
  { id: "keukeninstallateur", name: "Keukeninstallateur" },
  { id: "badkamerinstallateur", name: "Badkamerinstallateur" },
  { id: "dakdekker", name: "Dakdekker" },
  { id: "vloerenlegger", name: "Vloerenlegger" },
  { id: "isolatiespecialist", name: "Isolatiespecialist" },
  { id: "klusser", name: "Allround klusser (kleine klussen)" },
] as const;

export type SpecialtyId = (typeof SPECIALTIES)[number]["id"];
export const SPECIALTY_IDS = SPECIALTIES.map((s) => s.id) as [SpecialtyId, ...SpecialtyId[]];
export const specialtyName = (id: string) => SPECIALTIES.find((s) => s.id === id)?.name ?? id;

export const PROVINCES = [
  "Drenthe",
  "Flevoland",
  "Friesland",
  "Gelderland",
  "Groningen",
  "Limburg",
  "Noord-Brabant",
  "Noord-Holland",
  "Overijssel",
  "Utrecht",
  "Zeeland",
  "Zuid-Holland",
] as const;
export type Province = (typeof PROVINCES)[number];

export const PROPERTY_TYPES = [
  "Tussenwoning",
  "Hoekwoning",
  "Twee-onder-een-kapwoning",
  "Vrijstaande woning",
  "Appartement",
  "Bovenwoning",
  "Benedenwoning",
  "Portiekwoning",
  "Bedrijfspand / transformatie",
] as const;

export const RENOVATION_TYPES = [
  "Complete renovatie",
  "Gedeeltelijke renovatie",
  "Badkamer en/of keuken",
  "Verduurzaming",
  "Cosmetische opknapbeurt",
  "Splitsing / transformatie",
  "Dak en gevel",
] as const;

export const PRICE_LEVELS = {
  budget: { label: "Budget", short: "€", description: "Onder het gemiddelde tariefniveau in de regio (zelf opgegeven)" },
  midden: { label: "Middensegment", short: "€€", description: "Rond het gemiddelde tariefniveau (zelf opgegeven)" },
  premium: { label: "Premium", short: "€€€", description: "Boven het gemiddelde tariefniveau (zelf opgegeven)" },
  onbekend: { label: "Onbekend", short: "?", description: "Geen prijsniveau opgegeven" },
} as const;
export type PriceLevel = keyof typeof PRICE_LEVELS;
export const PRICE_LEVEL_ORDER: Record<PriceLevel, number> = { budget: 1, midden: 2, premium: 3, onbekend: 99 };

export const AVAILABILITY = {
  direct: { label: "Direct beschikbaar", tone: "positive" },
  binnen_1_maand: { label: "Binnen 1 maand", tone: "positive" },
  binnen_3_maanden: { label: "Binnen 3 maanden", tone: "neutral" },
  later: { label: "Later dan 3 maanden", tone: "warning" },
  vol: { label: "Volgeboekt", tone: "warning" },
  onbekend: { label: "Onbekend", tone: "muted" },
} as const;
export type AvailabilityStatus = keyof typeof AVAILABILITY;
export const AVAILABILITY_ORDER: Record<AvailabilityStatus, number> = {
  direct: 1,
  binnen_1_maand: 2,
  binnen_3_maanden: 3,
  later: 4,
  vol: 5,
  onbekend: 99,
};

export const PROJECT_STATUS = {
  concept: "Concept",
  orienteren: "Oriënteren",
  offertes: "Offertes opvragen",
  in_uitvoering: "In uitvoering",
  opgeleverd: "Opgeleverd",
  geannuleerd: "Geannuleerd",
} as const;
export type ProjectStatus = keyof typeof PROJECT_STATUS;

export const PROJECT_CONTRACTOR_STATUS = {
  shortlist: "Op shortlist",
  offerte_aangevraagd: "Offerte aangevraagd",
  geselecteerd: "Geselecteerd",
  afgewezen: "Afgewezen",
} as const;
export type ProjectContractorStatus = keyof typeof PROJECT_CONTRACTOR_STATUS;

export const QUOTE_REQUEST_STATUS = {
  concept: "Concept",
  klaar: "Klaar om te verzenden",
  verzonden: "Verzonden",
  reactie: "Reactie ontvangen",
  afgerond: "Afgerond",
  geannuleerd: "Geannuleerd",
} as const;
export type QuoteRequestStatus = keyof typeof QUOTE_REQUEST_STATUS;

export const PRICE_TYPES = {
  indicatief: { label: "Indicatieve prijs", description: "Richtprijs zonder bezichtiging of vaste werkomschrijving." },
  offerte: { label: "Offerte", description: "Concrete offerte voor het opgegeven werk." },
  overeengekomen: { label: "Overeengekomen prijs", description: "Definitief afgesproken bedrag." },
} as const;
export type PriceType = keyof typeof PRICE_TYPES;

export const QUOTE_STATUS = {
  ontvangen: "Ontvangen",
  in_overweging: "In overweging",
  geaccepteerd: "Geaccepteerd",
  afgewezen: "Afgewezen",
  verlopen: "Verlopen",
} as const;

export const OUTCOME_VERIFICATION = {
  niet_gecontroleerd: { label: "Opdrachtgeverservaring — niet gecontroleerd", short: "Niet gecontroleerd" },
  opdrachtgever_bevestigd: { label: "Opdrachtgever bevestigd", short: "Opdrachtgever bevestigd" },
  documentatie_gecontroleerd: { label: "Projectgegevens gecontroleerd", short: "Gecontroleerd" },
  betwist: { label: "Betwist — telt niet mee", short: "Betwist" },
  afgewezen: { label: "Afgewezen — telt niet mee", short: "Afgewezen" },
} as const;
export type OutcomeVerification = keyof typeof OUTCOME_VERIFICATION;

export const MODERATION_STATUS = {
  in_behandeling: "In behandeling",
  goedgekeurd: "Goedgekeurd",
  gepubliceerd: "Gepubliceerd",
  afgewezen: "Afgewezen",
} as const;

export const CONTRACTOR_STATUS = {
  in_beoordeling: "In beoordeling",
  actief: "Actief",
  gedeactiveerd: "Gedeactiveerd",
} as const;

export const VERIFICATION_TYPES = {
  bedrijfsgegevens: "Bedrijfsgegevens",
  projectgegevens: "Projectgegevens",
  opdrachtgever_bevestiging: "Bevestiging opdrachtgever",
} as const;

export const VERIFICATION_EVENT_STATUS = {
  aangevraagd: "Aangevraagd",
  goedgekeurd: "Goedgekeurd",
  afgewezen: "Afgewezen",
  ingetrokken: "Ingetrokken",
} as const;

export const FLAG_REASONS = {
  onjuiste_gegevens: "Onjuiste of verouderde gegevens",
  verdachte_review: "Verdachte beoordeling",
  betwist_resultaat: "Betwist projectresultaat",
  privacy: "Privacygevoelige informatie",
  overig: "Overig",
} as const;

export const FLAG_STATUS = {
  open: "Open",
  in_behandeling: "In behandeling",
  opgelost: "Opgelost",
  afgewezen: "Afgewezen",
} as const;

/** Soort uitvoerder: BouwCheck is niet beperkt tot aannemersbedrijven. */
export const PROVIDER_TYPES = {
  bedrijf: { label: "Aannemersbedrijf", short: "Bedrijf", description: "Bedrijf met personeel of onderaannemers (bv, vof of eenmanszaak)." },
  zzp: { label: "Zelfstandig vakman (zzp)", short: "Zzp-vakman", description: "Werkt zelf, zonder personeel, in een of meer vakgebieden." },
  klusser: { label: "Klusser", short: "Klusser", description: "Allround klusjesman voor kleinere klussen en afwerking." },
} as const;
export type ProviderType = keyof typeof PROVIDER_TYPES;
export const PROVIDER_TYPE_IDS = Object.keys(PROVIDER_TYPES) as [ProviderType, ...ProviderType[]];

export const USER_ROLES = {
  flipper: "Vastgoedondernemer of projectontwikkelaar",
  investeerder: "Vastgoedinvesteerder",
  aannemer: "Vakman (aannemer, zzp'er of klusser)",
  beheerder: "Beheerder",
} as const;
export type UserRole = keyof typeof USER_ROLES;

export const RATE_UNITS = {
  m2: "per m²",
  uur: "per uur",
  stuk: "per stuk",
  meter: "per strekkende meter",
  project: "per project",
} as const;

export const ATTACHMENT_KINDS = {
  foto: "Foto",
  plattegrond: "Plattegrond",
  offerte: "Bestaande offerte",
  overig: "Overig",
} as const;

/** Alle onderwerpen van interesse-aanvragen, ook die van de oude testprijzen (voor bestaande aanvragen). */
export const LEAD_TYPES = {
  teamvoorstel: "Teamvoorstel",
  offertecheck: "Offertecheck",
  selectie: "Aannemersselectie",
  renovatieselectie: "Complete renovatieselectie",
  projectpas: "Projectpas",
  pro: "Pro",
  portfolio: "Portfolio",
  contact: "Contact",
} as const;
export type LeadType = keyof typeof LEAD_TYPES;

/** Onderwerpen in het aanvraagformulier op /prijzen, in deze volgorde. */
export const PRICING_LEAD_TYPES: LeadType[] = ["teamvoorstel", "offertecheck", "projectpas", "pro", "contact"];
