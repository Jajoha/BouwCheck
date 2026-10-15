/**
 * Teamsamenstelling: van een vastgestelde scope naar concrete teams van
 * aannemers, geordend op één expliciete prioriteit (budget, kwaliteit of
 * snelheid).
 *
 * Uitgangspunten (zie ook /transparantie):
 * - Deterministisch en controleerbaar: AI bepaalt alleen de scope, niet de ranking.
 * - Elke prioriteit sorteert op één criterium; er is geen samengestelde score.
 * - Teams met onvoldoende gegevens voor het criterium worden niet tussen de
 *   anderen gerangschikt maar achteraan getoond, met de reden.
 * - Kosten zijn bandbreedtes op basis van door aannemers zelf opgegeven
 *   indicatieve tarieven × hoeveelheden uit de scope. Geen offerte.
 */
import type { ContractorMetrics } from "./metrics";
import { specialtyName } from "./constants";

export type ScopeItem = {
  specialty_id: string;
  description: string;
  quantity: number | null;
  unit: string | null;
};

export type TeamRate = {
  specialty_id: string;
  description: string;
  unit: string;
  price_min: number;
  price_max: number;
  vat_included: boolean;
};

export type TeamContractor = {
  id: string;
  slug: string;
  company_name: string;
  is_demo: boolean;
  specialties: string[];
  areas: string[];
  availability_status: string;
  available_from: string | null;
  rates: TeamRate[];
  metrics: ContractorMetrics;
  businessVerified: boolean;
};

export type TeamProjectInput = {
  province: string | null;
  area_m2: number | null;
  budget_amount: number | null;
  desired_start_date: string | null;
  /** Datum van berekening (YYYY-MM-DD) */
  today: string;
};

export type Priority = "budget" | "kwaliteit" | "snelheid";

export type PricedLine = {
  description: string;
  specialty_id: string;
  quantity: number | null;
  unit: string | null;
  min: number | null;
  max: number | null;
  rateDescription: string | null;
};

export type TeamMember = {
  contractor: TeamContractor;
  roles: string[];
  lines: PricedLine[];
  start: string | null;
  quality: MemberQuality;
};

export type MemberQuality = {
  sufficient: boolean;
  rating: number | null;
  ratingN: number;
  rework: number | null;
  verifiedProjects: number;
  registeredProjects: number;
};

export type CostEstimate = {
  min: number;
  max: number;
  /** Alle onderdelen zijn met tarieven begroot */
  complete: boolean;
  unpriced: string[];
  /** All-in m²-tarief van een hoofdaannemer gebruikt */
  allIn: boolean;
  vatIncludedSome: boolean;
};

export type TeamOption = {
  key: string;
  structure: "hoofdaannemer" | "specialisten";
  members: TeamMember[];
  cost: CostEstimate;
  start: string | null;
  qualitySufficient: boolean;
  weakest: TeamMember | null;
  missingSpecialties: string[];
  notes: string[];
};

export type RankedProposal = {
  priority: Priority;
  /** Gerangschikte opties: eerst de opties met voldoende gegevens voor dit criterium */
  ranked: TeamOption[];
  /** Opties zonder voldoende gegevens voor dit criterium, met reden */
  unranked: { option: TeamOption; reason: string }[];
};

const DAY = 86_400_000;
export function addDaysIso(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Date(d.getTime() + days * DAY).toISOString().slice(0, 10);
}

const words = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);

/** Kiest het tarief dat het best bij een scope-onderdeel past (zelfde vakgebied en eenheid, meeste woordovereenkomst). */
export function matchRate(item: ScopeItem, rates: TeamRate[]): TeamRate | null {
  const candidates = rates.filter((r) => r.specialty_id === item.specialty_id && r.unit === item.unit);
  if (candidates.length === 0) return null;
  const itemWords = new Set(words(item.description));
  let best = candidates[0];
  let bestScore = -1;
  for (const r of candidates) {
    const score = words(r.description).filter((w) => itemWords.has(w)).length;
    if (score > bestScore) {
      best = r;
      bestScore = score;
    }
  }
  return best;
}

export function priceLine(item: ScopeItem, rates: TeamRate[]): PricedLine {
  const rate = item.quantity != null ? matchRate(item, rates) : null;
  return {
    description: item.description,
    specialty_id: item.specialty_id,
    quantity: item.quantity,
    unit: item.unit,
    min: rate && item.quantity != null ? rate.price_min * item.quantity : null,
    max: rate && item.quantity != null ? rate.price_max * item.quantity : null,
    rateDescription: rate?.description ?? null,
  };
}

/** Vroegst mogelijke startdatum van een aannemer op basis van opgegeven beschikbaarheid. Null = onbekend. */
export function earliestStart(c: Pick<TeamContractor, "availability_status" | "available_from">, today: string): string | null {
  const from = c.available_from && c.available_from > today ? c.available_from : null;
  switch (c.availability_status) {
    case "direct":
      return from ?? today;
    case "binnen_1_maand":
      return from ?? addDaysIso(today, 30);
    case "binnen_3_maanden":
      return from ?? addDaysIso(today, 90);
    case "later":
      return from ?? addDaysIso(today, 180);
    case "vol":
      return from;
    default:
      return null;
  }
}

export function memberQuality(m: ContractorMetrics): MemberQuality {
  return {
    sufficient: m.rating.status === "ok",
    rating: m.rating.status === "ok" ? m.rating.value : null,
    ratingN: m.rating.n,
    rework: m.rework.status === "ok" ? m.rework.value : null,
    verifiedProjects: m.verifiedProjects,
    registeredProjects: m.registeredProjects,
  };
}

/** Negatief = a is kwalitatief sterker dan b. Volgorde: beoordeling, minder herstelwerk, meer gecontroleerde projecten. */
export function compareQuality(a: MemberQuality, b: MemberQuality): number {
  if (a.sufficient !== b.sufficient) return a.sufficient ? -1 : 1;
  if ((a.rating ?? 0) !== (b.rating ?? 0)) return (b.rating ?? 0) - (a.rating ?? 0);
  const ra = a.rework ?? 101;
  const rb = b.rework ?? 101;
  if (ra !== rb) return ra - rb;
  return b.verifiedProjects - a.verifiedProjects;
}

const mid = (c: CostEstimate) => (c.min + c.max) / 2;

function buildOption(
  key: string,
  structure: TeamOption["structure"],
  assignments: { contractor: TeamContractor; roles: string[]; lines: PricedLine[] }[],
  input: TeamProjectInput,
  extra: { allIn?: boolean; missing?: string[]; notes?: string[] } = {},
): TeamOption {
  const members: TeamMember[] = assignments.map((a) => ({
    ...a,
    start: earliestStart(a.contractor, input.today),
    quality: memberQuality(a.contractor.metrics),
  }));
  const lines = members.flatMap((m) => m.lines);
  const unpriced = lines.filter((l) => l.min === null).map((l) => l.description);
  const cost: CostEstimate = {
    min: lines.reduce((s, l) => s + (l.min ?? 0), 0),
    max: lines.reduce((s, l) => s + (l.max ?? 0), 0),
    complete: unpriced.length === 0 && (extra.missing ?? []).length === 0,
    unpriced,
    allIn: Boolean(extra.allIn),
    vatIncludedSome: members.some((m) => m.contractor.rates.some((r) => r.vat_included && m.lines.some((l) => l.rateDescription === r.description))),
  };
  const starts = members.map((m) => m.start);
  const start = starts.some((s) => s === null) || starts.length === 0 ? null : starts.reduce((a, b) => (a! > b! ? a : b));
  const qualitySufficient = members.length > 0 && members.every((m) => m.quality.sufficient);
  const weakest = members.length ? [...members].sort((a, b) => compareQuality(b.quality, a.quality))[0] : null;
  return {
    key,
    structure,
    members,
    cost,
    start,
    qualitySufficient,
    weakest,
    missingSpecialties: extra.missing ?? [],
    notes: extra.notes ?? [],
  };
}

function eligible(contractors: TeamContractor[], province: string | null) {
  return province ? contractors.filter((c) => c.areas.includes(province)) : contractors;
}

/** Hoofdaannemer-teams: één aannemer die het hele project aanneemt (eventueel met eigen onderaannemers). */
export function buildGeneralContractorTeams(scope: ScopeItem[], contractors: TeamContractor[], input: TeamProjectInput): TeamOption[] {
  const specialties = [...new Set(scope.map((s) => s.specialty_id))];
  const wantsGeneral = specialties.includes("hoofdaannemer") || specialties.length >= 3;
  if (!wantsGeneral) return [];
  const gcItem = scope.find((s) => s.specialty_id === "hoofdaannemer" && s.unit === "m2" && s.quantity != null);
  const allInQty = gcItem?.quantity ?? input.area_m2;
  return eligible(contractors, input.province)
    .filter((c) => c.specialties.includes("hoofdaannemer"))
    .map((c) => {
      const allInRate = c.rates.find((r) => r.specialty_id === "hoofdaannemer" && r.unit === "m2");
      if (allInRate && allInQty) {
        const line: PricedLine = {
          description: gcItem?.description ?? "Complete renovatie (all-in)",
          specialty_id: "hoofdaannemer",
          quantity: allInQty,
          unit: "m2",
          min: allInRate.price_min * allInQty,
          max: allInRate.price_max * allInQty,
          rateDescription: allInRate.description,
        };
        return buildOption(`hoofd-${c.id}`, "hoofdaannemer", [{ contractor: c, roles: specialties, lines: [line] }], input, {
          allIn: true,
          notes: [`Begroot met het all-in m²-tarief van ${c.company_name} (“${allInRate.description}”), dat alle onderdelen dekt.`],
        });
      }
      const lines = scope.map((s) => priceLine(s, c.rates));
      return buildOption(`hoofd-${c.id}`, "hoofdaannemer", [{ contractor: c, roles: specialties, lines }], input);
    });
}

/** Score van één kandidaat voor één vakgebied, per prioriteit. Lager = beter; null = geen gegevens. */
function candidateScore(priority: Priority, c: TeamContractor, items: ScopeItem[], today: string): number | null {
  if (priority === "budget") {
    const lines = items.map((i) => priceLine(i, c.rates));
    if (lines.some((l) => l.min === null)) return null;
    return lines.reduce((s, l) => s + (l.min! + l.max!) / 2, 0);
  }
  if (priority === "snelheid") {
    const start = earliestStart(c, today);
    return start ? new Date(`${start}T00:00:00Z`).getTime() / DAY : null;
  }
  const q = memberQuality(c.metrics);
  if (!q.sufficient) return null;
  // lagere waarde = beter; beoordeling domineert, herstelwerk en gecontroleerde projecten breken gelijke stand
  return -(q.rating! * 10_000) + (q.rework ?? 100) * 10 - q.verifiedProjects;
}

/** Team van losse vakspecialisten, per vakgebied de beste (rank 0) of op één na beste (rank 1) kandidaat. */
export function buildSpecialistTeam(scope: ScopeItem[], contractors: TeamContractor[], input: TeamProjectInput, priority: Priority, rank: 0 | 1): TeamOption | null {
  const specialties = [...new Set(scope.map((s) => s.specialty_id))].filter((s) => s !== "hoofdaannemer");
  if (specialties.length === 0) return null;
  const pool = eligible(contractors, input.province);
  const byContractor = new Map<string, { contractor: TeamContractor; roles: string[]; lines: PricedLine[] }>();
  const missing: string[] = [];
  let usedAlternative = false;
  for (const spec of specialties) {
    const items = scope.filter((s) => s.specialty_id === spec);
    const candidates = pool
      .filter((c) => c.specialties.includes(spec))
      .map((c) => ({ c, score: candidateScore(priority, c, items, input.today) }))
      .sort((a, b) => (a.score === null ? 1 : b.score === null ? -1 : a.score - b.score) || a.c.company_name.localeCompare(b.c.company_name, "nl"));
    if (candidates.length === 0) {
      missing.push(spec);
      continue;
    }
    const pick = candidates[Math.min(rank, candidates.length - 1)];
    if (rank === 1 && candidates.length > 1) usedAlternative = true;
    const entry = byContractor.get(pick.c.id) ?? { contractor: pick.c, roles: [], lines: [] };
    entry.roles.push(spec);
    entry.lines.push(...items.map((i) => priceLine(i, pick.c.rates)));
    byContractor.set(pick.c.id, entry);
  }
  if (rank === 1 && !usedAlternative) return null;
  if (byContractor.size === 0) return null;
  const notes = ["Geen hoofdaannemer: de coördinatie tussen de vakspecialisten ligt bij jou of een bouwbegeleider."];
  if (scope.some((s) => s.specialty_id === "hoofdaannemer")) notes.push("Regiewerk van een hoofdaannemer is in deze variant niet begroot.");
  if (missing.length) notes.push(`Geen aanbieder in ${input.province ?? "de regio"} gevonden voor: ${missing.map(specialtyName).join(", ").toLowerCase()}.`);
  const key = `spec-${priority}-${rank}-${[...byContractor.keys()].sort().join("-")}`;
  return buildOption(key, "specialisten", [...byContractor.values()], input, { missing, notes });
}

function dedupe(options: TeamOption[]) {
  const seen = new Set<string>();
  return options.filter((o) => {
    const sig = `${o.structure}:${o.members.map((m) => `${m.contractor.id}[${[...m.roles].sort().join(",")}]`).sort().join("|")}`;
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });
}

/** Rangschikt teams voor één prioriteit. */
export function rankForPriority(priority: Priority, scope: ScopeItem[], contractors: TeamContractor[], input: TeamProjectInput, limit = 3): RankedProposal {
  const options = dedupe([
    ...[buildSpecialistTeam(scope, contractors, input, priority, 0), buildSpecialistTeam(scope, contractors, input, priority, 1)].filter((o): o is TeamOption => o !== null),
    ...buildGeneralContractorTeams(scope, contractors, input),
  ]);
  const ranked: TeamOption[] = [];
  const unranked: { option: TeamOption; reason: string }[] = [];
  for (const o of options) {
    if (o.missingSpecialties.length) {
      unranked.push({ option: o, reason: `Dekt niet alle werkzaamheden: ${o.missingSpecialties.map(specialtyName).join(", ").toLowerCase()} ontbreekt.` });
    } else if (priority === "budget" && !o.cost.complete) {
      unranked.push({ option: o, reason: `Niet volledig te begroten: geen passend tarief voor ${o.cost.unpriced.join(", ").toLowerCase()}.` });
    } else if (priority === "kwaliteit" && !o.qualitySufficient) {
      const lacking = o.members.filter((m) => !m.quality.sufficient).map((m) => m.contractor.company_name);
      unranked.push({ option: o, reason: `Onvoldoende beoordelingen (minder dan het minimum) voor: ${lacking.join(", ")}.` });
    } else if (priority === "snelheid" && !o.start) {
      const unknown = o.members.filter((m) => !m.start).map((m) => m.contractor.company_name);
      unranked.push({ option: o, reason: `Beschikbaarheid onbekend voor: ${unknown.join(", ")}.` });
    } else {
      ranked.push(o);
    }
  }
  const byName = (a: TeamOption, b: TeamOption) => a.key.localeCompare(b.key);
  ranked.sort((a, b) => {
    if (priority === "budget") return mid(a.cost) - mid(b.cost) || byName(a, b);
    if (priority === "snelheid") {
      if (a.start !== b.start) return a.start! < b.start! ? -1 : 1;
      return a.members.length - b.members.length || byName(a, b);
    }
    return compareQuality(a.weakest!.quality, b.weakest!.quality) || byName(a, b);
  });
  return { priority, ranked: ranked.slice(0, limit), unranked: unranked.slice(0, limit) };
}

export function buildProposals(scope: ScopeItem[], contractors: TeamContractor[], input: TeamProjectInput) {
  return (["budget", "kwaliteit", "snelheid"] as const).map((p) => rankForPriority(p, scope, contractors, input));
}
