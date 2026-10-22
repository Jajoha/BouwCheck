/**
 * Centrale merk- en tekstconfiguratie. Wijzig hier de naam, tagline en
 * primaire teksten; de rest van de applicatie leest deze waarden.
 */
export const site = {
  name: "BouwCheck",
  tagline: "De juiste aannemer. Zonder verrassingen.",
  description: "Kies de beste vakmensen voor je verbouwing. Kies op prijs, snelheid of betrouwbaarheid.",
  contactEmail: "contact@bouwcheck.test",
  locale: "nl-NL",
  currency: "EUR",
  /**
   * Minder echte (niet-fictieve) vakmensen in een provincie dan dit aantal? Dan toont het hero-formulier
   * de regiomelding. Instelbaar met MIN_ECHTE_VAKMENSEN.
   */
  minEchteVakmensen: Number(process.env.MIN_ECHTE_VAKMENSEN) || 10,
  /** "[aantal] gecontroleerde vakmensen in [provincie]" pas vanaf dit aantal. */
  minGecontroleerdVoorBewijs: 10,
  /** Statistieken worden pas getoond vanaf dit aantal geldige waarnemingen. */
  minSampleSize: 3,
  /** Gegevens ouder dan dit aantal maanden worden als verouderd gemarkeerd. */
  staleAfterMonths: 24,
  /** Label bij verzonnen voorbeeldprofielen en -projecten. */
  demoLabel: "Voorbeeld — verzonnen gegevens",
  /**
   * Oprichtersverhaal op de homepage. Leeg = het blok wordt niet getoond.
   * De opdrachtgever levert deze tekst; alinea's scheiden met een lege regel.
   */
  founderStory: "" as string,
  founderName: "" as string,
} as const;

// ── Prijzen (met de Offertecheck) ───────────────────────────
// De teksten van de aanbodkaarten staan in src/content/homepage.ts.

/** Prijzen in euro's excl. btw. */
export const ladderPrices = {
  projectpas: 299,
  proMonthly: 199,
  /** Eerste klanten (founding members): Pro tegen deze prijs, blijvend vast. */
  proFoundingMonthly: 149,
} as const;
