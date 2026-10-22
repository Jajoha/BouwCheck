import "server-only";
import { sql, type Queryable } from "@/lib/db";

/**
 * Funnel-events, opgeslagen in de eigen database (geen externe trackers).
 * Spiegelt de check-constraint op funnel_events.event.
 */
export const FUNNEL_EVENTS = [
  "offertecheck_gestart",
  "offertecheck_ingediend",
  "offertecheck_rapport_verstuurd",
  "offertecheck_link_geklikt",
  "teamvoorstel_gestart",
  "teamvoorstel_ontvangen",
  "founding_member_interesse",
  "founding_member_gereserveerd",
  "projectpas_interesse",
  "pro_interesse",
] as const;
export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

export type EventDetails = {
  subjectType?: string;
  subjectId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Legt een event vast. Een mislukte registratie mag de gebruikersflow nooit breken,
 * behalve binnen een transactie (`db`): dan rolt alles samen terug.
 */
export async function logEvent(event: FunnelEvent, details: EventDetails = {}, db?: Queryable): Promise<void> {
  const q =
    "insert into funnel_events (event, subject_type, subject_id, user_id, metadata) values ($1,$2,$3,$4,$5::text::jsonb)";
  const params = [event, details.subjectType ?? null, details.subjectId ?? null, details.userId ?? null, JSON.stringify(details.metadata ?? {})];
  if (db) {
    await db.query(q, params);
    return;
  }
  try {
    await sql(q, params);
  } catch (err) {
    console.error(`Funnel-event ${event} niet vastgelegd`, err);
  }
}

/** Legt een event maximaal één keer per onderwerp vast (bijv. het eerste teamvoorstel van een project). */
export async function logEventOnce(event: FunnelEvent, details: EventDetails & { subjectType: string; subjectId: string }): Promise<void> {
  try {
    await sql(
      `insert into funnel_events (event, subject_type, subject_id, user_id, metadata)
       select $1,$2,$3,$4,$5::text::jsonb
       where not exists (select 1 from funnel_events where event = $1 and subject_type = $2 and subject_id = $3)`,
      [event, details.subjectType, details.subjectId, details.userId ?? null, JSON.stringify(details.metadata ?? {})],
    );
  } catch (err) {
    console.error(`Funnel-event ${event} niet vastgelegd`, err);
  }
}
