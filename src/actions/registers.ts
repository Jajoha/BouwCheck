"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sql } from "@/lib/db";
import { assertUser, AuthError } from "@/lib/auth/session";
import { aiConfig } from "@/lib/ai/config";
import { respondToSignal, reviewSignal, runRegisterCheck } from "@/lib/data/registers";
import { parseForm, optionalText, text } from "@/lib/validation";
import type { ActionResult } from "@/lib/forms/types";

function handle(err: unknown): ActionResult<never> {
  if (err instanceof AuthError) return { ok: false, message: err.message };
  throw err;
}

const uuid = z.string().regex(/^[0-9a-f-]{36}$/i);

async function logAdmin(adminId: string, action: string, entityId: string, details: Record<string, unknown>) {
  await sql("insert into admin_actions (admin_user_id, action, entity_type, entity_id, details) values ($1,$2,'aannemer',$3,$4::text::jsonb)", [
    adminId,
    action,
    entityId,
    JSON.stringify(details),
  ]);
}

/** Beheer: start een registercontrole voor één uitvoerder (duurt doorgaans 30–120 seconden). */
export async function runRegisterCheckAction(contractorId: string): Promise<ActionResult> {
  try {
    const user = await assertUser(["beheerder"]);
    if (!uuid.safeParse(contractorId).success) return { ok: false, message: "Ongeldige uitvoerder." };
    if (!aiConfig.configured) return { ok: false, message: "Registercontrole vereist ANTHROPIC_API_KEY in de serveromgeving." };
    const res = await runRegisterCheck(contractorId, user.id);
    await logAdmin(user.id, res.ok ? "registercontrole_uitgevoerd" : "registercontrole_mislukt", contractorId, { melding: res.message });
    revalidatePath("/beheer/registers");
    revalidatePath("/beheer/aannemers");
    return res.ok ? { ok: true, message: res.message } : { ok: false, message: res.message };
  } catch (err) {
    return handle(err);
  }
}

const reviewSchema = z.object({
  decision: z.enum(["goedgekeurd", "afgewezen", "ingetrokken"]),
  effect: z.enum(["uitsluiting", "waarschuwing"]),
  note: optionalText(500),
});

/** Beheer: signaal goedkeuren, afwijzen of intrekken. Het effect kan alleen worden afgezwakt, nooit verzwaard. */
export async function reviewSignalAction(signalId: string, fd: FormData): Promise<ActionResult> {
  try {
    const user = await assertUser(["beheerder"]);
    if (!uuid.safeParse(signalId).success) return { ok: false, message: "Ongeldig signaal." };
    const parsed = parseForm(reviewSchema, fd);
    if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
    const { decision, effect, note } = parsed.data;
    if (decision === "afgewezen" && !note) return { ok: false, fieldErrors: { note: ["Geef aan waarom het signaal wordt afgewezen."] } };
    const res = await reviewSignal(signalId, user.id, decision, effect, note ?? null);
    if (!res) return { ok: false, message: "Signaal niet gevonden." };
    await logAdmin(user.id, `registersignaal_${decision}`, res.contractorId, { signaal: signalId, effect: res.effect, notitie: note ?? null });
    revalidatePath("/beheer/registers");
    revalidatePath("/aannemers", "layout");
    const msg =
      decision === "goedgekeurd"
        ? res.effect === "uitsluiting"
          ? "Goedgekeurd als uitsluiting: de uitvoerder verschijnt niet meer in teamvoorstellen (wel met reden onder ‘niet gerangschikt’)."
          : "Goedgekeurd als waarschuwing: zichtbaar op het profiel en in teamvoorstellen."
        : decision === "afgewezen"
          ? "Signaal afgewezen."
          : "Signaal ingetrokken.";
    return { ok: true, message: msg };
  } catch (err) {
    return handle(err);
  }
}

const responseSchema = z.object({ response: text(10, 2000, "Reactie") });

/** Uitvoerder: openbare reactie op een goedgekeurd registersignaal over het eigen bedrijf. */
export async function respondToSignalAction(signalId: string, fd: FormData): Promise<ActionResult> {
  try {
    const user = await assertUser(["aannemer", "beheerder"]);
    if (!uuid.safeParse(signalId).success) return { ok: false, message: "Ongeldig signaal." };
    const parsed = parseForm(responseSchema, fd);
    if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
    const ok = await respondToSignal(signalId, user.id, parsed.data.response);
    if (!ok) return { ok: false, message: "Signaal niet gevonden." };
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/portaal");
  return { ok: true, message: "Reactie geplaatst. Die is zichtbaar bij het signaal op je profiel." };
}
