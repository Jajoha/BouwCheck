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
