import "server-only";
import { sql, sqlOne } from "@/lib/db";

export async function getAdminCounts() {
  return (await sqlOne<{
    contractors: number;
    pending_contractors: number;
    inactive_contractors: number;
    pending_verifications: number;
    pending_outcomes: number;
    open_flags: number;
    users: number;
    projects: number;
    quote_requests: number;
    new_leads: number;
  }>(`select
      (select count(*)::int from contractors where status = 'actief') as contractors,
      (select count(*)::int from contractors where status = 'in_beoordeling') as pending_contractors,
      (select count(*)::int from contractors where status = 'gedeactiveerd') as inactive_contractors,
      (select count(*)::int from verification_events where status = 'aangevraagd') as pending_verifications,
      (select count(*)::int from project_outcomes where moderation_status = 'in_behandeling') as pending_outcomes,
      (select count(*)::int from flags where status in ('open','in_behandeling')) as open_flags,
      (select count(*)::int from users) as users,
      (select count(*)::int from projects) as projects,
      (select count(*)::int from quote_requests) as quote_requests,
      (select count(*)::int from interest_leads where status = 'nieuw') as new_leads`))!;
}

export async function listAdminActions(limit = 30) {
  return sql<{ id: string; action: string; entity_type: string; entity_id: string | null; details: Record<string, unknown>; created_at: string; admin_name: string | null }>(
    `select a.id, a.action, a.entity_type, a.entity_id, a.details, a.created_at::text as created_at, u.name as admin_name
       from admin_actions a left join users u on u.id = a.admin_user_id order by a.created_at desc limit $1`,
    [limit],
  );
}

export async function listAllContractors() {
  return sql<{ id: string; slug: string; company_name: string; city: string | null; status: string; is_demo: boolean; owner_email: string | null; outcomes: number; updated_at: string; business_verified: boolean }>(
    `select c.id, c.slug, c.company_name, c.city, c.status, c.is_demo, u.email as owner_email, c.updated_at::text as updated_at,
            (select count(*)::int from project_outcomes o where o.contractor_id = c.id) as outcomes,
            exists (select 1 from verification_events v where v.contractor_id = c.id and v.verification_type = 'bedrijfsgegevens' and v.status = 'goedgekeurd') as business_verified
       from contractors c left join users u on u.id = c.owner_user_id
      order by case c.status when 'in_beoordeling' then 0 when 'actief' then 1 else 2 end, c.company_name`,
  );
}

export async function getContractorPrivate(id: string) {
  return sqlOne<{ contact_person_name: string | null; contact_person_email: string | null; internal_notes: string | null }>(
    "select contact_person_name, contact_person_email, internal_notes from contractor_private where contractor_id = $1",
    [id],
  );
}

export async function listVerificationEvents(status?: string) {
  return sql<{ id: string; contractor_id: string; company_name: string; is_demo: boolean; verification_type: string; status: string; evidence_reference: string | null; notes: string | null; created_at: string; reviewed_at: string | null; reviewer: string | null; kvk_number: string | null }>(
    `select v.id, v.contractor_id, c.company_name, v.is_demo, v.verification_type, v.status, v.evidence_reference, v.notes, v.created_at::text as created_at,
            v.reviewed_at::text as reviewed_at, u.name as reviewer, c.kvk_number
       from verification_events v join contractors c on c.id = v.contractor_id left join users u on u.id = v.reviewed_by
      where v.project_outcome_id is null ${status ? "and v.status = $1" : ""}
      order by case v.status when 'aangevraagd' then 0 else 1 end, v.created_at desc limit 200`,
    status ? [status] : [],
  );
}

export type AdminOutcome = {
  id: string;
  contractor_id: string;
  company_name: string;
  project_name: string | null;
  submitter: string | null;
  source: string;
  initial_budget: number | null;
  final_cost: number | null;
  amounts_vat_included: boolean;
  planned_completion_date: string | null;
  actual_completion_date: string | null;
  rework_required: boolean | null;
  extra_costs_reason: string | null;
  verification_status: string;
  moderation_status: string;
  evidence_reference: string | null;
  is_demo: boolean;
  created_at: string;
  review_id: string | null;
  rating: number | null;
  review_text: string | null;
  review_moderation: string | null;
  contractor_response: string | null;
};

export async function listOutcomesForModeration(filter: "open" | "alle" | "betwist") {
  const where =
    filter === "open" ? "where o.moderation_status = 'in_behandeling'" : filter === "betwist" ? "where o.verification_status = 'betwist'" : "";
  return sql<AdminOutcome>(
    `select o.id, o.contractor_id, c.company_name, p.name as project_name, u.name as submitter, o.source, o.initial_budget, o.final_cost, o.amounts_vat_included,
            o.planned_completion_date, o.actual_completion_date, o.rework_required, o.extra_costs_reason, o.verification_status, o.moderation_status,
            o.evidence_reference, o.is_demo, o.created_at::text as created_at, r.id as review_id, r.rating, r.review_text, r.moderation_status as review_moderation,
            r.contractor_response
       from project_outcomes o join contractors c on c.id = o.contractor_id left join projects p on p.id = o.project_id
       left join users u on u.id = o.submitted_by left join reviews r on r.outcome_id = o.id
       ${where}
      order by case o.moderation_status when 'in_behandeling' then 0 else 1 end, o.created_at desc limit 100`,
  );
}

export async function listFlags(open: boolean) {
  return sql<{ id: string; entity_type: string; entity_id: string; contractor_id: string | null; company_name: string | null; slug: string | null; reason: string; details: string; reporter: string | null; status: string; resolution: string | null; created_at: string }>(
    `select f.id, f.entity_type, f.entity_id, f.contractor_id, c.company_name, c.slug, f.reason, f.details, u.name as reporter, f.status, f.resolution, f.created_at::text as created_at
       from flags f left join contractors c on c.id = f.contractor_id left join users u on u.id = f.reporter_user_id
      ${open ? "where f.status in ('open','in_behandeling')" : ""}
      order by f.created_at desc limit 200`,
  );
}

export async function listAllProjects() {
  return sql<{ id: string; name: string; owner: string; owner_email: string; status: string; location: string; budget_amount: number | null; budget_vat_included: boolean; is_demo: boolean; created_at: string; shortlist: number; outcomes: number }>(
    `select p.id, p.name, u.name as owner, u.email as owner_email, p.status, p.location, p.budget_amount, p.budget_vat_included, p.is_demo, p.created_at::text as created_at,
            (select count(*)::int from project_contractors pc where pc.project_id = p.id) as shortlist,
            (select count(*)::int from project_outcomes o where o.project_id = p.id) as outcomes
       from projects p join users u on u.id = p.user_id order by p.created_at desc limit 300`,
  );
}

export async function listAllQuoteRequests() {
  return sql<{ id: string; project_name: string; company_name: string; requester: string; status: string; delivery_channel: string | null; created_at: string; sent_at: string | null; is_demo: boolean }>(
    `select qr.id, p.name as project_name, c.company_name, u.name as requester, qr.status, qr.delivery_channel, qr.created_at::text as created_at, qr.sent_at::text as sent_at, qr.is_demo
       from quote_requests qr join projects p on p.id = qr.project_id join contractors c on c.id = qr.contractor_id join users u on u.id = qr.user_id
      order by qr.created_at desc limit 300`,
  );
}

export async function listUsers() {
  return sql<{ id: string; name: string; email: string; role: string; company_name: string | null; is_active: boolean; is_demo: boolean; created_at: string; projects: number }>(
    `select u.id, u.name, u.email, u.role, u.company_name, u.is_active, u.is_demo, u.created_at::text as created_at,
            (select count(*)::int from projects p where p.user_id = u.id) as projects
       from users u order by u.created_at desc limit 500`,
  );
}

export async function listLeads() {
  return sql<{ id: string; lead_type: string; name: string; email: string; company: string | null; phone: string | null; message: string | null; status: string; created_at: string }>(
    "select id, lead_type, name, email, company, phone, message, status, created_at::text as created_at from interest_leads order by created_at desc limit 300",
  );
}
