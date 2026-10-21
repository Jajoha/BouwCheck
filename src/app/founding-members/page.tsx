import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FoundingForm } from "@/components/founding/founding-form";
import { ladderPrices } from "@/config/site";
import { getCurrentUser } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { listRegionSeats } from "@/lib/data/founding";
import { nextIntakeDate } from "@/lib/domain/ladder";
import { formatDate, formatEuro } from "@/lib/format";
import { todayIso } from "@/lib/today";

export const metadata: Metadata = {
  title: "Eerste klanten",
  description: "25 plekken per regio. Pro voor € 149 in plaats van € 199 per maand, excl. btw. De prijs blijft altijd zo.",
};

export default async function FoundingMembersPage() {
  if (!env.features.foundingMembers) notFound();
  const [regions, user] = await Promise.all([listRegionSeats(), getCurrentUser()]);
  const intake = nextIntakeDate(todayIso());
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 pb-28 sm:px-6 sm:py-14">
      <Badge tone="dark">Eerste klanten · 25 plekken per regio</Badge>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">Doe als een van de eersten mee en betaal minder</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-700">
        Je krijgt Pro voor <strong className="text-ink-950">{formatEuro(ladderPrices.proFoundingMonthly)} per maand</strong> in plaats van{" "}
        {formatEuro(ladderPrices.proMonthly)}, excl. btw. Die lage prijs houd je voor altijd.
      </p>

      <section className="mt-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-xl font-semibold text-ink-950">Plekken per regio</h2>
          <p className="flex items-center gap-1.5 text-sm text-ink-600">
            <CalendarDays className="size-4" aria-hidden /> Je start op de eerste dag van een kwartaal. De volgende start is op{" "}
            <strong className="text-ink-950">{formatDate(intake)}</strong>.
          </p>
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" aria-label="Vrije plekken per regio">
          {regions.map((r) => (
            <li key={r.regio} className="flex items-center justify-between gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm">
              <span className="truncate text-ink-800">{r.regio}</span>
              <span className={r.vrij === 0 ? "tabular text-xs font-semibold text-danger-700" : "tabular text-xs font-semibold text-ink-950"}>
                {r.vrij === 0 ? "vol" : `${r.vrij}/${r.plekken}`}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section id="aanmelden" className="mt-12 scroll-mt-24 rounded-[var(--radius-card)] border border-ink-200 bg-white p-5 sm:p-8">
        <h2 className="text-xl font-semibold text-ink-950">Vraag je plek aan</h2>
        <p className="mt-1 text-sm text-ink-600">Is je regio vol? Dan kom je op de wachtlijst voor het volgende kwartaal.</p>
        <div className="mt-6">
          <FoundingForm regions={regions} name={user?.name} email={user?.email} />
        </div>
      </section>
    </div>
  );
}
