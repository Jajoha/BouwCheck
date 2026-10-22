import { PrijsKaarten } from "@/components/marketing/aanbod-kaarten";
import { LeadForm } from "@/components/marketing/lead-form";
import { homepage } from "@/content/homepage";
import type { LeadType } from "@/lib/domain/constants";

/** Prijspagina met dezelfde vier kaarten als de homepage, en het aanvraagformulier onderaan. */
export function LadderPricing({
  selected,
  types,
  offertecheck,
  user,
}: {
  selected: LeadType;
  types: LeadType[];
  offertecheck: boolean;
  user: { name: string; email: string } | null;
}) {
  return (
    <div className="pb-28">
      <header className="relative isolate overflow-hidden border-b border-sand-200 bg-sand-100">
        <div aria-hidden className="bg-blueprint-light absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 sm:pb-24 sm:pt-16">
          <h1 className="font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-6xl">Prijzen</h1>
          <p className="mt-3 max-w-2xl text-lg text-ink-700">Het Teamvoorstel is gratis. Vakmensen betalen niets voor aanvragen.</p>
        </div>
      </header>

      <div className="mx-auto -mt-12 max-w-7xl px-4 sm:px-6">
        <PrijsKaarten headingLevel="h2" offertecheck={offertecheck} />
        <p className="mt-6 text-ink-700">{homepage.prijzen.onderKaarten}</p>

        <section id="aanvragen" className="mt-16 grid scroll-mt-24 gap-8 rounded-3xl bg-ink-950 p-6 text-white sm:p-10 lg:grid-cols-[1fr_1.4fr]" aria-labelledby="aanvragen-titel">
          <div>
            <h2 id="aanvragen-titel" className="font-display text-3xl font-bold tracking-tight">
              Aanvragen
            </h2>
            <p className="mt-3 text-ink-300">Kies waar je mee wilt starten. Laat je gegevens achter. Wij nemen contact met je op.</p>
            <p className="mt-2 font-medium text-accent-300">Er wordt nu niets afgerekend.</p>
          </div>
          <div className="rounded-2xl bg-white p-5 text-ink-900 sm:p-6">
            <LeadForm key={selected} type={selected} types={types} name={user?.name} email={user?.email} submitLabel="Aanvraag versturen" />
          </div>
        </section>
      </div>
    </div>
  );
}
