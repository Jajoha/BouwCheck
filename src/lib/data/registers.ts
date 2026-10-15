import "server-only";
import { sql, sqlOne, transaction } from "@/lib/db";
import { runRegisterAgent } from "@/lib/ai/register-agent";
import { recordUsage } from "@/lib/data/ai-usage";
import { todayIso } from "@/lib/today";
import {
  allowedEffect,
  isCheckStale,
  policyEffect,
  REGISTER_MAX_AGE_DAYS,
  type MatchBasis,
  type RegisterSignal,
  type SignalEffect,
  type SignalKind,
  type SignalStatus,
} from "@/lib/domain/registers";
import type { ProviderType } from "@/lib/domain/constants";

const SIGNAL_COLUMNS = `s.id, s.kind, s.effect, s.status, s.title, s.summary, s.source_name, s.source_url, s.event_date::text as event_date,
  s.match_basis, s.contractor_response`;

export type RegisterCheckRow = {
  id: string;
  status: "voltooid" | "mislukt";
  kvk_number: string | null;
  kvk_confirmed: boolean;
  summary: string | null;
  sources_checked: { name: string; url: string }[];
  findings_count: number;
  error_message: string | null;
  created_at: string;
};

export type RegisterState = {
  lastCheck: RegisterCheckRow | null;
  stale: boolean;
  signals: (RegisterSignal & { reviewed_at: string | null; responded_at: string | null; review_note: string | null; created_at: string })[];
};

/** Registerstatus van één uitvoerder. Publiek: alleen goedgekeurde signalen; beheer/eigenaar: ook voorgesteld. */
export async function getRegisterState(contractorId: string, opts: { includeUnapproved?: boolean } = {}): Promise<RegisterState> {
  const lastCheck = await sqlOne<RegisterCheckRow>(
    `select id, status, kvk_number, kvk_confirmed, summary, sources_checked, findings_count, error_message, created_at::text as created_at
       from register_checks where contractor_id = $1 and status = 'voltooid' order by created_at desc limit 1`,
    [contractorId],
  );
  const signals = await sql<RegisterState["signals"][number]>(
    `select ${SIGNAL_COLUMNS}, s.reviewed_at::text as reviewed_at, s.responded_at::text as responded_at, s.review_note, s.created_at::text as created_at
       from register_signals s
      where s.contractor_id = $1 and (${opts.includeUnapproved ? "s.status <> 'afgewezen'" : "s.status = 'goedgekeurd'"})
      order by s.event_date desc nulls last, s.created_at desc`,
    [contractorId],
  );
  return { lastCheck, stale: isCheckStale(lastCheck?.created_at ?? null, todayIso()), signals };
}

/** Goedgekeurde signalen en laatste controledatum voor een set uitvoerders (teamvoorstellen). */
export async function loadRegisterInfo(contractorIds: string[]) {
  const map = new Map<string, { signals: RegisterSignal[]; lastCheckedAt: string | null }>();
  if (contractorIds.length === 0) return map;
  for (const id of contractorIds) map.set(id, { signals: [], lastCheckedAt: null });
  const signals = await sql<RegisterSignal & { contractor_id: string }>(
    `select s.contractor_id, ${SIGNAL_COLUMNS} from register_signals s where s.status = 'goedgekeurd' and s.contractor_id = any($1::uuid[])`,
    [contractorIds],
  );
  for (const s of signals) map.get(s.contractor_id)?.signals.push(s);
  const checks = await sql<{ contractor_id: string; last: string }>(
    `select contractor_id, max(created_at)::text as last from register_checks
      where status = 'voltooid' and contractor_id = any($1::uuid[]) group by contractor_id`,
    [contractorIds],
  );
  for (const c of checks) {
    const entry = map.get(c.contractor_id);
    if (entry) entry.lastCheckedAt = c.last;
  }
  return map;
}

export type RunCheckResult = { ok: true; checkId: string; findings: number; message: string } | { ok: false; message: string };

/**
 * Voert een registercontrole uit met de AI-agent en slaat de bevindingen op als VOORSTEL.
 * requestedBy = beheerder die de controle start, of null voor een geplande controle.
 */
export async function runRegisterCheck(contractorId: string, requestedBy: string | null): Promise<RunCheckResult> {
  const c = await sqlOne<{ id: string; company_name: string; kvk_number: string | null; city: string | null; provider_type: ProviderType; website: string | null; is_demo: boolean }>(
    "select id, company_name, kvk_number, city, provider_type, website, is_demo from contractors where id = $1",
    [contractorId],
  );
  if (!c) return { ok: false, message: "Uitvoerder niet gevonden." };
  if (c.is_demo) return { ok: false, message: "Demo-uitvoerders hebben fictieve KvK-nummers en worden niet in echte registers gecontroleerd." };
  if (!c.kvk_number || !/^\d{8}$/.test(c.kvk_number)) {
    return { ok: false, message: "Geen geldig KvK-nummer (8 cijfers) bekend. Registercontrole koppelt alleen op KvK-nummer, nooit op naam." };
  }

  const outcome = await runRegisterAgent(
    { companyName: c.company_name, kvkNumber: c.kvk_number, city: c.city, providerType: c.provider_type, website: c.website },
    todayIso(),
  );
  await recordUsage(requestedBy, null, 0, outcome.usage, { feature: "registercontrole", contractorId: c.id });

  if (!outcome.ok) {
    await sql(
      `insert into register_checks (contractor_id, status, kvk_number, model, error_message, requested_by) values ($1,'mislukt',$2,$3,$4,$5)`,
      [c.id, c.kvk_number, outcome.usage.model, outcome.message, requestedBy],
    );
    return { ok: false, message: outcome.message };
  }

  const { report } = outcome;
  let inserted = 0;
  const checkId = await transaction(async (tx) => {
    const [row] = await tx.query<{ id: string }>(
      `insert into register_checks (contractor_id, status, kvk_number, kvk_confirmed, summary, sources_checked, findings_count, model, requested_by)
       values ($1,'voltooid',$2,$3,$4,$5::text::jsonb,$6,$7,$8) returning id`,
      [c.id, c.kvk_number, report.kvk_confirmed, report.summary, JSON.stringify(report.sources_checked), report.findings.length, outcome.usage.model, requestedBy],
    );
    for (const f of report.findings) {
      const res = await tx.query(
        `insert into register_signals (contractor_id, check_id, kind, effect, match_basis, title, summary, source_name, source_url, event_date)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         on conflict (contractor_id, kind, source_url) do nothing returning id`,
        [c.id, row.id, f.kind, policyEffect(f.kind, f.match_basis), f.match_basis, f.title, f.summary, f.source_name, f.source_url, f.event_date],
      );
      inserted += res.length;
    }
    return row.id;
  });
  const known = report.findings.length - inserted;
  return {
    ok: true,
    checkId,
    findings: inserted,
    message:
      report.findings.length === 0
        ? "Controle voltooid: geen bijzonderheden gevonden in de geraadpleegde registers."
        : `Controle voltooid: ${inserted} nieuwe bevinding(en) ter beoordeling${known > 0 ? `, ${known} al bekend` : ""}.`,
  };
}

export type PendingSignal = RegisterSignal & {
  contractor_id: string;
  company_name: string;
  slug: string;
  provider_type: ProviderType;
  kvk_number: string | null;
  created_at: string;
  policy_effect: SignalEffect;
};

export async function listSignalsForReview(status: SignalStatus = "voorgesteld") {
  const rows = await sql<Omit<PendingSignal, "policy_effect">>(
    `select ${SIGNAL_COLUMNS}, s.contractor_id, s.created_at::text as created_at, c.company_name, c.slug, c.provider_type, c.kvk_number
       from register_signals s join contractors c on c.id = s.contractor_id
      where s.status = $1 order by s.created_at desc limit 200`,
    [status],
  );
  return rows.map((r) => ({ ...r, policy_effect: policyEffect(r.kind, r.match_basis) }));
}

/** Actieve uitvoerders met KvK-nummer van wie de laatste controle ontbreekt of verouderd is. */
export async function listStaleContractors(limit = 50) {
  return sql<{ id: string; company_name: string; slug: string; provider_type: ProviderType; kvk_number: string; last_checked: string | null }>(
    `select c.id, c.company_name, c.slug, c.provider_type, c.kvk_number, max(rc.created_at)::text as last_checked
       from contractors c left join register_checks rc on rc.contractor_id = c.id and rc.status = 'voltooid'
      where c.status = 'actief' and not c.is_demo and c.kvk_number ~ '^[0-9]{8}$'
      group by c.id
     having max(rc.created_at) is null or max(rc.created_at) < now() - make_interval(days => $2)
      order by max(rc.created_at) asc nulls first, c.company_name
      limit $1`,
    [limit, REGISTER_MAX_AGE_DAYS],
  );
}

export async function listRecentChecks(limit = 30) {
  return sql<{ id: string; company_name: string; slug: string; status: string; findings_count: number; kvk_confirmed: boolean; error_message: string | null; created_at: string; requested_by_name: string | null }>(
    `select rc.id, c.company_name, c.slug, rc.status, rc.findings_count, rc.kvk_confirmed, rc.error_message, rc.created_at::text as created_at, u.name as requested_by_name
       from register_checks rc join contractors c on c.id = rc.contractor_id left join users u on u.id = rc.requested_by
      order by rc.created_at desc limit $1`,
    [limit],
  );
}

/** Beoordeling door beheer. Het effect wordt nooit zwaarder dan het beleid toestaat. */
export async function reviewSignal(
  signalId: string,
  adminId: string,
  decision: "goedgekeurd" | "afgewezen" | "ingetrokken",
  requestedEffect: SignalEffect,
  note: string | null,
) {
  const s = await sqlOne<{ kind: SignalKind; match_basis: MatchBasis; contractor_id: string; status: SignalStatus }>(
    "select kind, match_basis, contractor_id, status from register_signals where id = $1",
    [signalId],
  );
  if (!s) return null;
  const effect = allowedEffect(s.kind, s.match_basis, requestedEffect);
  await sql(
    `update register_signals set status = $2, effect = $3, reviewed_by = $4, reviewed_at = now(), review_note = $5 where id = $1`,
    [signalId, decision, effect, adminId, note],
  );
  return { contractorId: s.contractor_id, effect, previous: s.status };
}

/** Reactie van de uitvoerder zelf op een goedgekeurd signaal (openbaar zichtbaar bij het signaal). */
export async function respondToSignal(signalId: string, ownerUserId: string, response: string) {
  const rows = await sql<{ id: string }>(
    `update register_signals s set contractor_response = $3, responded_at = now()
       from contractors c
      where s.id = $1 and c.id = s.contractor_id and c.owner_user_id = $2 and s.status = 'goedgekeurd'
      returning s.id`,
    [signalId, ownerUserId, response],
  );
  return rows.length > 0;
}
