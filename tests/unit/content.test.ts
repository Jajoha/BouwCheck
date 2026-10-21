import { describe, expect, it } from "vitest";
import { homepage, OFFERTECHECK_CTA } from "@/content/homepage";
import { ladderPrices } from "@/config/site";
import { proBreakEvenProjects } from "@/lib/domain/ladder";
import { LADDER_LEAD_TYPES } from "@/lib/domain/constants";

const euro = (n: number) => `€ ${n.toLocaleString("nl-NL")}`;
const kaart = (id: string) => homepage.aanbod.kaarten.find((k) => k.id === id)!;

/** Alle klantteksten van de homepage als één string. */
const allText = JSON.stringify(homepage);

describe("homepageteksten", () => {
  it("vier kaarten in vaste volgorde, Pro gemarkeerd", () => {
    expect(homepage.aanbod.kaarten.map((k) => k.id)).toEqual(["offertecheck", "teamvoorstel", "projectpas", "pro"]);
    expect(homepage.aanbod.kaarten.filter((k) => k.markering).map((k) => k.id)).toEqual(["pro"]);
  });

  it("prijzen in de teksten kloppen met ladderPrices", () => {
    expect(kaart("projectpas").prijs).toBe(euro(ladderPrices.projectpas));
    expect(kaart("pro").prijs).toBe(euro(ladderPrices.proMonthly));
    expect(homepage.vragen.items.find((v) => v.vraag === "Wat kost het?")!.antwoord).toContain(`${euro(ladderPrices.projectpas)} per verbouwing`);
    expect(homepage.vragen.items.find((v) => v.vraag === "Wat kost het?")!.antwoord).toContain(`Pro ${euro(ladderPrices.proMonthly)} per maand`);
    expect(homepage.eersteKlanten.tekst).toContain(`${euro(ladderPrices.proFoundingMonthly)} in plaats van ${euro(ladderPrices.proMonthly)}`);
  });

  it("elk bedrag staat met excl. btw", () => {
    for (const k of homepage.aanbod.kaarten) {
      if (k.prijs.startsWith("€")) expect(k.prijsToelichting).toMatch(/excl\. btw$/);
      else expect(k.prijs).toBe("Gratis");
    }
    for (const t of [homepage.eersteKlanten.tekst, ...homepage.vragen.items.map((v) => v.antwoord)]) {
      if (t.includes("€")) expect(t).toContain("excl. btw");
    }
  });

  it("het omslagpunt Projectpas → Pro klopt met de prijzen", () => {
    const n = proBreakEvenProjects(ladderPrices.projectpas, ladderPrices.proMonthly);
    const woorden = ["nul", "een", "twee", "drie", "vier", "vijf", "zes", "zeven", "acht", "negen", "tien", "elf", "twaalf"];
    expect(homepage.aanbod.onderKaarten.toLowerCase()).toContain(`${woorden[n]} verbouwingen per jaar`);
  });

  it("knoppen naar de Offertecheck en de aanvragen", () => {
    expect(OFFERTECHECK_CTA).toEqual({ label: "Check mijn offertes – gratis", href: "/offertecheck#upload" });
    for (const id of ["projectpas", "pro"] as const) {
      expect(kaart(id).knop.href).toBe(`/prijzen?plan=${id}#aanvragen`);
      expect(LADDER_LEAD_TYPES).toContain(id);
    }
  });

  it("geen fasetaal of interne woorden", () => {
    expect(allText).not.toMatch(/bèta|\bbeta\b|testfase|pilot|demo|validatie|opslag|server|werkelijke kosten|vervanger/i);
    expect(allText).not.toMatch(/scope|stelpost|uitsluiting/i);
  });
});
