import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Notice, PageHeader, TableWrap, td, th } from "@/components/ui/misc";
import { CHECK_STATUS, DeadlineBadge } from "@/components/offertecheck/deadline";
import { requireAdmin } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { listChecks, offertecheckConfig, offertecheckCostToday } from "@/lib/data/offertecheck";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Beheer — Offertechecks" };

export default async function AdminChecks() {
  await requireAdmin("/beheer/offertechecks");
  const [checks, costToday] = await Promise.all([listChecks(), offertecheckCostToday()]);
  return (
    <>
      <PageHeader
        title="Offertechecks"
        description={`Elk rapport gaat pas naar de klant na goedkeuring. De 48-uursbelofte loopt vanaf indienen. AI-kosten vandaag: $ ${costToday.toFixed(2)} van $ ${offertecheckConfig.dailyBudgetUsd} dagbudget.`}
      />
      {!env.features.offertecheck ? (
        <Notice tone="warning" className="mt-4">
          <code>FEATURE_OFFERTECHECK</code> staat uit: de pagina /offertecheck is niet bereikbaar voor bezoekers.
        </Notice>
      ) : null}
      {checks.length === 0 ? (
        <EmptyState className="mt-6" title="Nog geen ingediende checks" />
      ) : (
        <TableWrap className="mt-6">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr>
                <th className={th}>Ingediend</th>
                <th className={th}>Contact</th>
                <th className={th}>Bestanden</th>
                <th className={th}>Status</th>
                <th className={th}>Deadline</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((c) => (
                <tr key={c.id}>
                  <td className={`${td} text-xs`}>
                    <Link href={`/beheer/offertechecks/${c.id}`} className="font-medium text-ink-950 hover:underline">
                      {formatDateTime(c.submitted_at)}
                    </Link>
                  </td>
                  <td className={td}>
                    {c.naam ?? "—"}
                    <span className="block text-xs text-ink-500">{c.email ?? "verwijderd"}</span>
                  </td>
                  <td className={`${td} tabular`}>{c.bestanden}</td>
                  <td className={td}>
                    <Badge tone={CHECK_STATUS[c.status].tone}>{CHECK_STATUS[c.status].label}</Badge>
                    {c.analyse_fout ? <span className="mt-1 block max-w-xs text-xs text-danger-700">{c.analyse_fout}</span> : null}
                  </td>
                  <td className={td}>{c.status !== "verwijderd" ? <DeadlineBadge submittedAt={c.submitted_at} sentAt={c.rapport_verstuurd_op} /> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </>
  );
}
