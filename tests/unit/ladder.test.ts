import { describe, expect, it } from "vitest";
import { freeSeats, nextIntakeDate, proBreakEvenProjects, yearlyCosts } from "@/lib/domain/ladder";
import { ladderPrices } from "@/config/site";

describe("prijzen", () => {
  it("berekent vanaf hoeveel projecten Pro goedkoper is", () => {
    expect(proBreakEvenProjects(299, 199)).toBe(8); // 8 × 299 = 2392 > 2388
    expect(yearlyCosts(8, 299, 199).projectpassen).toBeGreaterThan(yearlyCosts(8, 299, 199).pro);
    expect(yearlyCosts(7, 299, 199).projectpassen).toBeLessThan(yearlyCosts(7, 299, 199).pro);
  });

  it("eerste klanten betalen minder voor Pro", () => {
    expect(ladderPrices.proFoundingMonthly).toBeLessThan(ladderPrices.proMonthly);
  });
});

describe("founding members", () => {
  it("volgende instroomdatum is de eerste dag van het volgende kwartaal", () => {
    expect(nextIntakeDate("2026-10-20")).toBe("2027-01-01");
    expect(nextIntakeDate("2026-01-01")).toBe("2026-04-01");
    expect(nextIntakeDate("2026-06-30")).toBe("2026-07-01");
    expect(nextIntakeDate("2026-07-01")).toBe("2026-10-01");
  });

  it("vrije plekken worden nooit negatief", () => {
    expect(freeSeats(25, 3)).toBe(22);
    expect(freeSeats(25, 30)).toBe(0);
  });
});
