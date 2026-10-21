import { PageHeader } from "@/components/ui/misc";
import { AanbodKaarten } from "@/components/marketing/aanbod-kaarten";
import { LeadForm } from "@/components/marketing/lead-form";
import { homepage } from "@/content/homepage";
import { LADDER_LEAD_TYPES, type LeadType } from "@/lib/domain/constants";

/** Prijspagina met dezelfde vier kaarten als de homepage (achter FEATURE_OFFERTECHECK). */
export function LadderPricing({ selected, user }: { selected: LeadType; user: { name: string; email: string } | null }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 pb-28 sm:px-6">
      <PageHeader title="Prijzen" description="Begin gratis met een Offertecheck of een Teamvoorstel. Vakmensen betalen niets voor aanvragen." />

      <AanbodKaarten headingLevel="h2" className="mt-8" />
      <p className="mt-6 text-ink-700">{homepage.aanbod.onderKaarten}</p>

      <section id="aanvragen" className="mt-14 grid scroll-mt-24 gap-8 lg:grid-cols-[1fr_1.4fr]" aria-labelledby="aanvragen-titel">
        <div>
          <h2 id="aanvragen-titel" className="text-2xl font-semibold tracking-tight text-ink-950">
            Aanvragen
          </h2>
          <p className="mt-2 text-ink-700">Kies waar je mee wilt starten. Laat je gegevens achter. Wij nemen contact met je op.</p>
          <p className="mt-2 text-ink-700">Er wordt nu niets afgerekend.</p>
        </div>
        <div className="rounded-xl border border-ink-200 bg-white p-5 sm:p-6">
          <LeadForm key={selected} type={selected} types={LADDER_LEAD_TYPES} name={user?.name} email={user?.email} submitLabel="Aanvraag versturen" />
        </div>
      </section>
    </div>
  );
}
