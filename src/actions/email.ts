"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sql } from "@/lib/db";
import { assertUser, AuthError } from "@/lib/auth/session";
import { deliverMessage, queueEmail, unsubscribeByToken } from "@/lib/email";
import { parseForm } from "@/lib/validation";
import type { ActionResult } from "@/lib/forms/types";

const testMailSchema = z.object({
  to: z.preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() : v), z.email("Vul een geldig e-mailadres in.")),
});

const STATUS_MESSAGES: Record<string, string> = {
  verzonden: "Testmail verzonden.",
  niet_geconfigureerd: "Testmail staat in de outbox, maar is niet verzonden: RESEND_API_KEY of EMAIL_FROM ontbreekt.",
  mislukt: "Verzenden mislukt; zie de foutmelding in de outbox.",
};

async function logAdmin(userId: string, action: string, entityId: string | null, details: Record<string, unknown> = {}) {
  await sql("insert into admin_actions (admin_user_id, action, entity_type, entity_id, details) values ($1,$2,'email',$3,$4::text::jsonb)", [
    userId,
    action,
    entityId,
    JSON.stringify(details),
  ]);
}

export async function sendTestEmailAction(fd: FormData): Promise<ActionResult> {
  try {
    const user = await assertUser(["beheerder"]);
    const parsed = parseForm(testMailSchema, fd);
    if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
    const res = await queueEmail({
      to: parsed.data.to,
      kind: "transactioneel",
      template: "testmail",
      subject: "Testmail van BouwCheck",
      content: {
        heading: "Testmail",
        paragraphs: ["Deze mail is verstuurd vanuit Beheer → E-mail om de e-mailkoppeling te testen."],
      },
    });
    if (!res.queued) return { ok: false, message: "Niet in de wachtrij gezet." };
    await logAdmin(user.id, "testmail", res.id, { to: parsed.data.to, status: res.status });
    revalidatePath("/beheer/e-mail");
    return { ok: res.status === "verzonden", message: STATUS_MESSAGES[res.status] ?? `Status: ${res.status}` };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, message: err.message };
    throw err;
  }
}

/** Zet een niet-verzonden bericht opnieuw klaar en probeert het direct te versturen. */
export async function retryEmailAction(id: string): Promise<ActionResult> {
  try {
    const user = await assertUser(["beheerder"]);
    if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: "Ongeldig bericht." };
    const rows = await sql(
      "update email_messages set status = 'gepland', error_message = null where id = $1 and status in ('niet_geconfigureerd', 'mislukt') returning id",
      [id],
    );
    if (!rows.length) return { ok: false, message: "Dit bericht kan niet opnieuw worden verstuurd." };
    const status = await deliverMessage(id);
    await logAdmin(user.id, "email_opnieuw", id, { status });
    revalidatePath("/beheer/e-mail");
    return { ok: status === "verzonden", message: STATUS_MESSAGES[status] ?? `Status: ${status}` };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, message: err.message };
    throw err;
  }
}

/** Afmelden via de link in een opvolgmail; geen account nodig. */
export async function unsubscribeAction(fd: FormData): Promise<ActionResult> {
  const token = String(fd.get("token") ?? "");
  if (!/^[\w-]{20,64}$/.test(token)) return { ok: false, message: "Ongeldige afmeldlink." };
  const res = await unsubscribeByToken(token);
  if (!res.ok) return { ok: false, message: "Deze afmeldlink is niet (meer) geldig." };
  return { ok: true, message: "Je bent afgemeld. Je ontvangt geen opvolgmails meer." };
}
