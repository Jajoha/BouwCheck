"use server";

import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, sql, sqlOne, transaction } from "@/lib/db";
import type { Queryable } from "@/lib/db";
import { env } from "@/lib/env";
import { assertUser, AuthError, type SessionUser } from "@/lib/auth/session";
import { writeContractorProfile } from "@/lib/data/contractor-write";
import { seedDemoData } from "@/lib/db/seed";
import { contractorProfileSchema, optionalText, parseDutchNumber, parseForm, text } from "@/lib/validation";
import type { ActionResult } from "@/lib/forms/types";

/** Alle beheeracties: server-side afgeschermd op rol 'beheerder' en gelogd. */
async function admin() {
  return assertUser(["beheerder"]);
}

async function log(db: Queryable | null, user: SessionUser, action: string, entityType: string, entityId: string | null, details: Record<string, unknown> = {}) {
  const q = "insert into admin_actions (admin_user_id, action, entity_type, entity_id, details) values ($1,$2,$3,$4,$5::text::jsonb)";
  const params = [user.id, action, entityType, entityId, JSON.stringify(details)];
  if (db) await db.query(q, params);
  else await sql(q, params);
}

function handle(err: unknown): ActionResult<never> {
  if (err instanceof AuthError) return { ok: false, message: err.message };
  throw err;
}

const uuid = z.string().regex(/^[0-9a-f-]{36}$/i);

// ── Aannemers ───────────────────────────────────────────────
export async function setContractorStatusAction(contractorId: string, status: string): Promise<ActionResult> {
  try {
    const user = await admin();
    if (!["in_beoordeling", "actief", "gedeactiveerd"].includes(status)) return { ok: false, message: "Ongeldige status." };
    const row = await sqlOne<{ company_name: string }>(
      "update contractors set status = $2, updated_at = now() where id = $1 returning company_name",
      [contractorId, status],
    );
    if (!row) return { ok: false, message: "Aannemer niet gevonden." };
    await log(null, user, `aannemer_${status}`, "aannemer", contractorId, { naam: row.company_name });
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/beheer", "layout");
  revalidatePath("/aannemers");
  return { ok: true, message: "Status bijgewerkt." };
}

export async function adminSaveContractorAction(contractorId: string | null, fd: FormData): Promise<ActionResult> {
  let id: string;
  try {
    const user = await admin();
    const parsed = parseForm(contractorProfileSchema, fd);
    if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors, message: "Controleer de gemarkeerde velden." };
    const statusRaw = fd.get("status");
    const status = typeof statusRaw === "string" && ["in_beoordeling", "actief", "gedeactiveerd"].includes(statusRaw) ? statusRaw : "in_beoordeling";
    id = await transaction(async (tx) => {
      const savedId = await writeContractorProfile(tx, contractorId, parsed.data, { status });
      if (contractorId) await tx.query("update contractors set status = $2 where id = $1", [savedId, status]);
      await log(tx, user, contractorId ? "aannemer_gecorrigeerd" : "aannemer_toegevoegd", "aannemer", savedId, { naam: parsed.data.company_name });
      return savedId;
    });
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/beheer", "layout");
  revalidatePath("/aannemers");
  if (!contractorId) redirect(`/beheer/aannemers/${id}?melding=opgeslagen`);
  return { ok: true, message: "Aannemersgegevens opgeslagen." };
}

const notesSchema = z.object({ internal_notes: optionalText(5000) });
export async function saveInternalNotesAction(contractorId: string, fd: FormData): Promise<ActionResult> {
  try {
    const user = await admin();
    const parsed = parseForm(notesSchema, fd);
    if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
    await sql(
      `insert into contractor_private (contractor_id, internal_notes) values ($1,$2)
       on conflict (contractor_id) do update set internal_notes = excluded.internal_notes, updated_at = now()`,
      [contractorId, parsed.data.internal_notes ?? null],
    );
    await log(null, user, "interne_notitie", "aannemer", contractorId);
  } catch (err) {
    return handle(err);
  }
  revalidatePath(`/beheer/aannemers/${contractorId}`);
  return { ok: true, message: "Interne notities opgeslagen." };
}

// ── Verificatie ─────────────────────────────────────────────
const decisionSchema = z.object({
  decision: z.enum(["goedgekeurd", "afgewezen"]),
  evidence_reference: optionalText(300),
  notes: optionalText(2000),
});

export async function reviewVerificationAction(eventId: string, fd: FormData): Promise<ActionResult> {
  try {
    const user = await admin();
    const parsed = parseForm(decisionSchema, fd);
    if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
    const d = parsed.data;
    const current = await sqlOne<{ evidence_reference: string | null; contractor_id: string }>(
      "select evidence_reference, contractor_id from verification_events where id = $1 and status = 'aangevraagd'",
      [eventId],
    );
    if (!current) return { ok: false, message: "Verzoek niet gevonden of al afgehandeld." };
    // Bij goedkeuren moet beheer zelf vastleggen wat er is gecontroleerd.
    const evidence = d.decision === "goedgekeurd" ? d.evidence_reference : (d.evidence_reference ?? current.evidence_reference);
    if (d.decision === "goedgekeurd" && !evidence) {
      return { ok: false, fieldErrors: { evidence_reference: ["Een goedkeuring vereist een bewijsreferentie (bijv. KvK-uittreksel en datum)."] } };
    }
    await sql(
      "update verification_events set status = $2, evidence_reference = $3, notes = coalesce($4, notes), reviewed_by = $5, reviewed_at = now() where id = $1",
      [eventId, d.decision, evidence, d.notes ?? null, user.id],
    );
    await log(null, user, `verificatie_${d.decision}`, "verificatie", eventId, { aannemer: current.contractor_id });
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/beheer", "layout");
  return { ok: true, message: "Verificatieverzoek afgehandeld." };
}

const addVerificationSchema = z.object({
  verification_type: z.enum(["bedrijfsgegevens"]),
  evidence_reference: text(3, 300, "Bewijsreferentie"),
  notes: optionalText(2000),
});

export async function addVerificationAction(contractorId: string, fd: FormData): Promise<ActionResult> {
  try {
    const user = await admin();
    const parsed = parseForm(addVerificationSchema, fd);
    if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
    await sql(
      `insert into verification_events (contractor_id, verification_type, status, evidence_reference, notes, requested_by, reviewed_by, reviewed_at)
       values ($1,$2,'goedgekeurd',$3,$4,$5,$5, now())`,
      [contractorId, parsed.data.verification_type, parsed.data.evidence_reference, parsed.data.notes ?? null, user.id],
    );
    await log(null, user, "verificatie_toegekend", "aannemer", contractorId, { type: parsed.data.verification_type });
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/beheer", "layout");
  return { ok: true, message: "Verificatie vastgelegd." };
}

export async function revokeVerificationAction(eventId: string): Promise<ActionResult> {
  try {
    const user = await admin();
    const row = await sqlOne<{ contractor_id: string }>(
      "update verification_events set status = 'ingetrokken', reviewed_by = $2, reviewed_at = now() where id = $1 and status = 'goedgekeurd' returning contractor_id",
      [eventId, user.id],
    );
    if (!row) return { ok: false, message: "Verificatie niet gevonden." };
    await log(null, user, "verificatie_ingetrokken", "verificatie", eventId, { aannemer: row.contractor_id });
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/beheer", "layout");
  return { ok: true, message: "Verificatie ingetrokken." };
}

// ── Projectresultaten & reviews ─────────────────────────────
const moneyOrNull = z.preprocess((v) => (v === "" || v == null ? null : parseDutchNumber(String(v))), z.number({ error: "Ongeldig bedrag." }).positive().nullable());
const dateOrNull = z.preprocess((v) => (v === "" || v == null ? null : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable());

const moderateOutcomeSchema = z.object({
  moderation_status: z.enum(["in_behandeling", "goedgekeurd", "afgewezen"]),
  verification_status: z.enum(["niet_gecontroleerd", "opdrachtgever_bevestigd", "documentatie_gecontroleerd", "betwist", "afgewezen"]),
  evidence_reference: optionalText(300),
  initial_budget: moneyOrNull,
  final_cost: moneyOrNull,
  planned_completion_date: dateOrNull,
  actual_completion_date: dateOrNull,
  note: optionalText(2000),
});

export async function moderateOutcomeAction(outcomeId: string, fd: FormData): Promise<ActionResult> {
  try {
    const user = await admin();
    const parsed = parseForm(moderateOutcomeSchema, fd);
    if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
    const d = parsed.data;
    if (d.verification_status === "documentatie_gecontroleerd" && !d.evidence_reference) {
      return { ok: false, fieldErrors: { evidence_reference: ["Gecontroleerde projectgegevens vereisen een bewijsreferentie (bijv. eindfactuur + opleverrapport)."] } };
    }
    await transaction(async (tx) => {
      const [before] = await tx.query<{ contractor_id: string; verification_status: string }>(
        "select contractor_id, verification_status from project_outcomes where id = $1",
        [outcomeId],
      );
      if (!before) throw new AuthError("Projectresultaat niet gevonden.");
      await tx.query(
        `update project_outcomes set moderation_status=$2, verification_status=$3, evidence_reference=$4, initial_budget=$5, final_cost=$6,
           planned_completion_date=$7, actual_completion_date=$8, updated_at=now() where id=$1`,
        [outcomeId, d.moderation_status, d.verification_status, d.evidence_reference ?? null, d.initial_budget, d.final_cost, d.planned_completion_date, d.actual_completion_date],
      );
      // Review volgt de moderatie van het resultaat
      const reviewStatus = d.moderation_status === "goedgekeurd" ? "gepubliceerd" : d.moderation_status;
      const reviewVerification = d.verification_status === "documentatie_gecontroleerd" ? "gecontroleerd" : d.verification_status === "opdrachtgever_bevestigd" ? "opdrachtgever_bevestigd" : "niet_gecontroleerd";
      await tx.query("update reviews set moderation_status = $2, verification_status = $3, updated_at = now() where outcome_id = $1", [outcomeId, reviewStatus, reviewVerification]);
      if (d.verification_status !== before.verification_status && ["documentatie_gecontroleerd", "opdrachtgever_bevestigd"].includes(d.verification_status)) {
        await tx.query(
          `insert into verification_events (contractor_id, project_outcome_id, verification_type, status, evidence_reference, notes, reviewed_by, reviewed_at)
           values ($1,$2,$3,'goedgekeurd',$4,$5,$6, now())`,
          [before.contractor_id, outcomeId, d.verification_status === "documentatie_gecontroleerd" ? "projectgegevens" : "opdrachtgever_bevestiging",
            d.evidence_reference ?? "Bevestiging opdrachtgever", d.note ?? null, user.id],
        );
      }
      await log(tx, user, "resultaat_beoordeeld", "projectresultaat", outcomeId, { moderatie: d.moderation_status, verificatie: d.verification_status, notitie: d.note });
    });
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/beheer", "layout");
  return { ok: true, message: "Projectresultaat bijgewerkt." };
}

export async function moderateReviewAction(reviewId: string, status: string, opts: { removeResponse?: boolean } = {}): Promise<ActionResult> {
  try {
    const user = await admin();
    if (!["in_behandeling", "gepubliceerd", "afgewezen"].includes(status)) return { ok: false, message: "Ongeldige status." };
    await sql(
      `update reviews set moderation_status = $2, contractor_response = case when $3 then null else contractor_response end, updated_at = now() where id = $1`,
      [reviewId, status, Boolean(opts.removeResponse)],
    );
    await log(null, user, `review_${status}`, "review", reviewId, opts.removeResponse ? { reactie_verwijderd: true } : {});
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/beheer", "layout");
  return { ok: true, message: "Beoordeling bijgewerkt." };
}

// ── Meldingen ───────────────────────────────────────────────
const flagResolveSchema = z.object({
  status: z.enum(["open", "in_behandeling", "opgelost", "afgewezen"]),
  resolution: optionalText(2000),
});

export async function resolveFlagAction(flagId: string, fd: FormData): Promise<ActionResult> {
  try {
    const user = await admin();
    const parsed = parseForm(flagResolveSchema, fd);
    if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
    const d = parsed.data;
    if (["opgelost", "afgewezen"].includes(d.status) && !d.resolution) {
      return { ok: false, fieldErrors: { resolution: ["Licht de afhandeling toe."] } };
    }
    await sql(
      "update flags set status = $2, resolution = $3, resolved_by = case when $2 in ('opgelost','afgewezen') then $4::uuid else null end, resolved_at = case when $2 in ('opgelost','afgewezen') then now() else null end where id = $1",
      [flagId, d.status, d.resolution ?? null, user.id],
    );
    await log(null, user, `melding_${d.status}`, "melding", flagId);
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/beheer", "layout");
  return { ok: true, message: "Melding bijgewerkt." };
}

// ── Gebruikers & leads ──────────────────────────────────────
export async function setUserRoleAction(userId: string, role: string): Promise<ActionResult> {
  try {
    const user = await admin();
    if (!uuid.safeParse(userId).success || !["flipper", "investeerder", "aannemer", "beheerder"].includes(role)) return { ok: false, message: "Ongeldige invoer." };
    if (userId === user.id) return { ok: false, message: "Je kunt je eigen rol niet wijzigen." };
    await sql("update users set role = $2, updated_at = now() where id = $1", [userId, role]);
    await log(null, user, "rol_gewijzigd", "gebruiker", userId, { rol: role });
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/beheer/gebruikers");
  return { ok: true, message: "Rol bijgewerkt." };
}

export async function setUserActiveAction(userId: string, active: boolean): Promise<ActionResult> {
  try {
    const user = await admin();
    if (userId === user.id) return { ok: false, message: "Je kunt je eigen account niet blokkeren." };
    await sql("update users set is_active = $2, updated_at = now() where id = $1", [userId, active]);
    if (!active) await sql("delete from sessions where user_id = $1", [userId]);
    await log(null, user, active ? "gebruiker_geactiveerd" : "gebruiker_geblokkeerd", "gebruiker", userId);
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/beheer/gebruikers");
  return { ok: true, message: active ? "Account geactiveerd." : "Account geblokkeerd." };
}

export async function setLeadStatusAction(leadId: string, status: string): Promise<ActionResult> {
  try {
    const user = await admin();
    if (!["nieuw", "opgevolgd", "gesloten"].includes(status)) return { ok: false, message: "Ongeldige status." };
    await sql("update interest_leads set status = $2 where id = $1", [leadId, status]);
    await log(null, user, `lead_${status}`, "lead", leadId);
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/beheer/aanmeldingen");
  return { ok: true, message: "Status bijgewerkt." };
}

// ── Demo-data ───────────────────────────────────────────────
export async function resetDemoDataAction(): Promise<ActionResult> {
  try {
    await admin();
    const db = await getDb();
    if (!env.demoMode || db.driver !== "pglite") {
      return { ok: false, message: "Demo-data kan alleen in de lokale demo-modus worden teruggezet." };
    }
    await db.exec(`truncate table admin_actions, flags, verification_events, reviews, project_outcomes, quotes, quote_request_attachments,
      quote_requests, project_attachments, project_events, project_contractors, project_specialties, projects, project_scope_items, ai_usage, register_signals, register_checks,
      favorites, contractor_references, contractor_rates, contractor_service_areas, contractor_specialties, contractor_private, contractors,
      interest_leads, password_reset_tokens, sessions, users restart identity cascade`);
    fs.rmSync(path.resolve(process.cwd(), env.dataDir, "uploads"), { recursive: true, force: true });
    await seedDemoData(db);
  } catch (err) {
    return handle(err);
  }
  redirect("/inloggen?melding=demo-hersteld");
}
