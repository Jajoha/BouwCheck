"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/lib/env";
import { sql } from "@/lib/db";
import { assertUser, AuthError } from "@/lib/auth/session";
import {
  approveAndSend,
  createConcept,
  deleteCheck,
  getCheck,
  getCheckByToken,
  registerFile,
  runAnalysis,
  saveReport,
  submitConcept,
  verifyConcept,
} from "@/lib/data/offertecheck";
import { blobStoragePath, deleteFiles } from "@/lib/storage";
import { hasValidSignature, safeFileName } from "@/lib/uploads";
import { OFFERTECHECK_MAX_BYTES, OFFERTECHECK_TYPES, reportSchema, type Report } from "@/lib/domain/offertecheck";
import { offertecheckSchema, parseForm } from "@/lib/validation";
import type { ActionResult } from "@/lib/forms/types";

const disabled: ActionResult<never> = { ok: false, message: "De Offertecheck is nog niet beschikbaar." };

/** Stap 1: formulier → concept. De browser uploadt daarna de bestanden met het geheim. */
export async function startOffertecheckAction(fd: FormData): Promise<ActionResult<{ checkId: string; secret: string }>> {
  if (!env.features.offertecheck) return disabled;
  const parsed = parseForm(offertecheckSchema, fd);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors, message: "Controleer de gemarkeerde velden." };
  const d = parsed.data;
  const res = await createConcept({
    naam: d.naam,
    email: d.email,
    telefoon: d.telefoon ?? null,
    projectomschrijving: d.projectomschrijving ?? null,
    provincie: d.provincie ?? null,
    consent_contact: d.consent_contact,
    consent_benchmark: d.consent_benchmark,
  });
  if (!res.ok) return { ok: false, message: res.message };
  return { ok: true, data: { checkId: res.id, secret: res.secret } };
}

const blobFileSchema = z.object({
  checkId: z.string(),
  secret: z.string(),
  pathname: z.string().regex(/^offertechecks\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|jpg|png)$/),
  bestandsnaam: z.string().min(1).max(300),
});

/** Stap 2 (met Vercel Blob): registreert een bestand dat de browser rechtstreeks naar Blob heeft geüpload. */
export async function registerBlobFileAction(input: z.infer<typeof blobFileSchema>): Promise<ActionResult> {
  if (!env.features.offertecheck || !env.blobConfigured) return disabled;
  const parsed = blobFileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Ongeldig bestand." };
  const { checkId, secret, pathname, bestandsnaam } = parsed.data;
  if (!pathname.startsWith(`offertechecks/${checkId}/`) || !(await verifyConcept(checkId, secret))) return { ok: false, message: "Deze check is verlopen. Begin opnieuw." };
  const storagePath = blobStoragePath(pathname);
  const { head, get } = await import("@vercel/blob");
  const meta = await head(pathname).catch(() => null);
  if (!meta) return { ok: false, message: "Het bestand is niet aangekomen. Probeer het opnieuw." };
  const type = meta.contentType;
  const reject = async (message: string) => {
    await deleteFiles([storagePath]);
    return { ok: false, message };
  };
  if (!(OFFERTECHECK_TYPES as readonly string[]).includes(type)) return reject("Alleen pdf, jpg en png zijn toegestaan.");
  if (meta.size > OFFERTECHECK_MAX_BYTES) return reject("Een bestand mag maximaal 15 MB zijn.");
  // Bestandssignatuur controleren, niet alleen het opgegeven type
  const blob = await get(pathname, { access: "private", useCache: false });
  const reader = blob?.statusCode === 200 ? blob.stream.getReader() : null;
  const first = reader ? await reader.read() : null;
  await reader?.cancel();
  if (!first?.value || !hasValidSignature(type, Buffer.from(first.value))) return reject("Het bestand is geen geldige pdf, jpg of png.");
  const ext = type === "application/pdf" ? ".pdf" : type === "image/png" ? ".png" : ".jpg";
  const id = await registerFile(checkId, { storagePath, bestandsnaam: safeFileName(bestandsnaam, ext), mimeType: type, grootte: meta.size });
  if (!id) return { ok: false, message: "Maximaal 5 bestanden per check." };
  return { ok: true };
}

/** Stap 3: indienen. De analyse draait na het antwoord op de achtergrond. */
export async function submitOffertecheckAction(checkId: string, secret: string): Promise<ActionResult> {
  if (!env.features.offertecheck) return disabled;
  const res = await submitConcept(checkId, secret);
  if (!res.ok) return { ok: false, message: res.message };
  after(async () => {
    await runAnalysis(checkId);
  });
  redirect("/offertecheck/bedankt");
}

// ── Beheer ─────────────────────────────────────────────────

async function admin() {
  return assertUser(["beheerder"]);
}

async function logAdmin(userId: string, action: string, checkId: string, details: Record<string, unknown> = {}) {
  await sql("insert into admin_actions (admin_user_id, action, entity_type, entity_id, details) values ($1,$2,'offertecheck',$3,$4::text::jsonb)", [
    userId,
    action,
    checkId,
    JSON.stringify(details),
  ]);
}

function handle(err: unknown): ActionResult<never> {
  if (err instanceof AuthError) return { ok: false, message: err.message };
  throw err;
}

export async function rerunAnalysisAction(checkId: string): Promise<ActionResult> {
  try {
    const user = await admin();
    const res = await runAnalysis(checkId, { byAdmin: true });
    await logAdmin(user.id, "offertecheck_analyse", checkId, { ok: res.ok });
    revalidatePath(`/beheer/offertechecks/${checkId}`);
    return { ok: res.ok, message: res.message };
  } catch (err) {
    return handle(err);
  }
}

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

/** Bewerkt de teksten van het rapport; de cijfers komen uit de analyse (of uit het JSON-veld voor gevorderd gebruik). */
export async function saveReportAction(checkId: string, fd: FormData): Promise<ActionResult> {
  try {
    const user = await admin();
    const check = await getCheck(checkId);
    if (!check?.rapport_json || check.status !== "review") return { ok: false, message: "Alleen een rapport in beoordeling kan worden aangepast." };
    let report: Report = check.rapport_json;
    const raw = String(fd.get("rapport_json") ?? "").trim();
    if (raw && raw !== JSON.stringify(check.rapport_json, null, 2)) {
      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch {
        return { ok: false, fieldErrors: { rapport_json: ["Geen geldige JSON."] } };
      }
      const parsed = reportSchema.safeParse(json);
      if (!parsed.success) return { ok: false, fieldErrors: { rapport_json: [`Ongeldig rapport: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`] } };
      report = parsed.data;
    } else {
      const known = new Map(report.open_vragen.map((q) => [q.vraag, q.offerte]));
      report = {
        ...report,
        samenvatting: String(fd.get("samenvatting") ?? "").trim(),
        bevindingen: lines(fd.get("bevindingen")).slice(0, 5),
        open_vragen: lines(fd.get("open_vragen")).map((vraag) => ({ vraag, offerte: known.get(vraag) ?? null })),
      };
    }
    if (!(await saveReport(checkId, report))) return { ok: false, message: "Opslaan mislukt." };
    await logAdmin(user.id, "offertecheck_rapport_bewerkt", checkId);
    revalidatePath(`/beheer/offertechecks/${checkId}`);
    return { ok: true, message: "Rapport opgeslagen." };
  } catch (err) {
    return handle(err);
  }
}

export async function approveCheckAction(checkId: string): Promise<ActionResult> {
  try {
    const user = await admin();
    const res = await approveAndSend(checkId, user.id);
    if (!res.ok) return { ok: false, message: res.message };
    await logAdmin(user.id, "offertecheck_verstuurd", checkId, { mail: res.mailStatus ?? null });
    revalidatePath("/beheer/offertechecks");
    revalidatePath(`/beheer/offertechecks/${checkId}`);
    const mailNote =
      res.mailStatus === "verzonden" ? "De klant heeft een mail ontvangen." : "Er is géén mail verzonden (e-mail niet geconfigureerd): stuur de rapportlink zelf door.";
    return { ok: true, message: `Rapport goedgekeurd. ${mailNote}` };
  } catch (err) {
    return handle(err);
  }
}

export async function deleteCheckAction(checkId: string): Promise<ActionResult> {
  try {
    const user = await admin();
    if (!(await deleteCheck(checkId))) return { ok: false, message: "Check niet gevonden of al verwijderd." };
    await logAdmin(user.id, "offertecheck_verwijderd", checkId);
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/beheer/offertechecks");
  redirect("/beheer/offertechecks?melding=check-verwijderd");
}

/** De klant verwijdert zelf zijn check (via het rapport-token). */
export async function deleteOwnCheckAction(token: string): Promise<ActionResult> {
  const check = await getCheckByToken(token);
  if (!check) return { ok: false, message: "Deze check bestaat niet (meer)." };
  await deleteCheck(check.id);
  redirect("/offertecheck/verwijderd");
}
