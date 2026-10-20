import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { offertecheckConfig } from "@/lib/data/offertecheck";

export const metadata: Metadata = { title: "Check ontvangen" };

export default function OffertecheckThanksPage() {
  if (!env.features.offertecheck) notFound();
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <CheckCircle2 className="size-10 text-brand-600" aria-hidden />
      <h1 className="mt-4 text-2xl font-semibold text-ink-950">Je check volgt binnen 48 uur</h1>
      <p className="mt-2 text-ink-600">
        We zetten je offertes op één scope en een medewerker controleert het rapport. Je ontvangt een link naar je rapport op het e-mailadres dat je hebt opgegeven.
      </p>
      {offertecheckConfig.agendaUrl ? (
        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-sm text-ink-600">Wil je de uitkomst samen doorlopen? Plan alvast een kort gesprek.</p>
          <Button asChild>
            <a href={offertecheckConfig.agendaUrl} target="_blank" rel="noopener noreferrer">
              <CalendarClock aria-hidden /> Plan een kort gesprek
            </a>
          </Button>
        </div>
      ) : null}
      <p className="mt-8 text-sm text-ink-500">
        Geen offertes meer te vergelijken?{" "}
        <Link href="/projecten/nieuw" className="font-medium text-ink-800 underline">
          Vraag direct een teamvoorstel aan
        </Link>
        .
      </p>
    </div>
  );
}
