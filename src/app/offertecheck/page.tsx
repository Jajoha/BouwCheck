import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EyeOff, ShieldCheck, Trash2 } from "lucide-react";
import { OffertecheckForm } from "@/components/offertecheck/offertecheck-form";
import { OFFER, OfferFull } from "@/components/offertecheck/offer";
import { Notice } from "@/components/ui/misc";
import { getWeeklyCapacity, WEEK_FULL_MESSAGE } from "@/lib/data/offertecheck";
import { env } from "@/lib/env";
import { logEvent } from "@/lib/events";

export const metadata: Metadata = {
  title: "Offertecheck",
  description: OFFER.intro,
};

const ASSURANCES = [
  { Icon: EyeOff, title: "Niet gedeeld met aannemers", text: "Je offertes blijven bij ons. Aannemers weten niet dat je een check doet." },
  { Icon: ShieldCheck, title: "Prijzen alleen met toestemming", text: "We gebruiken je prijzen alleen als jij dat aanvinkt. Nooit met namen of adressen." },
  { Icon: Trash2, title: "Verwijderen kan altijd", text: "Onder je rapport staat een knop. Daarmee verwijder je alles direct." },
];

/** Landingspagina met één doel: offertes uploaden. Geen hoofdmenu (zie FunnelHidden in de header). */
/** Herkomst van een klik op "Heb je al offertes?" op de homepage; andere waarden worden genegeerd. */
const BRONNEN = ["home-hero", "home-slot"];

export default async function OffertecheckPage({ searchParams }: { searchParams: Promise<{ bron?: string }> }) {
  if (!env.features.offertecheck) notFound();
  const { bron } = await searchParams;
  if (bron && BRONNEN.includes(bron)) await logEvent("offertecheck_link_geklikt", { metadata: { bron } });
  const capacity = await getWeeklyCapacity();
  return (
    <div className="relative isolate bg-sand-50">
      <div aria-hidden className="bg-blueprint-light absolute inset-x-0 top-0 -z-10 h-[32rem] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
    <div className="mx-auto max-w-3xl px-4 py-10 pb-28 sm:px-6 sm:py-14">
      <OfferFull capacity={capacity} />
      <section id="upload" aria-labelledby="upload-titel" className="relative mt-12 scroll-mt-24 overflow-hidden rounded-2xl bg-white p-5 shadow-[var(--shadow-float)] ring-1 ring-ink-950/5 sm:p-8">
        <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent-400 via-accent-300 to-brand-500" />
        <h2 id="upload-titel" className="mb-5 font-display text-2xl font-bold text-ink-950">
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
        De Offertecheck is geen offerte en geen advies. Een medewerker kijkt elk rapport na. Lees ook de{" "}
        <a href="/privacy" className="underline hover:text-ink-800">
          privacyverklaring
        </a>
        .
      </p>
    </div>
    </div>
  );
}
