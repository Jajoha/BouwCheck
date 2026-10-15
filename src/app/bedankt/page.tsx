import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LEAD_TYPES } from "@/lib/domain/constants";

export const metadata: Metadata = { title: "Bedankt" };

export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const label = type && type in LEAD_TYPES ? LEAD_TYPES[type as keyof typeof LEAD_TYPES] : "je bericht";
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <CheckCircle2 className="size-10 text-brand-600" aria-hidden />
      <h1 className="mt-4 text-2xl font-semibold text-ink-950">Bedankt, je aanvraag is ontvangen</h1>
      <p className="mt-2 text-ink-600">
        We hebben je aanvraag ({label.toLowerCase()}) opgeslagen en nemen contact met je op. Er is geen betaling gestart en je zit nergens aan vast.
      </p>
      <p className="mt-2 text-sm text-ink-500">Let op: in deze bèta worden geen automatische bevestigingsmails verstuurd.</p>
      <div className="mt-6 flex gap-2">
        <Button asChild variant="outline">
          <Link href="/">Naar home</Link>
        </Button>
        <Button asChild>
          <Link href="/projecten/nieuw">Start je project</Link>
        </Button>
      </div>
    </div>
  );
}
