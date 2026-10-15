"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sql, sqlOne, transaction } from "@/lib/db";
import { env } from "@/lib/env";
import { assertUser, AuthError, FLIPPER_ROLES } from "@/lib/auth/session";
import { addProjectEvent, getProjectForUser } from "@/lib/data/projects";
import { parseForm, quoteRequestSchema, quoteSchema, text, optionalText } from "@/lib/validation";
import { QUOTE_REQUEST_STATUS, type QuoteRequestStatus } from "@/lib/domain/constants";
import type { ActionResult } from "@/lib/forms/types";

function handle(err: unknown): ActionResult<never> {
  if (err instanceof AuthError) return { ok: false, message: err.message };
  throw err;
}

async function ownedRequest(id: string) {
  const user = await assertUser(FLIPPER_ROLES);
  const row = await sqlOne<{ id: string; project_id: string; status: QuoteRequestStatus; company_name: string }>(
    `select qr.id, qr.project_id, qr.status, c.company_name from quote_requests qr join contractors c on c.id = qr.contractor_id
      where qr.id = $1 and qr.user_id = $2`,
    [id, user.id],
  );
  if (!row) throw new AuthError("Offerteaanvraag niet gevonden of geen toegang.");
  return { user, request: row };
}

/** Stap 1: aanvragen voorbereiden (opgeslagen als concept), daarna controleren. */
export async function prepareQuoteRequestsAction(fd: FormData): Promise<ActionResult> {
  let ids: string[] = [];
  try {
    const user = await assertUser(FLIPPER_ROLES);
    const parsed = parseForm(quoteRequestSchema, fd);
    if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors, message: "Controleer de gemarkeerde velden." };
    const d = parsed.data;
    const project = await getProjectForUser(d.project_id, user);
    if (!project) return { ok: false, message: "Project niet gevonden." };
    const contractors = await sql<{ id: string; company_name: string }>(
      "select id, company_name from contractors where id = any($1::uuid[]) and status = 'actief'",
      [d.contractor_ids],
    );
    if (contractors.length === 0) return { ok: false, fieldErrors: { contractor_ids: ["Kies minimaal één actieve aannemer."] } };
    const attachments = d.attachment_ids.length
      ? await sql<{ id: string }>("select id from project_attachments where id = any($1::uuid[]) and project_id = $2", [d.attachment_ids, project.id])
      : [];
    ids = await transaction(async (tx) => {
      const created: string[] = [];
      for (const c of contractors) {
        const [row] = await tx.query<{ id: string }>(
          `insert into quote_requests (project_id, contractor_id, user_id, work_description, specialty_ids, budget_indication, budget_vat_included,
             desired_start_date, desired_completion_date, additional_notes, contact_name, contact_email, contact_phone, status)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'concept') returning id`,
          [project.id, c.id, user.id, d.work_description, d.specialty_ids, d.budget_indication ?? null, d.budget_vat_included, d.desired_start_date ?? null,
            d.desired_completion_date ?? null, d.additional_notes ?? null, d.contact_name, d.contact_email, d.contact_phone ?? null],
        );
        for (const a of attachments) {
          await tx.query("insert into quote_request_attachments (quote_request_id, attachment_id) values ($1,$2)", [row.id, a.id]);
        }
        await tx.query(
          "insert into project_contractors (project_id, contractor_id) values ($1,$2) on conflict (project_id, contractor_id) do nothing",
          [project.id, c.id],
        );
        created.push(row.id);
      }
      await addProjectEvent(tx, project.id, user.id, "offerteaanvraag", `Offerteaanvraag voorbereid voor ${contractors.map((c) => c.company_name).join(", ")} (concept)`);
      return created;
    });
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/offerteaanvragen");
  redirect(`/offerteaanvragen/controleren?ids=${ids.join(",")}`);
}

/**
 * Verzenden. Er bestaat in deze bèta geen e-mailintegratie:
 * - heeft de aannemer een account, dan verschijnt de aanvraag in het aannemersportaal (kanaal 'platform');
 * - in demo-modus wordt de aanvraag als demo-verzending gemarkeerd en NIET extern verstuurd (kanaal 'demo');
 * - anders blijft de aanvraag op 'klaar om te verzenden' staan.
 */
export async function sendQuoteRequestsAction(ids: string[]): Promise<ActionResult<{ platform: number; demo: number; notSent: number }>> {
  try {
    const user = await assertUser(FLIPPER_ROLES);
    const rows = await sql<{ id: string; project_id: string; contractor_id: string; company_name: string; has_account: boolean }>(
      `select qr.id, qr.project_id, qr.contractor_id, c.company_name, (c.owner_user_id is not null) as has_account
         from quote_requests qr join contractors c on c.id = qr.contractor_id
        where qr.id = any($1::uuid[]) and qr.user_id = $2 and qr.status in ('concept','klaar') and c.status = 'actief'`,
      [ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id)), user.id],
    );
    if (rows.length === 0) return { ok: false, message: "Geen aanvragen gevonden die verzonden kunnen worden." };
    const counts = { platform: 0, demo: 0, notSent: 0 };
    await transaction(async (tx) => {
      for (const r of rows) {
        const channel = r.has_account ? "platform" : env.demoMode ? "demo" : null;
        if (channel) {
          await tx.query("update quote_requests set status = 'verzonden', delivery_channel = $2, sent_at = now(), updated_at = now() where id = $1", [r.id, channel]);
          await tx.query("update project_contractors set status = 'offerte_aangevraagd' where project_id = $1 and contractor_id = $2 and status = 'shortlist'", [r.project_id, r.contractor_id]);
          counts[channel]++;
          await addProjectEvent(tx, r.project_id, user.id, "offerteaanvraag",
            channel === "platform"
              ? `Offerteaanvraag verzonden naar ${r.company_name} via het BouwCheck-aannemersportaal`
              : `Offerteaanvraag gemarkeerd als verzonden naar ${r.company_name} (demo — niet extern verzonden)`);
        } else {
          await tx.query("update quote_requests set status = 'klaar', updated_at = now() where id = $1", [r.id]);
          counts.notSent++;
        }
      }
    });
    revalidatePath("/offerteaanvragen");
    const parts = [];
    if (counts.platform) parts.push(`${counts.platform} verzonden via het aannemersportaal`);
    if (counts.demo) parts.push(`${counts.demo} als demo-verzending opgeslagen (niet echt verstuurd)`);
    if (counts.notSent) parts.push(`${counts.notSent} niet verzonden: aannemer heeft geen account en e-mail is niet geconfigureerd`);
    return { ok: true, message: parts.join("; ") + ".", data: counts };
  } catch (err) {
    return handle(err) as ActionResult<{ platform: number; demo: number; notSent: number }>;
  }
}

export async function setQuoteRequestStatusAction(id: string, status: string): Promise<ActionResult> {
  try {
    const { user, request } = await ownedRequest(id);
    // 'verzonden' kan alleen via de verzendactie worden gezet.
    const allowed: QuoteRequestStatus[] = ["concept", "klaar", "reactie", "afgerond", "geannuleerd"];
    if (!allowed.includes(status as QuoteRequestStatus)) return { ok: false, message: "Deze status kan niet handmatig worden gezet." };
    if (["concept", "klaar"].includes(status) && !["concept", "klaar"].includes(request.status)) {
      return { ok: false, message: "Een verzonden aanvraag kan niet terug naar concept." };
    }
    await sql("update quote_requests set status = $2, updated_at = now() where id = $1", [id, status]);
    await addProjectEvent(null, request.project_id, user.id, "offerteaanvraag", `Offerteaanvraag ${request.company_name}: ${QUOTE_REQUEST_STATUS[status as QuoteRequestStatus].toLowerCase()}`);
  } catch (err) {
    return handle(err);
  }
  revalidatePath(`/offerteaanvragen/${id}`);
  return { ok: true, message: "Status bijgewerkt." };
}

const draftSchema = z.object({
  work_description: text(10, 5000, "Omschrijving van de werkzaamheden"),
  additional_notes: optionalText(3000),
});

export async function updateQuoteRequestDraftAction(id: string, fd: FormData): Promise<ActionResult> {
  try {
    const { request } = await ownedRequest(id);
    if (!["concept", "klaar"].includes(request.status)) return { ok: false, message: "Alleen concepten kunnen worden bewerkt." };
    const parsed = parseForm(draftSchema, fd);
    if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
    await sql("update quote_requests set work_description = $2, additional_notes = $3, updated_at = now() where id = $1", [
      id,
      parsed.data.work_description,
      parsed.data.additional_notes ?? null,
    ]);
  } catch (err) {
    return handle(err);
  }
  revalidatePath(`/offerteaanvragen/${id}`);
  return { ok: true, message: "Concept opgeslagen." };
}

export async function deleteQuoteRequestAction(id: string): Promise<ActionResult> {
  try {
    const { user, request } = await ownedRequest(id);
    if (!["concept", "klaar", "geannuleerd"].includes(request.status)) {
      return { ok: false, message: "Verzonden aanvragen kunnen niet worden verwijderd; annuleer ze in plaats daarvan." };
    }
    await sql("delete from quote_requests where id = $1", [id]);
    await addProjectEvent(null, request.project_id, user.id, "offerteaanvraag", `Conceptaanvraag voor ${request.company_name} verwijderd`);
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/offerteaanvragen");
  redirect("/offerteaanvragen?melding=aanvraag-verwijderd");
}

// ── Offertes (door de opdrachtgever vastgelegd) ─────────────
export async function addQuoteAction(fd: FormData): Promise<ActionResult> {
  try {
    const user = await assertUser(FLIPPER_ROLES);
    const parsed = parseForm(quoteSchema, fd);
    if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors, message: "Controleer de gemarkeerde velden." };
    const d = parsed.data;
    const project = await getProjectForUser(d.project_id, user);
    if (!project) return { ok: false, message: "Project niet gevonden." };
    const contractor = await sqlOne<{ company_name: string }>("select company_name from contractors where id = $1", [d.contractor_id]);
    if (!contractor) return { ok: false, fieldErrors: { contractor_id: ["Onbekende aannemer."] } };
    await transaction(async (tx) => {
      await tx.query(
        `insert into quotes (project_id, contractor_id, price_type, amount, vat_included, materials_included, scope_specialty_ids, scope_description,
           inclusions, exclusions, estimated_duration_days, earliest_start_date, validity_date, source, created_by)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'opdrachtgever',$14)`,
        [project.id, d.contractor_id, d.price_type, d.amount, d.vat_included, d.materials_included, d.scope_specialty_ids, d.scope_description,
          d.inclusions ?? null, d.exclusions ?? null, d.estimated_duration_days ?? null, d.earliest_start_date ?? null, d.validity_date ?? null, user.id],
      );
      await tx.query("insert into project_contractors (project_id, contractor_id) values ($1,$2) on conflict do nothing", [project.id, d.contractor_id]);
      await addProjectEvent(tx, project.id, user.id, "offerte", `Bedrag vastgelegd voor ${contractor.company_name}`);
    });
    revalidatePath(`/projecten/${project.id}`);
    return { ok: true, message: "Offerte vastgelegd." };
  } catch (err) {
    return handle(err);
  }
}

export async function deleteQuoteAction(quoteId: string): Promise<ActionResult> {
  try {
    const user = await assertUser(FLIPPER_ROLES);
    const row = await sqlOne<{ project_id: string }>(
      "delete from quotes q using projects p where q.id = $1 and p.id = q.project_id and p.user_id = $2 returning q.project_id",
      [quoteId, user.id],
    );
    if (!row) return { ok: false, message: "Offerte niet gevonden." };
    revalidatePath(`/projecten/${row.project_id}`);
    return { ok: true, message: "Offerte verwijderd." };
  } catch (err) {
    return handle(err);
  }
}
