import { describe, expect, it } from "vitest";
import { computeMetrics, type OutcomeInput, type ReviewInput } from "@/lib/domain/metrics";
import { buildProposals, earliestStart, matchRate, rankForPriority, type ScopeItem, type TeamContractor, type TeamProjectInput } from "@/lib/domain/teams";

const today = "2026-10-15";
const input: TeamProjectInput = { province: "Utrecht", area_m2: 100, budget_amount: 80000, desired_start_date: "2026-12-01", today };

function metrics(ratings: number[], rework = false) {
  const o: OutcomeInput = {
    moderation_status: "goedgekeurd",
    verification_status: "documentatie_gecontroleerd",
    initial_budget: 1000,
    final_cost: 1000,
    planned_completion_date: "2026-01-10",
    actual_completion_date: "2026-01-10",
    start_date: "2026-01-01",
    rework_required: rework,
    created_at: "2026-02-01T00:00:00Z",
  };
  const r = (rating: number): ReviewInput => ({ moderation_status: "gepubliceerd", rating, quality_rating: rating, communication_rating: null, reliability_rating: null, created_at: "2026-02-01T00:00:00Z" });
  return computeMetrics(ratings.map(() => o), ratings.map(r), { minSample: 3, staleAfterMonths: 24, now: new Date("2026-10-15T00:00:00Z") });
}

let n = 0;
function contractor(over: Partial<TeamContractor> & { specialties: string[] }): TeamContractor {
  n++;
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    slug: `c${n}`,
    company_name: over.company_name ?? `Aannemer ${n}`,
    is_demo: true,
    areas: ["Utrecht"],
    availability_status: "direct",
    available_from: null,
    rates: [],
    metrics: metrics([4, 4, 4]),
    businessVerified: true,
    ...over,
  };
}

const scope: ScopeItem[] = [
  { specialty_id: "elektricien", description: "Nieuwe groepenkast", quantity: 1, unit: "stuk" },
  { specialty_id: "schilder", description: "Binnenschilderwerk wanden", quantity: 100, unit: "m2" },
];

describe("hulpfuncties", () => {
  it("kiest het tarief met de meeste woordovereenkomst binnen vakgebied en eenheid", () => {
    const rates = [
      { specialty_id: "elektricien", description: "Extra aansluitpunt", unit: "stuk", price_min: 80, price_max: 120, vat_included: false },
      { specialty_id: "elektricien", description: "Nieuwe groepenkast incl. aardlek", unit: "stuk", price_min: 1000, price_max: 1500, vat_included: false },
    ];
    expect(matchRate(scope[0], rates)?.description).toMatch(/groepenkast/);
    expect(matchRate({ ...scope[0], unit: "m2" }, rates)).toBeNull();
  });

  it("vertaalt beschikbaarheid naar een vroegste startdatum", () => {
    expect(earliestStart({ availability_status: "direct", available_from: null }, today)).toBe(today);
    expect(earliestStart({ availability_status: "binnen_1_maand", available_from: null }, today)).toBe("2026-11-14");
    expect(earliestStart({ availability_status: "vol", available_from: "2027-02-15" }, today)).toBe("2027-02-15");
    expect(earliestStart({ availability_status: "vol", available_from: null }, today)).toBeNull();
    expect(earliestStart({ availability_status: "onbekend", available_from: "2026-11-01" }, today)).toBeNull();
    expect(earliestStart({ availability_status: "direct", available_from: "2026-01-01" }, today)).toBe(today);
  });
});

describe("rangschikking per prioriteit", () => {
  const goedkoop = contractor({
    company_name: "Goedkope Elektra",
    specialties: ["elektricien"],
    availability_status: "binnen_3_maanden",
    rates: [{ specialty_id: "elektricien", description: "Groepenkast", unit: "stuk", price_min: 900, price_max: 1100, vat_included: false }],
    metrics: metrics([3, 3, 4]),
  });
  const duur = contractor({
    company_name: "Topkwaliteit Elektra",
    specialties: ["elektricien"],
    availability_status: "direct",
    rates: [{ specialty_id: "elektricien", description: "Groepenkast", unit: "stuk", price_min: 1500, price_max: 1900, vat_included: false }],
    metrics: metrics([5, 5, 5]),
  });
  const schilder = contractor({
    company_name: "Schilder Utrecht",
    specialties: ["schilder"],
    rates: [{ specialty_id: "schilder", description: "Binnenschilderwerk", unit: "m2", price_min: 10, price_max: 14, vat_included: false }],
  });
  const buitenRegio = contractor({ company_name: "Elektra Groningen", specialties: ["elektricien"], areas: ["Groningen"], rates: [{ specialty_id: "elektricien", description: "Groepenkast", unit: "stuk", price_min: 1, price_max: 2, vat_included: false }] });
  const all = [goedkoop, duur, schilder, buitenRegio];

  it("budget: kiest per vakgebied de laagste kostenindicatie binnen de regio", () => {
    const p = rankForPriority("budget", scope, all, input);
    const best = p.ranked[0];
    expect(best.members.map((m) => m.contractor.company_name).sort()).toEqual(["Goedkope Elektra", "Schilder Utrecht"]);
    expect(best.cost.min).toBe(900 + 1000);
    expect(best.cost.max).toBe(1100 + 1400);
    expect(best.cost.complete).toBe(true);
  });

  it("kwaliteit: kiest de best beoordeelde en vergelijkt teams op de zwakste schakel", () => {
    const p = rankForPriority("kwaliteit", scope, all, input);
    expect(p.ranked[0].members.map((m) => m.contractor.company_name)).toContain("Topkwaliteit Elektra");
    expect(p.ranked[0].weakest?.quality.rating).toBeCloseTo(4);
  });

  it("snelheid: team is pas compleet beschikbaar als het laatste lid kan starten", () => {
    const p = rankForPriority("snelheid", scope, all, input);
    expect(p.ranked[0].start).toBe(today);
    expect(p.ranked[0].members.map((m) => m.contractor.company_name)).toContain("Topkwaliteit Elektra");
    const slower = p.ranked.find((o) => o.members.some((m) => m.contractor.company_name === "Goedkope Elektra"));
    expect(slower?.start).toBe("2027-01-13");
  });

  it("teams zonder voldoende gegevens worden niet gerangschikt maar met reden getoond", () => {
    const zonderTarief = contractor({ company_name: "Schilder zonder tarief", specialties: ["schilder"], metrics: metrics([4]) });
    const p = rankForPriority("budget", scope, [duur, zonderTarief], input);
    expect(p.ranked).toHaveLength(0);
    expect(p.unranked[0].reason).toMatch(/Niet volledig te begroten/);
    const q = rankForPriority("kwaliteit", scope, [duur, zonderTarief], input);
    expect(q.unranked[0].reason).toMatch(/Onvoldoende beoordelingen.*Schilder zonder tarief/);
  });

  it("ontbrekend vakgebied in de regio wordt expliciet gemeld", () => {
    const p = rankForPriority("budget", scope, [schilder], input);
    expect(p.ranked).toHaveLength(0);
    expect(p.unranked[0].reason).toMatch(/elektricien ontbreekt/);
  });
});

describe("hoofdaannemer", () => {
  it("gebruikt een all-in m²-tarief voor het hele project", () => {
    const hoofd = contractor({
      company_name: "Hoofdaannemer Utrecht",
      specialties: ["hoofdaannemer"],
      rates: [{ specialty_id: "hoofdaannemer", description: "Complete renovatie", unit: "m2", price_min: 500, price_max: 700, vat_included: false }],
    });
    const fullScope: ScopeItem[] = [{ specialty_id: "hoofdaannemer", description: "Complete renovatie", quantity: 100, unit: "m2" }, ...scope];
    const proposals = buildProposals(fullScope, [hoofd], input);
    const budget = proposals.find((p) => p.priority === "budget")!;
    const team = budget.ranked.find((o) => o.structure === "hoofdaannemer")!;
    expect(team.cost.allIn).toBe(true);
    expect(team.cost.min).toBe(50000);
    expect(team.members[0].roles).toEqual(["hoofdaannemer", "elektricien", "schilder"]);
  });
});
