"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql, sqlOne, transaction } from "@/lib/db";
import { env } from "@/lib/env";
import { assertUser, AuthError, FLIPPER_ROLES } from "@/lib/auth/session";
import { addProjectEvent, getProjectForUser } from "@/lib/data/projects";
import { attachmentKindSchema, parseForm, projectNotesSchema, projectSchema } from "@/lib/validation";
import { PROJECT_CONTRACTOR_STATUS, PROJECT_STATUS, type ProjectContractorStatus, type ProjectStatus } from "@/lib/domain/constants";
import type { ActionResult } from "@/lib/forms/types";

async function ownedProject(projectId: string) {
  const user = await assertUser(FLIPPER_ROLES);
  const project = await getProjectForUser(projectId, user);
  if (!project) throw new AuthError("Project niet gevonden of geen toegang.");
  return { user, project };
}

function handle(err: unknown): ActionResult<never> {
  if (err instanceof AuthError) return { ok: false, message: err.message };
  throw err;
}

export async function createProjectAction(fd: FormData): Promise<ActionResult> {
  let projectId: string;
  try {
    const user = await assertUser(FLIPPER_ROLES);
    const parsed = parseForm(projectSchema, fd);
    if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors, message: "Controleer de gemarkeerde velden." };
    const d = parsed.data;
    projectId = await transaction(async (tx) => {
      const [row] = await tx.query<{ id: string }>(
        `insert into projects (user_id, name, location, province, property_type, renovation_type, area_m2, budget_amount, budget_vat_included,
           desired_start_date, desired_completion_date, status, description, material_preferences, extra_requirements)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'orienteren',$12,$13,$14) returning id`,
        [user.id, d.name, d.location, d.province ?? null, d.property_type, d.renovation_type, d.area_m2 ?? null, d.budget_amount ?? null, d.budget_vat_included,
          d.desired_start_date ?? null, d.desired_completion_date ?? null, d.description, d.material_preferences ?? null, d.extra_requirements ?? null],
      );
      for (const s of d.specialty_ids) await tx.query("insert into project_specialties (project_id, specialty_id) values ($1,$2)", [row.id, s]);
      await addProjectEvent(tx, row.id, user.id, "aangemaakt", "Project aangemaakt");
      return row.id;
    });
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/dashboard");
  redirect(`/projecten/${projectId}?melding=project-aangemaakt`);
}

export async function updateProjectAction(projectId: string, fd: FormData): Promise<ActionResult> {
  try {
    const { user } = await ownedProject(projectId);
    const parsed = parseForm(projectSchema, fd);
    if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors, message: "Controleer de gemarkeerde velden." };
    const d = parsed.data;
    await transaction(async (tx) => {
      await tx.query(
        `update projects set name=$2, location=$3, province=$4, property_type=$5, renovation_type=$6, area_m2=$7, budget_amount=$8,
           budget_vat_included=$9, desired_start_date=$10, desired_completion_date=$11, description=$12, material_preferences=$13,
           extra_requirements=$14, status=coalesce($15, status), updated_at=now() where id=$1`,
        [projectId, d.name, d.location, d.province ?? null, d.property_type, d.renovation_type, d.area_m2 ?? null, d.budget_amount ?? null,
          d.budget_vat_included, d.desired_start_date ?? null, d.desired_completion_date ?? null, d.description, d.material_preferences ?? null,
          d.extra_requirements ?? null, d.status ?? null],
      );
      await tx.query("delete from project_specialties where project_id = $1", [projectId]);
      for (const s of d.specialty_ids) await tx.query("insert into project_specialties (project_id, specialty_id) values ($1,$2)", [projectId, s]);
      await addProjectEvent(tx, projectId, user.id, "bewerkt", "Projectgegevens bijgewerkt");
    });
  } catch (err) {
    return handle(err);
  }
  revalidatePath(`/projecten/${projectId}`);
  redirect(`/projecten/${projectId}?melding=project-bijgewerkt`);
}

export async function setProjectStatusAction(projectId: string, status: string): Promise<ActionResult> {
  try {
    const { user, project } = await ownedProject(projectId);
    if (!(status in PROJECT_STATUS)) return { ok: false, message: "Ongeldige status." };
    if (project.status === status) return { ok: true };
    await sql("update projects set status = $2, updated_at = now() where id = $1", [projectId, status]);
    await addProjectEvent(null, projectId, user.id, "status", `Status gewijzigd naar ${PROJECT_STATUS[status as ProjectStatus]}`);
  } catch (err) {
    return handle(err);
  }
  revalidatePath(`/projecten/${projectId}`);
  return { ok: true, message: "Status bijgewerkt." };
}

export async function saveProjectNotesAction(projectId: string, fd: FormData): Promise<ActionResult> {
  try {
    await ownedProject(projectId);
    const parsed = parseForm(projectNotesSchema, fd);
    if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
    await sql("update projects set notes = $2, updated_at = now() where id = $1", [projectId, parsed.data.notes ?? null]);
  } catch (err) {
    return handle(err);
  }
  revalidatePath(`/projecten/${projectId}`);
  return { ok: true, message: "Notities opgeslagen." };
}

export async function deleteProjectAction(projectId: string): Promise<ActionResult> {
  try {
    await ownedProject(projectId);
    const files = await sql<{ storage_path: string }>("select storage_path from project_attachments where project_id = $1", [projectId]);
    await sql("delete from projects where id = $1", [projectId]);
    for (const f of files) await fs.rm(path.resolve(uploadRoot(), f.storage_path), { force: true });
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/projecten");
  redirect("/projecten?melding=project-verwijderd");
}

// ── Shortlist ───────────────────────────────────────────────
export async function addToShortlistAction(projectId: string, contractorIds: string[]): Promise<ActionResult> {
  try {
    const { user } = await ownedProject(projectId);
    const valid = await sql<{ id: string; company_name: string }>(
      "select id, company_name from contractors where id = any($1::uuid[]) and status = 'actief'",
      [contractorIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id))],
    );
    let added = 0;
    for (const c of valid) {
      const rows = await sql(
        "insert into project_contractors (project_id, contractor_id) values ($1,$2) on conflict (project_id, contractor_id) do nothing returning id",
        [projectId, c.id],
      );
      if (rows.length) {
        added++;
        await addProjectEvent(null, projectId, user.id, "shortlist", `${c.company_name} toegevoegd aan de shortlist`);
      }
    }
    revalidatePath(`/projecten/${projectId}`);
    return { ok: true, message: added ? `${added} aannemer${added === 1 ? "" : "s"} toegevoegd aan de shortlist.` : "Staat al op de shortlist." };
  } catch (err) {
    return handle(err);
  }
}

export async function updateShortlistStatusAction(projectId: string, contractorId: string, status: string): Promise<ActionResult> {
  try {
    const { user } = await ownedProject(projectId);
    if (!(status in PROJECT_CONTRACTOR_STATUS)) return { ok: false, message: "Ongeldige status." };
    const row = await sqlOne<{ company_name: string }>(
      `update project_contractors pc set status = $3 from contractors c
        where pc.project_id = $1 and pc.contractor_id = $2 and c.id = pc.contractor_id returning c.company_name`,
      [projectId, contractorId, status],
    );
    if (row) {
      await addProjectEvent(null, projectId, user.id, "shortlist", `${row.company_name}: ${PROJECT_CONTRACTOR_STATUS[status as ProjectContractorStatus].toLowerCase()}`);
    }
  } catch (err) {
    return handle(err);
  }
  revalidatePath(`/projecten/${projectId}`);
  return { ok: true, message: "Status bijgewerkt." };
}

export async function removeFromShortlistAction(projectId: string, contractorId: string): Promise<ActionResult> {
  try {
    const { user } = await ownedProject(projectId);
    const row = await sqlOne<{ company_name: string }>(
      `delete from project_contractors pc using contractors c where pc.project_id = $1 and pc.contractor_id = $2 and c.id = pc.contractor_id returning c.company_name`,
      [projectId, contractorId],
    );
    if (row) await addProjectEvent(null, projectId, user.id, "shortlist", `${row.company_name} verwijderd van de shortlist`);
  } catch (err) {
    return handle(err);
  }
  revalidatePath(`/projecten/${projectId}`);
  return { ok: true, message: "Verwijderd van de shortlist." };
}

// ── Bijlagen ────────────────────────────────────────────────
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["application/pdf", ".pdf"],
]);

function uploadRoot() {
  return path.resolve(process.cwd(), env.dataDir, "uploads");
}

export async function uploadAttachmentAction(projectId: string, fd: FormData): Promise<ActionResult> {
  try {
    const { user } = await ownedProject(projectId);
    const kind = attachmentKindSchema.safeParse(fd.get("kind"));
    const file = fd.get("file");
    if (!kind.success) return { ok: false, fieldErrors: { kind: ["Kies een type bijlage."] } };
    if (!(file instanceof File) || file.size === 0) return { ok: false, fieldErrors: { file: ["Kies een bestand."] } };
    if (file.size > MAX_BYTES) return { ok: false, fieldErrors: { file: ["Het bestand is groter dan 10 MB."] } };
    const ext = ALLOWED.get(file.type);
    if (!ext) return { ok: false, fieldErrors: { file: ["Alleen JPG, PNG, WebP of PDF zijn toegestaan."] } };
    const buffer = Buffer.from(await file.arrayBuffer());
    // Controleer de bestandssignatuur, niet alleen het opgegeven MIME-type.
    const sig = buffer.subarray(0, 4).toString("hex");
    const okSig =
      (file.type === "application/pdf" && buffer.subarray(0, 4).toString() === "%PDF") ||
      (file.type === "image/png" && sig === "89504e47") ||
      (file.type === "image/jpeg" && sig.startsWith("ffd8ff")) ||
      (file.type === "image/webp" && buffer.subarray(8, 12).toString() === "WEBP");
    if (!okSig) return { ok: false, fieldErrors: { file: ["De inhoud van het bestand komt niet overeen met het bestandstype."] } };
    const storagePath = path.join(projectId, `${randomUUID()}${ext}`);
    await fs.mkdir(path.join(uploadRoot(), projectId), { recursive: true });
    await fs.writeFile(path.join(uploadRoot(), storagePath), buffer);
    const safeName = file.name.replace(/[^\w.\- ()À-ÿ]/g, "_").slice(0, 150) || `bijlage${ext}`;
    await sql(
      "insert into project_attachments (project_id, user_id, kind, file_name, mime_type, size_bytes, storage_path) values ($1,$2,$3,$4,$5,$6,$7)",
      [projectId, user.id, kind.data, safeName, file.type, file.size, storagePath],
    );
    await addProjectEvent(null, projectId, user.id, "bijlage", `Bijlage toegevoegd: ${safeName}`);
  } catch (err) {
    return handle(err);
  }
  revalidatePath(`/projecten/${projectId}`);
  return { ok: true, message: "Bijlage geüpload." };
}

export async function deleteAttachmentAction(projectId: string, attachmentId: string): Promise<ActionResult> {
  try {
    await ownedProject(projectId);
    const row = await sqlOne<{ storage_path: string }>(
      "delete from project_attachments where id = $1 and project_id = $2 returning storage_path",
      [attachmentId, projectId],
    );
    if (row) await fs.rm(path.resolve(uploadRoot(), row.storage_path), { force: true });
  } catch (err) {
    return handle(err);
  }
  revalidatePath(`/projecten/${projectId}`);
  return { ok: true, message: "Bijlage verwijderd." };
}
