import { describe, expect, it } from "vitest";
import { analyzeQuotes, parseCompareIds, type QuoteForComparison } from "@/lib/domain/comparison";

const q = (id: string, amount: number, over: Partial<QuoteForComparison> = {}): QuoteForComparison => ({
  contractorId: id,
  contractorName: `Aannemer ${id}`,
  price_type: "offerte",
  amount,
  vat_included: false,
  materials_included: true,
  scope_specialty_ids: ["hoofdaannemer", "elektricien"],
  exclusions: null,
  estimated_duration_days: 30,
  ...over,
});

describe("analyzeQuotes", () => {
  it("markeert de laagste prijs alleen als alles vergelijkbaar is", () => {
    const r = analyzeQuotes(["a", "b"], [q("a", 100), q("b", 90, { estimated_duration_days: 20 })]);
    expect(r.comparable).toBe(true);
    expect(r.lowestPriceContractorId).toBe("b");
    expect(r.shortestDurationContractorId).toBe("b");
    expect(r.warnings).toHaveLength(0);
  });

  it("waarschuwt bij verschillende scope en markeert dan geen laagste prijs", () => {
    const r = analyzeQuotes(["a", "b"], [q("a", 100), q("b", 60, { scope_specialty_ids: ["hoofdaannemer"] })]);
    expect(r.comparable).toBe(false);
    expect(r.lowestPriceContractorId).toBeNull();
    expect(r.warnings.join(" ")).toMatch(/elektricien niet in de scope/i);
  });

  it("waarschuwt bij gemengde prijstypen, btw en ontbrekende offertes", () => {
    const r = analyzeQuotes(["a", "b", "c"], [q("a", 100), q("b", 90, { price_type: "indicatief", vat_included: true })]);
    expect(r.comparable).toBe(false);
    const text = r.warnings.join(" ");
    expect(text).toMatch(/1 van de 3/);
    expect(text).toMatch(/indicatieve prijs/i);
    expect(text).toMatch(/btw/);
  });

  it("geeft geen markering bij gelijke bedragen", () => {
    const r = analyzeQuotes(["a", "b"], [q("a", 100), q("b", 100)]);
    expect(r.lowestPriceContractorId).toBeNull();
  });

  it("zonder offertes: niet vergelijkbaar, met uitleg", () => {
    const r = analyzeQuotes(["a", "b"], []);
    expect(r.comparable).toBe(false);
    expect(r.warnings[0]).toMatch(/nog geen offertes/i);
  });
});

describe("parseCompareIds", () => {
  const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
  it("filtert ongeldige id's, dubbelen en beperkt tot het maximum", () => {
    expect(parseCompareIds(`${id(1)},${id(1)},foo,${id(2)},${id(3)},${id(4)},${id(5)}`, 4)).toEqual([id(1), id(2), id(3), id(4)]);
    expect(parseCompareIds(undefined, 4)).toEqual([]);
  });
});
