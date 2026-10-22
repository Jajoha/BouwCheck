import { describe, expect, it } from "vitest";
import { homepage, OFFERTECHECK_CTA, PRIORITEITEN, START_HREF, VERBOUWINGEN, VIND_CTA } from "@/content/homepage";
import { ladderPrices } from "@/config/site";
import { proBreakEvenProjects } from "@/lib/domain/ladder";
import { PRICING_LEAD_TYPES, RENOVATION_TYPES } from "@/lib/domain/constants";
import type { Priority } from "@/lib/domain/teams";

const PRIORITIES: Priority[] = ["budget", "kwaliteit", "snelheid"];

const euro = (n: number) => `€ ${n.toLocaleString("nl-NL")}`;
const kaart = (id: string) => homepage.prijzen.kaarten.find((k) => k.id === id)!;

/** Alle klantteksten van de homepage als één string (functies als hun bron). */
const allText = JSON.stringify(homepage, (_k, v) => (typeof v === "function" ? String(v) : v));

describe("homepageteksten", () => {
  it("vier prijskaarten in vaste volgorde, Pro gemarkeerd", () => {
    expect(homepage.prijzen.kaarten.map((k) => k.id)).toEqual(["teamvoorstel", "offertecheck", "projectpas", "pro"]);
    expect(homepage.prijzen.kaarten.filter((k) => "markering" in k).map((k) => k.id)).toEqual(["pro"]);
    expect(kaart("pro").markering).toBe("Voordeligst bij meerdere panden");
  });

  it("prijzen in de teksten kloppen met ladderPrices", () => {
    expect(kaart("projectpas").prijs).toBe(euro(ladderPrices.projectpas));
    expect(kaart("pro").prijs).toBe(euro(ladderPrices.proMonthly));
    const kost = homepage.vragen.items.find((v) => v.vraag === "Wat kost het?")!.antwoord;
    expect(kost).toContain(`De Projectpas kost ${euro(ladderPrices.projectpas)} per verbouwing.`);
    expect(kost).toContain(`Pro kost ${euro(ladderPrices.proMonthly)} per maand.`);
    expect(homepage.eersteKlanten.tekst).toContain(`${euro(ladderPrices.proFoundingMonthly)} in plaats van ${euro(ladderPrices.proMonthly)}`);
  });

  it("elk bedrag staat met (zonder btw), nooit met excl. btw", () => {
    for (const k of homepage.prijzen.kaarten) {
      if (k.prijs.startsWith("€")) expect(k.prijsToelichting).toMatch(/\(zonder btw\)$/);
      else expect(k.prijs).toBe("Gratis");
    }
    expect(homepage.eersteKlanten.tekst).toContain("(zonder btw)");
    expect(allText).not.toMatch(/excl\.? btw/i);
  });

  it("het omslagpunt Projectpas → Pro klopt met de prijzen", () => {
    const n = proBreakEvenProjects(ladderPrices.projectpas, ladderPrices.proMonthly);
    const woorden = ["nul", "een", "twee", "drie", "vier", "vijf", "zes", "zeven", "acht", "negen", "tien", "elf", "twaalf"];
    expect(homepage.prijzen.onderKaarten.toLowerCase()).toContain(`${woorden[n]} verbouwingen per jaar`);
  });

  it("knoppen gaan naar het hero-formulier, de Offertecheck en het aanvraagformulier", () => {
    expect(VIND_CTA).toEqual({ label: "Vind mijn vakmensen – gratis", href: "/#start" });
    expect(START_HREF).toBe("/#start");
    expect(OFFERTECHECK_CTA).toEqual({ label: "Check mijn offertes – gratis", href: "/offertecheck#upload" });
    expect(kaart("teamvoorstel").knop.href).toBe("/#start");
    for (const id of ["projectpas", "pro"] as const) {
      expect(kaart(id).knop.href).toBe(`/prijzen?plan=${id}#aanvragen`);
      expect(PRICING_LEAD_TYPES).toContain(id);
    }
  });

  it("hero-keuzes passen op de bestaande ordening en renovatietypes", () => {
    expect(PRIORITEITEN.map((p) => [p.label, p.value])).toEqual([
      ["Laagste prijs", "budget"],
      ["Snelste start", "snelheid"],
      ["Meest betrouwbaar", "kwaliteit"],
    ]);
    for (const p of PRIORITEITEN) expect(PRIORITIES).toContain(p.value);
    for (const v of VERBOUWINGEN) if (v.renovatieType) expect(RENOVATION_TYPES).toContain(v.renovatieType);
    expect(VERBOUWINGEN.map((v) => v.label)).toEqual(["Badkamer", "Keuken", "Complete renovatie", "Anders"]);
  });

  it("geen fasetaal, interne woorden of vaktaal", () => {
    expect(allText).not.toMatch(/bèta|\bbeta\b|testfase|pilot|demo|validatie|opslag|server|werkelijke kosten|vervanger/i);
    expect(allText).not.toMatch(/scope|offreer|offreren|stelpost|uitsluiting|meerwerk|uitvoerder|oplevering|planning|extra werk/i);
  });
});
