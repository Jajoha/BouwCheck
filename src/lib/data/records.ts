import "server-only";
import { sql } from "@/lib/db";
import type { PriceType, QuoteRequestStatus } from "@/lib/domain/constants";

// ── Offertes ─────────────────────────────────────────────────
export type Quote = {
  id: string;
  project_id: string;
  contractor_id: string;
  company_name: string;
  price_type: PriceType;
  amount: number;
  vat_included: boolean;
  materials_included: boolean | null;
  scope_specialty_ids: string[];
  scope_description: string;
  inclusions: string | null;
  exclusions: string | null;
  estimated_duration_days: number | null;
  earliest_start_date: string | null;
  validity_date: string | null;
  status: string;
  source: string;
  is_demo: boolean;
  created_at: string;
};

const QUOTE_COLUMNS = `q.id, q.project_id, q.contractor_id, c.company_name, q.price_type, q.amount, q.vat_included, q.materials_included,
  q.scope_specialty_ids, q.scope_description, q.inclusions, q.exclusions, q.estimated_duration_days, q.earliest_start_date,
  q.validity_date, q.status, q.source, q.is_demo, q.created_at::text as created_at`;

export async function getQuotesForProject(projectId: string) {
  return sql<Quote>(
    `select ${QUOTE_COLUMNS} from quotes q join contractors c on c.id = q.contractor_id where q.project_id = $1 order by q.created_at desc`,
    [projectId],
  );
}

/** Meest recente offerte per aannemer voor een project. */
export async function getLatestQuotes(projectId: string, contractorIds: string[]) {
  if (contractorIds.length === 0) return [];
  return sql<Quote>(
    `select distinct on (q.contractor_id) ${QUOTE_COLUMNS}
       from quotes q join contractors c on c.id = q.contractor_id
      where q.project_id = $1 and q.contractor_id = any($2::uuid[]) and q.status <> 'verlopen'
      order by q.contractor_id, q.created_at desc`,
    [projectId, contractorIds],
  );
}

// ── Offerteaanvragen ────────────────────────────────────────
export type QuoteRequest = {
  id: string;
  project_id: string;
  project_name: string;
  contractor_id: string;
  company_name: string;
  contractor_slug: string;
  contractor_is_demo: boolean;
  contractor_has_account: boolean;
  user_id: string;
  work_description: string;
  specialty_ids: string[];
  budget_indication: number | null;
  budget_vat_included: boolean;
  desired_start_date: string | null;
  desired_completion_date: string | null;
  additional_notes: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  status: QuoteRequestStatus;
  delivery_channel: "platform" | "demo" | null;
  sent_at: string | null;
  contractor_response: string | null;
  responded_at: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

const QR_COLUMNS = `qr.id, qr.project_id, p.name as project_name, qr.contractor_id, c.company_name, c.slug as contractor_slug,
  c.is_demo as contractor_is_demo, (c.owner_user_id is not null) as contractor_has_account, qr.user_id, qr.work_description,
  qr.specialty_ids, qr.budget_indication, qr.budget_vat_included, qr.desired_start_date, qr.desired_completion_date,
  qr.additional_notes, qr.contact_name, qr.contact_email, qr.contact_phone, qr.status, qr.delivery_channel,
  qr.sent_at::text as sent_at, qr.contractor_response, qr.responded_at::text as responded_at, qr.is_demo,
  qr.created_at::text as created_at, qr.updated_at::text as updated_at`;
const QR_FROM = "from quote_requests qr join projects p on p.id = qr.project_id join contractors c on c.id = qr.contractor_id";

export async function listQuoteRequestsForUser(userId: string, opts: { projectId?: string; limit?: number } = {}) {
  const params: unknown[] = [userId];
  let extra = "";
  if (opts.projectId) {
    params.push(opts.projectId);
    extra = ` and qr.project_id = $${params.length}`;
  }
  params.push(opts.limit ?? 200);
  return sql<QuoteRequest>(`select ${QR_COLUMNS} ${QR_FROM} where qr.user_id = $1${extra} order by qr.updated_at desc limit $${params.length}`, params);
}

export async function getQuoteRequest(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await sql<QuoteRequest>(`select ${QR_COLUMNS} ${QR_FROM} where qr.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function listQuoteRequestsForContractor(contractorId: string) {
  // Aannemers zien alleen aanvragen die daadwerkelijk via het platform zijn verzonden.
  return sql<QuoteRequest>(
    `select ${QR_COLUMNS} ${QR_FROM} where qr.contractor_id = $1 and qr.delivery_channel = 'platform' order by qr.sent_at desc`,
    [contractorId],
  );
}

export async function getQuoteRequestAttachments(quoteRequestId: string) {
  return sql<{ id: string; file_name: string; kind: string; size_bytes: number }>(
    `select a.id, a.file_name, a.kind, a.size_bytes from quote_request_attachments qa join project_attachments a on a.id = qa.attachment_id
      where qa.quote_request_id = $1`,
    [quoteRequestId],
  );
}

// ── Favorieten ──────────────────────────────────────────────
export async function getFavoriteIds(userId: string) {
  const rows = await sql<{ contractor_id: string }>("select contractor_id from favorites where user_id = $1", [userId]);
  return new Set(rows.map((r) => r.contractor_id));
}

export async function listFavoriteContractorIds(userId: string) {
  const rows = await sql<{ contractor_id: string }>(
    "select f.contractor_id from favorites f join contractors c on c.id = f.contractor_id where f.user_id = $1 and c.status = 'actief' order by f.created_at desc",
    [userId],
  );
  return rows.map((r) => r.contractor_id);
}

// ── Vergelijkingen ──────────────────────────────────────────
export type SavedComparison = {
  id: string;
  name: string;
  notes: string | null;
  project_id: string | null;
  project_name: string | null;
  created_at: string;
  updated_at: string;
  contractor_ids: string[];
  contractor_names: string[];
};

export async function listComparisons(userId: string, limit = 100) {
  return sql<SavedComparison>(
    `select cmp.id, cmp.name, cmp.notes, cmp.project_id, p.name as project_name, cmp.created_at::text as created_at, cmp.updated_at::text as updated_at,
            coalesce(array_agg(ci.contractor_id order by ci.position) filter (where ci.contractor_id is not null), '{}') as contractor_ids,
            coalesce(array_agg(c.company_name order by ci.position) filter (where c.company_name is not null), '{}') as contractor_names
       from comparisons cmp
       left join projects p on p.id = cmp.project_id
       left join comparison_items ci on ci.comparison_id = cmp.id
       left join contractors c on c.id = ci.contractor_id
      where cmp.user_id = $1
      group by cmp.id, p.name
      order by cmp.updated_at desc limit $2`,
    [userId, limit],
  );
}

// ── Projectresultaten ───────────────────────────────────────
export async function getOutcomesForProject(projectId: string) {
  return sql<{
    id: string;
    contractor_id: string;
    company_name: string;
    initial_budget: number | null;
    final_cost: number | null;
    planned_completion_date: string | null;
    actual_completion_date: string | null;
    verification_status: string;
    moderation_status: string;
    rating: number | null;
    review_moderation: string | null;
    created_at: string;
  }>(
    `select o.id, o.contractor_id, c.company_name, o.initial_budget, o.final_cost, o.planned_completion_date, o.actual_completion_date,
            o.verification_status, o.moderation_status, r.rating, r.moderation_status as review_moderation, o.created_at::text as created_at
       from project_outcomes o join contractors c on c.id = o.contractor_id left join reviews r on r.outcome_id = o.id
      where o.project_id = $1 order by o.created_at desc`,
    [projectId],
  );
}
