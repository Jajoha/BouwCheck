/**
 * Centrale merk- en tekstconfiguratie. Wijzig hier de naam, tagline en
 * primaire teksten; de rest van de applicatie leest deze waarden.
 */
export const site = {
  name: "BouwCheck",
  tagline: "De juiste aannemer. Zonder verrassingen.",
  description:
    "Vergelijk aannemers op prijs, betrouwbaarheid, snelheid en kwaliteit, zodat je meer grip krijgt op renovatiekosten en rendement.",
  contactEmail: "contact@bouwcheck.test",
  locale: "nl-NL",
  currency: "EUR",
  /** Statistieken worden pas getoond vanaf dit aantal geldige waarnemingen. */
  minSampleSize: 3,
  /** Gegevens ouder dan dit aantal maanden worden als verouderd gemarkeerd. */
  staleAfterMonths: 24,
  /** Maximaal aantal aannemers in één vergelijking. */
  maxCompare: 4,
  hero: {
    title: "De juiste aannemer maakt het verschil tussen winst en verlies.",
    subtitle:
      "Vergelijk aannemers op prijs, betrouwbaarheid, snelheid en kwaliteit. Krijg meer grip op je renovatiebudget en bescherm je rendement.",
    primaryCta: "Vind een aannemer",
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
      "Shortlist voor één vakgebied",
      "Vergelijking op prijs, planning en projectdata",
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
      "Voor een uitgebreidere selectie en vergelijking van aannemers voor meerdere onderdelen van een renovatie.",
    features: [
      "Selectie voor meerdere vakgebieden",
      "Vergelijking van offertes op gelijke scope",
      "Signalering van budget- en planningsrisico's",
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
      "Voor actieve vastgoedflippers die regelmatig aannemers vergelijken en meerdere projecten beheren.",
    features: [
      "Onbeperkt projecten en vergelijkingen",
      "Projectresultaten en ervaringen vastleggen",
      "Favoriete vakmensen per regio",
      "Offerteaanvragen beheren per project",
    ],
    cta: "Interesse tonen in Pro",
  },
];
