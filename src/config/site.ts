/**
 * Centrale merk- en tekstconfiguratie. Wijzig hier de naam, tagline en
 * primaire teksten; de rest van de applicatie leest deze waarden.
 */
export const site = {
  name: "BouwCheck",
  tagline: "De juiste aannemer. Zonder verrassingen.",
  description:
    "Beschrijf je renovatieproject en ontvang een onderbouwde samenstelling van aannemers, zzp-vakmensen en klussers, geordend op budget, kwaliteit of snelheid.",
  contactEmail: "contact@bouwcheck.test",
  locale: "nl-NL",
  currency: "EUR",
  /** Statistieken worden pas getoond vanaf dit aantal geldige waarnemingen. */
  minSampleSize: 3,
  /** Gegevens ouder dan dit aantal maanden worden als verouderd gemarkeerd. */
  staleAfterMonths: 24,
  hero: {
    title: "De juiste aannemer maakt het verschil tussen winst en verlies.",
    subtitle:
      "Beschrijf je project en voeg foto's toe. BouwCheck bepaalt de werkzaamheden en stelt teams samen van aannemers, zzp-vakmensen en klussers — geordend op budget, kwaliteit of snelheid, onderbouwd met projectresultaten.",
    primaryCta: "Start je project",
    secondaryCta: "Bekijk hoe het werkt",
  },
  demoLabel: "Demo-data — niet geverifieerd",
  /**
   * Oprichtersverhaal op de homepage (met de Offertecheck). Leeg = een duidelijk gemarkeerde placeholder.
   * De opdrachtgever levert deze tekst; alinea's scheiden met een lege regel.
   */
  founderStory: "" as string,
  founderName: "" as string,
} as const;

export type PricingPlan = {
  id: "selectie" | "renovatieselectie" | "pro";
  name: string;
  price: string;
  priceNote: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
};

/** Voorlopige testprijzen — nog niet gevalideerd in de markt. */
export const pricingPlans: PricingPlan[] = [
  {
    id: "selectie",
    name: "Aannemersselectie",
    price: "€ 199",
    priceNote: "per selectie, excl. btw",
    description:
      "Voor vastgoedflippers die voor één specifiek project een shortlist van passende aannemers willen ontvangen.",
    features: [
      "Teamvoorstel voor één vakgebied",
      "Geordend op budget, kwaliteit of snelheid",
      "Overzicht van ontbrekende gegevens per aannemer",
      "Offerteaanvragen voorbereid vanuit BouwCheck",
    ],
    cta: "Selectie aanvragen",
  },
  {
    id: "renovatieselectie",
    name: "Complete renovatieselectie",
    price: "€ 499 – € 999",
    priceNote: "per project, excl. btw",
    description:
      "Voor een complete renovatie: een team van aannemers en onderaannemers voor alle onderdelen, op basis van een AI-intake met foto's.",
    features: [
      "AI-intake met foto's: werkzaamheden en risico's in kaart",
      "Teams van aannemers en onderaannemers voor alle vakgebieden",
      "Offerteaanvragen op één gestandaardiseerde scope",
      "Vastlegging van je selectiebeslissing",
    ],
    cta: "Project aanmelden",
    highlighted: true,
  },
  {
    id: "pro",
    name: "BouwCheck Pro",
    price: "€ 99",
    priceNote: "per maand, excl. btw",
    description:
      "Voor actieve vastgoedflippers met meerdere renovatieprojecten per jaar.",
    features: [
      "Onbeperkt projecten en teamvoorstellen",
      "Projectresultaten en ervaringen vastleggen",
      "Favoriete vakmensen per regio",
      "Offerteaanvragen beheren per project",
    ],
    cta: "Interesse tonen in Pro",
  },
];

// ── Value ladder (met de Offertecheck) ──────────────────────

export type LadderStep = {
  id: "offertecheck" | "teamvoorstel" | "projectpas" | "pro" | "portfolio";
  name: string;
  /** Prijs na validatie. */
  price: string;
  priceNote: string;
  /** Wat de klant in de pilot betaalt. */
  pilotNote: string;
  summary: string;
  delivers: string[];
  guarantees: string[];
  bonuses: string[];
  cta: { label: string; href: string };
  highlighted?: boolean;
};

/** Prijzen in euro's excl. btw; het rekenvoorbeeld op /prijzen wordt hieruit berekend. */
export const ladderPrices = {
  projectpas: 299,
  proMonthly: 199,
  /** Founding members: Pro tegen deze prijs, blijvend vast. */
  proFoundingMonthly: 149,
  portfolioMonthly: 595,
} as const;

const PILOT_FREE = "Nu gratis, alleen werkelijke kosten";
const eurPrice = (n: number) => `€ ${n.toLocaleString("nl-NL")}`;

export const FOUNDING_BONUSES = [
  "Standaardcontracten voor vakmensen",
  "Meerwerkprotocol",
  "Opleverchecklist",
  "Prijsbenchmarks per regio",
];

/** Garanties gelden alleen voor de dienst van BouwCheck, nooit voor het bouwwerk. */
export const GUARANTEE_72H = "Geen passend teamvoorstel binnen 72 uur? Dan is die maand of projectpas gratis.";
export const GUARANTEE_MONEY_BACK = "Is de projectpas na oplevering zijn geld niet waard? Geld terug.";

export const ladder: LadderStep[] = [
  {
    id: "offertecheck",
    name: "Offertecheck",
    price: "Gratis",
    priceNote: "altijd",
    pilotNote: "Gratis",
    summary: "Je offertes binnen 48 uur op één scope.",
    delivers: ["Alle posten van je offertes naast elkaar", "Ontbrekende posten, stelposten en uitsluitingen", "Grote prijsverschillen en vragen voor de aannemers"],
    guarantees: [],
    bonuses: [],
    cta: { label: "Check starten", href: "/offertecheck" },
  },
  {
    id: "teamvoorstel",
    name: "Teamvoorstel",
    price: "Gratis",
    priceNote: "per project",
    pilotNote: "Gratis",
    summary: "Teams die offreren op één scope, binnen 72 uur.",
    delivers: ["Werkzaamheden uit je beschrijving, foto's of Offertecheck", "Teams van aannemers, zzp-vakmensen en klussers", "Geordend op budget, kwaliteit of snelheid, met onderbouwing"],
    guarantees: [],
    bonuses: [],
    cta: { label: "Teamvoorstel starten", href: "/projecten/nieuw" },
  },
  {
    id: "projectpas",
    name: "Projectpas",
    price: eurPrice(ladderPrices.projectpas),
    priceNote: "per project, excl. btw",
    pilotNote: PILOT_FREE,
    summary: "Eén renovatie van start tot oplevering.",
    delivers: ["Teamvoorstel en offerteaanvragen op één scope", "Offertes, planning en tijdlijn per project op één plek", "Projectresultaat vastleggen na oplevering"],
    guarantees: [GUARANTEE_72H, GUARANTEE_MONEY_BACK],
    bonuses: ["Opleverchecklist"],
    cta: { label: "Interesse tonen", href: "/prijzen?plan=projectpas#aanvragen" },
  },
  {
    id: "pro",
    name: "BouwCheck Pro",
    price: eurPrice(ladderPrices.proMonthly),
    priceNote: "per maand, excl. btw",
    pilotNote: PILOT_FREE,
    summary: "Voor flippers met meerdere projecten per jaar.",
    delivers: ["Onbeperkt projecten en teamvoorstellen", "Favoriete vakmensen per regio", "Prijsbenchmarks uit echte offertes", "Vervanger binnen 72 uur"],
    guarantees: [GUARANTEE_72H],
    bonuses: FOUNDING_BONUSES,
    cta: { label: "Interesse tonen", href: "/prijzen?plan=pro#aanvragen" },
    highlighted: true,
  },
  {
    id: "portfolio",
    name: "Portfolio",
    price: eurPrice(ladderPrices.portfolioMonthly),
    priceNote: "per maand, excl. btw",
    pilotNote: PILOT_FREE,
    summary: "Voor teams met meerdere gebruikers en regio's.",
    delivers: ["Meerdere gebruikers en regio's", "Overzicht van je hele portefeuille", "Analyse per project en per vakman"],
    guarantees: [GUARANTEE_72H],
    bonuses: FOUNDING_BONUSES,
    cta: { label: "Interesse tonen", href: "/prijzen?plan=portfolio#aanvragen" },
  },
];
