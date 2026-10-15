import "server-only";
import { sql } from "@/lib/db";
import { getContractorsByIds, getRatesForContractors } from "./contractors";
import { loadRegisterInfo } from "./registers";
import { buildProposals, registerExclusions, type ScopeItem, type TeamContractor, type TeamProjectInput } from "@/lib/domain/teams";

/** Alle actieve uitvoerders (bedrijven, zzp'ers en klussers) in de vorm die de teammotor verwacht. */
export async function loadTeamContractors(): Promise<TeamContractor[]> {
  const ids = (await sql<{ id: string }>("select id from contractors where status = 'actief'")).map((r) => r.id);
  const [contractors, rates, register] = await Promise.all([getContractorsByIds(ids), getRatesForContractors(ids), loadRegisterInfo(ids)]);
  return contractors.map((c) => ({
    id: c.id,
    slug: c.slug,
    company_name: c.company_name,
    is_demo: c.is_demo,
    specialties: c.specialties.map((s) => s.id),
    areas: c.areas,
    availability_status: c.availability_status,
    available_from: c.available_from,
    rates: rates
      .filter((r) => r.contractor_id === c.id)
      .map((r) => ({ specialty_id: r.specialty_id, description: r.description, unit: r.unit, price_min: r.price_min, price_max: r.price_max, vat_included: r.vat_included })),
    metrics: c.metrics,
    businessVerified: c.verification.businessVerified,
    provider_type: c.provider_type,
    register: register.get(c.id) ?? { signals: [], lastCheckedAt: null },
  }));
}

import { todayIso } from "@/lib/today";
export { todayIso };

export async function proposalsFor(scope: ScopeItem[], project: Omit<TeamProjectInput, "today">) {
  const contractors = await loadTeamContractors();
  const input = { ...project, today: todayIso() };
  return { proposals: buildProposals(scope, contractors, input), excluded: registerExclusions(scope, contractors, input) };
}
