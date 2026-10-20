"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { env } from "@/lib/env";
import { assertUser, AuthError, getCurrentUser } from "@/lib/auth/session";
import { createReservation } from "@/lib/data/founding";
import { logEvent } from "@/lib/events";
import { caseSchema, foundingMemberSchema, parseForm } from "@/lib/validation";
import type { ActionResult } from "@/lib/forms/types";

export async function reserveFoundingMemberAction(fd: FormData): Promise<ActionResult> {
  if (!env.features.foundingMembers) return { ok: false, message: "Het founding-member-aanbod is nog niet beschikbaar." };
  const parsed = parseForm(foundingMemberSchema, fd);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors, message: "Controleer de gemarkeerde velden." };
  const d = parsed.data;
  const user = await getCurrentUser();
  const row = await createReservation({ naam: d.naam, email: d.email, regio: d.regio, projecten_per_jaar: d.projecten_per_jaar, userId: user?.id ?? null });
  if (!row) return { ok: false, fieldErrors: { regio: ["Onbekende regio."] } };
  await logEvent("founding_member_interesse", { subjectType: "founding_member", subjectId: row.id, userId: user?.id ?? null, metadata: { regio: d.regio } });
  redirect("/founding-members/bedankt");
}

// ── Beheer ─────────────────────────────────────────────────

const STATUSES = ["interesse", "gereserveerd", "terugbetaald", "geannuleerd"];

async function admin() {
  return assertUser(["beheerder"]);
}

async function logAdmin(userId: string, action: string, entityType: string, entityId: string | null, details: Record<string, unknown> = {}) {
  await sql("insert into admin_actions (admin_user_id, action, entity_type, entity_id, details) values ($1,$2,$3,$4,$5::text::jsonb)", [
    userId,
    action,
    entityType,
    entityId,
    JSON.stringify(details),
  ]);
}

function handle(err: unknown): ActionResult<never> {
  if (err instanceof AuthError) return { ok: false, message: err.message };
  throw err;
}

/** Zet de status van een reservering. 'gereserveerd' bezet een plek (handmatig, tot er aanbetalingen zijn). */
export async function setReservationStatusAction(id: string, status: string): Promise<ActionResult> {
  try {
    const user = await admin();
    if (!STATUSES.includes(status) || !/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: "Ongeldige status." };
    if (status === "gereserveerd") {
      const full = await sql(
        `select 1 from founding_member_reserveringen f join founding_member_regios r on r.regio = f.regio
          where f.id = $1 and (select count(*) from founding_member_reserveringen x where x.regio = f.regio and x.status = 'gereserveerd' and x.id <> f.id) >= r.plekken`,
        [id],
      );
      if (full.length) return { ok: false, message: "Deze regio is vol." };
    }
    const rows = await sql<{ status_was: string }>(
      "update founding_member_reserveringen f set status = $2, updated_at = now() from (select status as status_was from founding_member_reserveringen where id = $1) old where f.id = $1 returning old.status_was",
      [id, status],
    );
    if (!rows.length) return { ok: false, message: "Reservering niet gevonden." };
    if (status === "gereserveerd" && rows[0].status_was !== "gereserveerd") {
      await logEvent("founding_member_gereserveerd", { subjectType: "founding_member", subjectId: id, userId: user.id, metadata: { handmatig: true } });
    }
    await logAdmin(user.id, `founding_${status}`, "founding_member", id);
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/beheer/founding-members");
  return { ok: true, message: "Status bijgewerkt." };
}

export async function setRegionSeatsAction(regio: string, plekken: number): Promise<ActionResult> {
  try {
    const user = await admin();
    if (!Number.isInteger(plekken) || plekken < 0 || plekken > 1000) return { ok: false, message: "Ongeldig aantal plekken." };
    const rows = await sql("update founding_member_regios set plekken = $2 where regio = $1 returning regio", [regio, plekken]);
    if (!rows.length) return { ok: false, message: "Onbekende regio." };
    await logAdmin(user.id, "founding_plekken", "founding_member_regio", null, { regio, plekken });
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/beheer/founding-members");
  return { ok: true, message: "Aantal plekken bijgewerkt." };
}

export async function saveCaseAction(fd: FormData): Promise<ActionResult> {
  try {
    const user = await admin();
    const parsed = parseForm(caseSchema, fd);
    if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
    const d = parsed.data;
    const [row] = await sql<{ id: string }>("insert into cases (titel, regio, samenvatting, resultaat) values ($1,$2,$3,$4) returning id", [
      d.titel,
      d.regio ?? null,
      d.samenvatting,
      d.resultaat ?? null,
    ]);
    await logAdmin(user.id, "case_toegevoegd", "case", row.id);
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/beheer/cases");
  return { ok: true, message: "Case opgeslagen (nog niet gepubliceerd)." };
}

export async function setCasePublishedAction(id: string, published: boolean): Promise<ActionResult> {
  try {
    const user = await admin();
    await sql("update cases set gepubliceerd = $2 where id = $1", [id, published]);
    await logAdmin(user.id, published ? "case_gepubliceerd" : "case_verborgen", "case", id);
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/beheer/cases");
  revalidatePath("/");
  return { ok: true, message: published ? "Case gepubliceerd." : "Case verborgen." };
}

export async function deleteCaseAction(id: string): Promise<ActionResult> {
  try {
    const user = await admin();
    await sql("delete from cases where id = $1", [id]);
    await logAdmin(user.id, "case_verwijderd", "case", id);
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/beheer/cases");
  revalidatePath("/");
  return { ok: true, message: "Case verwijderd." };
}
