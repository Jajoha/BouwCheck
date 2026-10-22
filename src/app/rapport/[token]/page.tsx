import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportView } from "@/components/offertecheck/report-view";
import { DeleteOwnCheckButton } from "@/components/offertecheck/check-widgets";
import { getCheckByToken } from "@/lib/data/offertecheck";
import { formatDate } from "@/lib/format";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Je Offertecheck", robots: { index: false, follow: false } };

/** Rapport van een Offertecheck; alleen bereikbaar met het (niet te raden) token uit de mail. */
export default async function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const check = await getCheckByToken(token);
  if (!check?.rapport_json) notFound();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 pb-28 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Offertecheck · {formatDate(check.rapport_verstuurd_op)}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-950 sm:text-3xl">
        {check.rapport_json.offertes.length === 1 ? "Je offerte, post voor post" : `Je ${check.rapport_json.offertes.length} offertes naast elkaar`}
      </h1>
      <div className="mt-6">
        <ReportView report={check.rapport_json} />
      </div>

      <section className="mt-12 rounded-[var(--radius-card)] bg-ink-950 p-6 text-white sm:p-8">
        <Users className="size-6 text-brand-200" aria-hidden />
        <h2 className="mt-3 text-xl font-semibold sm:text-2xl">Wil je vakmensen die allemaal voor hetzelfde werk een prijs geven?</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-200">
          We zetten de posten uit deze check klaar als werkomschrijving. Daarmee stelt {site.name} teams van vakmensen voor. Je kiest zelf op prijs, betrouwbaarheid of snelheid.
          Zo krijg je offertes die je wel kunt vergelijken. Het Teamvoorstel is gratis.
        </p>
        <Button asChild size="lg" className="mt-5 h-auto w-full whitespace-normal bg-white py-3 text-ink-950 hover:bg-ink-100 sm:w-auto">
          <Link href={`/rapport/${token}/teamvoorstel`}>
            Vraag een Teamvoorstel aan met dit werk <ArrowRight aria-hidden />
          </Link>
        </Button>
      </section>

      <div className="mt-10 flex flex-col gap-4 border-t border-ink-100 pt-6 text-xs text-ink-500 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-2xl">
          De Offertecheck is geen offerte en geen advies. De bedragen komen uit jouw offertes. {site.name} heeft ze niet nagevraagd bij de aannemers. {site.name} is geen
          partij bij jouw afspraken met een aannemer. Een medewerker heeft dit rapport nagekeken voordat we het stuurden.
        </p>
        <DeleteOwnCheckButton token={token} />
      </div>
    </div>
  );
}
