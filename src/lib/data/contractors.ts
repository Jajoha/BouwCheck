import "server-only";
import { sql, sqlOne } from "@/lib/db";
import { site } from "@/config/site";
import { computeMetrics, dataCompleteness, type ContractorMetrics, type OutcomeInput, type ReviewInput } from "@/lib/domain/metrics";
import { summarizeVerification, VERIFICATION_LEVELS, type VerificationSummary, type VerificationLevel } from "@/lib/domain/verification";
import { AVAILABILITY_ORDER, PRICE_LEVEL_ORDER, type AvailabilityStatus, type PriceLevel, type ProviderType } from "@/lib/domain/constants";

/** Openbare aannemersgegevens. Bevat bewust geen velden uit contractor_private. */
export type ContractorSummary = {
  id: string;
  slug: string;
  company_name: string;
  provider_type: ProviderType;
  description: string;
  city: string | null;
  hq_province: string | null;
  price_level: PriceLevel;
  availability_status: AvailabilityStatus;
  available_from: string | null;
  availability_updated_at: string | null;
  project_types: string[];
  status: string;
  is_demo: boolean;
  owner_user_id: string | null;
  specialties: { id: string; name: string; is_primary: boolean }[];
  areas: string[];
  rateCount: number;
  metrics: ContractorMetrics;
  verification: VerificationSummary;
  completeness: number;
  updated_at: string;
};

const BASE_COLUMNS = `c.id, c.slug, c.company_name, c.provider_type, c.description, c.city, c.hq_province, c.price_level, c.availability_status,
  c.available_from, c.availability_updated_at::text as availability_updated_at, c.project_types, c.status, c.is_demo, c.owner_user_id,
  c.updated_at::text as updated_at`;

type BaseRow = Omit<ContractorSummary, "specialties" | "areas" | "rateCount" | "metrics" | "verification" | "completeness">;

async function hydrate(rows: BaseRow[]): Promise<ContractorSummary[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [specs, areas, outcomes, reviews, events, rates] = await Promise.all([
    sql<{ contractor_id: string; id: string; name: string; is_primary: boolean }>(
      `select cs.contractor_id, s.id, s.name, cs.is_primary from contractor_specialties cs join specialties s on s.id = cs.specialty_id
        where cs.contractor_id = any($1::uuid[]) order by cs.is_primary desc, s.sort_order`,
      [ids],
    ),
    sql<{ contractor_id: string; province: string }>(
      "select contractor_id, province from contractor_service_areas where contractor_id = any($1::uuid[]) order by province",
      [ids],
    ),
    sql<OutcomeInput & { contractor_id: string }>(
      `select contractor_id, moderation_status, verification_status, initial_budget, final_cost, planned_completion_date,
              actual_completion_date, start_date, rework_required, created_at::text as created_at, updated_at::text as updated_at
         from project_outcomes where contractor_id = any($1::uuid[])`,
      [ids],
    ),
    sql<ReviewInput & { contractor_id: string }>(
      `select contractor_id, moderation_status, rating, quality_rating, communication_rating, reliability_rating, created_at::text as created_at
         from reviews where contractor_id = any($1::uuid[])`,
      [ids],
    ),
    sql<{ contractor_id: string; verification_type: string }>(
      `select distinct contractor_id, verification_type from verification_events
        where contractor_id = any($1::uuid[]) and status = 'goedgekeurd' and project_outcome_id is null`,
      [ids],
    ),
    sql<{ contractor_id: string; n: number }>(
      "select contractor_id, count(*)::int as n from contractor_rates where contractor_id = any($1::uuid[]) group by contractor_id",
      [ids],
    ),
  ]);
  const group = <T extends { contractor_id: string }>(list: T[]) => {
    const map = new Map<string, T[]>();
    for (const item of list) map.set(item.contractor_id, [...(map.get(item.contractor_id) ?? []), item]);
    return map;
  };
  const specMap = group(specs);
  const areaMap = group(areas);
  const outcomeMap = group(outcomes);
  const reviewMap = group(reviews);
  const eventMap = group(events);
  const rateMap = new Map(rates.map((r) => [r.contractor_id, r.n]));

  return rows.map((row) => {
    const metrics = computeMetrics(outcomeMap.get(row.id) ?? [], reviewMap.get(row.id) ?? [], {
      minSample: site.minSampleSize,
      staleAfterMonths: site.staleAfterMonths,
    });
    const verification = summarizeVerification({
      approvedEventTypes: (eventMap.get(row.id) ?? []).map((e) => e.verification_type),
      clientConfirmedProjects: metrics.clientConfirmedProjects,
      verifiedProjects: metrics.verifiedProjects,
    });
    const rateCount = rateMap.get(row.id) ?? 0;
    return {
      ...row,
      specialties: (specMap.get(row.id) ?? []).map(({ id, name, is_primary }) => ({ id, name, is_primary })),
      areas: (areaMap.get(row.id) ?? []).map((a) => a.province),
      rateCount,
      metrics,
      verification,
      completeness: dataCompleteness(metrics, {
        hasRates: rateCount > 0,
        availabilityKnown: row.availability_status !== "onbekend",
        priceLevelKnown: row.price_level !== "onbekend",
        businessVerified: verification.businessVerified,
      }),
    };
  });
}

export type ContractorFilters = {
  q?: string;
  specialty?: string;
  province?: string;
  priceLevel?: string;
  availability?: string; // maximale beschikbaarheid, bijv. 'binnen_1_maand'
  projectType?: string;
  verification?: string; // minimaal verificatieniveau
  minRating?: number;
  minProjects?: number;
  minOnTime?: number;
  maxBudgetDeviation?: number;
  sort?: "relevantie" | "prijs" | "beoordeling" | "ervaring" | "op_tijd" | "beschikbaarheid" | "compleetheid";
  page?: number;
  pageSize?: number;
};

export type ContractorListResult = {
  items: ContractorSummary[];
  total: number;
  page: number;
  pageCount: number;
  /** Uitleg wanneer sortering deels op onvoldoende gegevens stuit */
  sortNote: string | null;
};

export async function listContractors(filters: ContractorFilters): Promise<ContractorListResult> {
  const where: string[] = ["c.status = 'actief'"];
  const params: unknown[] = [];
  const p = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  if (filters.q) {
    const term = p(`%${filters.q.toLowerCase()}%`);
    where.push(`(lower(c.company_name) like ${term} or lower(c.description) like ${term} or lower(coalesce(c.city,'')) like ${term})`);
  }
  if (filters.specialty) {
    where.push(`exists (select 1 from contractor_specialties cs where cs.contractor_id = c.id and cs.specialty_id = ${p(filters.specialty)})`);
  }
  if (filters.province) {
    where.push(`exists (select 1 from contractor_service_areas a where a.contractor_id = c.id and a.province = ${p(filters.province)})`);
  }
  if (filters.priceLevel) where.push(`c.price_level = ${p(filters.priceLevel)}`);
  if (filters.projectType) where.push(`${p(filters.projectType)} = any(c.project_types)`);

  const rows = await sql<BaseRow>(`select ${BASE_COLUMNS} from contractors c where ${where.join(" and ")} order by c.company_name`, params);
  let items = await hydrate(rows);

  // Filters op afgeleide gegevens (berekend in de applicatielaag)
  if (filters.availability && filters.availability in AVAILABILITY_ORDER) {
    const max = AVAILABILITY_ORDER[filters.availability as AvailabilityStatus];
    items = items.filter((c) => AVAILABILITY_ORDER[c.availability_status] <= max);
  }
  if (filters.verification && filters.verification in VERIFICATION_LEVELS) {
    const level = filters.verification as VerificationLevel;
    items = items.filter((c) => level === "zelf_opgegeven" || c.verification.levels.includes(level));
  }
  if (filters.minRating) {
    items = items.filter((c) => c.metrics.rating.status === "ok" && c.metrics.rating.value! >= filters.minRating!);
  }
  if (filters.minProjects) items = items.filter((c) => c.metrics.registeredProjects >= filters.minProjects!);
  if (filters.minOnTime) {
    items = items.filter((c) => c.metrics.onTime.status === "ok" && c.metrics.onTime.value! >= filters.minOnTime!);
  }
  if (filters.maxBudgetDeviation !== undefined) {
    items = items.filter((c) => c.metrics.budgetDeviation.status === "ok" && c.metrics.budgetDeviation.value! <= filters.maxBudgetDeviation!);
  }

  const { sorted, note } = sortContractors(items, filters.sort ?? "relevantie", filters);
  const pageSize = filters.pageSize ?? 9;
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = Math.min(Math.max(1, filters.page ?? 1), pageCount);
  return {
    items: sorted.slice((page - 1) * pageSize, page * pageSize),
    total: sorted.length,
    page,
    pageCount,
    sortNote: note,
  };
}

/**
 * Sortering. Aannemers zonder voldoende gegevens voor het gekozen criterium
 * komen altijd achteraan (alfabetisch) en worden niet tussen de anderen
 * gerangschikt. Betaling heeft nooit invloed op de volgorde.
 */
export function sortContractors(items: ContractorSummary[], sort: NonNullable<ContractorFilters["sort"]>, filters: ContractorFilters = {}) {
  const byName = (a: ContractorSummary, b: ContractorSummary) => a.company_name.localeCompare(b.company_name, "nl");
  const partition = (has: (c: ContractorSummary) => boolean, cmp: (a: ContractorSummary, b: ContractorSummary) => number, label: string) => {
    const withData = items.filter(has).sort((a, b) => cmp(a, b) || byName(a, b));
    const without = items.filter((c) => !has(c)).sort(byName);
    return {
      sorted: [...withData, ...without],
      note: without.length
        ? `${without.length} ${without.length === 1 ? "aannemer heeft" : "aannemers hebben"} nog onvoldoende gegevens voor sortering op ${label} en ${without.length === 1 ? "staat" : "staan"} onderaan.`
        : null,
    };
  };
  switch (sort) {
    case "prijs":
      return partition((c) => c.price_level !== "onbekend", (a, b) => PRICE_LEVEL_ORDER[a.price_level] - PRICE_LEVEL_ORDER[b.price_level], "prijsniveau");
    case "beoordeling":
      return partition((c) => c.metrics.rating.status === "ok", (a, b) => b.metrics.rating.value! - a.metrics.rating.value!, "beoordeling");
    case "ervaring":
      return { sorted: [...items].sort((a, b) => b.metrics.registeredProjects - a.metrics.registeredProjects || b.metrics.verifiedProjects - a.metrics.verifiedProjects || byName(a, b)), note: null };
    case "op_tijd":
      return partition((c) => c.metrics.onTime.status === "ok", (a, b) => b.metrics.onTime.value! - a.metrics.onTime.value!, "tijdige oplevering");
    case "beschikbaarheid":
      return partition((c) => c.availability_status !== "onbekend", (a, b) => AVAILABILITY_ORDER[a.availability_status] - AVAILABILITY_ORDER[b.availability_status], "beschikbaarheid");
    case "compleetheid":
      return { sorted: [...items].sort((a, b) => b.completeness - a.completeness || byName(a, b)), note: null };
    case "relevantie":
    default: {
      // Relevantie: primair vakgebied komt overeen, daarna tekstmatch op naam, daarna compleetheid van gegevens.
      const q = filters.q?.toLowerCase();
      const score = (c: ContractorSummary) =>
        (filters.specialty && c.specialties.find((s) => s.id === filters.specialty)?.is_primary ? 2 : 0) +
        (q && c.company_name.toLowerCase().includes(q) ? 1 : 0) +
        c.completeness;
      return { sorted: [...items].sort((a, b) => score(b) - score(a) || byName(a, b)), note: null };
    }
  }
}

export async function getContractorsByIds(ids: string[], opts: { includeInactive?: boolean } = {}) {
  if (ids.length === 0) return [];
  const rows = await sql<BaseRow>(
    `select ${BASE_COLUMNS} from contractors c where c.id = any($1::uuid[]) ${opts.includeInactive ? "" : "and c.status = 'actief'"}`,
    [ids],
  );
  const hydrated = await hydrate(rows);
  return ids.map((id) => hydrated.find((c) => c.id === id)).filter((c): c is ContractorSummary => Boolean(c));
}

export async function getContractorSummaryById(id: string, opts: { includeInactive?: boolean } = {}) {
  return (await getContractorsByIds([id], opts))[0] ?? null;
}

export type ContractorRate = {
  id: string;
  specialty_id: string;
  specialty_name: string;
  description: string;
  unit: string;
  price_min: number;
  price_max: number;
  vat_included: boolean;
  materials_included: boolean | null;
  updated_at: string;
};

export type ContractorDetail = ContractorSummary & {
  kvk_number: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  team_size: number | null;
  founded_year: number | null;
  created_at: string;
  rates: ContractorRate[];
  references: { id: string; title: string; city: string | null; property_type: string | null; renovation_type: string | null; year: number | null; description: string; work_items: string[] }[];
  outcomes: PublicOutcome[];
  reviews: PublicReview[];
  businessVerification: { reviewed_at: string; evidence_reference: string | null; is_demo: boolean } | null;
};

export type PublicOutcome = {
  id: string;
  property_type: string | null;
  renovation_type: string | null;
  city: string | null;
  province: string | null;
  work_specialty_ids: string[];
  start_date: string | null;
  initial_budget: number | null;
  final_cost: number | null;
  amounts_vat_included: boolean;
  planned_completion_date: string | null;
  actual_completion_date: string | null;
  rework_required: boolean | null;
  verification_status: string;
  moderation_status: string;
  source: string;
  is_demo: boolean;
  created_at: string;
};

export type PublicReview = {
  id: string;
  rating: number;
  quality_rating: number | null;
  communication_rating: number | null;
  reliability_rating: number | null;
  review_text: string;
  verification_status: string;
  contractor_response: string | null;
  contractor_response_at: string | null;
  is_demo: boolean;
  created_at: string;
  renovation_type: string | null;
  city: string | null;
};

export async function getContractorDetail(slug: string, opts: { includeInactive?: boolean } = {}): Promise<ContractorDetail | null> {
  const row = await sqlOne<BaseRow & Pick<ContractorDetail, "kvk_number" | "email" | "phone" | "website" | "team_size" | "founded_year" | "created_at">>(
    `select ${BASE_COLUMNS}, c.kvk_number, c.email, c.phone, c.website, c.team_size, c.founded_year, c.created_at::text as created_at
       from contractors c where c.slug = $1 ${opts.includeInactive ? "" : "and c.status = 'actief'"}`,
    [slug],
  );
  if (!row) return null;
  const [summary] = await hydrate([row]);
  const [rates, references, outcomes, reviews, business] = await Promise.all([
    sql<ContractorRate>(
      `select r.id, r.specialty_id, s.name as specialty_name, r.description, r.unit, r.price_min, r.price_max, r.vat_included,
              r.materials_included, r.updated_at::text as updated_at
         from contractor_rates r join specialties s on s.id = r.specialty_id where r.contractor_id = $1 order by s.sort_order, r.price_min`,
      [row.id],
    ),
    sql<ContractorDetail["references"][number]>(
      "select id, title, city, property_type, renovation_type, year, description, work_items from contractor_references where contractor_id = $1 order by year desc nulls last",
      [row.id],
    ),
    sql<PublicOutcome>(
      `select id, property_type, renovation_type, city, province, work_specialty_ids, start_date, initial_budget, final_cost, amounts_vat_included,
              planned_completion_date, actual_completion_date, rework_required, verification_status, moderation_status, source, is_demo,
              created_at::text as created_at
         from project_outcomes where contractor_id = $1 and moderation_status = 'goedgekeurd'
        order by actual_completion_date desc nulls last`,
      [row.id],
    ),
    sql<PublicReview>(
      `select r.id, r.rating, r.quality_rating, r.communication_rating, r.reliability_rating, r.review_text, r.verification_status,
              r.contractor_response, r.contractor_response_at::text as contractor_response_at, r.is_demo, r.created_at::text as created_at,
              o.renovation_type, o.city
         from reviews r join project_outcomes o on o.id = r.outcome_id
        where r.contractor_id = $1 and r.moderation_status = 'gepubliceerd'
        order by r.created_at desc`,
      [row.id],
    ),
    sqlOne<{ reviewed_at: string; evidence_reference: string | null; is_demo: boolean }>(
      `select reviewed_at::text as reviewed_at, evidence_reference, is_demo from verification_events
        where contractor_id = $1 and verification_type = 'bedrijfsgegevens' and status = 'goedgekeurd' order by reviewed_at desc limit 1`,
      [row.id],
    ),
  ]);
  return { ...row, ...summary, rates, references, outcomes, reviews, businessVerification: business };
}

export async function getRatesForContractors(ids: string[]) {
  if (ids.length === 0) return [];
  return sql<ContractorRate & { contractor_id: string }>(
    `select r.contractor_id, r.id, r.specialty_id, s.name as specialty_name, r.description, r.unit, r.price_min, r.price_max, r.vat_included,
            r.materials_included, r.updated_at::text as updated_at
       from contractor_rates r join specialties s on s.id = r.specialty_id
      where r.contractor_id = any($1::uuid[]) order by s.sort_order, r.price_min`,
    [ids],
  );
}

/** Lichte lijst voor keuzelijsten (bijv. beheer). */
export async function listContractorOptions() {
  return sql<{ id: string; company_name: string; is_demo: boolean }>(
    "select id, company_name, is_demo from contractors where status = 'actief' order by company_name",
  );
}
