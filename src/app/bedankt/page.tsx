import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LEAD_TYPES } from "@/lib/domain/constants";

export const metadata: Metadata = { title: "Bedankt" };

/** Onderwerpen waarvoor we contact opnemen om te starten; er wordt (nog) niets afgerekend. */
const START_TYPES = ["projectpas", "pro"];

export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const label = type && type in LEAD_TYPES ? LEAD_TYPES[type as keyof typeof LEAD_TYPES] : null;
  const start = type ? START_TYPES.includes(type) : false;
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <CheckCircle2 className="size-10 text-brand-600" aria-hidden />
      {start ? (
        <>
          <h1 className="mt-4 text-2xl font-semibold text-ink-950">Bedankt. We nemen binnen 1 werkdag contact met je op om te starten.</h1>
          <p className="mt-2 text-ink-700">Je aanvraag voor {label} is binnen. Er wordt nu niets afgerekend.</p>
        </>
      ) : (
        <>
          <h1 className="mt-4 text-2xl font-semibold text-ink-950">Bedankt, je aanvraag is binnen</h1>
          <p className="mt-2 text-ink-700">
            {label && type !== "contact" ? `Je aanvraag voor ${label} is binnen. ` : ""}We nemen contact met je op. Er wordt niets afgerekend.
          </p>
        </>
      )}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button asChild variant="outline">
          <Link href="/">Naar de startpagina</Link>
        </Button>
      </div>
    </div>
  );
}
