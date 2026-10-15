"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb, sql, sqlOne, transaction } from "@/lib/db";
import { ALLOWED_UPLOADS, hasValidSignature, storeProjectFile } from "@/lib/uploads";
import { deleteFiles } from "@/lib/storage";
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
    await deleteFiles(files.map((f) => f.storage_path)).catch((err) => console.error("Bijlagen verwijderen mislukt", err));
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

export async function uploadAttachmentAction(projectId: string, fd: FormData): Promise<ActionResult> {
  try {
    const { user } = await ownedProject(projectId);
    const kind = attachmentKindSchema.safeParse(fd.get("kind"));
    const file = fd.get("file");
    if (!kind.success) return { ok: false, fieldErrors: { kind: ["Kies een type bijlage."] } };
    if (!(file instanceof File) || file.size === 0) return { ok: false, fieldErrors: { file: ["Kies een bestand."] } };
    if (file.size > MAX_BYTES) return { ok: false, fieldErrors: { file: ["Het bestand is groter dan 10 MB."] } };
    if (!ALLOWED_UPLOADS.has(file.type)) return { ok: false, fieldErrors: { file: ["Alleen JPG, PNG, WebP of PDF zijn toegestaan."] } };
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasValidSignature(file.type, buffer)) return { ok: false, fieldErrors: { file: ["De inhoud van het bestand komt niet overeen met het bestandstype."] } };
    const db = await getDb();
    const name = await storeProjectFile(db, { projectId, userId: user.id, kind: kind.data, fileName: file.name, type: file.type, buffer });
    await addProjectEvent(null, projectId, user.id, "bijlage", `Bijlage toegevoegd: ${name}`);
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
    if (row) await deleteFiles([row.storage_path]).catch((err) => console.error("Bijlage verwijderen mislukt", err));
  } catch (err) {
    return handle(err);
  }
  revalidatePath(`/projecten/${projectId}`);
  return { ok: true, message: "Bijlage verwijderd." };
}
