import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Columns3, FileText, Paperclip, ClipboardCheck, History, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DefinitionList, EmptyState, Notice, TableWrap, td, th } from "@/components/ui/misc";
import { DemoBadge, quoteRequestTone } from "@/components/domain/badges";
import { MetricValue } from "@/components/domain/metric";
import {
  AddQuoteForm,
  AttachmentUpload,
  DeleteAttachmentButton,
  DeleteProjectButton,
  DeleteQuoteButton,
  MatchPicker,
  NotesForm,
  ProjectStatusSelect,
  RemoveFromShortlistButton,
  ShortlistStatusSelect,
} from "@/components/projects/project-widgets";
import { requireFlipper } from "@/lib/auth/session";
import { getProjectAttachments, getProjectEvents, getProjectForUser, getShortlist } from "@/lib/data/projects";
import { getOutcomesForProject, getQuotesForProject, listComparisons, listQuoteRequestsForUser } from "@/lib/data/records";
import { getContractorsByIds, listContractors } from "@/lib/data/contractors";
import { ATTACHMENT_KINDS, MODERATION_STATUS, OUTCOME_VERIFICATION, PRICE_TYPES, QUOTE_REQUEST_STATUS, specialtyName, type OutcomeVerification } from "@/lib/domain/constants";
import { budgetDeviationPct } from "@/lib/domain/metrics";
import { formatDate, formatDateTime, formatDays, formatMoney, formatNumber, formatPercent } from "@/lib/format";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireFlipper(`/projecten/${id}`);
  const p = await getProjectForUser(id, user);
  if (!p) notFound();

  const [shortlist, quotes, requests, outcomes, events, attachments, comparisons, regional] = await Promise.all([
    getShortlist(p.id),
    getQuotesForProject(p.id),
    listQuoteRequestsForUser(user.id, { projectId: p.id }),
    getOutcomesForProject(p.id),
    getProjectEvents(p.id),
    getProjectAttachments(p.id),
    listComparisons(user.id),
    listContractors({ province: p.province ?? undefined, pageSize: 500 }),
  ]);
  const shortlistIds = shortlist.map((s) => s.contractor_id);
  const shortlistDetails = await getContractorsByIds(shortlistIds);
  const projectComparisons = comparisons.filter((c) => c.project_id === p.id);

  // Passende aannemers: overlap in vakgebied (of hoofdaannemer), in de regio van het project
  const candidates = regional.items
    .filter((c) => !shortlistIds.includes(c.id))
    .map((c) => {
      const ids = c.specialties.map((s) => s.id);
      const general = ids.includes("hoofdaannemer");
      const matched = p.specialty_ids.filter((s) => ids.includes(s));
      return { c, matched, general };
    })
    .filter((x) => x.matched.length > 0 || x.general)
    .sort((a, b) => b.matched.length - a.matched.length || b.c.completeness - a.c.completeness)
    .slice(0, 8);

  const compareIds = shortlistIds.slice(0, 4);
  const outcomeContractors = new Set(outcomes.map((o) => o.contractor_id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6">
      <Link href="/projecten" className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-950">
        <ArrowLeft className="size-4" aria-hidden /> Alle projecten
      </Link>
      <div className="mt-4 flex flex-col gap-4 border-b border-ink-100 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">{p.is_demo ? <DemoBadge /> : null}</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-950 sm:text-[28px]">{p.name}</h1>
          <p className="mt-1 text-sm text-ink-600">
            {p.location}
            {p.province ? ` (${p.province})` : ""} · {p.property_type} · {p.renovation_type}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProjectStatusSelect projectId={p.id} status={p.status} />
          <Button asChild variant="outline">
            <Link href={`/projecten/${p.id}/bewerken`}>
              <Pencil aria-hidden /> Bewerken
            </Link>
          </Button>
          <DeleteProjectButton projectId={p.id} name={p.name} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Shortlist */}
          <Card>
            <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-4" aria-hidden /> Geselecteerde aannemers
                </CardTitle>
                <CardDescription>Shortlist voor dit project ({shortlist.length}).</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {compareIds.length >= 2 ? (
                  <Button asChild size="sm" variant="dark">
                    <Link href={`/vergelijken?ids=${compareIds.join(",")}&project=${p.id}`}>
                      <Columns3 aria-hidden /> Vergelijk shortlist{shortlistIds.length > 4 ? " (eerste 4)" : ""}
                    </Link>
                  </Button>
                ) : null}
                {shortlist.length ? (
                  <Button asChild size="sm">
                    <Link href={`/offerteaanvragen/nieuw?project=${p.id}&aannemers=${shortlistIds.join(",")}`}>
                      <FileText aria-hidden /> Offerteaanvraag
                    </Link>
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {shortlist.length === 0 ? (
                <div className="p-5">
                  <EmptyState icon={Users} title="Nog geen aannemers geselecteerd" description="Kies hieronder uit passende aannemers, of zoek in de database." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr>
                        <th className={th}>Aannemer</th>
                        <th className={th}>Op tijd</th>
                        <th className={th}>Budgetafwijking</th>
                        <th className={th}>Status</th>
                        <th className={th}>
                          <span className="sr-only">Acties</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {shortlist.map((s) => {
                        const d = shortlistDetails.find((x) => x.id === s.contractor_id);
                        return (
                          <tr key={s.id}>
                            <td className={td}>
                              <Link href={`/aannemers/${s.slug}`} className="font-medium text-ink-950 hover:underline">
                                {s.company_name}
                              </Link>
                              {s.contractor_status !== "actief" ? <span className="block text-xs text-warn-700">Profiel niet meer actief</span> : null}
                              {s.notes ? <span className="block text-xs text-ink-500">{s.notes}</span> : null}
                            </td>
                            <td className={td}>{d ? <MetricValue metric={d.metrics.onTime} kind="percent" compact /> : "—"}</td>
                            <td className={td}>{d ? <MetricValue metric={d.metrics.budgetDeviation} kind="signedPercent" compact /> : "—"}</td>
                            <td className={td}>
                              <ShortlistStatusSelect projectId={p.id} contractorId={s.contractor_id} status={s.status} name={s.company_name} />
                            </td>
                            <td className={`${td} whitespace-nowrap text-right`}>
                              {!outcomeContractors.has(s.contractor_id) ? (
                                <Button asChild size="sm" variant="ghost">
                                  <Link href={`/projecten/${p.id}/resultaat?aannemer=${s.contractor_id}`}>
                                    <ClipboardCheck aria-hidden /> Resultaat
                                  </Link>
                                </Button>
                              ) : null}
                              <RemoveFromShortlistButton projectId={p.id} contractorId={s.contractor_id} name={s.company_name} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Passende aannemers */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Passende aannemers</CardTitle>
                <CardDescription>
                  Actief in {p.province ?? "alle regio's"} met een of meer gevraagde vakgebieden. Overeenkomsten en ontbrekende gegevens per aannemer.
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href={`/aannemers${p.province ? `?provincie=${encodeURIComponent(p.province)}` : ""}`}>
                  <Search aria-hidden /> Zoeken
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {candidates.length === 0 ? (
                <EmptyState title="Geen (nieuwe) passende aannemers gevonden" description="Probeer de database met andere filters, of pas de provincie of vakgebieden van je project aan." />
              ) : (
                <div className="flex flex-col gap-4">
                  <ul className="divide-y divide-ink-100">
                    {candidates.map(({ c, matched, general }) => {
                      const missing = [
                        c.metrics.onTime.status !== "ok" && "op-tijdpercentage",
                        c.metrics.budgetDeviation.status !== "ok" && "budgetafwijking",
                        c.rateCount === 0 && "tarieven",
                        c.availability_status === "onbekend" && "beschikbaarheid",
                        !c.verification.businessVerified && "gecontroleerde bedrijfsgegevens",
                      ].filter(Boolean);
                      return (
                        <li key={c.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <Link href={`/aannemers/${c.slug}`} className="font-medium text-ink-950 hover:underline">
                              {c.company_name}
                            </Link>
                            <p className="text-xs text-ink-600">
                              <span className="text-brand-800">Komt overeen:</span>{" "}
                              {general ? "hoofdaannemer (alle vakgebieden, evt. via onderaannemers)" : matched.map(specialtyName).join(", ")}
                            </p>
                            {missing.length ? (
                              <p className="text-xs text-ink-500">
                                <span className="text-warn-700">Ontbreekt:</span> {missing.join(", ")}
                              </p>
                            ) : (
                              <p className="text-xs text-ink-500">Geen ontbrekende kerngegevens</p>
                            )}
                          </div>
                          <div className="text-xs text-ink-600 sm:text-right">
                            {c.metrics.registeredProjects} projecten · {c.metrics.verifiedProjects} gecontroleerd
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <MatchPicker projectId={p.id} candidates={candidates.map((x) => ({ id: x.c.id, name: x.c.company_name }))} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Offertes */}
          <Card>
            <CardHeader>
              <CardTitle>Offertes en prijsopgaven</CardTitle>
              <CardDescription>Leg bedragen vast om ze in de vergelijking te gebruiken. Indicatieve prijs, offerte en overeengekomen prijs worden apart getoond.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {quotes.length ? (
                <TableWrap>
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr>
                        <th className={th}>Aannemer</th>
                        <th className={th}>Soort</th>
                        <th className={`${th} text-right`}>Bedrag</th>
                        <th className={th}>Scope</th>
                        <th className={th}>Doorlooptijd</th>
                        <th className={th}>
                          <span className="sr-only">Acties</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotes.map((q) => (
                        <tr key={q.id}>
                          <td className={td}>{q.company_name}</td>
                          <td className={td}>
                            <Badge tone={q.price_type === "indicatief" ? "muted" : q.price_type === "offerte" ? "info" : "positive"}>{PRICE_TYPES[q.price_type].label}</Badge>
                          </td>
                          <td className={`${td} tabular whitespace-nowrap text-right font-medium`}>{formatMoney(q.amount, q.vat_included)}</td>
                          <td className={`${td} text-xs`}>
                            {q.scope_specialty_ids.map(specialtyName).join(", ")}
                            {q.exclusions ? <span className="block text-warn-700">Uitgesloten: {q.exclusions}</span> : null}
                          </td>
                          <td className={td}>{formatDays(q.estimated_duration_days)}</td>
                          <td className={`${td} text-right`}>
                            <DeleteQuoteButton quoteId={q.id} name={q.company_name} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              ) : (
                <p className="text-sm text-ink-500">Nog geen bedragen vastgelegd.</p>
              )}
              <details className="rounded-lg border border-ink-200 p-4">
                <summary className="cursor-pointer text-sm font-medium text-ink-900">Offerte of prijsopgave vastleggen</summary>
                <div className="mt-4">
                  <AddQuoteForm projectId={p.id} contractors={shortlist.map((s) => ({ id: s.contractor_id, name: s.company_name }))} projectSpecialties={p.specialty_ids} />
                </div>
              </details>
            </CardContent>
          </Card>

          {/* Offerteaanvragen */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Offerteaanvragen</CardTitle>
              <Button asChild size="sm" variant="outline">
                <Link href={`/offerteaanvragen/nieuw?project=${p.id}`}>Nieuwe aanvraag</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <p className="text-sm text-ink-500">Nog geen offerteaanvragen voor dit project.</p>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {requests.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                      <Link href={`/offerteaanvragen/${r.id}`} className="text-sm font-medium text-ink-950 hover:underline">
                        {r.company_name}
                      </Link>
                      <div className="flex items-center gap-2">
                        {r.delivery_channel === "demo" ? <span className="text-xs text-demo-700">Demo — niet echt verzonden</span> : null}
                        <Badge tone={quoteRequestTone[r.status]}>{QUOTE_REQUEST_STATUS[r.status]}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Projectresultaten */}
          <Card>
            <CardHeader>
              <CardTitle>Projectresultaten en ervaringen</CardTitle>
              <CardDescription>
                Registreer na oplevering per aannemer de werkelijke kosten en opleverdatum. Resultaten tellen pas mee in statistieken na beoordeling door beheer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {outcomes.length === 0 ? (
                <p className="text-sm text-ink-500">Nog geen resultaten geregistreerd. Gebruik ‘Resultaat’ bij een aannemer op de shortlist.</p>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {outcomes.map((o) => {
                    const dev = budgetDeviationPct(o.initial_budget, o.final_cost);
                    return (
                      <li key={o.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-ink-950">{o.company_name}</p>
                          <p className="text-xs text-ink-500">
                            Afwijking {dev === null ? "onbekend" : formatPercent(dev, { signed: true })} · opgeleverd {formatDate(o.actual_completion_date)} (gepland{" "}
                            {formatDate(o.planned_completion_date)}){o.rating ? ` · beoordeling ${o.rating}/5` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge tone={o.moderation_status === "goedgekeurd" ? "positive" : o.moderation_status === "afgewezen" ? "danger" : "warning"}>
                            {MODERATION_STATUS[o.moderation_status as keyof typeof MODERATION_STATUS]}
                          </Badge>
                          <Badge tone="muted">{OUTCOME_VERIFICATION[o.verification_status as OutcomeVerification].short}</Badge>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Zijkolom */}
        <aside className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Projectinformatie</CardTitle>
            </CardHeader>
            <CardContent className="py-1">
              <DefinitionList
                items={[
                  { term: "Oppervlak", value: p.area_m2 ? `${formatNumber(p.area_m2, 1)} m²` : "Onbekend" },
                  { term: "Budget", value: formatMoney(p.budget_amount, p.budget_vat_included) },
                  { term: "Gewenste start", value: formatDate(p.desired_start_date) },
                  { term: "Gewenste oplevering", value: formatDate(p.desired_completion_date) },
                  { term: "Vakgebieden", value: p.specialty_ids.map(specialtyName).join(", ") },
                  { term: "Materiaal", value: p.material_preferences ?? "—" },
                  { term: "Bijzonderheden", value: p.extra_requirements ?? "—" },
                ]}
              />
              <p className="border-t border-ink-100 py-3 text-sm leading-relaxed text-ink-700">{p.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notities</CardTitle>
            </CardHeader>
            <CardContent>
              <NotesForm projectId={p.id} notes={p.notes ?? ""} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="size-4" aria-hidden /> Bijlagen
              </CardTitle>
              <CardDescription>Foto&apos;s, plattegronden en bestaande offertes. Alleen zichtbaar voor jou (en voor aannemers als je ze aan een aanvraag koppelt).</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {attachments.length ? (
                <ul className="divide-y divide-ink-100 text-sm">
                  {attachments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                      <a href={`/api/bijlagen/${a.id}`} className="min-w-0 truncate text-brand-700 hover:underline" target="_blank" rel="noreferrer">
                        {a.file_name}
                      </a>
                      <span className="flex shrink-0 items-center gap-1 text-xs text-ink-500">
                        {ATTACHMENT_KINDS[a.kind as keyof typeof ATTACHMENT_KINDS]} · {Math.max(1, Math.round(a.size_bytes / 1024))} kB
                        <DeleteAttachmentButton projectId={p.id} attachmentId={a.id} name={a.file_name} />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-500">Nog geen bijlagen.</p>
              )}
              <AttachmentUpload projectId={p.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vergelijkingen</CardTitle>
            </CardHeader>
            <CardContent>
              {projectComparisons.length === 0 ? (
                <p className="text-sm text-ink-500">Nog geen vergelijkingen voor dit project opgeslagen.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {projectComparisons.map((c) => (
                    <li key={c.id}>
                      <Link href={`/vergelijken?ids=${c.contractor_ids.join(",")}&project=${p.id}`} className="font-medium text-brand-700 hover:underline">
                        {c.name}
                      </Link>
                      <span className="block text-xs text-ink-500">{c.contractor_names.join(" · ")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="size-4" aria-hidden /> Tijdlijn
              </CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-ink-500">Nog geen activiteit.</p>
              ) : (
                <ol className="space-y-3">
                  {events.map((e) => (
                    <li key={e.id} className="border-l-2 border-ink-200 pl-3">
                      <p className="text-sm text-ink-800">{e.message}</p>
                      <p className="text-xs text-ink-500">{formatDateTime(e.created_at)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
          {p.is_demo ? <Notice tone="demo">Dit is een demoproject met fictieve offertes en aanvragen.</Notice> : null}
        </aside>
      </div>
    </div>
  );
}
