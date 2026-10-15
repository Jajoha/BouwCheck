import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Notice, PageHeader, TableWrap, td, th } from "@/components/ui/misc";
import { RunRegisterCheckButton, SignalReviewForm } from "@/components/admin/register-widgets";
import { requireAdmin } from "@/lib/auth/session";
import { aiConfig } from "@/lib/ai/config";
import { listRecentChecks, listSignalsForReview, listStaleContractors } from "@/lib/data/registers";
import { MATCH_BASIS, REGISTER_MAX_AGE_DAYS, SIGNAL_KINDS } from "@/lib/domain/registers";
import { PROVIDER_TYPES } from "@/lib/domain/constants";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Beheer — registers" };

export default async function AdminRegisters() {
  await requireAdmin("/beheer/registers");
  const [pending, approved, stale, recent] = await Promise.all([
    listSignalsForReview("voorgesteld"),
    listSignalsForReview("goedgekeurd"),
    listStaleContractors(50),
    listRecentChecks(30),
  ]);
  return (
    <>
      <PageHeader
        title="Registercontrole"
        description="Een AI-agent zoekt per uitvoerder in officiële registers (Centraal Insolventieregister, KvK, Rechtspraak, officiële bekendmakingen). Alles wat hij vindt is een voorstel: pas na jouw goedkeuring wordt het zichtbaar en telt het mee."
      />
      <div className="mt-4 flex flex-col gap-3">
        {!aiConfig.configured ? <Notice tone="warning">ANTHROPIC_API_KEY ontbreekt: controles kunnen niet worden uitgevoerd.</Notice> : null}
        <Notice tone="info" title="Beleid">
          Uitsluiten van teamvoorstellen kan alleen bij een juridisch feit (faillissement, surseance, opgeheven KvK-inschrijving) dat op <strong>KvK-nummer</strong> aan de
          uitvoerder is gekoppeld; de database dwingt dit af. Al het andere is een waarschuwing. Bij eenmanszaken en zzp&apos;ers worden geen persoonlijke schulden
          (WSNP) of privégegevens vastgelegd. Kosten per controle staan onder <Link href="/beheer/ai-gebruik">AI-gebruik</Link>.
        </Notice>
      </div>

      <h2 className="mt-8 text-base font-semibold">Te beoordelen ({pending.length})</h2>
      {pending.length === 0 ? (
        <EmptyState className="mt-3" title="Geen voorgestelde signalen" description="Nieuwe bevindingen van de registeragent verschijnen hier." />
      ) : (
        <ul className="mt-3 grid gap-4 lg:grid-cols-2">
          {pending.map((s) => (
            <li key={s.id} className="rounded-[var(--radius-card)] border border-ink-200 bg-white p-4" data-testid="pending-signal">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/aannemers/${s.slug}`} className="font-medium text-ink-950 hover:underline">
                  {s.company_name}
                </Link>
                <span className="flex gap-1.5">
                  <Badge tone="muted">{PROVIDER_TYPES[s.provider_type].short}</Badge>
                  <Badge tone={s.policy_effect === "uitsluiting" ? "dark" : "neutral"}>{SIGNAL_KINDS[s.kind].label}</Badge>
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-ink-900">{s.title}</p>
              <p className="mt-1 text-sm text-ink-700">{s.summary}</p>
              <p className="mt-1 text-xs text-ink-500">
                {s.event_date ? `${formatDate(s.event_date)} · ` : ""}
                {MATCH_BASIS[s.match_basis]} (KvK uitvoerder: {s.kvk_number ?? "onbekend"}) ·{" "}
                <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="underline">
                  {s.source_name}
                </a>{" "}
                · gevonden {formatDate(s.created_at)}
              </p>
              <p className="mt-2 text-xs text-ink-600">Controleer de bron zelf voordat je besluit.</p>
              <div className="mt-3">
                <SignalReviewForm signalId={s.id} policyEffect={s.policy_effect} current="voorgesteld" />
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-10 text-base font-semibold">Controle nodig ({stale.length})</h2>
      <p className="mt-1 text-sm text-ink-600">
        Actieve uitvoerders met KvK-nummer, nooit of langer dan {REGISTER_MAX_AGE_DAYS} dagen geleden gecontroleerd. Een geplande taak controleert dagelijks een paar
        uitvoerders (CRON_SECRET vereist); je kunt ook direct controleren. Demo-uitvoerders en uitvoerders zonder KvK-nummer worden overgeslagen.
      </p>
      {stale.length === 0 ? (
        <EmptyState className="mt-3" title="Alle actieve uitvoerders zijn recent gecontroleerd" />
      ) : (
        <TableWrap className="mt-3">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr>
                <th className={th}>Uitvoerder</th>
                <th className={th}>Soort</th>
                <th className={th}>KvK</th>
                <th className={th}>Laatste controle</th>
                <th className={th}>Actie</th>
              </tr>
            </thead>
            <tbody>
              {stale.map((c) => (
                <tr key={c.id}>
                  <td className={td}>
                    <Link href={`/aannemers/${c.slug}`} className="hover:underline">
                      {c.company_name}
                    </Link>
                  </td>
                  <td className={td}>{PROVIDER_TYPES[c.provider_type].short}</td>
                  <td className={`${td} tabular`}>{c.kvk_number}</td>
                  <td className={td}>{c.last_checked ? formatDate(c.last_checked) : "Nooit"}</td>
                  <td className={td}>
                    <RunRegisterCheckButton contractorId={c.id} name={c.company_name} disabledReason={aiConfig.configured ? null : "AI niet geconfigureerd"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}

      <h2 className="mt-10 text-base font-semibold">Goedgekeurde signalen ({approved.length})</h2>
      {approved.length === 0 ? (
        <EmptyState className="mt-3" title="Nog geen goedgekeurde signalen" />
      ) : (
        <ul className="mt-3 grid gap-4 lg:grid-cols-2">
          {approved.map((s) => (
            <li key={s.id} className="rounded-[var(--radius-card)] border border-ink-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/aannemers/${s.slug}`} className="font-medium text-ink-950 hover:underline">
                  {s.company_name}
                </Link>
                <Badge tone={s.effect === "uitsluiting" ? "dark" : "neutral"}>{s.effect === "uitsluiting" ? "Uitgesloten" : "Waarschuwing"}</Badge>
              </div>
              <p className="mt-1 text-sm text-ink-700">
                {SIGNAL_KINDS[s.kind].label}: {s.title}
              </p>
              {s.contractor_response ? <p className="mt-1 text-xs text-ink-600">Reactie uitvoerder: {s.contractor_response}</p> : null}
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-ink-600">Intrekken</summary>
                <div className="mt-2">
                  <SignalReviewForm signalId={s.id} policyEffect={s.effect} current="goedgekeurd" />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-10 text-base font-semibold">Recente controles</h2>
      {recent.length === 0 ? (
        <EmptyState className="mt-3" title="Nog geen controles uitgevoerd" />
      ) : (
        <TableWrap className="mt-3">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr>
                <th className={th}>Moment</th>
                <th className={th}>Uitvoerder</th>
                <th className={th}>Resultaat</th>
                <th className={th}>Gestart door</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id}>
                  <td className={td}>{formatDateTime(r.created_at)}</td>
                  <td className={td}>{r.company_name}</td>
                  <td className={td}>
                    {r.status === "voltooid"
                      ? `${r.findings_count} bevinding(en)${r.kvk_confirmed ? " · KvK bevestigd" : " · KvK niet bevestigd"}`
                      : `Mislukt: ${r.error_message ?? "onbekend"}`}
                  </td>
                  <td className={td}>{r.requested_by_name ?? "Gepland"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </>
  );
}
