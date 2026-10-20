import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EyeOff, ShieldCheck, Trash2 } from "lucide-react";
import { OffertecheckForm } from "@/components/offertecheck/offertecheck-form";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Gratis Offertecheck",
  description: "Upload je offertes. Binnen 48 uur zie je wat er ontbreekt, wat er is uitgesloten en waar de prijzen uiteenlopen.",
};

const ASSURANCES = [
  { Icon: EyeOff, title: "Niet gedeeld met aannemers", text: "Je offertes blijven tussen jou en BouwCheck. Aannemers zien niet dat je een check doet." },
  { Icon: ShieldCheck, title: "Geanonimiseerd alleen met toestemming", text: "Prijsbenchmarks gebruiken we alleen als jij dat aanvinkt, zonder namen of adressen." },
  { Icon: Trash2, title: "Verwijderen kan altijd", text: "Onder je rapport staat een knop waarmee je de check en je bestanden direct verwijdert." },
];

/** Landingspagina met één doel: offertes uploaden. Geen hoofdmenu (zie FunnelHidden in de header). */
export default function OffertecheckPage() {
  if (!env.features.offertecheck) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 pb-28 sm:px-6 sm:py-14">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Gratis tijdens de bèta</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">Upload je offertes. Weet binnen 48 uur wat ze je niet vertellen.</h1>
      <p className="mt-3 max-w-2xl text-base text-ink-600">
        Wij zetten je offertes op één scope en laten zien wat er ontbreekt, wat er is uitgesloten en waar de prijzen uiteenlopen. Gratis tijdens de bèta.
      </p>
      <div className="mt-8 rounded-[var(--radius-card)] border border-ink-200 bg-white p-5 sm:p-8">
        <OffertecheckForm uploadMode={env.blobConfigured ? "blob" : "server"} />
      </div>
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
