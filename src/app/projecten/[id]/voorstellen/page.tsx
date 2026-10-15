import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, Notice, PageHeader } from "@/components/ui/misc";
import { TeamCard, PRIORITY_META, costLabel } from "@/components/teams/team-card";
import { requireFlipper } from "@/lib/auth/session";
import { getProjectForUser } from "@/lib/data/projects";
import { getScope } from "@/lib/data/scope";
import { proposalsFor } from "@/lib/data/teams";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import type { Priority } from "@/lib/domain/teams";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Teamvoorstellen" };

export default async function ProposalsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireFlipper(`/projecten/${id}/voorstellen`);
  const p = await getProjectForUser(id, user);
  if (!p) notFound();
  const scope = await getScope(p.id);

  const header = (
    <>
      <Link href={`/projecten/${p.id}`} className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-950">
        <ArrowLeft className="size-4" aria-hidden /> Naar project
      </Link>
      <PageHeader
        className="mt-4"
        eyebrow={p.name}
        title="Teamvoorstellen"
        description={`${p.location}${p.province ? ` (${p.province})` : ""} · budget ${formatMoney(p.budget_amount, p.budget_vat_included)} · gewenste start ${formatDate(p.desired_start_date)}`}
        actions={
          <Button asChild variant="outline">
            <Link href={`/projecten/${p.id}/werkzaamheden`}>
              <Pencil aria-hidden /> Werkzaamheden aanpassen
            </Link>
          </Button>
        }
      />
    </>
  );

  if (scope.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 pb-28 sm:px-6">
        {header}
        <EmptyState
          className="mt-8"
          icon={ListChecks}
          title="Leg eerst de werkzaamheden vast"
          description="Teams worden samengesteld op basis van de werkzaamheden (vakgebied, omschrijving en hoeveelheid)."
          action={
            <Button asChild>
              <Link href={`/projecten/${p.id}/werkzaamheden`}>Werkzaamheden vastleggen</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const proposals = await proposalsFor(
    scope.map((s) => ({ specialty_id: s.specialty_id, description: s.description, quantity: s.quantity, unit: s.unit })),
    { province: p.province, area_m2: p.area_m2, budget_amount: p.budget_amount, desired_start_date: p.desired_start_date },
  );
  const ctx = { budget: p.budget_amount, desiredStart: p.desired_start_date };
  const best = Object.fromEntries(proposals.map((x) => [x.priority, x.ranked[0] ?? null])) as Record<Priority, (typeof proposals)[number]["ranked"][number] | null>;
  const noScopeQuantities = scope.every((s) => s.quantity === null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6">
      {header}
      <div className="mt-6 flex flex-col gap-3">
        <Notice tone="info" title="Hoe deze voorstellen tot stand komen">
          BouwCheck stelt per prioriteit teams samen uit aannemers die in {p.province ?? "je regio"} werken en de benodigde vakgebieden uitvoeren: één hoofdaannemer, of
          losse vakspecialisten. Elke prioriteit ordent op één criterium — er is geen verborgen totaalscore. Teams met te weinig gegevens voor een criterium staan apart,
          met de reden. Kosten zijn indicaties op basis van opgegeven tarieven, geen offertes. <Link href="/transparantie">Meer uitleg</Link>
        </Notice>
        {noScopeQuantities ? (
          <Notice tone="warning">Er zijn geen hoeveelheden bekend, dus kosten kunnen niet worden ingeschat. Vul hoeveelheden aan bij de werkzaamheden.</Notice>
        ) : null}
        {!p.province ? <Notice tone="warning">Er is geen provincie bekend: alle aannemers komen in aanmerking, ongeacht werkgebied.</Notice> : null}
      </div>

      {/* Overzicht van de drie aanbevelingen */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {proposals.map((prop) => {
          const meta = PRIORITY_META[prop.priority];
          const o = prop.ranked[0];
          return (
            <a key={prop.priority} href={`#${prop.priority}`} className="group rounded-[var(--radius-card)] border border-ink-200 bg-white p-5 hover:border-ink-400">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink-950">
                <meta.icon className="size-4 text-brand-700" aria-hidden /> {meta.title}
              </p>
              {o ? (
                <>
                  <p className="mt-3 text-sm text-ink-800">{o.members.map((m) => m.contractor.company_name).join(" + ")}</p>
                  <dl className="mt-3 space-y-1 text-xs text-ink-600">
                    <div className="flex justify-between gap-2">
                      <dt>Kosten</dt>
                      <dd className="tabular font-medium text-ink-900">{costLabel(o)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Beschikbaar</dt>
                      <dd className="font-medium text-ink-900">{o.start ? formatDate(o.start) : "Onbekend"}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Zwakste schakel</dt>
                      <dd className="font-medium text-ink-900">{o.qualitySufficient && o.weakest ? `${formatNumber(o.weakest.quality.rating, 1)}/5` : "Onvoldoende data"}</dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-xs font-medium text-brand-700 group-hover:underline">Bekijk team en onderbouwing</p>
                </>
              ) : (
                <p className="mt-3 text-sm text-ink-500">Onvoldoende gegevens om op dit criterium te rangschikken. Zie de toelichting hieronder.</p>
              )}
            </a>
          );
        })}
      </div>

      {proposals.map((prop) => {
        const meta = PRIORITY_META[prop.priority];
        const others = (Object.keys(best) as Priority[])
          .filter((k) => k !== prop.priority && best[k])
          .map((k) => ({ label: PRIORITY_META[k].title, option: best[k]! }));
        return (
          <section key={prop.priority} id={prop.priority} className="mt-12 scroll-mt-24" aria-labelledby={`${prop.priority}-titel`}>
            <h2 id={`${prop.priority}-titel`} className="flex items-center gap-2 text-xl font-semibold text-ink-950">
              <meta.icon className="size-5 text-brand-700" aria-hidden /> {meta.title}
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-ink-600">
              <span className="font-medium text-ink-800">Criterium:</span> {meta.criterion}
            </p>
            <div className="mt-4 flex flex-col gap-4">
              {prop.ranked.length === 0 ? (
                <EmptyState title="Geen team met voldoende gegevens voor dit criterium" description="Hieronder zie je welke teams wel mogelijk zijn en wat er ontbreekt." />
              ) : (
                prop.ranked.map((o, i) => (
                  <TeamCard key={o.key} option={o} priority={prop.priority} projectId={p.id} recommended={i === 0} ctx={ctx} compareTo={i === 0 ? others : undefined} />
                ))
              )}
              {prop.unranked.length ? (
                <details className="rounded-[var(--radius-card)] border border-dashed border-ink-300 bg-ink-50/60 p-4">
                  <summary className="cursor-pointer text-sm font-medium text-ink-800">
                    {prop.unranked.length} {prop.unranked.length === 1 ? "team" : "teams"} niet gerangschikt op {meta.label.toLowerCase()} — onvoldoende gegevens
                  </summary>
                  <div className="mt-4 flex flex-col gap-4">
                    {prop.unranked.map(({ option, reason }) => (
                      <div key={option.key}>
                        <p className="mb-2 text-sm text-warn-700">{reason}</p>
                        <TeamCard option={option} priority={prop.priority} projectId={p.id} ctx={ctx} />
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          </section>
        );
      })}
      <p className="mt-10 text-xs text-ink-500">
        Berekend op {formatDate(new Date())} met de actuele gegevens van {site.name}. Beschikbaarheid en tarieven zijn door aannemers zelf opgegeven; statistieken pas vanaf{" "}
        {site.minSampleSize} waarnemingen.
      </p>
    </div>
  );
}
