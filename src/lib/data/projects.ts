import "server-only";
import { sql, sqlOne } from "@/lib/db";
import type { Queryable } from "@/lib/db";
import type { ProjectStatus } from "@/lib/domain/constants";

export type Project = {
  id: string;
  user_id: string;
  name: string;
  location: string;
  province: string | null;
  property_type: string;
  renovation_type: string;
  area_m2: number | null;
  budget_amount: number | null;
  budget_vat_included: boolean;
  desired_start_date: string | null;
  desired_completion_date: string | null;
  status: ProjectStatus;
  description: string;
  material_preferences: string | null;
  extra_requirements: string | null;
  notes: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
  specialty_ids: string[];
};

const COLUMNS = `p.id, p.user_id, p.name, p.location, p.province, p.property_type, p.renovation_type, p.area_m2, p.budget_amount,
  p.budget_vat_included, p.desired_start_date, p.desired_completion_date, p.status, p.description, p.material_preferences,
  p.extra_requirements, p.notes, p.is_demo, p.created_at::text as created_at, p.updated_at::text as updated_at,
  coalesce((select array_agg(ps.specialty_id order by ps.specialty_id) from project_specialties ps where ps.project_id = p.id), '{}') as specialty_ids`;

export async function listProjects(userId: string) {
  return sql<Project & { shortlist_count: number; request_count: number; quote_count: number }>(
    `select ${COLUMNS},
       (select count(*)::int from project_contractors pc where pc.project_id = p.id) as shortlist_count,
       (select count(*)::int from quote_requests qr where qr.project_id = p.id) as request_count,
       (select count(*)::int from quotes q where q.project_id = p.id) as quote_count
       from projects p where p.user_id = $1
      order by case when p.status in ('opgeleverd','geannuleerd') then 1 else 0 end, p.updated_at desc`,
    [userId],
  );
}

/** Haalt een project op; alleen voor de eigenaar (of beheer met allowAdmin). */
export async function getProjectForUser(id: string, user: { id: string; role: string }, opts: { allowAdmin?: boolean } = {}) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const project = await sqlOne<Project>(`select ${COLUMNS} from projects p where p.id = $1`, [id]);
  if (!project) return null;
  if (project.user_id !== user.id && !(opts.allowAdmin && user.role === "beheerder")) return null;
  return project;
}

export type ShortlistEntry = {
  id: string;
  contractor_id: string;
  status: string;
  notes: string | null;
  company_name: string;
  slug: string;
  is_demo: boolean;
  contractor_status: string;
};

export async function getShortlist(projectId: string) {
  return sql<ShortlistEntry>(
    `select pc.id, pc.contractor_id, pc.status, pc.notes, c.company_name, c.slug, c.is_demo, c.status as contractor_status
       from project_contractors pc join contractors c on c.id = pc.contractor_id
      where pc.project_id = $1 order by pc.created_at`,
    [projectId],
  );
}

export async function getProjectEvents(projectId: string) {
  return sql<{ id: string; event_type: string; message: string; created_at: string }>(
    "select id, event_type, message, created_at::text as created_at from project_events where project_id = $1 order by created_at desc limit 50",
    [projectId],
  );
}

export async function getProjectAttachments(projectId: string) {
  return sql<{ id: string; kind: string; file_name: string; mime_type: string; size_bytes: number; created_at: string }>(
    "select id, kind, file_name, mime_type, size_bytes, created_at::text as created_at from project_attachments where project_id = $1 order by created_at desc",
    [projectId],
  );
}

export async function addProjectEvent(db: Queryable | null, projectId: string, userId: string | null, type: string, message: string) {
  const text = "insert into project_events (project_id, user_id, event_type, message) values ($1,$2,$3,$4)";
  if (db) await db.query(text, [projectId, userId, type, message]);
  else await sql(text, [projectId, userId, type, message]);
}

export async function getActivityForUser(userId: string, limit = 8) {
  return sql<{ id: string; message: string; created_at: string; project_id: string; project_name: string }>(
    `select e.id, e.message, e.created_at::text as created_at, p.id as project_id, p.name as project_name
       from project_events e join projects p on p.id = e.project_id
      where p.user_id = $1 order by e.created_at desc limit $2`,
    [userId, limit],
  );
}
