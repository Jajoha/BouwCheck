import { describe, expect, it } from "vitest";
import { allowedEffect, checkAgeDays, isCheckStale, policyEffect, registerImpact, type RegisterSignal } from "@/lib/domain/registers";
import { buildProposals, registerExclusions, type ScopeItem, type TeamContractor, type TeamProjectInput } from "@/lib/domain/teams";
import { computeMetrics } from "@/lib/domain/metrics";
import { registerReportSchema } from "@/lib/ai/register-agent";

const signal = (over: Partial<RegisterSignal>): RegisterSignal => ({
  id: "s1",
  kind: "faillissement",
  effect: "uitsluiting",
  status: "goedgekeurd",
  title: "Faillissement uitgesproken",
  summary: "De rechtbank heeft het faillissement uitgesproken.",
  source_name: "Centraal Insolventieregister",
  source_url: "https://insolventies.rechtspraak.nl/",
  event_date: "2026-09-01",
  match_basis: "kvk_nummer",
  contractor_response: null,
  ...over,
});

describe("beleid registersignalen", () => {
  it("sluit alleen uit bij een juridisch feit dat op KvK-nummer is gekoppeld", () => {
    expect(policyEffect("faillissement", "kvk_nummer")).toBe("uitsluiting");
    expect(policyEffect("surseance", "kvk_nummer")).toBe("uitsluiting");
    expect(policyEffect("kvk_uitgeschreven", "kvk_nummer")).toBe("uitsluiting");
    expect(policyEffect("faillissement", "naam")).toBe("waarschuwing");
    expect(policyEffect("faillissement", "naam_en_adres")).toBe("waarschuwing");
    expect(policyEffect("jonge_inschrijving", "kvk_nummer")).toBe("waarschuwing");
    expect(policyEffect("rechterlijke_uitspraak", "kvk_nummer")).toBe("waarschuwing");
  });

  it("laat een beheerder afzwakken maar nooit verzwaren", () => {
    expect(allowedEffect("faillissement", "kvk_nummer", "waarschuwing")).toBe("waarschuwing");
    expect(allowedEffect("faillissement", "naam", "uitsluiting")).toBe("waarschuwing");
    expect(allowedEffect("doorstart_zelfde_adres", "kvk_nummer", "uitsluiting")).toBe("waarschuwing");
  });

  it("telt alleen goedgekeurde signalen mee", () => {
    const impact = registerImpact([
      signal({ id: "a", status: "voorgesteld" }),
      signal({ id: "b", status: "afgewezen" }),
      signal({ id: "c", status: "goedgekeurd", effect: "waarschuwing", kind: "jonge_inschrijving" }),
    ]);
    expect(impact.exclusion).toBeNull();
    expect(impact.warnings.map((w) => w.id)).toEqual(["c"]);
  });

  it("markeert ontbrekende of verouderde controles", () => {
    expect(checkAgeDays(null, "2026-10-15")).toBeNull();
    expect(isCheckStale(null, "2026-10-15")).toBe(true);
    expect(isCheckStale("2026-09-01T10:00:00Z", "2026-10-15")).toBe(false);
    expect(isCheckStale("2026-06-01T10:00:00Z", "2026-10-15")).toBe(true);
  });
});

describe("teamvoorstellen met registersignalen en klussers", () => {
  const input: TeamProjectInput = { province: "Utrecht", area_m2: null, budget_amount: null, desired_start_date: null, today: "2026-10-15" };
  const scope: ScopeItem[] = [
    { specialty_id: "schilder", description: "Binnenschilderwerk", quantity: 100, unit: "m2" },
    { specialty_id: "klusser", description: "Plinten en deuren afhangen", quantity: 12, unit: "uur" },
  ];
  const metrics = computeMetrics([], [], { minSample: 3, staleAfterMonths: 24, now: new Date("2026-10-15T00:00:00Z") });
  let n = 0;
  const make = (over: Partial<TeamContractor> & { specialties: string[]; company_name: string }): TeamContractor => ({
    id: `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
    slug: `u${n}`,
    is_demo: false,
    areas: ["Utrecht"],
    availability_status: "direct",
    available_from: null,
    rates: [],
    metrics,
    businessVerified: false,
    ...over,
  });
  const schilder = make({
    company_name: "Schilder Goedkoop",
    specialties: ["schilder"],
    rates: [{ specialty_id: "schilder", description: "Binnenschilderwerk", unit: "m2", price_min: 8, price_max: 12, vat_included: false }],
    register: { signals: [signal({})], lastCheckedAt: "2026-10-01" },
  });
  const schilder2 = make({
    company_name: "Schilder Duurder",
    specialties: ["schilder"],
    rates: [{ specialty_id: "schilder", description: "Binnenschilderwerk", unit: "m2", price_min: 12, price_max: 16, vat_included: false }],
  });
  const klusser = make({
    company_name: "Klusser Kees",
    provider_type: "klusser",
    specialties: ["klusser"],
    rates: [{ specialty_id: "klusser", description: "Klusuurtarief", unit: "uur", price_min: 35, price_max: 45, vat_included: false }],
    register: {
      signals: [signal({ id: "w", kind: "jonge_inschrijving", effect: "waarschuwing", title: "Inschrijving jonger dan een jaar", source_name: "KvK" })],
      lastCheckedAt: "2026-10-01",
    },
  });

  it("neemt een uitgesloten uitvoerder in geen enkel team op, maar toont hem met reden en bron", () => {
    const proposals = buildProposals(scope, [schilder, schilder2, klusser], input);
    const allMembers = proposals.flatMap((p) => [...p.ranked, ...p.unranked.map((u) => u.option)]).flatMap((o) => o.members.map((m) => m.contractor.id));
    expect(allMembers).not.toContain(schilder.id);
    const excluded = registerExclusions(scope, [schilder, schilder2, klusser], input);
    expect(excluded.map((e) => e.contractor.company_name)).toEqual(["Schilder Goedkoop"]);
    expect(excluded[0].reason).toMatch(/Faillissement.*Centraal Insolventieregister/);
  });

  it("een voorgesteld (nog niet beoordeeld) signaal sluit niemand uit", () => {
    const pending = { ...schilder, register: { signals: [signal({ status: "voorgesteld" })], lastCheckedAt: null } };
    const budget = buildProposals(scope, [pending, schilder2, klusser], input)[0];
    expect(budget.ranked[0].members.map((m) => m.contractor.company_name)).toContain("Schilder Goedkoop");
    expect(registerExclusions(scope, [pending], input)).toEqual([]);
  });

  it("neemt een klusser op voor klussen en toont een waarschuwing bij het team", () => {
    const budget = buildProposals(scope, [schilder, schilder2, klusser], input)[0];
    const team = budget.ranked[0];
    expect(team.members.map((m) => m.contractor.company_name).sort()).toEqual(["Klusser Kees", "Schilder Duurder"]);
    // 100 m² × € 12–16 + 12 uur × € 35–45
    expect(team.cost.min).toBe(1200 + 420);
    expect(team.cost.max).toBe(1600 + 540);
    expect(team.notes.some((n) => n.includes("Registersignaal bij Klusser Kees") && n.includes("KvK"))).toBe(true);
  });
});

describe("rapport van de registeragent", () => {
  const base = { kvk_confirmed: true, summary: "Gecontroleerd in drie registers.", sources_checked: [{ name: "KvK", url: "https://www.kvk.nl/" }] };
  it("accepteert een geldig rapport", () => {
    const ok = registerReportSchema.safeParse({
      ...base,
      findings: [
        { kind: "faillissement", title: "Faillissement", summary: "Uitgesproken.", source_name: "CIR", source_url: "https://insolventies.rechtspraak.nl/x", event_date: "2026-09-01", match_basis: "kvk_nummer" },
      ],
    });
    expect(ok.success).toBe(true);
  });
  it("weigert bevindingen zonder geldige http(s)-bron of met een onbekende soort", () => {
    const bad = (f: object) =>
      registerReportSchema.safeParse({
        ...base,
        findings: [{ kind: "faillissement", title: "Faillissement", summary: "Uitgesproken.", source_name: "CIR", source_url: "https://x.nl/", event_date: null, match_basis: "naam", ...f }],
      }).success;
    expect(bad({ source_url: "javascript:alert(1)" })).toBe(false);
    expect(bad({ kind: "wsnp" })).toBe(false);
    expect(bad({ event_date: "1 september" })).toBe(false);
  });
});
