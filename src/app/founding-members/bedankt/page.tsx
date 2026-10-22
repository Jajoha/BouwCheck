import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { nextIntakeDate } from "@/lib/domain/ladder";
import { formatDate } from "@/lib/format";
import { todayIso } from "@/lib/today";

export const metadata: Metadata = { title: "Aanvraag ontvangen" };

export default function FoundingThanksPage() {
  if (!env.features.foundingMembers) notFound();
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <CheckCircle2 className="size-10 text-brand-600" aria-hidden />
      <h1 className="mt-4 text-2xl font-semibold text-ink-950">Je aanvraag is ontvangen</h1>
      <p className="mt-2 text-ink-600">
        We nemen contact met je op vóór {formatDate(nextIntakeDate(todayIso()))}. Dan start het volgende kwartaal. Er wordt nu niets afgerekend.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        {env.features.offertecheck ? (
          <Button asChild>
            <Link href="/offertecheck#upload">Check mijn offertes – gratis</Link>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link href="/">Naar de startpagina</Link>
        </Button>
      </div>
    </div>
  );
}
