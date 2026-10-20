import "server-only";
import { randomBytes } from "node:crypto";
import { sql, sqlOne, type Queryable } from "@/lib/db";
import { env } from "@/lib/env";
import { site } from "@/config/site";
import { mayQueueEmail, normalizeEmail, renderEmail, type EmailContent, type EmailKind } from "./render";

/**
 * E-mail via Resend (https://resend.com), aangeroepen met fetch (geen extra afhankelijkheid).
 * RESEND_BASE_URL is alleen bedoeld voor tests (nep-server).
 * Alle berichten gaan eerst naar de outbox (email_messages). Zonder RESEND_API_KEY en EMAIL_FROM
 * krijgen ze de status 'niet_geconfigureerd' en blijven ze zichtbaar in Beheer → E-mail;
 * er wordt nooit gedaan alsof een mail is verzonden.
 */
export const emailConfig = {
  configured: Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim()),
  from: process.env.EMAIL_FROM?.trim() || "",
  replyTo: process.env.EMAIL_REPLY_TO?.trim() || undefined,
};

export type QueueEmailInput = {
  to: string;
  kind: EmailKind;
  /** Naam van de template, voor beheer en rapportage (bijv. 'offertecheck_rapport'). */
  template: string;
  subject: string;
  content: EmailContent;
  /** Toestemming voor opvolgmails (verplicht true bij kind 'opvolging'). */
  consent?: boolean;
  /** Later versturen (opvolgreeks); standaard direct. */
  sendAfter?: Date;
  sequenceKey?: string;
};

export type QueueResult = { queued: false; reason: "geen_toestemming" } | { queued: true; id: string; status: string };

export const unsubscribeUrl = (token: string) => `${env.appUrl}/afmelden/${token}`;

export async function isUnsubscribed(email: string, db?: Queryable): Promise<boolean> {
  const q = "select 1 as x from email_unsubscribes where email = $1";
  const rows = db ? await db.query(q, [normalizeEmail(email)]) : await sql(q, [normalizeEmail(email)]);
  return rows.length > 0;
}

/** Zet een bericht in de outbox en verstuurt het direct als het nu al aan de beurt is. */
export async function queueEmail(input: QueueEmailInput): Promise<QueueResult> {
  const to = normalizeEmail(input.to);
  const unsubscribed = await isUnsubscribed(to);
  if (!mayQueueEmail(input.kind, { consent: input.consent ?? false, unsubscribed })) return { queued: false, reason: "geen_toestemming" };
  const token = randomBytes(24).toString("base64url");
  const rendered = renderEmail(input.content, {
    brand: site.name,
    unsubscribeUrl: input.kind === "opvolging" ? unsubscribeUrl(token) : undefined,
  });
  const row = await sqlOne<{ id: string }>(
    `insert into email_messages (to_email, kind, template, subject, html, text_body, send_after, sequence_key, unsubscribe_token)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
    [to, input.kind, input.template, input.subject, rendered.html, rendered.text, (input.sendAfter ?? new Date()).toISOString(), input.sequenceKey ?? null, token],
  );
  const id = row!.id;
  if (!input.sendAfter || input.sendAfter.getTime() <= Date.now()) {
    const status = await deliverMessage(id);
    return { queued: true, id, status };
  }
  return { queued: true, id, status: "gepland" };
}

type MessageRow = {
  id: string;
  to_email: string;
  kind: EmailKind;
  subject: string;
  html: string;
  text_body: string;
  unsubscribe_token: string;
};

/** Claimt en verstuurt één bericht. Geeft de nieuwe status terug. */
export async function deliverMessage(id: string): Promise<string> {
  const msg = await sqlOne<MessageRow>(
    "update email_messages set status = 'bezig' where id = $1 and status = 'gepland' returning id, to_email, kind, subject, html, text_body, unsubscribe_token",
    [id],
  );
  if (!msg) return "niet_gepland";
  return send(msg);
}

async function finish(id: string, status: string, fields: { providerId?: string; error?: string } = {}) {
  await sql(
    "update email_messages set status = $2, sent_at = case when $2 = 'verzonden' then now() else sent_at end, provider_message_id = $3, error_message = $4 where id = $1",
    [id, status, fields.providerId ?? null, fields.error ?? null],
  );
  return status;
}

async function send(msg: MessageRow): Promise<string> {
  if (msg.kind === "opvolging" && (await isUnsubscribed(msg.to_email))) return finish(msg.id, "geannuleerd", { error: "Afgemeld" });
  if (!emailConfig.configured) return finish(msg.id, "niet_geconfigureerd", { error: "RESEND_API_KEY of EMAIL_FROM ontbreekt" });
  const headers: Record<string, string> = {};
  if (msg.kind === "opvolging") headers["List-Unsubscribe"] = `<${unsubscribeUrl(msg.unsubscribe_token)}>`;
  try {
    const res = await fetch(`${process.env.RESEND_BASE_URL?.trim() || "https://api.resend.com"}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
        "Content-Type": "application/json",
        // Resend negeert een herhaald verzoek met dezelfde sleutel: geen dubbele mail bij een retry
        "Idempotency-Key": msg.id,
      },
      body: JSON.stringify({
        from: emailConfig.from,
        to: [msg.to_email],
        subject: msg.subject,
        html: msg.html,
        text: msg.text_body,
        reply_to: emailConfig.replyTo,
        headers,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) return finish(msg.id, "mislukt", { error: `Resend ${res.status}: ${body.message ?? "onbekende fout"}`.slice(0, 500) });
    return finish(msg.id, "verzonden", { providerId: body.id });
  } catch (err) {
    return finish(msg.id, "mislukt", { error: String(err instanceof Error ? err.message : err).slice(0, 500) });
  }
}

/** Verstuurt geplande berichten die aan de beurt zijn (aangeroepen door de cron). */
export async function processDueEmails(limit = 50): Promise<Record<string, number>> {
  // Claimen in één statement: gelijktijdige runs pakken nooit hetzelfde bericht.
  const due = await sql<MessageRow>(
    `update email_messages set status = 'bezig'
     where id in (select id from email_messages where status = 'gepland' and send_after <= now() order by send_after limit $1 for update skip locked)
     returning id, to_email, kind, subject, html, text_body, unsubscribe_token`,
    [limit],
  );
  const counts: Record<string, number> = {};
  for (const msg of due) {
    const status = await send(msg);
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts;
}

/** Stopt een reeks: alle nog geplande berichten worden geannuleerd. */
export async function cancelSequence(sequenceKey: string, reason: string): Promise<number> {
  const rows = await sql(
    "update email_messages set status = 'geannuleerd', error_message = $2 where sequence_key = $1 and status = 'gepland' returning id",
    [sequenceKey, reason],
  );
  return rows.length;
}

/** Afmelden via het token uit een mail: legt de afmelding vast en annuleert alle geplande opvolgmails. */
export async function unsubscribeByToken(token: string): Promise<{ ok: boolean; email?: string }> {
  const msg = await sqlOne<{ to_email: string }>("select to_email from email_messages where unsubscribe_token = $1", [token]);
  if (!msg) return { ok: false };
  await sql("insert into email_unsubscribes (email) values ($1) on conflict (email) do nothing", [msg.to_email]);
  await sql(
    "update email_messages set status = 'geannuleerd', error_message = 'Afgemeld' where to_email = $1 and kind = 'opvolging' and status = 'gepland'",
    [msg.to_email],
  );
  return { ok: true, email: msg.to_email };
}
