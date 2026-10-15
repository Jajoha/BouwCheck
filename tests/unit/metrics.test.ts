import { describe, expect, it } from "vitest";
import { budgetDeviationPct, computeMetrics, dataCompleteness, delayDays, type OutcomeInput, type ReviewInput } from "@/lib/domain/metrics";

const base: OutcomeInput = {
  moderation_status: "goedgekeurd",
  verification_status: "documentatie_gecontroleerd",
  initial_budget: 10000,
  final_cost: 11000,
  planned_completion_date: "2026-03-01",
  actual_completion_date: "2026-03-01",
  start_date: "2026-02-01",
  rework_required: false,
  created_at: "2026-03-10T00:00:00Z",
};
const opts = { minSample: 3, staleAfterMonths: 24, now: new Date("2026-10-15T00:00:00Z") };

describe("formules", () => {
  it("berekent budgetafwijking volgens (definitief − begroot) / begroot × 100", () => {
    expect(budgetDeviationPct(10000, 11000)).toBeCloseTo(10);
    expect(budgetDeviationPct(10000, 9000)).toBeCloseTo(-10);
    expect(budgetDeviationPct(null, 9000)).toBeNull();
    expect(budgetDeviationPct(0, 9000)).toBeNull();
  });
  it("berekent vertraging in dagen, zonder tijdzone-effecten", () => {
    expect(delayDays("2026-03-01", "2026-03-11")).toBe(10);
    expect(delayDays("2026-03-29", "2026-03-30")).toBe(1); // over zomertijdwissel
    expect(delayDays("2026-03-10", "2026-03-01")).toBe(-9);
    expect(delayDays(null, "2026-03-01")).toBeNull();
  });
});

describe("computeMetrics", () => {
  it("toont geen percentages bij te weinig waarnemingen", () => {
    const m = computeMetrics([base, base], [], opts);
    expect(m.registeredProjects).toBe(2);
    expect(m.onTime.status).toBe("onvoldoende");
    expect(m.onTime.value).toBeNull();
    expect(m.onTime.n).toBe(2);
    expect(m.rating.status).toBe("geen");
  });

  it("berekent op-tijdpercentage en budgetafwijking vanaf de minimale steekproef", () => {
    const late = { ...base, actual_completion_date: "2026-03-15", final_cost: 13000 };
    const m = computeMetrics([base, base, late], [], opts);
    expect(m.onTime.status).toBe("ok");
    expect(m.onTime.value).toBeCloseTo(66.67, 1);
    expect(m.budgetDeviation.value).toBeCloseTo((10 + 10 + 30) / 3);
    expect(m.avgDelayDays.value).toBeCloseTo(14 / 3);
    expect(m.avgDurationDays.value).toBeCloseTo((28 + 28 + 42) / 3);
  });

  it("telt alleen goedgekeurde, niet-betwiste resultaten mee", () => {
    const m = computeMetrics(
      [base, base, { ...base, moderation_status: "in_behandeling" }, { ...base, verification_status: "betwist" }, { ...base, moderation_status: "afgewezen" }],
      [],
      opts,
    );
    expect(m.registeredProjects).toBe(2);
    expect(m.pendingProjects).toBe(1);
    expect(m.excludedProjects).toBe(2);
    expect(m.onTime.status).toBe("onvoldoende");
  });

  it("onderscheidt gecontroleerde en door opdrachtgever bevestigde projecten", () => {
    const m = computeMetrics([base, { ...base, verification_status: "opdrachtgever_bevestigd" }, { ...base, verification_status: "niet_gecontroleerd" }], [], opts);
    expect(m.verifiedProjects).toBe(1);
    expect(m.clientConfirmedProjects).toBe(1);
    expect(m.registeredProjects).toBe(3);
  });

  it("gebruikt alleen gepubliceerde beoordelingen", () => {
    const r = (rating: number, moderation_status = "gepubliceerd"): ReviewInput => ({ rating, moderation_status, quality_rating: rating, communication_rating: null, reliability_rating: null, created_at: "2026-01-01T00:00:00Z" });
    const m = computeMetrics([], [r(5), r(4), r(3), r(1, "in_behandeling")], opts);
    expect(m.rating.value).toBeCloseTo(4);
    expect(m.rating.n).toBe(3);
    expect(m.communicationRating.status).toBe("geen");
  });

  it("markeert verouderde gegevens", () => {
    const old = { ...base, created_at: "2023-01-01T00:00:00Z", updated_at: "2023-01-01T00:00:00Z" };
    expect(computeMetrics([old], [], opts).isStale).toBe(true);
    expect(computeMetrics([base], [], opts).isStale).toBe(false);
  });

  it("herstelwerk alleen over projecten waarvan het bekend is", () => {
    const m = computeMetrics([{ ...base, rework_required: true }, base, base, { ...base, rework_required: null }], [], opts);
    expect(m.rework.n).toBe(3);
    expect(m.rework.value).toBeCloseTo(33.33, 1);
  });

  it("datacompleetheid ligt tussen 0 en 1", () => {
    const m = computeMetrics([base, base, base], [], opts);
    const c = dataCompleteness(m, { hasRates: true, availabilityKnown: true, priceLevelKnown: false, businessVerified: false });
    expect(c).toBeGreaterThan(0);
    expect(c).toBeLessThan(1);
  });
});
