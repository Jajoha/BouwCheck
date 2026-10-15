import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { DemoBadge } from "@/components/domain/badges";
import { RevokeVerificationButton, VerificationDecisionForm } from "@/components/admin/admin-widgets";
import { requireAdmin } from "@/lib/auth/session";
import { listVerificationEvents } from "@/lib/data/admin";
import { VERIFICATION_EVENT_STATUS, VERIFICATION_TYPES } from "@/lib/domain/constants";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Beheer — verificaties" };

export default async function AdminVerifications() {
  await requireAdmin("/beheer/verificaties");
  const events = await listVerificationEvents();
  const open = events.filter((e) => e.status === "aangevraagd");
  const done = events.filter((e) => e.status !== "aangevraagd");
  return (
    <>
      <PageHeader title="Verificaties" description="Beoordeel verzoeken tot controle van bedrijfsgegevens. Een goedkeuring vereist altijd een bewijsreferentie." />
      <h2 className="mt-6 text-base font-semibold">Open verzoeken ({open.length})</h2>
      {open.length === 0 ? (
        <EmptyState className="mt-3" title="Geen open verificatieverzoeken" />
      ) : (
        <ul className="mt-3 grid gap-4 md:grid-cols-2">
          {open.map((e) => (
            <li key={e.id} className="rounded-[var(--radius-card)] border border-ink-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <Link href={`/beheer/aannemers/${e.contractor_id}`} className="font-medium text-ink-950 hover:underline">
                  {e.company_name}
                </Link>
                {e.is_demo ? <DemoBadge compact /> : null}
              </div>
              <p className="mt-1 text-xs text-ink-500">
                {VERIFICATION_TYPES[e.verification_type as keyof typeof VERIFICATION_TYPES]} · aangevraagd {formatDate(e.created_at)} · KvK {e.kvk_number ?? "onbekend"}
              </p>
              {e.notes ? <p className="mt-1 text-sm text-ink-700">{e.notes}</p> : null}
              <div className="mt-3">
                <VerificationDecisionForm id={e.id} evidence={e.evidence_reference} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <h2 className="mt-10 text-base font-semibold">Afgehandeld</h2>
      <ul className="mt-3 divide-y divide-ink-100 rounded-[var(--radius-card)] border border-ink-200 bg-white">
        {done.map((e) => (
          <li key={e.id} className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="font-medium">{e.company_name}</span>{" "}
              <Badge tone={e.status === "goedgekeurd" ? "positive" : "muted"}>{VERIFICATION_EVENT_STATUS[e.status as keyof typeof VERIFICATION_EVENT_STATUS]}</Badge>
              {e.is_demo ? <span className="ml-2 text-xs text-demo-700">fictief</span> : null}
              <p className="text-xs text-ink-500">
                {e.evidence_reference ?? "—"} · {e.reviewer ?? "—"} · {formatDate(e.reviewed_at)}
              </p>
            </div>
            {e.status === "goedgekeurd" ? <RevokeVerificationButton id={e.id} /> : null}
          </li>
        ))}
      </ul>
    </>
  );
}
