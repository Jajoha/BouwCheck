import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Notice, PageHeader } from "@/components/ui/misc";
import { LeadForm } from "@/components/marketing/lead-form";
import { LadderPricing } from "@/components/marketing/ladder-pricing";
import { pricingPlans } from "@/config/site";
import { getCurrentUser } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { LADDER_LEAD_TYPES, type LeadType } from "@/lib/domain/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Prijzen" };

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  const user = await getCurrentUser();
  if (env.features.offertecheck) {
    const selected: LeadType = LADDER_LEAD_TYPES.includes(plan as LeadType) ? (plan as LeadType) : "pro";
    return <LadderPricing selected={selected} user={user ? { name: user.name, email: user.email } : null} foundingMembers={env.features.foundingMembers} />;
  }
  // Zonder Offertecheck: de oorspronkelijke testprijzen
  const selected = pricingPlans.find((p) => p.id === plan)?.id ?? "selectie";
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 pb-28 sm:px-6">
      <PageHeader
        title="Prijzen"
        description="Geen zoekwerk: beschrijf je project en ontvang teams van aannemers op budget, kwaliteit of snelheid. We testen in deze bèta welk model het beste past."
      />
      <Notice tone="warning" className="mt-6" title="Voorlopige testprijzen">
        Onderstaande bedragen zijn voorstellen om interesse te toetsen — geen bewezen marktprijzen en geen aanbod. Er worden in deze bèta geen betalingen verwerkt; een
        aanvraag is vrijblijvend.
      </Notice>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {pricingPlans.map((p) => (
          <div key={p.id} className={cn("flex flex-col rounded-xl border bg-white p-6", p.highlighted ? "border-ink-900 shadow-[var(--shadow-raised)]" : "border-ink-200")}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink-950">{p.name}</h2>
              <Badge tone="warning">Testprijs</Badge>
            </div>
            <p className="mt-4">
              <span className="tabular text-3xl font-semibold text-ink-950">{p.price}</span>
              <span className="ml-2 text-sm text-ink-500">{p.priceNote}</span>
            </p>
            <p className="mt-3 text-sm text-ink-600">{p.description}</p>
            <ul className="mt-5 flex-1 space-y-2">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2 text-sm text-ink-700">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden /> {f}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-6" variant={p.highlighted ? "primary" : "outline"}>
              <Link href={`/prijzen?plan=${p.id}#aanvragen`} scroll>
                {p.cta}
              </Link>
            </Button>
          </div>
        ))}
      </div>

      <section id="aanvragen" className="mt-14 grid scroll-mt-24 gap-8 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink-950">Interesse of pilot aanvragen</h2>
          <p className="mt-2 text-ink-600">
            Laat je gegevens achter. We nemen contact op om je project of situatie te bespreken. Je aanvraag wordt opgeslagen in BouwCheck; er wordt geen betaling gestart.
          </p>
          <p className="mt-4 text-sm text-ink-500">Wil je de bèta eerst zelf proberen? Start direct een project — dat is gratis tijdens de testfase (met een AI-tegoed per account).</p>
          <Button asChild variant="outline" className="mt-3">
            <Link href="/projecten/nieuw">Start je project</Link>
          </Button>
        </div>
        <div className="rounded-xl border border-ink-200 bg-white p-6">
          <LeadForm key={selected} type={selected} name={user?.name} email={user?.email} submitLabel="Aanvraag versturen" />
        </div>
      </section>
    </div>
  );
}
