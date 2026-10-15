"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql, sqlOne } from "@/lib/db";
import { assertUser, AuthError, FLIPPER_ROLES, getCurrentUser } from "@/lib/auth/session";
import { flagSchema, leadSchema, parseForm } from "@/lib/validation";
import type { ActionResult } from "@/lib/forms/types";

function handle(err: unknown): ActionResult<never> {
  if (err instanceof AuthError) return { ok: false, message: err.message };
  throw err;
}

export async function toggleFavoriteAction(contractorId: string): Promise<ActionResult<{ favorite: boolean }>> {
  try {
    const user = await assertUser(FLIPPER_ROLES);
    const removed = await sql("delete from favorites where user_id = $1 and contractor_id = $2 returning id", [user.id, contractorId]);
    if (removed.length) {
      revalidatePath("/favorieten");
      return { ok: true, message: "Verwijderd uit opgeslagen aannemers.", data: { favorite: false } };
    }
    const exists = await sqlOne("select 1 from contractors where id = $1 and status = 'actief'", [contractorId]);
    if (!exists) return { ok: false, message: "Aannemer niet gevonden." };
    await sql("insert into favorites (user_id, contractor_id) values ($1,$2) on conflict do nothing", [user.id, contractorId]);
    revalidatePath("/favorieten");
    return { ok: true, message: "Aannemer opgeslagen.", data: { favorite: true } };
  } catch (err) {
    return handle(err) as ActionResult<{ favorite: boolean }>;
  }
}

export async function submitLeadAction(fd: FormData): Promise<ActionResult> {
  const parsed = parseForm(leadSchema, fd);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors, message: "Controleer de gemarkeerde velden." };
  const d = parsed.data;
  const user = await getCurrentUser();
  await sql(
    "insert into interest_leads (lead_type, name, email, company, phone, message, user_id) values ($1,$2,$3,$4,$5,$6,$7)",
    [d.lead_type, d.name, d.email, d.company ?? null, d.phone ?? null, d.message ?? null, user?.id ?? null],
  );
  redirect(`/bedankt?type=${d.lead_type}`);
}

export async function submitFlagAction(fd: FormData): Promise<ActionResult> {
  try {
    const user = await assertUser();
    const parsed = parseForm(flagSchema, fd);
    if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
    const d = parsed.data;
    let contractorId: string | null = null;
    if (d.entity_type === "aannemer") contractorId = (await sqlOne<{ id: string }>("select id from contractors where id = $1", [d.entity_id]))?.id ?? null;
    if (d.entity_type === "review") contractorId = (await sqlOne<{ contractor_id: string }>("select contractor_id from reviews where id = $1", [d.entity_id]))?.contractor_id ?? null;
    if (d.entity_type === "projectresultaat") contractorId = (await sqlOne<{ contractor_id: string }>("select contractor_id from project_outcomes where id = $1", [d.entity_id]))?.contractor_id ?? null;
    if (!contractorId) return { ok: false, message: "Het gemelde item bestaat niet (meer)." };
    const recent = await sqlOne<{ n: number }>(
      "select count(*)::int as n from flags where reporter_user_id = $1 and created_at > now() - interval '1 day'",
      [user.id],
    );
    if ((recent?.n ?? 0) >= 10) return { ok: false, message: "Je hebt vandaag al veel meldingen gedaan. Probeer het morgen opnieuw." };
    await sql(
      "insert into flags (entity_type, entity_id, contractor_id, reason, details, reporter_user_id) values ($1,$2,$3,$4,$5,$6)",
      [d.entity_type, d.entity_id, contractorId, d.reason, d.details, user.id],
    );
    return { ok: true, message: "Bedankt. Je melding is ontvangen en wordt door beheer beoordeeld." };
  } catch (err) {
    return handle(err);
  }
}
