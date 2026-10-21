import Link from "next/link";
import { Check, Gift, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Notice, PageHeader } from "@/components/ui/misc";
import { LeadForm } from "@/components/marketing/lead-form";
import { ladder, ladderPrices } from "@/config/site";
import { LADDER_LEAD_TYPES, type LeadType } from "@/lib/domain/constants";
import { proBreakEvenProjects, yearlyCosts } from "@/lib/domain/ladder";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Prijspagina met de vijf treden van de value ladder (achter FEATURE_OFFERTECHECK). */
export function LadderPricing({ selected, user, foundingMembers }: { selected: LeadType; user: { name: string; email: string } | null; foundingMembers: boolean }) {
  const breakEven = proBreakEvenProjects(ladderPrices.projectpas, ladderPrices.proMonthly);
  const two = yearlyCosts(2, ladderPrices.projectpas, ladderPrices.proMonthly);
  const atBreakEven = yearlyCosts(breakEven, ladderPrices.projectpas, ladderPrices.proMonthly);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 pb-28 sm:px-6">
      <PageHeader
        title="Prijzen"
        description="Begin gratis met een Offertecheck of een teamvoorstel. Betaal pas als BouwCheck je renovatie aantoonbaar onder controle houdt. Geen commissie op opdrachtsommen, geen leadkosten voor vakmensen."
      />
      <Notice tone="info" className="mt-6" title="Bèta: nu gratis, alleen werkelijke kosten">
        De bedragen hieronder zijn de prijzen na de validatiefase. Tijdens de bèta betaal je voor de betaalde treden alleen de werkelijke kosten. Er lopen nooit betalingen
        tussen jou en vakmensen via het platform.
      </Notice>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {ladder.map((step) => (
          <div
            key={step.id}
            id={step.id}
            className={cn("flex scroll-mt-24 flex-col rounded-xl border bg-white p-5", step.highlighted ? "border-ink-900 shadow-[var(--shadow-raised)] xl:-my-2 xl:py-7" : "border-ink-200")}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-ink-950">{step.name}</h2>
              {step.highlighted ? <Badge tone="dark">Aanbevolen</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-ink-600">{step.summary}</p>
            <p className="mt-4">
              <span className="tabular text-2xl font-semibold text-ink-950">{step.price}</span>
              <span className="ml-1.5 text-xs text-ink-500">{step.priceNote}</span>
            </p>
            <p className="mt-1">
              <Badge tone={step.pilotNote === "Gratis" ? "positive" : "info"}>{step.pilotNote}</Badge>
            </p>
            <ul className="mt-4 space-y-1.5">
              {step.delivers.map((d) => (
                <li key={d} className="flex gap-2 text-sm text-ink-700">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden /> {d}
                </li>
              ))}
            </ul>
            {step.guarantees.length ? (
              <ul className="mt-4 space-y-1.5 border-t border-ink-100 pt-3">
                {step.guarantees.map((g) => (
                  <li key={g} className="flex gap-2 text-xs text-ink-700">
                    <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-brand-700" aria-hidden /> {g}
                  </li>
                ))}
              </ul>
            ) : null}
            {step.bonuses.length ? (
              <ul className="mt-3 space-y-1">
                {step.bonuses.map((b) => (
                  <li key={b} className="flex gap-2 text-xs text-ink-600">
                    <Gift className="mt-0.5 size-3.5 shrink-0 text-ink-500" aria-hidden /> {b}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex-1" />
            <Button asChild className="mt-5" variant={step.highlighted ? "primary" : "outline"}>
              <Link href={step.cta.href}>{step.cta.label}</Link>
            </Button>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-ink-500">Garanties gelden alleen voor de dienst van BouwCheck, nooit voor het bouwwerk zelf. BouwCheck neemt geen werk aan en is geen partij bij afspraken met vakmensen.</p>

      <section className="mt-12 grid gap-6 rounded-xl border border-ink-200 bg-ink-50 p-6 md:grid-cols-[1fr_1.2fr] md:p-8">
        <div>
          <h2 className="text-xl font-semibold text-ink-950">Projectpas of Pro?</h2>
          <p className="mt-2 text-sm text-ink-600">
            Pro is voordeliger vanaf <strong>{breakEven} projecten per jaar</strong>, of als je meerdere renovaties tegelijk hebt lopen en favorieten, benchmarks en een vervanger
            binnen 72 uur wilt.
          </p>
          {foundingMembers ? (
            <p className="mt-3 text-sm text-ink-600">
              Founding members krijgen Pro voor {formatEuro(ladderPrices.proFoundingMonthly)} per maand, blijvend vast.{" "}
              <Link href="/founding-members" className="font-medium text-brand-700 underline">
                Bekijk het aanbod
              </Link>
              .
            </p>
          ) : null}
        </div>
        <table className="w-full text-sm">
          <caption className="sr-only">Jaarkosten projectpas tegenover Pro</caption>
          <thead>
            <tr className="text-left text-xs text-ink-500">
              <th className="pb-2 font-medium">Per jaar, excl. btw</th>
              <th className="pb-2 text-right font-medium">Projectpassen</th>
              <th className="pb-2 text-right font-medium">Pro</th>
            </tr>
          </thead>
          <tbody className="tabular">
            <tr className="border-t border-ink-200">
              <td className="py-2">2 projecten</td>
              <td className="py-2 text-right">{formatEuro(two.projectpassen)}</td>
              <td className="py-2 text-right">{formatEuro(two.pro)}</td>
            </tr>
            <tr className="border-t border-ink-200">
              <td className="py-2">{breakEven} projecten</td>
              <td className="py-2 text-right">{formatEuro(atBreakEven.projectpassen)}</td>
              <td className="py-2 text-right font-semibold text-brand-800">{formatEuro(atBreakEven.pro)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section id="aanvragen" className="mt-14 grid scroll-mt-24 gap-8 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink-950">Interesse tonen</h2>
          <p className="mt-2 text-ink-600">Laat je gegevens achter; we nemen contact op om je projecten te bespreken. Er wordt geen betaling gestart en je zit nergens aan vast.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link href="/offertecheck">Gratis Offertecheck</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/projecten/nieuw">Teamvoorstel starten</Link>
            </Button>
          </div>
        </div>
        <div className="rounded-xl border border-ink-200 bg-white p-6">
          <LeadForm key={selected} type={selected} types={LADDER_LEAD_TYPES} name={user?.name} email={user?.email} submitLabel="Aanvraag versturen" />
        </div>
      </section>
    </div>
  );
}
