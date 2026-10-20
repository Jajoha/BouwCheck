import { describe, expect, it } from "vitest";
import {
  alignmentSchema,
  benchmarkRows,
  buildReport,
  deadlineFor,
  extractedOfferSchema,
  normalizeAlignment,
  redactPersonalData,
  reportSchema,
  scopeFromReport,
  type ExtractedLine,
  type ExtractedOffer,
} from "@/lib/domain/offertecheck";

const line = (over: Partial<ExtractedLine>): ExtractedLine => ({
  omschrijving: "Regel",
  vakgebied: "schilder",
  hoeveelheid: null,
  eenheid: null,
  bedrag_excl_btw: null,
  type: "post",
  zekerheid: "hoog",
  toelichting: null,
  ...over,
});

const offer = (regels: ExtractedLine[], over: Partial<ExtractedOffer & { bestandsnaam: string }> = {}): ExtractedOffer & { bestandsnaam: string } => ({
  is_offerte: true,
  aannemer_naam: "Bouwbedrijf X",
  offerte_datum: null,
  totaal_excl_btw: null,
  opmerkingen: [],
  regels,
  bestandsnaam: "offerte.pdf",
  ...over,
});

describe("redactPersonalData", () => {
  it("verwijdert e-mail, telefoon, IBAN, postcode en adres", () => {
    const input = "Dhr. Jansen, Kerkstraat 12a, 3811 AB Amersfoort. Tel 06-12345678 of +31 33 123 4567, jansen@voorbeeld.nl, IBAN NL91 ABNA 0417 1643 00.";
    const out = redactPersonalData(input);
    expect(out).not.toMatch(/Kerkstraat 12/);
    expect(out).not.toMatch(/3811 AB/);
    expect(out).not.toMatch(/06-12345678/);
    expect(out).not.toMatch(/123 4567/);
    expect(out).not.toMatch(/jansen@/);
    expect(out).not.toMatch(/NL91/);
    expect(out).toContain("[adres]");
    expect(out).toContain("[telefoon]");
  });

  it("laat bedragen, hoeveelheden en omschrijvingen staan", () => {
    const input = "Stucwerk wanden 85 m2 à € 22,50 = € 1.912,50; totaal € 18.450,00 excl. btw";
    expect(redactPersonalData(input)).toBe(input);
  });
});

describe("AI-schema's", () => {
  it("accepteert een geldige extractie en weigert een onbekend vakgebied", () => {
    const ok = { is_offerte: true, aannemer_naam: null, offerte_datum: null, totaal_excl_btw: 1000, regels: [line({ bedrag_excl_btw: 1000 })], opmerkingen: [] };
    expect(extractedOfferSchema.safeParse(ok).success).toBe(true);
    const bad = { ...ok, regels: [{ ...ok.regels[0], vakgebied: "astronaut" }] };
    expect(extractedOfferSchema.safeParse(bad).success).toBe(false);
  });

  it("valideert de koppeling", () => {
    expect(alignmentSchema.safeParse({ scope_posten: [], open_vragen: [{ offerte: null, vraag: "Wat?" }], samenvatting: "" }).success).toBe(true);
    expect(alignmentSchema.safeParse({ scope_posten: [{ omschrijving: "x", vakgebied: "schilder", regels: [{ offerte: "a" }] }], open_vragen: [], samenvatting: "" }).success).toBe(false);
  });
});

describe("normalizeAlignment", () => {
  const offers = [
    { regels: [line({ omschrijving: "Schilderwerk" }), line({ omschrijving: "Betaling 30/70", type: "voorwaarde" })] },
    { regels: [line({ omschrijving: "Schilderen" }), line({ omschrijving: "Tegelwerk", vakgebied: "tegelzetter" })] },
  ];

  it("negeert ongeldige verwijzingen en voorwaarden, en dubbel gebruik", () => {
    const posts = normalizeAlignment(offers, {
      scope_posten: [
        { omschrijving: "Schilderwerk", vakgebied: "schilder", regels: [{ offerte: 0, regel: 0 }, { offerte: 1, regel: 0 }, { offerte: 5, regel: 0 }, { offerte: 0, regel: 1 }] },
        { omschrijving: "Dubbel", vakgebied: "schilder", regels: [{ offerte: 0, regel: 0 }] },
      ],
    });
    expect(posts[0].regels).toEqual([{ offerte: 0, regel: 0 }, { offerte: 1, regel: 0 }]);
    expect(posts.find((p) => p.omschrijving === "Dubbel")).toBeUndefined();
  });

  it("geeft niet-gekoppelde regels een eigen post", () => {
    const posts = normalizeAlignment(offers, { scope_posten: [] });
    expect(posts.map((p) => p.omschrijving)).toEqual(["Schilderwerk", "Schilderen", "Tegelwerk"]);
    expect(posts.map((p) => p.key)).toEqual(["p1", "p2", "p3"]);
  });
});

describe("buildReport", () => {
  const offers = [
    offer([
      line({ omschrijving: "Schilderwerk", bedrag_excl_btw: 2000, hoeveelheid: 100, eenheid: "m2" }),
      line({ omschrijving: "Tegelwerk badkamer", vakgebied: "tegelzetter", bedrag_excl_btw: 3000 }),
      line({ omschrijving: "Sanitair", vakgebied: "badkamerinstallateur", type: "stelpost", bedrag_excl_btw: 1500, toelichting: "Keuze sanitair nog open" }),
    ]),
    offer(
      [
        line({ omschrijving: "Schilderen wanden en plafonds", bedrag_excl_btw: 3600 }),
        line({ omschrijving: "Tegelwerk", vakgebied: "tegelzetter", type: "uitsluiting", toelichting: "Niet in prijs" }),
      ],
      { bestandsnaam: "b.pdf", totaal_excl_btw: 3600 },
    ),
  ];
  const posts = normalizeAlignment(offers, {
    scope_posten: [
      { omschrijving: "Schilderwerk", vakgebied: "schilder", regels: [{ offerte: 0, regel: 0 }, { offerte: 1, regel: 0 }] },
      { omschrijving: "Tegelwerk", vakgebied: "tegelzetter", regels: [{ offerte: 0, regel: 1 }, { offerte: 1, regel: 1 }] },
      { omschrijving: "Sanitair", vakgebied: "badkamerinstallateur", regels: [{ offerte: 0, regel: 2 }] },
    ],
  });
  const report = buildReport({ offers, posts, openQuestions: [{ offerte: 1, vraag: "Is tegelwerk elders begroot?" }, { offerte: 9, vraag: "weg" }], summary: "Twee offertes." });

  it("zet per post de status en bedragen per offerte", () => {
    expect(report.posten[0].per_offerte).toEqual([{ status: "geprijsd", bedrag: 2000 }, { status: "geprijsd", bedrag: 3600 }]);
    expect(report.posten[1].per_offerte.map((x) => x.status)).toEqual(["geprijsd", "uitgesloten"]);
    expect(report.posten[2].per_offerte.map((x) => x.status)).toEqual(["stelpost", "ontbreekt"]);
  });

  it("vindt ontbrekende posten, stelposten, uitsluitingen en prijsverschillen", () => {
    // met een indicatie in euro's uit de offertes die de post wel prijzen
    expect(report.ontbrekend).toEqual([{ offerte: "B", posten: ["Tegelwerk", "Sanitair"], indicaties: [{ min: 3000, max: 3000 }, { min: 1500, max: 1500 }] }]);
    expect(report.stelposten).toEqual([{ offerte: "A", omschrijving: "Sanitair", bedrag: 1500, toelichting: "Keuze sanitair nog open" }]);
    expect(report.uitsluitingen[0]).toMatchObject({ offerte: "B", omschrijving: "Tegelwerk" });
    expect(report.prijsverschillen).toEqual([{ post: "Schilderwerk", laagste: { offerte: "A", bedrag: 2000 }, hoogste: { offerte: "B", bedrag: 3600 }, factor: 1.8 }]);
  });

  it("berekent totalen, filtert ongeldige vragen en maakt bevindingen", () => {
    expect(report.offertes.map((o) => o.totaal_excl_btw)).toEqual([6500, 3600]);
    expect(report.open_vragen).toEqual([{ offerte: "B", vraag: "Is tegelwerk elders begroot?" }]);
    expect(report.bevindingen).toHaveLength(3);
    expect(report.bevindingen[0]).toMatch(/Offerte B mist 2 posten/);
    expect(reportSchema.safeParse(report).success).toBe(true);
  });

  it("toont bij één offerte geen ontbrekende posten", () => {
    const single = buildReport({ offers: [offers[0]], posts: normalizeAlignment([offers[0]], { scope_posten: [] }), openQuestions: [], summary: "" });
    expect(single.ontbrekend).toEqual([]);
    expect(single.stelposten).toHaveLength(1);
  });

  it("levert een scope voor het teamvoorstel zonder uitgesloten of ontbrekende posten", () => {
    const scope = scopeFromReport(report, [{ scope_post: "p1", hoeveelheid: 100, eenheid: "m2" }]);
    expect(scope).toEqual([
      { specialty_id: "schilder", description: "Schilderwerk", quantity: 100, unit: "m2" },
      { specialty_id: "tegelzetter", description: "Tegelwerk", quantity: null, unit: null },
      { specialty_id: "badkamerinstallateur", description: "Sanitair", quantity: null, unit: null },
    ]);
  });
});

describe("rapport zonder bevindingen", () => {
  it("heeft geen bevindingen als alle offertes hetzelfde bevatten", () => {
    const same = [offer([line({ omschrijving: "Schilderwerk", bedrag_excl_btw: 2000 })]), offer([line({ omschrijving: "Schilderwerk", bedrag_excl_btw: 2100 })])];
    const r = buildReport({ offers: same, posts: normalizeAlignment(same, { scope_posten: [{ omschrijving: "Schilderwerk", vakgebied: "schilder", regels: [{ offerte: 0, regel: 0 }, { offerte: 1, regel: 0 }] }] }), openQuestions: [], summary: "" });
    expect(r.ontbrekend).toEqual([]);
    expect(r.prijsverschillen).toEqual([]);
    expect(r.stelposten).toEqual([]);
    expect(r.bevindingen).toEqual([]);
  });

  it("oude rapporten zonder indicaties blijven geldig", () => {
    const r = buildReport({ offers: [offer([line({})])], posts: [], openQuestions: [], summary: "" });
    expect(reportSchema.safeParse({ ...r, ontbrekend: [{ offerte: "A", posten: ["x"] }] }).success).toBe(true);
  });
});

describe("benchmarkRows (toestemming en anonimisering)", () => {
  const lines = [
    line({ bedrag_excl_btw: 2000, hoeveelheid: 100, eenheid: "m2" }),
    line({ bedrag_excl_btw: 500, type: "stelpost", hoeveelheid: 1, eenheid: "stuk" }),
    line({ bedrag_excl_btw: 900 }),
  ];

  it("levert niets zonder toestemming", () => {
    expect(benchmarkRows(lines, { consent: false, regio: "Utrecht", maand: "2026-10-01" })).toEqual([]);
  });

  it("alleen geprijsde posten met hoeveelheid, zonder namen of koppelingen", () => {
    const rows = benchmarkRows(lines, { consent: true, regio: "Utrecht", maand: "2026-10-01" });
    expect(rows).toEqual([{ vakgebied: "schilder", eenheid: "m2", prijs_per_eenheid: 20, regio: "Utrecht", maand: "2026-10-01" }]);
    expect(Object.keys(rows[0]).sort()).toEqual(["eenheid", "maand", "prijs_per_eenheid", "regio", "vakgebied"]);
  });
});

describe("deadlineFor", () => {
  it("is 48 uur na indienen", () => {
    expect(deadlineFor("2026-10-20T10:00:00Z").toISOString()).toBe("2026-10-22T10:00:00.000Z");
  });
});

describe("capaciteit per week", () => {
  it("leest OFFERTECHECK_MAX_PER_WEEK alleen als positief geheel getal", async () => {
    const { parseWeeklyMax } = await import("@/lib/domain/offertecheck");
    expect(parseWeeklyMax(undefined)).toBeNull();
    expect(parseWeeklyMax("")).toBeNull();
    expect(parseWeeklyMax("0")).toBeNull();
    expect(parseWeeklyMax("abc")).toBeNull();
    expect(parseWeeklyMax("12,5")).toBeNull();
    expect(parseWeeklyMax(" 20 ")).toBe(20);
  });

  it("zonder limiet geen capaciteit (regel verborgen); met limiet echte resterende plekken", async () => {
    const { weeklyCapacity } = await import("@/lib/domain/offertecheck");
    expect(weeklyCapacity(null, 7)).toBeNull();
    expect(weeklyCapacity(20, 7)).toEqual({ max: 20, remaining: 13 });
    expect(weeklyCapacity(5, 9)).toEqual({ max: 5, remaining: 0 });
  });
});
