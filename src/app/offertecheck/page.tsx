import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EyeOff, ShieldCheck, Trash2 } from "lucide-react";
import { OffertecheckForm } from "@/components/offertecheck/offertecheck-form";
import { OFFER, OfferFull } from "@/components/offertecheck/offer";
import { Notice } from "@/components/ui/misc";
import { getWeeklyCapacity, WEEK_FULL_MESSAGE } from "@/lib/data/offertecheck";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Gratis Offertecheck",
  description: OFFER.intro,
};

const ASSURANCES = [
  { Icon: EyeOff, title: "Niet gedeeld met aannemers", text: "Je offertes blijven tussen jou en BouwCheck. Aannemers zien niet dat je een check doet." },
  { Icon: ShieldCheck, title: "Geanonimiseerd alleen met toestemming", text: "Prijsbenchmarks gebruiken we alleen als jij dat aanvinkt, zonder namen of adressen." },
  { Icon: Trash2, title: "Verwijderen kan altijd", text: "Onder je rapport staat een knop waarmee je de check en je bestanden direct verwijdert." },
];

/** Landingspagina met één doel: offertes uploaden. Geen hoofdmenu (zie FunnelHidden in de header). */
export default async function OffertecheckPage() {
  if (!env.features.offertecheck) notFound();
  const capacity = await getWeeklyCapacity();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 pb-28 sm:px-6 sm:py-14">
      <OfferFull capacity={capacity} />
      <section id="upload" aria-labelledby="upload-titel" className="mt-12 scroll-mt-24 rounded-[var(--radius-card)] border border-ink-200 bg-white p-5 sm:p-8">
        <h2 id="upload-titel" className="mb-5 text-xl font-semibold text-ink-950">
          Upload je offertes
        </h2>
        {capacity && capacity.remaining === 0 ? (
          <Notice tone="warning">{WEEK_FULL_MESSAGE}</Notice>
        ) : (
          <OffertecheckForm uploadMode={env.blobConfigured ? "blob" : "server"} />
        )}
      </section>
      <ul className="mt-8 grid gap-4 sm:grid-cols-3">
        {ASSURANCES.map(({ Icon, title, text }) => (
          <li key={title} className="flex gap-3 sm:flex-col sm:gap-2">
            <Icon className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-ink-900">{title}</p>
              <p className="mt-0.5 text-sm text-ink-600">{text}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-xs text-ink-500">
        De Offertecheck is geen offerte en geen advies. Een medewerker van BouwCheck controleert elk rapport voordat je het ontvangt. Lees ook de{" "}
        <a href="/privacy" className="underline hover:text-ink-800">
          privacyverklaring
        </a>
        .
      </p>
    </div>
  );
}
