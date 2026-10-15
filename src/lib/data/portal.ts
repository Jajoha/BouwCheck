import "server-only";
import { sql, sqlOne } from "@/lib/db";

export async function getOwnContractor(userId: string) {
  return getContractorForEdit({ ownerUserId: userId });
}

/** Volledige bewerkbare profielgegevens (portaal en beheer). Alleen na autorisatie aanroepen. */
export async function getContractorForEdit(by: { ownerUserId: string } | { id: string }) {
  return sqlOne<{
    id: string;
    slug: string;
    company_name: string;
    description: string;
    city: string | null;
    hq_province: string | null;
    kvk_number: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    price_level: string;
    availability_status: string;
    available_from: string | null;
    team_size: number | null;
    founded_year: number | null;
    project_types: string[];
    status: string;
    is_demo: boolean;
    specialty_ids: string[];
    primary_specialty: string | null;
    areas: string[];
  }>(
    `select c.id, c.slug, c.company_name, c.description, c.city, c.hq_province, c.kvk_number, c.email, c.phone, c.website, c.price_level,
            c.availability_status, c.available_from, c.team_size, c.founded_year, c.project_types, c.status, c.is_demo,
            coalesce((select array_agg(specialty_id) from contractor_specialties where contractor_id = c.id), '{}') as specialty_ids,
            (select specialty_id from contractor_specialties where contractor_id = c.id and is_primary limit 1) as primary_specialty,
            coalesce((select array_agg(province order by province) from contractor_service_areas where contractor_id = c.id), '{}') as areas
       from contractors c where ${"id" in by ? "c.id = $1" : "c.owner_user_id = $1"}`,
    ["id" in by ? by.id : by.ownerUserId],
  );
}

export async function getVerificationEvents(contractorId: string) {
  return sql<{ id: string; verification_type: string; status: string; evidence_reference: string | null; notes: string | null; created_at: string; reviewed_at: string | null; project_outcome_id: string | null }>(
    `select id, verification_type, status, evidence_reference, notes, created_at::text as created_at, reviewed_at::text as reviewed_at, project_outcome_id
       from verification_events where contractor_id = $1 order by created_at desc`,
    [contractorId],
  );
}

export async function getReviewsForContractorOwner(contractorId: string) {
  return sql<{ id: string; rating: number; review_text: string; moderation_status: string; contractor_response: string | null; created_at: string; is_demo: boolean }>(
    `select id, rating, review_text, moderation_status, contractor_response, created_at::text as created_at, is_demo
       from reviews where contractor_id = $1 and moderation_status <> 'afgewezen' order by created_at desc limit 50`,
    [contractorId],
  );
}
