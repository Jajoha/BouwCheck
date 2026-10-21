import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { sql, sqlOne, transaction } from "@/lib/db";
import { env } from "@/lib/env";
import { site } from "@/config/site";
import { alignOffers, extractOffer, prepareDocument, type OfferDocument } from "@/lib/ai/offertecheck";
import { recordUsage } from "@/lib/data/ai-usage";
import { cancelSequence, queueEmail } from "@/lib/email";
import { logEvent } from "@/lib/events";
import { deleteFiles, readFileBuffer } from "@/lib/storage";
import {
  benchmarkRows,
  buildReport,
  deadlineFor,
  normalizeAlignment,
  OFFERTECHECK_MAX_FILES,
  parseWeeklyMax,
  weeklyCapacity,
  type Report,
  type WeeklyCapacity,
} from "@/lib/domain/offertecheck";

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const offertecheckConfig = {
  /** Maximale AI-kosten voor alle Offertechecks samen per kalenderdag (UTC), in USD. */
  dailyBudgetUsd: num(process.env.OFFERTECHECK_DAILY_BUDGET_USD, 25),
  /** Maximaal aantal ingediende checks per e-mailadres per 24 uur (misbruikrem). */
  maxPerEmailPerDay: num(process.env.OFFERTECHECK_MAX_PER_EMAIL, 3),
  /** Optionele agendalink op de bedankpagina (bijv. Calendly of een Google-afsprakenpagina). */
  agendaUrl: process.env.OFFERTECHECK_AGENDA_URL?.trim() || null,
  /** Maximaal aantal checks per week (elke check wordt door een mens nagekeken). Leeg = geen limiet en geen "Beperkt"-regel. */
  maxPerWeek: parseWeeklyMax(process.env.OFFERTECHECK_MAX_PER_WEEK),
};

/** Ingediende checks in de lopende week (maandag 00:00 tot nu, Nederlandse tijd); ook verwijderde tellen mee. */
export async function checksSubmittedThisWeek(): Promise<number> {
  const row = await sqlOne<{ n: number }>(
    `select count(*)::int as n from offerte_checks
      where submitted_at >= (date_trunc('week', now() at time zone 'Europe/Amsterdam') at time zone 'Europe/Amsterdam')`,
  );
  return row?.n ?? 0;
}

export async function getWeeklyCapacity(): Promise<WeeklyCapacity | null> {
  if (offertecheckConfig.maxPerWeek === null) return null;
  return weeklyCapacity(offertecheckConfig.maxPerWeek, await checksSubmittedThisWeek());
}

const hash = (secret: string) => createHash("sha256").update(secret).digest("hex");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CheckRow = {
  id: string;
  status: "concept" | "ingediend" | "in_analyse" | "review" | "verstuurd" | "verwijderd";
  created_at: string;
  submitted_at: string | null;
  naam: string | null;
  email: string | null;
  telefoon: string | null;
  projectomschrijving: string | null;
  provincie: string | null;
  consent_contact: boolean;
  consent_benchmark: boolean;
  analyse_gestart_op: string | null;
  analyse_fout: string | null;
  rapport_json: Report | null;
  rapport_token: string | null;
  rapport_verstuurd_op: string | null;
  project_id: string | null;
};

const CHECK_COLUMNS = `id, status, created_at::text, submitted_at::text, naam, email, telefoon, projectomschrijving, provincie, consent_contact, consent_benchmark,
  analyse_gestart_op::text, analyse_fout, rapport_json, rapport_token, rapport_verstuurd_op::text, project_id`;

// ── Indienen (zonder account) ───────────────────────────────

export type ConceptInput = {
  naam: string;
  email: string;
  telefoon: string | null;
  projectomschrijving: string | null;
  provincie: string | null;
  consent_contact: boolean;
  consent_benchmark: boolean;
};

/** Maakt een concept-check aan; het geheim krijgt alleen de browser die het formulier invult. */
export const WEEK_FULL_MESSAGE = "Deze week zijn alle plekken voor de Offertecheck bezet. Probeer het volgende week opnieuw.";

export async function createConcept(input: ConceptInput): Promise<{ ok: true; id: string; secret: string } | { ok: false; message: string }> {
  const capacity = await getWeeklyCapacity();
  if (capacity && capacity.remaining === 0) return { ok: false, message: WEEK_FULL_MESSAGE };
  const recent = await sqlOne<{ n: number }>(
    "select count(*)::int as n from offerte_checks where lower(email) = lower($1) and status <> 'concept' and created_at > now() - interval '24 hours'",
    [input.email],
  );
  if ((recent?.n ?? 0) >= offertecheckConfig.maxPerEmailPerDay) {
    return { ok: false, message: "Je hebt vandaag al meerdere checks ingediend. Probeer het morgen opnieuw of neem contact met ons op." };
  }
  const secret = randomBytes(24).toString("base64url");
  const row = await sqlOne<{ id: string }>(
    `insert into offerte_checks (naam, email, telefoon, projectomschrijving, provincie, consent_contact, consent_benchmark, upload_secret_hash)
     values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
    [input.naam, input.email, input.telefoon, input.projectomschrijving, input.provincie, input.consent_contact, input.consent_benchmark, hash(secret)],
  );
  await logEvent("offertecheck_gestart", { subjectType: "offertecheck", subjectId: row!.id });
  return { ok: true, id: row!.id, secret };
}

/** Controleert of de browser bestanden aan dit concept mag toevoegen. */
export async function verifyConcept(checkId: string, secret: string): Promise<{ fileCount: number } | null> {
  if (!UUID.test(checkId) || !secret) return null;
  const row = await sqlOne<{ n: number }>(
    `select (select count(*)::int from offerte_bestanden b where b.check_id = c.id) as n
       from offerte_checks c where c.id = $1 and c.status = 'concept' and c.upload_secret_hash = $2 and c.created_at > now() - interval '2 hours'`,
    [checkId, hash(secret)],
  );
  return row ? { fileCount: row.n } : null;
}

export async function registerFile(checkId: string, file: { storagePath: string; bestandsnaam: string; mimeType: string; grootte: number }) {
  const row = await sqlOne<{ id: string }>(
    `insert into offerte_bestanden (check_id, storage_path, bestandsnaam, mime_type, grootte, volgorde)
     select $1,$2,$3,$4,$5, count(*) from offerte_bestanden where check_id = $1
     having count(*) < $6
     returning id`,
    [checkId, file.storagePath, file.bestandsnaam, file.mimeType, file.grootte, OFFERTECHECK_MAX_FILES],
  );
  if (!row) {
    await deleteFiles([file.storagePath]);
    return null;
  }
  return row.id;
}

/** Zet het concept op 'ingediend'; daarna begint de 48-uurstermijn. */
export async function submitConcept(checkId: string, secret: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const concept = await verifyConcept(checkId, secret);
  if (!concept) return { ok: false, message: "Deze check is verlopen. Begin opnieuw." };
  if (concept.fileCount === 0) return { ok: false, message: "Voeg minimaal één offerte toe." };
  const capacity = await getWeeklyCapacity();
  if (capacity && capacity.remaining === 0) return { ok: false, message: WEEK_FULL_MESSAGE };
  const row = await sqlOne<{ id: string }>(
    "update offerte_checks set status = 'ingediend', submitted_at = now(), upload_secret_hash = null where id = $1 and status = 'concept' returning id",
    [checkId],
  );
  if (!row) return { ok: false, message: "Deze check is al ingediend." };
  await logEvent("offertecheck_ingediend", { subjectType: "offertecheck", subjectId: checkId, metadata: { bestanden: concept.fileCount } });
  return { ok: true };
}

// ── Analyse ────────────────────────────────────────────────

export async function offertecheckCostToday(): Promise<number> {
  const row = await sqlOne<{ cost: number }>(
    "select coalesce(sum(cost_usd), 0) as cost from ai_usage where feature = 'offertecheck' and created_at >= date_trunc('day', now())",
  );
  return Number(row?.cost ?? 0);
}

type FileRow = { id: string; storage_path: string; bestandsnaam: string; mime_type: OfferDocument["mimeType"]; volgorde: number };

/**
 * Analyseert een ingediende check en zet hem klaar voor beoordeling (status 'review').
 * Mislukt de analyse, dan blijft de check op 'ingediend' staan met de fout, zodat beheer hem opnieuw kan starten.
 * `byAdmin` = handmatig gestart door een beheerder: ook bij een bestaand rapport en voorbij het dagbudget.
 */
export async function runAnalysis(checkId: string, opts: { byAdmin?: boolean } = {}): Promise<{ ok: boolean; message: string }> {
  const claimed = await sqlOne<{ projectomschrijving: string | null }>(
    `update offerte_checks set status = 'in_analyse', analyse_gestart_op = now(), analyse_fout = null
      where id = $1 and (status = 'ingediend' or ($2 and status in ('review', 'in_analyse')))
      returning projectomschrijving`,
    [checkId, Boolean(opts.byAdmin)],
  );
  if (!claimed) return { ok: false, message: "Deze check kan nu niet (opnieuw) worden geanalyseerd." };

  const fail = async (message: string) => {
    await sql("update offerte_checks set status = 'ingediend', analyse_fout = $2 where id = $1 and status = 'in_analyse'", [checkId, message.slice(0, 500)]);
    return { ok: false, message };
  };

  try {
    if (!opts.byAdmin && (await offertecheckCostToday()) >= offertecheckConfig.dailyBudgetUsd) {
      return fail(`Dagbudget voor AI ($ ${offertecheckConfig.dailyBudgetUsd}) bereikt; start de analyse handmatig vanuit beheer.`);
    }
    const files = await sql<FileRow>("select id, storage_path, bestandsnaam, mime_type, volgorde from offerte_bestanden where check_id = $1 order by volgorde", [checkId]);
    if (!files.length) return fail("Geen bestanden gevonden.");

    const results = await Promise.all(
      files.map(async (f) => {
        const buffer = await readFileBuffer(f.storage_path);
        if (!buffer) return { file: f, ok: false as const, message: `Bestand ${f.bestandsnaam} ontbreekt in de opslag.` };
        let prepared;
        try {
          prepared = await prepareDocument({ bestandsnaam: f.bestandsnaam, mimeType: f.mime_type, buffer });
        } catch (err) {
          return { file: f, ok: false as const, message: String(err instanceof Error ? err.message : err) };
        }
        const res = await extractOffer(prepared, { bestandsnaam: f.bestandsnaam, projectomschrijving: claimed.projectomschrijving });
        await recordUsage(null, null, prepared.kind === "image" ? 1 : 0, res.usage, { feature: "offertecheck", offerteCheckId: checkId });
        return res.ok ? { file: f, ok: true as const, offer: res.data } : { file: f, ok: false as const, message: `${f.bestandsnaam}: ${res.message}` };
      }),
    );
    const failed = results.filter((r) => !r.ok);
    if (failed.length) return fail(failed.map((r) => (r.ok ? "" : r.message)).join(" · "));

    const extracted = results.flatMap((r) => (r.ok ? [{ file: r.file, offer: r.offer }] : []));
    const offers = extracted.filter((x) => x.offer.is_offerte);
    if (!offers.length) return fail("Geen van de bestanden lijkt een offerte of prijsopgave.");

    const aligned = await alignOffers(offers.map((x) => x.offer));
    await recordUsage(null, null, 0, aligned.usage, { feature: "offertecheck", offerteCheckId: checkId });
    if (!aligned.ok) return fail(`Koppelen op één scope: ${aligned.message}`);

    const offerInputs = offers.map((x) => ({ ...x.offer, bestandsnaam: x.file.bestandsnaam }));
    const posts = normalizeAlignment(offerInputs, aligned.data);
    const report = buildReport({ offers: offerInputs, posts, openQuestions: aligned.data.open_vragen, summary: aligned.data.samenvatting });
    for (const skipped of extracted.filter((x) => !x.offer.is_offerte)) {
      report.open_vragen.push({ offerte: null, vraag: `Het bestand "${skipped.file.bestandsnaam}" lijkt geen offerte en is niet meegenomen. Klopt dat?` });
    }

    const postOf = new Map<string, string>();
    posts.forEach((p) => p.regels.forEach((r) => postOf.set(`${r.offerte}:${r.regel}`, p.key)));
    await transaction(async (tx) => {
      await tx.query("delete from offerte_regels where check_id = $1", [checkId]);
      for (const [o, x] of offers.entries()) {
        for (const [r, l] of x.offer.regels.entries()) {
          await tx.query(
            `insert into offerte_regels (check_id, bestand_id, aannemer_naam, omschrijving, vakgebied, hoeveelheid, eenheid, bedrag_excl_btw, type, zekerheid, toelichting, scope_post, volgorde)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
            [checkId, x.file.id, x.offer.aannemer_naam, l.omschrijving, l.vakgebied, l.hoeveelheid, l.eenheid, l.bedrag_excl_btw, l.type, l.zekerheid, l.toelichting, postOf.get(`${o}:${r}`) ?? null, r],
          );
        }
      }
      await tx.query("update offerte_checks set status = 'review', rapport_json = $2::text::jsonb, analyse_fout = null where id = $1", [checkId, JSON.stringify(report)]);
    });
    return { ok: true, message: "Analyse klaar; het rapport staat klaar voor beoordeling." };
  } catch (err) {
    console.error("[offertecheck] analyse mislukt", err);
    return fail(`Onverwachte fout: ${String(err instanceof Error ? err.message : err)}`);
  }
}

// ── Beheer ─────────────────────────────────────────────────

export async function listChecks() {
  return sql<Omit<CheckRow, "rapport_json"> & { bestanden: number }>(
    `select ${CHECK_COLUMNS.replace("rapport_json, ", "")}, (select count(*)::int from offerte_bestanden b where b.check_id = c.id) as bestanden
       from offerte_checks c where status not in ('concept') order by (status = 'verwijderd'), submitted_at desc nulls last limit 300`,
  );
}

export async function getCheck(id: string): Promise<CheckRow | null> {
  if (!UUID.test(id)) return null;
  return sqlOne<CheckRow>(`select ${CHECK_COLUMNS} from offerte_checks where id = $1`, [id]);
}

export async function getCheckFiles(id: string) {
  return sql<{ id: string; bestandsnaam: string; mime_type: string; grootte: number }>(
    "select id, bestandsnaam, mime_type, grootte from offerte_bestanden where check_id = $1 order by volgorde",
    [id],
  );
}

export async function getCheckLines(id: string) {
  return sql<{ bestand_id: string; aannemer_naam: string | null; omschrijving: string; vakgebied: string; hoeveelheid: number | null; eenheid: string | null; bedrag_excl_btw: number | null; type: string; zekerheid: string; toelichting: string | null; scope_post: string | null }>(
    "select bestand_id, aannemer_naam, omschrijving, vakgebied, hoeveelheid, eenheid, bedrag_excl_btw, type, zekerheid, toelichting, scope_post from offerte_regels where check_id = $1 order by bestand_id, volgorde",
    [id],
  );
}

export async function saveReport(id: string, report: Report) {
  const rows = await sql("update offerte_checks set rapport_json = $2::text::jsonb where id = $1 and status = 'review' returning id", [id, JSON.stringify(report)]);
  return rows.length > 0;
}

export const reportUrl = (token: string) => `${env.appUrl}/rapport/${token}`;

/** Keurt het rapport goed: token aanmaken, benchmarks vastleggen (met toestemming), mail versturen. */
export async function approveAndSend(id: string, adminId: string): Promise<{ ok: boolean; message: string; mailStatus?: string; url?: string }> {
  const token = randomBytes(32).toString("base64url");
  const check = await transaction(async (tx) => {
    const [row] = await tx.query<CheckRow>(
      `update offerte_checks set status = 'verstuurd', rapport_token = $2, rapport_verstuurd_op = now(), beoordeeld_door = $3
        where id = $1 and status = 'review' and rapport_json is not null returning ${CHECK_COLUMNS}`,
      [id, token, adminId],
    );
    if (!row) return null;
    const lines = await tx.query<{ vakgebied: string; eenheid: string | null; hoeveelheid: number | null; bedrag_excl_btw: number | null; type: string }>(
      "select vakgebied, eenheid, hoeveelheid, bedrag_excl_btw, type from offerte_regels where check_id = $1",
      [id],
    );
    const month = new Date().toISOString().slice(0, 7) + "-01";
    const rows = benchmarkRows(lines as Parameters<typeof benchmarkRows>[0], { consent: row.consent_benchmark, regio: row.provincie, maand: month });
    for (const b of rows) {
      await tx.query("insert into benchmark_regels (vakgebied, eenheid, prijs_per_eenheid, regio, maand) values ($1,$2,$3,$4,$5)", [b.vakgebied, b.eenheid, b.prijs_per_eenheid, b.regio, b.maand]);
    }
    return row;
  });
  if (!check) return { ok: false, message: "Alleen een rapport in beoordeling kan worden verstuurd." };

  const url = reportUrl(token);
  const report = check.rapport_json!;
  const mail = await queueEmail({
    to: check.email!,
    kind: "transactioneel",
    template: "offertecheck_rapport",
    subject: "Je Offertecheck staat klaar",
    content: {
      heading: `${check.naam ? `${check.naam.split(" ")[0]}, je` : "Je"} Offertecheck staat klaar`,
      paragraphs: [
        `We hebben ${report.offertes.length === 1 ? "je offerte" : `je ${report.offertes.length} offertes`} op één scope gezet. De belangrijkste bevindingen:`,
        ...report.bevindingen.map((b) => `• ${b}`),
        "In het rapport zie je per post wat elke offerte wel en niet bevat, en welke vragen je aan de aannemers kunt stellen.",
      ],
      cta: { label: "Bekijk je rapport", url },
      footnote: `De Offertecheck is geen offerte en geen advies; ${site.name} is geen partij bij afspraken tussen jou en een aannemer.`,
    },
  });
  const submitted = check.submitted_at ? new Date(check.submitted_at) : new Date();
  await logEvent("offertecheck_rapport_verstuurd", {
    subjectType: "offertecheck",
    subjectId: id,
    userId: adminId,
    metadata: { binnen_48u: Date.now() <= deadlineFor(submitted).getTime(), mail: mail.queued ? mail.status : "niet_verstuurd" },
  });
  return { ok: true, message: "Rapport verstuurd.", mailStatus: mail.queued ? mail.status : undefined, url };
}

/** Verwijdert bestanden, regels en persoonsgegevens. De rij blijft (zonder inhoud) bestaan voor de funnelcijfers. */
export async function deleteCheck(id: string): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const files = await sql<{ storage_path: string }>("select storage_path from offerte_bestanden where check_id = $1", [id]);
  await deleteFiles(files.map((f) => f.storage_path));
  const rows = await sql(
    `update offerte_checks set status = 'verwijderd', verwijderd_op = now(), naam = null, email = null, telefoon = null, projectomschrijving = null,
       rapport_json = null, rapport_token = null, upload_secret_hash = null, analyse_fout = null
     where id = $1 and status <> 'verwijderd' returning id`,
    [id],
  );
  await sql("delete from offerte_bestanden where check_id = $1", [id]);
  await cancelSequence(`offertecheck:${id}`, "Check verwijderd");
  return rows.length > 0;
}

// ── Rapport (openbaar via token) ───────────────────────────

export async function getCheckByToken(token: string): Promise<CheckRow | null> {
  if (!/^[\w-]{40,64}$/.test(token)) return null;
  return sqlOne<CheckRow>(`select ${CHECK_COLUMNS} from offerte_checks where rapport_token = $1 and status = 'verstuurd'`, [token]);
}

/** Opruimen van concepten die nooit zijn ingediend (bijv. afgebroken uploads). */
export async function purgeStaleConcepts(): Promise<number> {
  const stale = await sql<{ id: string }>("select id from offerte_checks where status = 'concept' and created_at < now() - interval '1 day' limit 100");
  for (const c of stale) {
    const files = await sql<{ storage_path: string }>("select storage_path from offerte_bestanden where check_id = $1", [c.id]);
    await deleteFiles(files.map((f) => f.storage_path));
    await sql("delete from offerte_checks where id = $1", [c.id]);
  }
  return stale.length;
}
