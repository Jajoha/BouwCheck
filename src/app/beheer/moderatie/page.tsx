import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { DemoBadge } from "@/components/domain/badges";
import { OutcomeModerationForm, ReviewModerationButtons } from "@/components/admin/admin-widgets";
import { requireAdmin } from "@/lib/auth/session";
import { listOutcomesForModeration } from "@/lib/data/admin";
import { budgetDeviationPct, delayDays } from "@/lib/domain/metrics";
import { MODERATION_STATUS, OUTCOME_VERIFICATION, type OutcomeVerification } from "@/lib/domain/constants";
import { formatDate, formatDays, formatMoney, formatPercent } from "@/lib/format";

export const metadata: Metadata = { title: "Beheer — resultaten en reviews" };

const FILTERS = [
  ["open", "Te beoordelen"],
  ["betwist", "Betwist"],
  ["alle", "Alle (laatste 100)"],
] as const;

export default async function AdminModeration({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  await requireAdmin("/beheer/moderatie");
  const { filter: raw } = await searchParams;
  const filter = (FILTERS.find(([k]) => k === raw)?.[0] ?? "open") as "open" | "alle" | "betwist";
  const list = await listOutcomesForModeration(filter);
  return (
    <>
      <PageHeader title="Projectresultaten en reviews" description="Controleer gegevens, corrigeer waar nodig en bepaal of een resultaat meetelt. ‘Projectgegevens gecontroleerd’ alleen met bewijsreferentie." />
      <nav className="mt-6 flex gap-2" aria-label="Filter">
        {FILTERS.map(([k, l]) => (
          <Link key={k} href={`/beheer/moderatie?filter=${k}`} className={`rounded-full border px-3 py-1 text-sm ${filter === k ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-700"}`}>
            {l}
          </Link>
        ))}
      </nav>
      {list.length === 0 ? (
        <EmptyState className="mt-6" title="Niets te beoordelen" />
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {list.map((o) => {
            const dev = budgetDeviationPct(o.initial_budget, o.final_cost);
            const delay = delayDays(o.planned_completion_date, o.actual_completion_date);
            return (
              <li key={o.id} className="rounded-[var(--radius-card)] border border-ink-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink-950">
                      {o.company_name} {o.project_name ? <span className="font-normal text-ink-500">· {o.project_name}</span> : null}
                    </p>
                    <p className="text-xs text-ink-500">
                      Ingediend door {o.submitter ?? "onbekend"} ({o.source}) op {formatDate(o.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {o.is_demo ? <DemoBadge compact /> : null}
                    <Badge tone={o.moderation_status === "goedgekeurd" ? "positive" : o.moderation_status === "afgewezen" ? "danger" : "warning"}>
                      {MODERATION_STATUS[o.moderation_status as keyof typeof MODERATION_STATUS]}
                    </Badge>
                    <Badge tone={o.verification_status === "betwist" ? "danger" : "muted"}>{OUTCOME_VERIFICATION[o.verification_status as OutcomeVerification].short}</Badge>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-xs text-ink-500">Begroot → definitief</dt>
                    <dd className="tabular">
                      {formatMoney(o.initial_budget, o.amounts_vat_included)} → {formatMoney(o.final_cost, o.amounts_vat_included)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-500">Afwijking</dt>
                    <dd className="tabular">{dev === null ? "Onbekend" : formatPercent(dev, { signed: true })}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-500">Oplevering</dt>
                    <dd>
                      {formatDate(o.actual_completion_date)} {delay !== null ? <span className="text-xs text-ink-500">({delay > 0 ? `${formatDays(delay)} te laat` : "op tijd"})</span> : null}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-500">Herstelwerk</dt>
                    <dd>{o.rework_required === null ? "Onbekend" : o.rework_required ? "Ja" : "Nee"}</dd>
                  </div>
                </dl>
                {o.extra_costs_reason ? <p className="mt-2 text-sm text-ink-700">Meerkosten: {o.extra_costs_reason}</p> : null}
                {o.review_id ? (
                  <div className="mt-3 rounded-md bg-ink-50 p-3 text-sm">
                    <p className="text-xs text-ink-500">
                      Review {o.rating}/5 · {o.review_moderation}
                    </p>
                    <p className="mt-1 text-ink-800">{o.review_text}</p>
                    {o.contractor_response ? <p className="mt-2 text-xs text-ink-600">Reactie aannemer: {o.contractor_response}</p> : null}
                    <div className="mt-2">
                      <ReviewModerationButtons id={o.review_id} status={o.review_moderation ?? "in_behandeling"} hasResponse={Boolean(o.contractor_response)} />
                    </div>
                  </div>
                ) : null}
                <details className="mt-3 rounded-md border border-ink-200 p-3" open={o.moderation_status === "in_behandeling"}>
                  <summary className="cursor-pointer text-sm font-medium">Beoordelen / corrigeren</summary>
                  <div className="mt-3">
                    <OutcomeModerationForm
                      id={o.id}
                      initial={{
                        moderation_status: o.moderation_status,
                        verification_status: o.verification_status,
                        evidence_reference: o.evidence_reference ?? "",
                        initial_budget: o.initial_budget?.toString() ?? "",
                        final_cost: o.final_cost?.toString() ?? "",
                        planned: o.planned_completion_date ?? "",
                        actual: o.actual_completion_date ?? "",
                      }}
                    />
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
