/**
 * Alle teksten van de homepage, in de volgorde waarin ze op de pagina staan.
 * Pas alleen de tekst tussen de aanhalingstekens aan; de opmaak regelt de pagina zelf.
 *
 * De vier aanbodkaarten (`aanbod.kaarten`) staan ook op /prijzen, met precies dezelfde tekst.
 * Prijzen staan hier als tekst; tests/unit/content.test.ts controleert dat ze kloppen met
 * `ladderPrices` in src/config/site.ts.
 */

/** De primaire knop naar de Offertecheck, overal op de site. */
export const OFFERTECHECK_CTA = { label: "Check mijn offertes – gratis", href: "/offertecheck#upload" } as const;
/** Dezelfde knop, kort, rechtsboven in de navigatie. */
export const OFFERTECHECK_NAV_CTA = { label: "Check mijn offertes", href: "/offertecheck#upload" } as const;

/** Label op elk blok met verzonnen voorbeeldgegevens. */
export const VOORBEELD_LABEL = "Voorbeeld";
/** Eén regel waar verzonnen vakmensen in beeld zijn. */
export const VERZONNEN_VAKMENSEN = "Dit voorbeeld bevat nog verzonnen vakmensen.";

export type AanbodKaart = {
  id: "offertecheck" | "teamvoorstel" | "projectpas" | "pro";
  naam: string;
  tekst: string;
  prijs: string;
  /** Leeg bij gratis: dan is er geen btw. */
  prijsToelichting: string;
  knop: { label: string; href: string };
  /** Markering boven de kaart, bijv. "Meest gekozen voor meerdere panden". */
  markering?: string;
};

export const homepage = {
  hero: {
    label: "Voor vastgoedondernemers en projectontwikkelaars die verbouwen",
    titel: "Laat je offertes gratis checken voordat je tekent",
    intro: "Je stuurt ons je offertes. Binnen 48 uur hoor je:",
    punten: ["wat er mist in elke offerte;", "wat er niet in zit, maar wel nodig is;", "waar je te veel betaalt."],
    slot: "Zo kom je achteraf niet voor dure verrassingen te staan.",
    knop: OFFERTECHECK_CTA,
  },

  voorbeeld: {
    label: VOORBEELD_LABEL,
    titel: "Zo ziet een check eruit",
    tekst:
      "Drie offertes voor dezelfde woning. Offerte A lijkt het goedkoopst. Maar afvoer van puin, de meterkast en het egaliseren van de vloer zitten er niet in. Tel je die erbij op, dan is A niet meer de goedkoopste.",
  },

  herkenning: {
    titel: "Herken je dit?",
    punten: [
      { kop: "Offertes zijn niet te vergelijken.", tekst: "Elke aannemer schrijft het anders op." },
      { kop: "Er komen extra kosten bij.", tekst: "Dat merk je pas als het werk al bezig is." },
      { kop: "Het werk duurt langer.", tekst: "Elke week extra kost je rente en vaste lasten." },
      { kop: "Afspraken worden niet nagekomen.", tekst: "Dat merk je pas als het te laat is." },
    ],
  },

  aanbod: {
    titel: "Wat je bij ons kunt krijgen",
    kaarten: [
      {
        id: "offertecheck",
        naam: "Offertecheck",
        tekst: "Wij vergelijken je offertes en laten zien wat er mist.",
        prijs: "Gratis",
        prijsToelichting: "",
        knop: { label: "Check mijn offertes", href: "/offertecheck#upload" },
      },
      {
        id: "teamvoorstel",
        naam: "Teamvoorstel",
        tekst: "Wij zoeken vakmensen die allemaal voor precies hetzelfde werk een prijs geven. Binnen 72 uur.",
        prijs: "Gratis",
        prijsToelichting: "",
        knop: { label: "Vraag een teamvoorstel aan", href: "/projecten/nieuw" },
      },
      {
        id: "projectpas",
        naam: "Projectpas",
        tekst: "Je regelt één verbouwing via ons: offertes, planning en extra werk op één plek.",
        prijs: "€ 299",
        prijsToelichting: "per verbouwing, excl. btw",
        knop: { label: "Start met de Projectpas", href: "/prijzen?plan=projectpas#aanvragen" },
      },
      {
        id: "pro",
        naam: "Pro",
        tekst: "Hetzelfde, maar voor al je verbouwingen.",
        prijs: "€ 199",
        prijsToelichting: "per maand, excl. btw",
        knop: { label: "Start met Pro", href: "/prijzen?plan=pro#aanvragen" },
        markering: "Meest gekozen voor meerdere panden",
      },
    ] satisfies readonly AanbodKaart[],
    /**
     * Klopt met de prijzen: 8 × € 299 = € 2.392 tegenover 12 × € 199 = € 2.388 per jaar.
     * Bij minder verbouwingen per jaar is de Projectpas goedkoper.
     */
    onderKaarten: "Acht verbouwingen per jaar of meer? Dan is Pro voordeliger.",
    knop: OFFERTECHECK_CTA,
  },

  vertrouwen: {
    titel: "Waarom je ons kunt vertrouwen",
    punten: [
      "Aannemers kunnen niet betalen om bovenaan te staan.",
      "We laten zien hoe zeker iets is. Heeft een bedrijf het zelf ingevuld, of hebben wij het gecontroleerd?",
      "Cijfers pas na 3 projecten. Een cijfer over één klus zegt niets.",
      "Aannemers mogen reageren op wat er over hen staat.",
    ],
    link: { label: "Zo controleren wij", href: "/transparantie" },
  },

  /** Alleen zichtbaar met FEATURE_FOUNDING_MEMBERS. */
  eersteKlanten: {
    titel: "Eerste klanten",
    tekst: "Er zijn 25 plekken per regio. Wie nu meedoet, houdt de lage prijs voor altijd: Pro voor € 149 in plaats van € 199 per maand, excl. btw.",
    knop: { label: "Bekijk het aanbod", href: "/founding-members" },
  },

  vakmensen: {
    titel: "Ben je aannemer, zzp'er of klusser?",
    tekst:
      "Maak gratis een profiel. Je betaalt niets voor aanvragen. Elke aanvraag is duidelijk omschreven, dus je hoeft niet te raden wat de klant wil.",
    knop: { label: "Aanmelden als vakman", href: "/registreren?rol=aannemer" },
  },

  vragen: {
    titel: "Vragen",
    items: [
      {
        vraag: "Wat doen jullie met mijn offertes?",
        antwoord:
          "Wij lezen ze en maken je rapport. Een medewerker kijkt alles na. We delen je offertes niet met aannemers. Je kunt ze altijd laten verwijderen.",
      },
      { vraag: "Weet de aannemer dat ik een check doe?", antwoord: "Nee." },
      { vraag: "Kiest de computer de aannemer voor mij?", antwoord: "Nee. Jij kiest. Wij zetten de opties eerlijk naast elkaar." },
      {
        vraag: "Wat kost het?",
        antwoord:
          "De Offertecheck en het Teamvoorstel zijn gratis. De Projectpas kost € 299 per verbouwing en Pro € 199 per maand, allebei excl. btw.",
      },
      { vraag: "Kunnen aannemers betalen voor een betere plek?", antwoord: "Nee. Nooit." },
    ],
    link: { tekst: "Staat je vraag er niet bij?", label: "Neem contact op", href: "/contact" },
  },

  slot: {
    titel: "Teken pas als je weet wat je koopt",
    knop: OFFERTECHECK_CTA,
  },
} as const;
