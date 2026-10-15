import "server-only";
import { sql } from "@/lib/db";
import { getContractorsByIds, getRatesForContractors } from "./contractors";
import { buildProposals, type ScopeItem, type TeamContractor, type TeamProjectInput } from "@/lib/domain/teams";

/** Alle actieve aannemers in de vorm die de teammotor verwacht. */
export async function loadTeamContractors(): Promise<TeamContractor[]> {
  const ids = (await sql<{ id: string }>("select id from contractors where status = 'actief'")).map((r) => r.id);
  const [contractors, rates] = await Promise.all([getContractorsByIds(ids), getRatesForContractors(ids)]);
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
  }));
}

export function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date());
}

export async function proposalsFor(scope: ScopeItem[], project: Omit<TeamProjectInput, "today">) {
  const contractors = await loadTeamContractors();
  return buildProposals(scope, contractors, { ...project, today: todayIso() });
}
