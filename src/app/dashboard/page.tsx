import type { Metadata } from "next";
import Link from "next/link";
import { Plus, FolderKanban, Bookmark, CheckCircle2, FileText, Activity, Lightbulb, ArrowRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { DemoBadge, projectTone, quoteRequestTone } from "@/components/domain/badges";
import { requireFlipper } from "@/lib/auth/session";
import { getActivityForUser, listProjects } from "@/lib/data/projects";
import { listFavoriteContractorIds, listQuoteRequestsForUser } from "@/lib/data/records";
import { getContractorsByIds } from "@/lib/data/contractors";
import { PROJECT_STATUS, QUOTE_REQUEST_STATUS } from "@/lib/domain/constants";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { MetricValue } from "@/components/domain/metric";

export const metadata: Metadata = { title: "Dashboard" };

const TIPS = [
  "Vraag elke aannemer om een prijs voor hetzelfde werk. Anders kun je niet vergelijken.",
  "Vraag naar bedragen die nog kunnen veranderen. En naar wat er niet in zit, zoals afvoer of asbest.",
  "Kijk bij prestaties naar het aantal projecten: 1 of 2 projecten zeggen weinig.",
  "Leg betalingstermijnen vast op basis van opgeleverde onderdelen, niet op datum.",
  "Controleer de KvK-inschrijving en verzekering (CAR/aansprakelijkheid) vóór opdracht.",
];

function greeting() {
  const h = Number(new Intl.DateTimeFormat("nl-NL", { hour: "numeric", hour12: false, timeZone: "Europe/Amsterdam" }).format(new Date()));
  return h < 12 ? "Goedemorgen" : h < 18 ? "Goedemiddag" : "Goedenavond";
}

export default async function DashboardPage() {
  const user = await requireFlipper("/dashboard");
  const [projects, requests, favoriteIds, activity] = await Promise.all([
    listProjects(user.id),
    listQuoteRequestsForUser(user.id, { limit: 50 }),
    listFavoriteContractorIds(user.id),
    getActivityForUser(user.id, 8),
  ]);
  const favorites = await getContractorsByIds(favoriteIds.slice(0, 4));
  const active = projects.filter((p) => !["opgeleverd", "geannuleerd"].includes(p.status));
  const openRequests = requests.filter((r) => ["concept", "klaar", "verzonden", "reactie"].includes(r.status));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6">
      <PageHeader
        eyebrow={user.company_name ?? undefined}
        title={`${greeting()}, ${user.name.split(" ")[0]}`}
        description="Overzicht van je renovatieprojecten, teamvoorstellen en offerteaanvragen."
        actions={
          <>
            <Button asChild>
              <Link href="/projecten/nieuw">
                <Plus aria-hidden /> Nieuw renovatieproject
              </Link>
            </Button>
          </>
        }
      />

      <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Actieve projecten", value: active.length, href: "/projecten", icon: FolderKanban },
          { label: "Open offerteaanvragen", value: openRequests.length, href: "/offerteaanvragen", icon: FileText },
          { label: "Afgeronde projecten", value: projects.filter((p) => p.status === "opgeleverd").length, href: "/projecten", icon: CheckCircle2 },
          { label: "Opgeslagen aannemers", value: favoriteIds.length, href: "/favorieten", icon: Bookmark },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="rounded-[var(--radius-card)] border border-ink-200 bg-white p-4 transition-colors hover:border-ink-300">
            <dt className="flex items-center gap-2 text-xs font-medium text-ink-500">
              <s.icon className="size-4" aria-hidden /> {s.label}
            </dt>
            <dd className="tabular mt-2 text-2xl font-semibold text-ink-950">{s.value}</dd>
          </Link>
        ))}
      </dl>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Actieve renovatieprojecten</CardTitle>
              <Link href="/projecten" className="text-sm text-brand-700 hover:underline">
                Alle projecten
              </Link>
            </CardHeader>
            <CardContent>
              {active.length === 0 ? (
                <EmptyState
                  icon={FolderKanban}
                  title="Nog geen actieve projecten"
                  description="Beschrijf je eerste renovatieproject en voeg foto's toe. Je krijgt teamvoorstellen op prijs, snelheid en betrouwbaarheid."
                  action={
                    <Button asChild>
                      <Link href="/projecten/nieuw">Project aanmaken</Link>
                    </Button>
                  }
                />
              ) : (
                <ul className="divide-y divide-ink-100">
                  {active.slice(0, 5).map((p) => (
                    <li key={p.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <Link href={`/projecten/${p.id}`} className="font-medium text-ink-950 hover:underline">
                          {p.name}
                        </Link>
                        <p className="text-xs text-ink-500">
                          {p.location} · {p.renovation_type} · budget {formatMoney(p.budget_amount, p.budget_vat_included)} · start {formatDate(p.desired_start_date)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/projecten/${p.id}/voorstellen`}>
                            <Users aria-hidden /> Teamvoorstellen
                          </Link>
                        </Button>
                        {p.is_demo ? <DemoBadge compact /> : null}
                        <span className="text-xs text-ink-500">
                          {p.shortlist_count} aannemers · {p.quote_count} offertes
                        </span>
                        <Badge tone={projectTone[p.status]}>{PROJECT_STATUS[p.status]}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Openstaande offerteaanvragen</CardTitle>
              <Link href="/offerteaanvragen" className="text-sm text-brand-700 hover:underline">
                Alle aanvragen
              </Link>
            </CardHeader>
            <CardContent>
              {openRequests.length === 0 ? (
                <EmptyState icon={FileText} title="Geen openstaande aanvragen" description="Bereid een offerteaanvraag voor vanuit een project of aannemersprofiel." />
              ) : (
                <ul className="divide-y divide-ink-100">
                  {openRequests.slice(0, 6).map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <Link href={`/offerteaanvragen/${r.id}`} className="font-medium text-ink-950 hover:underline">
                          {r.company_name}
                        </Link>
                        <p className="truncate text-xs text-ink-500">{r.project_name}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge tone={quoteRequestTone[r.status]}>{QUOTE_REQUEST_STATUS[r.status]}</Badge>
                        {r.delivery_channel === "demo" ? <span className="text-[11px] text-demo-700">Demo — niet echt verzonden</span> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Opgeslagen aannemers</CardTitle>
              <Link href="/favorieten" className="text-sm text-brand-700 hover:underline">
                Alle
              </Link>
            </CardHeader>
            <CardContent>
              {favorites.length === 0 ? (
                <EmptyState icon={Bookmark} title="Nog niets opgeslagen" description="Gebruik ‘Opslaan’ op het profiel van een aannemer uit een teamvoorstel." />
              ) : (
                <ul className="divide-y divide-ink-100">
                  {favorites.map((c) => (
                    <li key={c.id} className="py-2.5">
                      <Link href={`/aannemers/${c.slug}`} className="font-medium text-ink-950 hover:underline">
                        {c.company_name}
                      </Link>
                      <p className="text-xs text-ink-500">{c.specialties.map((s) => s.name).join(", ")}</p>
                      <p className="mt-0.5 text-xs text-ink-600">
                        Op tijd: <MetricValue metric={c.metrics.onTime} kind="percent" compact className="text-xs" />
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-4" aria-hidden /> Recente activiteit
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-sm text-ink-500">Nog geen activiteit.</p>
              ) : (
                <ol className="space-y-3">
                  {activity.map((a) => (
                    <li key={a.id} className="border-l-2 border-ink-200 pl-3">
                      <p className="text-sm text-ink-800">{a.message}</p>
                      <p className="text-xs text-ink-500">
                        <Link href={`/projecten/${a.project_id}`} className="hover:underline">
                          {a.project_name}
                        </Link>{" "}
                        · {formatDateTime(a.created_at)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card className="bg-ink-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="size-4" aria-hidden /> Aandachtspunten bij het selecteren
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-ink-700">
                {TIPS.map((t) => (
                  <li key={t} className="flex gap-2">
                    <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-brand-600" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
