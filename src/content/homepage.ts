/**
 * Alle teksten van de homepage, in de volgorde waarin ze op de pagina staan.
 * Pas alleen de tekst tussen de aanhalingstekens aan; de opmaak regelt de pagina zelf.
 *
 * De vier prijskaarten (`prijzen.kaarten`) staan ook op /prijzen, met precies dezelfde tekst.
 * Prijzen staan hier als tekst; tests/unit/content.test.ts controleert dat ze kloppen met
 * `ladderPrices` in src/config/site.ts.
 */

/** Het hero-formulier; elke knop "Vind mijn vakmensen" springt hierheen. */
export const START_ANCHOR = "start";
export const START_HREF = `/#${START_ANCHOR}`;

/** De primaire knop naar de Offertecheck. */
export const OFFERTECHECK_CTA = { label: "Check mijn offertes – gratis", href: "/offertecheck#upload" } as const;
/** De link naar de Offertecheck onder de knoppen "Vind mijn vakmensen"; `bron` wordt als funnel-event vastgelegd. */
export const OFFERTES_LINK = { label: "Heb je al offertes? Laat ze gratis checken →", href: (bron: string) => `/offertecheck?bron=${bron}#upload` } as const;
/** De primaire knop naar het hero-formulier. */
export const VIND_CTA = { label: "Vind mijn vakmensen – gratis", href: START_HREF } as const;
/** Dezelfde knop, kort, rechtsboven in de navigatie. */
export const VIND_NAV_CTA = { label: "Vind mijn vakmensen", href: START_HREF } as const;

/** Label op elk blok met verzonnen voorbeeldgegevens. */
export const VOORBEELD_LABEL = "Voorbeeld";
/** Eén regel waar verzonnen vakmensen in beeld zijn. */
export const VERZONNEN_VAKMENSEN = "Dit voorbeeld bevat nog verzonnen vakmensen.";
/** Achter elk bedrag. */
export const ZONDER_BTW = "(zonder btw)";

/** Prioriteit in het hero-formulier → de bestaande ordening (budget, snelheid, kwaliteit). */
export const PRIORITEITEN = [
  { value: "budget", label: "Laagste prijs" },
  { value: "snelheid", label: "Snelste start" },
  { value: "kwaliteit", label: "Meest betrouwbaar" },
] as const;

/** Soort verbouwing in het hero-formulier → het type renovatie in de teamvoorstel-flow. */
export const VERBOUWINGEN = [
  { value: "badkamer", label: "Badkamer", renovatieType: "Badkamer en/of keuken", omschrijving: "Badkamer verbouwen." },
  { value: "keuken", label: "Keuken", renovatieType: "Badkamer en/of keuken", omschrijving: "Keuken verbouwen." },
  { value: "complete-renovatie", label: "Complete renovatie", renovatieType: "Complete renovatie", omschrijving: "" },
  { value: "anders", label: "Anders", renovatieType: "", omschrijving: "" },
] as const;

export type PrijsKaart = {
  id: "teamvoorstel" | "offertecheck" | "projectpas" | "pro";
  naam: string;
  tekst: string;
  prijs: string;
  /** Leeg bij gratis: dan is er geen btw. */
  prijsToelichting: string;
  knop: { label: string; href: string };
  /** Markering boven de kaart. */
  markering?: string;
};

export const homepage = {
  hero: {
    label: "Voor vastgoedondernemers en projectontwikkelaars",
    titel: "Kies de beste vakmensen voor je verbouwing.",
    tekst: "Kies op prijs, snelheid of betrouwbaarheid. Binnen 72 uur zie je wie het werk kan doen.",
    formulier: {
      verbouwing: "Wat ga je verbouwen?",
      verbouwingKies: "Kies wat je gaat verbouwen",
      provincie: "In welke provincie?",
      provincieKies: "Kies een provincie",
      prioriteit: "Wat vind je het belangrijkst?",
      knop: VIND_CTA.label,
      link: OFFERTES_LINK.label,
    },
    regiomelding: {
      tekst: "In deze provincie bouwen we ons netwerk nog op. Laat je offertes alvast gratis checken. Dan nemen we contact op zodra er een team voor je is.",
      knop: OFFERTECHECK_CTA,
    },
    voorbeeld: {
      label: VOORBEELD_LABEL,
      kaarten: { budget: "Goedkoopst", snelheid: "Snelst", kwaliteit: "Meest betrouwbaar" },
      prijs: (van: string, tot: string) => `van ${van} tot ${tot} ${ZONDER_BTW}`,
      start: (datum: string) => `kan beginnen op ${datum}`,
      startOnbekend: "startdatum nog onbekend",
      betrouwbaar: (cijfer: string) => `betrouwbaar: ${cijfer} van 5`,
      betrouwbaarOnbekend: "betrouwbaar: nog te weinig klussen",
    },
  },

  voordelen: ["Binnen 72 uur een team", "Eén vaste contactpersoon", "Niemand betaalt voor een betere plek"],

  gokken: {
    titel: "Klaar met gokken op een aannemer?",
    kaarten: [
      { kop: "Eerlijk vergelijken.", tekst: "Iedereen geeft een prijs voor precies hetzelfde werk." },
      { kop: "Weet wanneer ze beginnen.", tekst: "Je ziet meteen wanneer het hele team kan starten." },
      { kop: "Weet hoe ze het eerder deden.", tekst: "Waren ze op tijd? Bleven ze binnen het budget?" },
      { kop: "Eén vaste contactpersoon.", tekst: "Je belt altijd met dezelfde persoon. Geen callcenter." },
    ],
  },

  kiezen: {
    titel: "Waar kies jij op?",
    punten: [
      { kop: "Prijs.", tekst: "Wat kost het hele team samen?" },
      { kop: "Tijd.", tekst: "Wanneer kan het hele team beginnen?" },
      { kop: "Betrouwbaarheid.", tekst: "Doen ze wat ze beloven? Op tijd, binnen budget, weinig herstelwerk." },
    ],
    zin: "Niemand kan betalen om hoger te staan.",
    link: { label: "Zo controleren wij →", href: "/transparantie" },
  },

  /** Alleen zichtbaar met echte data; nooit verzonnen cijfers. */
  bewijs: {
    /** Alleen voor schermlezers. */
    titel: "Wie er al meedoet",
    vakmensen: (aantal: number, provincie: string) => `${aantal} gecontroleerde vakmensen in ${provincie}`,
  },

  zoWerktHet: {
    titel: "Zo werkt het",
    stappen: ["Vertel wat je wilt verbouwen.", "Binnen 72 uur zie je teams die het kunnen doen. Jij kiest.", "Je contactpersoon helpt je tot alles klaar is."],
    knop: VIND_CTA,
  },

  offertes: {
    titel: "Heb je al offertes?",
    tekst: "Wij checken ze gratis. Binnen 48 uur weet je wat er mist en waar je te veel betaalt.",
    voorbeeldLabel: VOORBEELD_LABEL,
    onderVoorbeeld: "Offerte A lijkt het goedkoopst. Tel wat er mist erbij op. Dan is hij dat niet meer.",
    knop: OFFERTECHECK_CTA,
  },

  voorWie: {
    /** Alleen voor schermlezers; de kaarten hebben zelf een kop. */
    titel: "Voor wie",
    kaarten: [
      { kop: "Vastgoedondernemer", tekst: "Je verbouwt een paar panden per jaar.", knop: { label: "Bekijk de Projectpas", href: "/prijzen#projectpas" } },
      { kop: "Projectontwikkelaar", tekst: "Je hebt meerdere projecten tegelijk.", knop: { label: "Bekijk Pro", href: "/prijzen#pro" } },
      {
        kop: "Vakman",
        tekst: "Aannemer, zzp'er of klusser? Maak gratis een profiel. Je betaalt niets voor aanvragen.",
        knop: { label: "Aanmelden als vakman", href: "/registreren?rol=aannemer" },
      },
    ],
  },

  prijzen: {
    titel: "Wat het kost",
    kaarten: [
      {
        id: "teamvoorstel",
        naam: "Teamvoorstel",
        tekst: "Teams die een prijs geven voor hetzelfde werk. Binnen 72 uur.",
        prijs: "Gratis",
        prijsToelichting: "",
        knop: { label: "Vind mijn vakmensen", href: START_HREF },
      },
      {
        id: "offertecheck",
        naam: "Offertecheck",
        tekst: "Wij vergelijken je offertes. Je ziet wat er mist.",
        prijs: "Gratis",
        prijsToelichting: "",
        knop: { label: "Check mijn offertes", href: "/offertecheck#upload" },
      },
      {
        id: "projectpas",
        naam: "Projectpas",
        // Planning en het bijhouden van extra werk zitten niet in het product (zie docs/klantteksten-herschrijving.md).
        tekst: "Eén verbouwing: al je aanvragen en vakmensen op één plek, met een vaste contactpersoon.",
        prijs: "€ 299",
        prijsToelichting: `per verbouwing ${ZONDER_BTW}`,
        knop: { label: "Start met de Projectpas", href: "/prijzen?plan=projectpas#aanvragen" },
      },
      {
        id: "pro",
        naam: "Pro",
        tekst: "Al je verbouwingen, met een vaste contactpersoon.",
        prijs: "€ 199",
        prijsToelichting: `per maand ${ZONDER_BTW}`,
        knop: { label: "Start met Pro", href: "/prijzen?plan=pro#aanvragen" },
        markering: "Voordeligst bij meerdere panden",
      },
    ] satisfies readonly PrijsKaart[],
    /**
     * Moet kloppen met de prijzen: 8 × € 299 = € 2.392 tegenover 12 × € 199 = € 2.388 per jaar.
     * "Twee verbouwingen per jaar" klopt niet (2 × € 299 = € 598); tests/unit/content.test.ts bewaakt dit.
     */
    onderKaarten: "Acht verbouwingen per jaar of meer? Dan is Pro voordeliger.",
  },

  /** Alleen zichtbaar met FEATURE_FOUNDING_MEMBERS. */
  eersteKlanten: {
    titel: "Eerste klanten",
    tekst: "Er zijn 25 plekken per regio. Pro kost dan € 149 in plaats van € 199 per maand (zonder btw). Die prijs houd je.",
    knop: { label: "Bekijk het aanbod", href: "/founding-members" },
  },

  vragen: {
    titel: "Vragen",
    items: [
      {
        vraag: "Hoe kiezen jullie de vakmensen?",
        antwoord: "Op wat jij belangrijk vindt: prijs, tijd of betrouwbaarheid. We kijken alleen naar vakmensen in jouw regio.",
      },
      { vraag: "Kunnen aannemers betalen voor een betere plek?", antwoord: "Nee. Nooit." },
      { vraag: "Kiest de computer voor mij?", antwoord: "Nee. Jij kiest. Wij zetten de opties eerlijk naast elkaar." },
      { vraag: "Wie is mijn contactpersoon?", antwoord: "Eén vaste persoon van BouwCheck. Die helpt je tot alles klaar is." },
      {
        vraag: "Wat doen jullie met mijn offertes?",
        antwoord:
          "Wij lezen ze en maken je rapport. Een medewerker kijkt alles na. We delen je offertes niet met aannemers. Je kunt ze altijd laten verwijderen.",
      },
      {
        vraag: "Wat kost het?",
        antwoord: "Het Teamvoorstel en de Offertecheck zijn gratis. De Projectpas kost € 299 per verbouwing. Pro kost € 199 per maand. Allebei zonder btw.",
      },
    ],
    link: { label: "Staat je vraag er niet bij? Neem contact op →", href: "/contact" },
  },

  slot: {
    titel: "Vind de beste vakmensen voor je verbouwing.",
    knop: VIND_CTA,
    link: OFFERTES_LINK.label,
  },
} as const;
