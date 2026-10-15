"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sql, sqlOne, transaction } from "@/lib/db";
import { assertUser, AuthError } from "@/lib/auth/session";
import { contractorProfileSchema, contractorResponseSchema, parseForm, rateSchema, referenceSchema, text } from "@/lib/validation";
import { writeContractorProfile } from "@/lib/data/contractor-write";
import type { ActionResult } from "@/lib/forms/types";

function handle(err: unknown): ActionResult<never> {
  if (err instanceof AuthError) return { ok: false, message: err.message };
  throw err;
}

async function ownContractor() {
  const user = await assertUser(["aannemer", "beheerder"]);
  const c = await sqlOne<{ id: string; slug: string }>("select id, slug from contractors where owner_user_id = $1", [user.id]);
  if (!c) throw new AuthError("Maak eerst een bedrijfsprofiel aan.");
  return { user, contractor: c };
}

/** Nieuw bedrijfsprofiel: standaard 'in beoordeling' en zonder enige verificatie (= "Zelf opgegeven"). */
export async function saveOwnProfileAction(fd: FormData): Promise<ActionResult> {
  try {
    const user = await assertUser(["aannemer"]);
    const parsed = parseForm(contractorProfileSchema, fd);
    if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors, message: "Controleer de gemarkeerde velden." };
    const existing = await sqlOne<{ id: string }>("select id from contractors where owner_user_id = $1", [user.id]);
    await transaction((tx) => writeContractorProfile(tx, existing?.id ?? null, parsed.data, { ownerUserId: user.id }));
    revalidatePath("/portaal");
    if (!existing) redirect("/portaal?melding=profiel-aangemaakt");
    return { ok: true, message: "Profiel bijgewerkt." };
  } catch (err) {
    return handle(err);
  }
}

export async function addRateAction(fd: FormData): Promise<ActionResult> {
  try {
    const { contractor } = await ownContractor();
    const parsed = parseForm(rateSchema, fd);
    if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
    const d = parsed.data;
    await sql(
      `insert into contractor_rates (contractor_id, specialty_id, description, unit, price_min, price_max, vat_included, materials_included)
       values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [contractor.id, d.specialty_id, d.description, d.unit, d.price_min, d.price_max, d.vat_included, d.materials_included],
    );
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/portaal");
  return { ok: true, message: "Tarief toegevoegd." };
}

export async function deleteRateAction(rateId: string): Promise<ActionResult> {
  try {
    const { contractor } = await ownContractor();
    await sql("delete from contractor_rates where id = $1 and contractor_id = $2", [rateId, contractor.id]);
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/portaal");
  return { ok: true, message: "Tarief verwijderd." };
}

export async function addReferenceAction(fd: FormData): Promise<ActionResult> {
  try {
    const { contractor } = await ownContractor();
    const parsed = parseForm(referenceSchema, fd);
    if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
    const d = parsed.data;
    await sql(
      `insert into contractor_references (contractor_id, title, city, property_type, renovation_type, year, description, work_items)
       values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [contractor.id, d.title, d.city ?? null, d.property_type ?? null, d.renovation_type ?? null, d.year ?? null, d.description, d.work_items],
    );
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/portaal");
  return { ok: true, message: "Referentieproject toegevoegd." };
}

export async function deleteReferenceAction(referenceId: string): Promise<ActionResult> {
  try {
    const { contractor } = await ownContractor();
    await sql("delete from contractor_references where id = $1 and contractor_id = $2", [referenceId, contractor.id]);
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/portaal");
  return { ok: true, message: "Referentieproject verwijderd." };
}

const verificationRequestSchema = z.object({ evidence_reference: text(3, 300, "Bewijsreferentie") });

export async function requestVerificationAction(fd: FormData): Promise<ActionResult> {
  try {
    const { user, contractor } = await ownContractor();
    const parsed = parseForm(verificationRequestSchema, fd);
    if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
    const open = await sqlOne(
      "select 1 from verification_events where contractor_id = $1 and verification_type = 'bedrijfsgegevens' and status = 'aangevraagd'",
      [contractor.id],
    );
    if (open) return { ok: false, message: "Er loopt al een verificatieverzoek." };
    await sql(
      `insert into verification_events (contractor_id, verification_type, status, evidence_reference, notes, requested_by)
       values ($1,'bedrijfsgegevens','aangevraagd',$2,'Aangevraagd via het aannemersportaal.',$3)`,
      [contractor.id, parsed.data.evidence_reference, user.id],
    );
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/portaal");
  return { ok: true, message: "Verificatie aangevraagd. Beheer beoordeelt je aanvraag." };
}

const responseSchema = z.object({ request_id: z.string().uuid(), response: text(5, 3000, "Reactie") });

export async function respondToQuoteRequestAction(fd: FormData): Promise<ActionResult> {
  try {
    const { contractor } = await ownContractor();
    const parsed = parseForm(responseSchema, fd);
    if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
    const row = await sqlOne<{ project_id: string }>(
      `update quote_requests set contractor_response = $3, responded_at = now(), status = 'reactie', updated_at = now()
        where id = $1 and contractor_id = $2 and delivery_channel = 'platform' and status in ('verzonden','reactie') returning project_id`,
      [parsed.data.request_id, contractor.id, parsed.data.response],
    );
    if (!row) return { ok: false, message: "Aanvraag niet gevonden of niet meer open." };
    await sql("insert into project_events (project_id, event_type, message) values ($1,'offerteaanvraag',$2)", [
      row.project_id,
      "Reactie ontvangen van aannemer via het aannemersportaal",
    ]);
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/portaal");
  return { ok: true, message: "Reactie verzonden naar de opdrachtgever (zichtbaar in BouwCheck)." };
}

export async function respondToReviewAction(fd: FormData): Promise<ActionResult> {
  try {
    const { contractor } = await ownContractor();
    const parsed = parseForm(contractorResponseSchema, fd);
    if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
    const rows = await sql(
      "update reviews set contractor_response = $3, contractor_response_at = now(), updated_at = now() where id = $1 and contractor_id = $2 returning id",
      [parsed.data.review_id, contractor.id, parsed.data.response],
    );
    if (!rows.length) return { ok: false, message: "Beoordeling niet gevonden." };
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/portaal");
  return { ok: true, message: "Reactie geplaatst." };
}
