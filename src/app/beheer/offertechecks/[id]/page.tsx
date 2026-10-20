import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DefinitionList, Notice, PageHeader, TableWrap, td, th } from "@/components/ui/misc";
import { CheckActions, ReportEditForm } from "@/components/offertecheck/check-widgets";
import { CHECK_STATUS, DeadlineBadge } from "@/components/offertecheck/deadline";
import { ReportView } from "@/components/offertecheck/report-view";
import { requireAdmin } from "@/lib/auth/session";
import { getCheck, getCheckFiles, getCheckLines, reportUrl } from "@/lib/data/offertecheck";
import { formatDateTime, formatEuro } from "@/lib/format";
import { specialtyName } from "@/lib/domain/constants";

export const metadata: Metadata = { title: "Beheer — Offertecheck" };

export default async function AdminCheckDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin(`/beheer/offertechecks/${id}`);
  const check = await getCheck(id);
  if (!check || check.status === "concept") notFound();
  const [files, lines] = await Promise.all([getCheckFiles(id), getCheckLines(id)]);
  const url = check.rapport_token ? reportUrl(check.rapport_token) : null;
  return (
    <>
      <Link href="/beheer/offertechecks" className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-950">
        <ArrowLeft className="size-4" aria-hidden /> Alle checks
      </Link>
      <PageHeader
        className="mt-4"
        title={`Offertecheck van ${check.naam ?? "(verwijderd)"}`}
        description={check.projectomschrijving ?? undefined}
        actions={<CheckActions id={check.id} status={check.status} reportUrl={url} />}
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {check.analyse_fout ? (
            <Notice tone="danger" title="Analyse niet gelukt" className="mb-4">
              {check.analyse_fout}
            </Notice>
          ) : null}
          {check.status === "in_analyse" ? <Notice className="mb-4">De analyse loopt (gestart {formatDateTime(check.analyse_gestart_op)}). Ververs de pagina over een minuut.</Notice> : null}
          {check.rapport_json ? (
            <>
              {check.status === "review" ? (
                <section className="mb-8 rounded-[var(--radius-card)] border border-ink-200 bg-white p-4 sm:p-5">
                  <h2 className="mb-3 text-base font-semibold">Rapport aanpassen</h2>
                  <ReportEditForm id={check.id} report={check.rapport_json} />
                </section>
              ) : null}
              <h2 className="mb-3 text-base font-semibold">{check.status === "verstuurd" ? "Verstuurd rapport" : "Voorvertoning voor de klant"}</h2>
              <div className="rounded-[var(--radius-card)] border border-ink-200 bg-white p-4 sm:p-6">
                <ReportView report={check.rapport_json} showContractor />
              </div>
            </>
          ) : null}
          {lines.length ? (
            <>
              <h2 className="mb-3 mt-10 text-base font-semibold">Geëxtraheerde regels ({lines.length})</h2>
              <TableWrap>
                <table className="w-full min-w-[820px]">
                  <thead>
                    <tr>
                      <th className={th}>Bestand</th>
                      <th className={th}>Regel</th>
                      <th className={th}>Type</th>
                      <th className={`${th} text-right`}>Hoeveelheid</th>
                      <th className={`${th} text-right`}>Bedrag</th>
                      <th className={th}>Zekerheid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, i) => (
                      <tr key={i}>
                        <td className={`${td} text-xs`}>{files.find((f) => f.id === l.bestand_id)?.bestandsnaam ?? "—"}</td>
                        <td className={td}>
                          {l.omschrijving}
                          <span className="block text-xs text-ink-500">
                            {specialtyName(l.vakgebied)}
                            {l.scope_post ? ` · post ${l.scope_post}` : ""}
                            {l.toelichting ? ` · ${l.toelichting}` : ""}
                          </span>
                        </td>
                        <td className={`${td} text-xs`}>{l.type}</td>
                        <td className={`${td} tabular text-right`}>{l.hoeveelheid !== null ? `${l.hoeveelheid} ${l.eenheid ?? ""}` : "—"}</td>
                        <td className={`${td} tabular text-right`}>{l.bedrag_excl_btw !== null ? formatEuro(l.bedrag_excl_btw, { cents: true }) : "—"}</td>
                        <td className={`${td} text-xs`}>{l.zekerheid}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </>
          ) : null}
        </div>
        <aside className="flex flex-col gap-4">
          <div className="rounded-[var(--radius-card)] border border-ink-200 bg-white p-4">
            <DefinitionList
              items={[
                { term: "Status", value: <Badge tone={CHECK_STATUS[check.status].tone}>{CHECK_STATUS[check.status].label}</Badge> },
                { term: "Ingediend", value: formatDateTime(check.submitted_at) },
                { term: "Deadline", value: <DeadlineBadge submittedAt={check.submitted_at} sentAt={check.rapport_verstuurd_op} /> },
                { term: "Verstuurd", value: check.rapport_verstuurd_op ? formatDateTime(check.rapport_verstuurd_op) : "—" },
                {
                  term: "Rapport",
                  value: url ? (
                    <a href={url} target="_blank" rel="noopener" className="font-medium text-brand-700 hover:underline">
                      Rapport openen
                    </a>
                  ) : (
                    "Nog niet verstuurd"
                  ),
                },
                { term: "E-mail", value: check.email ?? "—" },
                { term: "Telefoon", value: check.telefoon ?? "—" },
                { term: "Provincie", value: check.provincie ?? "—" },
                { term: "Benchmarks", value: check.consent_benchmark ? "Toestemming gegeven" : "Geen toestemming" },
                { term: "Teamvoorstel", value: check.project_id ? "Gestart" : "Nog niet" },
              ]}
            />
          </div>
          {files.length ? (
            <div className="rounded-[var(--radius-card)] border border-ink-200 bg-white p-4">
              <h2 className="text-sm font-semibold">Bestanden</h2>
              <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                {files.map((f) => (
                  <li key={f.id}>
                    <a href={`/api/offertecheck/bestanden/${f.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-ink-800 hover:underline">
                      <FileText className="size-4 text-ink-500" aria-hidden /> {f.bestandsnaam}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}
