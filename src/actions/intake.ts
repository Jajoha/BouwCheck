"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb, sql, transaction } from "@/lib/db";
import { assertUser, AuthError, FLIPPER_ROLES } from "@/lib/auth/session";
import { aiConfig } from "@/lib/ai/config";
import { analyzeIntake, type IntakeResult } from "@/lib/ai/intake";
import { checkUsageAllowed, getUserUsageThisMonth, recordUsage } from "@/lib/data/ai-usage";
import { addProjectEvent, getProjectForUser } from "@/lib/data/projects";
import { replaceScope } from "@/lib/data/scope";
import { logEvent } from "@/lib/events";
import { getCheckByToken } from "@/lib/data/offertecheck";
import { cancelSequence } from "@/lib/email";
import { hasValidSignature, storeProjectFile } from "@/lib/uploads";
import { aiSummarySchema, intakeProjectSchema, parseForm, parseJsonField, scopeListSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/forms/types";

const MAX_PHOTO_BYTES = 2.5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024; // Vercel staat max. ~4,5 MB per request toe
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

function handle(err: unknown): ActionResult<never> {
  if (err instanceof AuthError) return { ok: false, message: err.message };
  throw err;
}

async function readPhotos(fd: FormData): Promise<{ ok: true; photos: { name: string; type: (typeof IMAGE_TYPES)[number]; buffer: Buffer }[] } | { ok: false; message: string }> {
  const files = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > aiConfig.maxPhotos) return { ok: false, message: `Maximaal ${aiConfig.maxPhotos} foto's.` };
  let total = 0;
  const photos = [];
  for (const f of files) {
    if (!(IMAGE_TYPES as readonly string[]).includes(f.type)) return { ok: false, message: `${f.name}: alleen JPG, PNG of WebP.` };
    if (f.size > MAX_PHOTO_BYTES) return { ok: false, message: `${f.name} is te groot.` };
    total += f.size;
    if (total > MAX_TOTAL_BYTES) return { ok: false, message: "De foto's zijn samen te groot. Gebruik minder foto's." };
    const buffer = Buffer.from(await f.arrayBuffer());
    if (!hasValidSignature(f.type, buffer)) return { ok: false, message: `${f.name}: de inhoud komt niet overeen met het bestandstype.` };
    photos.push({ name: f.name, type: f.type as (typeof IMAGE_TYPES)[number], buffer });
  }
  return { ok: true, photos };
}

export type AnalyzeData = { result: IntakeResult; model: string; costUsd: number; monthCostUsd: number; monthLimitUsd: number; analyzedAt: string };

/** Stap 1 → 2: analyseer beschrijving en foto's met AI. Slaat nog niets op behalve het verbruik. */
export async function analyzeIntakeAction(fd: FormData): Promise<ActionResult<AnalyzeData>> {
  try {
    const user = await assertUser(FLIPPER_ROLES);
    if (!aiConfig.configured) return { ok: false, message: "AI-analyse is niet geconfigureerd. Vul de werkzaamheden handmatig in." };
    const parsed = parseForm(intakeProjectSchema, fd);
    if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors, message: "Controleer de gemarkeerde velden." };
    const blocked = await checkUsageAllowed(user.id);
    if (blocked) return { ok: false, message: blocked };
    const photos = await readPhotos(fd);
    if (!photos.ok) return { ok: false, fieldErrors: { photos: [photos.message] }, message: photos.message };
    const d = parsed.data;
    const outcome = await analyzeIntake({
      description: d.description,
      location: d.location,
      province: d.province,
      propertyType: d.property_type,
      renovationType: d.renovation_type,
      areaM2: d.area_m2 ?? null,
      images: photos.photos.map((p) => ({ mediaType: p.type, data: p.buffer.toString("base64") })),
    });
    await recordUsage(user.id, null, photos.photos.length, outcome.usage);
    if (!outcome.ok) return { ok: false, message: outcome.message };
    const month = await getUserUsageThisMonth(user.id);
    return {
      ok: true,
      message: "Analyse klaar. Controleer de werkzaamheden.",
      data: {
        result: outcome.result,
        model: outcome.usage.model,
        costUsd: outcome.usage.cost_usd,
        monthCostUsd: month.costUsd,
        monthLimitUsd: aiConfig.monthlyLimitUsd,
        analyzedAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    return handle(err) as ActionResult<AnalyzeData>;
  }
}

/** Stap 2 → opslaan: project + bevestigde scope + foto's, daarna naar de teamvoorstellen. */
export async function createProjectFromIntakeAction(fd: FormData): Promise<ActionResult> {
  let projectId: string;
  try {
    const user = await assertUser(FLIPPER_ROLES);
    const parsed = parseForm(intakeProjectSchema, fd);
    if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors, message: "Controleer de projectgegevens in stap 1." };
    const scope = parseJsonField(scopeListSchema, fd.get("scope"));
    if (!scope.ok) return { ok: false, fieldErrors: { scope: [scope.error] }, message: scope.error };
    const summary = parseJsonField(aiSummarySchema, fd.get("ai_summary"));
    const photos = await readPhotos(fd);
    if (!photos.ok) return { ok: false, fieldErrors: { photos: [photos.message] }, message: photos.message };
    const d = parsed.data;
    const name = d.name ?? `${d.property_type} ${d.location} — ${d.renovation_type.toLowerCase()}`;
    const token = String(fd.get("offertecheck_token") ?? "");
    const check = token ? await getCheckByToken(token) : null;
    const db = await getDb();
    projectId = await transaction(async (tx) => {
      const [row] = await tx.query<{ id: string }>(
        `insert into projects (user_id, name, location, province, property_type, renovation_type, area_m2, budget_amount, budget_vat_included,
           desired_start_date, desired_completion_date, status, description, ai_summary)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'orienteren',$12,$13::text::jsonb) returning id`,
        [user.id, name, d.location, d.province, d.property_type, d.renovation_type, d.area_m2 ?? null, d.budget_amount ?? null, d.budget_vat_included,
          d.desired_start_date ?? null, d.desired_completion_date ?? null, d.description, summary.ok && summary.data ? JSON.stringify(summary.data) : null],
      );
      await replaceScope(tx, row.id, scope.data);
      const viaAi = scope.data.some((s) => s.source === "ai");
      await addProjectEvent(tx, row.id, user.id, "aangemaakt", viaAi ? "Project aangemaakt via intake; werkzaamheden voorgesteld door AI en bevestigd" : "Project aangemaakt via intake; werkzaamheden handmatig ingevuld");
      // Koppel recente intake-analyses van deze gebruiker aan het project
      await tx.query(
        "update ai_usage set project_id = $2 where user_id = $1 and project_id is null and created_at > now() - interval '2 hours'",
        [user.id, row.id],
      );
      await logEvent("teamvoorstel_gestart", { subjectType: "project", subjectId: row.id, userId: user.id, metadata: { via_ai: viaAi, offertecheck_id: check?.id ?? null } }, tx);
      if (check) {
        // Doorklik uit de Offertecheck: koppelen (alleen de eerste keer)
        await tx.query("update offerte_checks set project_id = $2, user_id = $3 where id = $1 and project_id is null", [check.id, row.id, user.id]);
      }
      return row.id;
    });
    for (const p of photos.photos) {
      await storeProjectFile(db, { projectId, userId: user.id, kind: "foto", fileName: p.name, type: p.type, buffer: p.buffer });
    }
    if (photos.photos.length) await addProjectEvent(null, projectId, user.id, "bijlage", `${photos.photos.length} foto('s) toegevoegd via intake`);
    // Wie een teamvoorstel start, krijgt geen opvolgmails over de check meer
    if (check) await cancelSequence(`offertecheck:${check.id}`, "Teamvoorstel gestart");
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/dashboard");
  redirect(`/projecten/${projectId}/voorstellen?melding=project-aangemaakt`);
}

/** Werkzaamheden van een bestaand project aanpassen. */
export async function saveScopeAction(projectId: string, fd: FormData): Promise<ActionResult> {
  try {
    const user = await assertUser(FLIPPER_ROLES);
    const project = await getProjectForUser(projectId, user);
    if (!project) return { ok: false, message: "Project niet gevonden." };
    const scope = parseJsonField(scopeListSchema, fd.get("scope"));
    if (!scope.ok) return { ok: false, fieldErrors: { scope: [scope.error] }, message: scope.error };
    await transaction(async (tx) => {
      await replaceScope(tx, project.id, scope.data);
      await addProjectEvent(tx, project.id, user.id, "scope", `Werkzaamheden bijgewerkt (${scope.data.length} onderdelen)`);
    });
  } catch (err) {
    return handle(err);
  }
  revalidatePath(`/projecten/${projectId}`);
  redirect(`/projecten/${projectId}/voorstellen?melding=scope-opgeslagen`);
}

/** Een teamvoorstel kiezen: leden op de shortlist en door naar de offerteaanvraag. */
export async function chooseTeamAction(projectId: string, priorityLabel: string, contractorIds: string[]): Promise<ActionResult> {
  try {
    const user = await assertUser(FLIPPER_ROLES);
    const project = await getProjectForUser(projectId, user);
    if (!project) return { ok: false, message: "Project niet gevonden." };
    const ids = contractorIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 15);
    const members = await sql<{ id: string; company_name: string }>("select id, company_name from contractors where id = any($1::uuid[]) and status = 'actief'", [ids]);
    if (members.length === 0) return { ok: false, message: "Geen actieve aannemers in dit voorstel." };
    await transaction(async (tx) => {
      for (const m of members) {
        await tx.query("insert into project_contractors (project_id, contractor_id) values ($1,$2) on conflict (project_id, contractor_id) do nothing", [project.id, m.id]);
      }
      await addProjectEvent(tx, project.id, user.id, "teamvoorstel", `Teamvoorstel gekozen (${priorityLabel.slice(0, 40)}): ${members.map((m) => m.company_name).join(", ")}`);
    });
    redirect(`/offerteaanvragen/nieuw?project=${project.id}&aannemers=${members.map((m) => m.id).join(",")}`);
  } catch (err) {
    return handle(err);
  }
}
