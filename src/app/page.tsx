import Link from "next/link";
import { ArrowRight, Check, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { site } from "@/config/site";
import { homepage, OFFERTES_LINK, VERZONNEN_VAKMENSEN, VIND_CTA } from "@/content/homepage";
import { env } from "@/lib/env";
import { CheckExample } from "@/components/marketing/check-example";
import { PrijsKaarten } from "@/components/marketing/aanbod-kaarten";
import { StartForm } from "@/components/marketing/start-form";
import { TeamCard } from "@/components/teams/team-card";
import { sqlOne } from "@/lib/db";
import { getScope } from "@/lib/data/scope";
import { proposalsFor } from "@/lib/data/teams";
import { countRealContractorsByProvince } from "@/lib/data/regio";
import { cn } from "@/lib/utils";
import type { Priority, TeamOption } from "@/lib/domain/teams";

/** Volgorde van de voorbeeldkaarten in de hero. */
const VOORBEELD_VOLGORDE: Priority[] = ["budget", "snelheid", "kwaliteit"];

/**
 * Voorbeeldteams voor de hero: per prioriteit het best passende team uit het voorbeeldproject,
 * berekend met dezelfde motor als in de app. Hetzelfde team staat nooit in twee kaarten:
 * is het beste team al getoond, dan volgt het volgende team uit dezelfde ordening.
 */
async function getVoorbeeldTeams(): Promise<{ priority: Priority; option: TeamOption }[]> {
  const project = await sqlOne<{ id: string; province: string | null; area_m2: number | null; budget_amount: number | null; desired_start_date: string | null }>(
    `select p.id, p.province, p.area_m2, p.budget_amount, p.desired_start_date from projects p
      where p.is_demo and exists (select 1 from project_scope_items s where s.project_id = p.id)
      order by (select count(*) from project_scope_items s where s.project_id = p.id) desc, p.created_at limit 1`,
  );
  if (!project) return [];
  const scope = await getScope(project.id);
  const { proposals } = await proposalsFor(
    scope.map((s) => ({ specialty_id: s.specialty_id, description: s.description, quantity: s.quantity, unit: s.unit })),
    { province: project.province, area_m2: project.area_m2, budget_amount: project.budget_amount, desired_start_date: project.desired_start_date },
  );
  const used = new Set<string>();
  const teams: { priority: Priority; option: TeamOption }[] = [];
  for (const priority of VOORBEELD_VOLGORDE) {
    const option = proposals.find((p) => p.priority === priority)?.ranked.find((o) => !used.has(o.key));
    if (!option) continue;
    used.add(option.key);
    teams.push({ priority, option });
  }
  return teams;
}

export default async function HomePage() {
  const [teams, counts] = await Promise.all([getVoorbeeldTeams(), countRealContractorsByProvince()]);
  const offertecheck = env.features.offertecheck;
  const { hero, voordelen, gokken, kiezen, bewijs, zoWerktHet, offertes, voorWie, prijzen, eersteKlanten, vragen, slot } = homepage;
  const fictief = teams.some(({ option }) => option.members.some((m) => m.contractor.is_demo));
  const bewijsProvincies = Object.entries(counts)
    .filter(([, c]) => c.gecontroleerd >= site.minGecontroleerdVoorBewijs)
    .sort((a, b) => b[1].gecontroleerd - a[1].gecontroleerd);
  return (
    <>
      {/* 4.1 Hero */}
      <section className="border-b border-ink-100 bg-gradient-to-b from-ink-50/80 to-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 pb-12 pt-8 sm:px-6 sm:pt-12 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:pb-20 lg:pt-16">
          <div>
            <p className="mb-2 text-sm font-semibold text-brand-800 sm:text-base">{hero.label}</p>
            <h1 className="text-3xl font-semibold leading-[1.15] tracking-tight text-ink-950 sm:text-5xl sm:leading-[1.1]">{hero.titel}</h1>
            <p className="mt-3 text-lg leading-relaxed text-ink-700">{hero.tekst}</p>
            <div className="mt-6">
              <StartForm echtePerProvincie={Object.fromEntries(Object.entries(counts).map(([p, c]) => [p, c.echt]))} minEchteVakmensen={site.minEchteVakmensen} offertecheck={offertecheck} />
            </div>
          </div>
          {teams.length ? (
            <section aria-labelledby="voorbeeld-teams" className="lg:pt-8">
              <h2 id="voorbeeld-teams" className="sr-only">
                Voorbeeld van een teamvoorstel
              </h2>
              <Badge tone="demo">{hero.voorbeeld.label}</Badge>
              <ul className="mt-3 flex flex-col gap-3">
                {teams.map(({ priority, option }) => (
                  <li key={priority}>
                    <TeamCard
                      option={option}
                      priority={priority}
                      compact={{
                        title: hero.voorbeeld.kaarten[priority],
                        price: hero.voorbeeld.prijs,
                        start: hero.voorbeeld.start,
                        startUnknown: hero.voorbeeld.startOnbekend,
                        rating: hero.voorbeeld.betrouwbaar,
                        ratingUnknown: hero.voorbeeld.betrouwbaarOnbekend,
                      }}
                    />
                  </li>
                ))}
              </ul>
              {fictief ? <p className="mt-3 text-sm font-medium text-demo-700">{VERZONNEN_VAKMENSEN}</p> : null}
            </section>
          ) : null}
        </div>
      </section>

      {/* 4.2 Voordelenstrip */}
      <section aria-label="Voordelen" className="border-b border-ink-100 bg-white">
        <ul className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-sm font-medium text-ink-800 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-8 sm:px-6">
          {voordelen.map((v) => (
            <li key={v} className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-brand-700" strokeWidth={3} aria-hidden />
              {v}
            </li>
          ))}
        </ul>
      </section>

      {/* 4.3 Klaar met gokken op een aannemer? */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20" aria-labelledby="gokken-titel">
        <h2 id="gokken-titel" className="text-2xl font-semibold tracking-tight text-ink-950 sm:text-3xl">
          {gokken.titel}
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {gokken.kaarten.map((k) => (
            <li key={k.kop} className="rounded-xl border border-ink-200 bg-white p-5 text-ink-700">
              <h3 className="font-semibold text-ink-950">{k.kop}</h3>
              <p className="mt-1">{k.tekst}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 4.4 Waar kies jij op? */}
      <section className="border-y border-ink-100 bg-ink-50" aria-labelledby="kiezen-titel">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <h2 id="kiezen-titel" className="text-2xl font-semibold tracking-tight text-ink-950 sm:text-3xl">
            {kiezen.titel}
          </h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {kiezen.punten.map((p) => (
              <li key={p.kop} className="rounded-xl border border-ink-200 bg-white p-5 text-ink-700">
                <h3 className="font-semibold text-ink-950">{p.kop}</h3>
                <p className="mt-1">{p.tekst}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 font-medium text-ink-950">{kiezen.zin}</p>
          <Link href={kiezen.link.href} className="mt-2 inline-block font-medium text-brand-800 underline underline-offset-2 hover:text-brand-900">
            {kiezen.link.label}
          </Link>
        </div>
      </section>

      {/* 4.5 Bewijs: alleen met echte data (gepubliceerde cases hebben geen naam of citaat en staan hier dus niet) */}
      {bewijsProvincies.length ? (
        <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 sm:pt-20" aria-labelledby="bewijs-titel">
          <h2 id="bewijs-titel" className="sr-only">
            {bewijs.titel}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bewijsProvincies.map(([provincie, c]) => (
              <li key={provincie} className="rounded-xl border border-ink-200 bg-white p-5 text-lg font-semibold text-ink-950">
                {bewijs.vakmensen(c.gecontroleerd, provincie)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 4.6 Zo werkt het */}
      <section id="zo-werkt-het" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20" aria-labelledby="zo-werkt-het-titel">
        <h2 id="zo-werkt-het-titel" className="text-2xl font-semibold tracking-tight text-ink-950 sm:text-3xl">
          {zoWerktHet.titel}
        </h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {zoWerktHet.stappen.map((s, i) => (
            <li key={s} className="flex gap-4 rounded-xl border border-ink-200 bg-white p-5 text-ink-800">
              <span className="tabular flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white" aria-hidden>
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <VindButton className="mt-8" />
      </section>

      {/* 4.7 Heb je al offertes? */}
      {offertecheck ? (
        <section className="border-y border-ink-100 bg-ink-50" aria-labelledby="offertes-titel">
          <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
            <h2 id="offertes-titel" className="text-2xl font-semibold tracking-tight text-ink-950 sm:text-3xl">
              {offertes.titel}
            </h2>
            <p className="mt-3 text-ink-700">{offertes.tekst}</p>
            <div className="mt-6">
              <CheckExample caption={offertes.onderVoorbeeld} />
            </div>
            <Button asChild size="lg" className="mt-6 w-full sm:w-auto">
              <Link href={offertes.knop.href}>
                {offertes.knop.label} <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </section>
      ) : null}

      {/* 4.8 Voor wie */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20" aria-labelledby="voor-wie-titel">
        <h2 id="voor-wie-titel" className="sr-only">
          {voorWie.titel}
        </h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {voorWie.kaarten.map((k) => (
            <li key={k.kop} id={k.kop === "Vakman" ? "voor-vakmensen" : undefined} className="flex scroll-mt-24 flex-col rounded-xl border border-ink-200 bg-white p-5">
              <h3 className="text-lg font-semibold text-ink-950">{k.kop}</h3>
              <p className="mt-1 flex-1 text-ink-700">{k.tekst}</p>
              <Button asChild variant={k.kop === "Vakman" ? "dark" : "outline"} className="mt-5 h-auto min-h-10 whitespace-normal py-2">
                <Link href={k.knop.href}>{k.knop.label}</Link>
              </Button>
            </li>
          ))}
        </ul>
      </section>

      {/* 4.9 Wat het kost */}
      <section id="prijzen" className="scroll-mt-20 border-y border-ink-100 bg-ink-50" aria-labelledby="prijzen-titel">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <h2 id="prijzen-titel" className="text-2xl font-semibold tracking-tight text-ink-950 sm:text-3xl">
            {prijzen.titel}
          </h2>
          <PrijsKaarten className="mt-8" offertecheck={offertecheck} />
          <p className="mt-6 text-ink-700">{prijzen.onderKaarten}</p>
        </div>
      </section>

      {/* 4.10 Eerste klanten */}
      {env.features.foundingMembers ? (
        <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 sm:pt-20" aria-labelledby="eerste-klanten-titel">
          <div className="flex flex-col gap-6 rounded-2xl bg-ink-950 p-6 text-white sm:p-8 md:flex-row md:items-center md:justify-between md:p-10">
            <div className="max-w-2xl">
              <h2 id="eerste-klanten-titel" className="text-2xl font-semibold tracking-tight">
                {eersteKlanten.titel}
              </h2>
              <p className="mt-2 text-ink-200">{eersteKlanten.tekst}</p>
            </div>
            <Button asChild size="lg" className="bg-white text-ink-950 hover:bg-ink-100">
              <Link href={eersteKlanten.knop.href}>{eersteKlanten.knop.label}</Link>
            </Button>
          </div>
        </section>
      ) : null}

      <FounderStory />

      {/* 4.11 Vragen */}
      <section aria-labelledby="vragen-titel">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1fr_2fr]">
          <div>
            <h2 id="vragen-titel" className="text-2xl font-semibold tracking-tight text-ink-950 sm:text-3xl">
              {vragen.titel}
            </h2>
            <Link href={vragen.link.href} className="mt-3 inline-block font-medium text-brand-800 underline underline-offset-2">
              {vragen.link.label}
            </Link>
          </div>
          <ul className="divide-y divide-ink-200 border-y border-ink-200">
            {vragen.items.map((f) => (
              <li key={f.vraag}>
                <details className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink-950 [&::-webkit-details-marker]:hidden">
                    {f.vraag}
                    <span aria-hidden className="text-xl leading-none text-ink-400 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-2 text-ink-700">{f.antwoord}</p>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4.12 Slot */}
      <section className="bg-brand-800 text-white" aria-labelledby="slot-titel">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-5 px-4 py-14 sm:px-6 sm:py-16">
          <h2 id="slot-titel" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {slot.titel}
          </h2>
          <VindButton className="bg-white text-brand-900 hover:bg-brand-50" />
          {offertecheck ? (
            <Link href={OFFERTES_LINK.href("home-slot")} className="font-medium text-white underline underline-offset-2">
              {slot.link}
            </Link>
          ) : null}
        </div>
      </section>
    </>
  );
}

/** De primaire knop naar het hero-formulier. */
function VindButton({ className }: { className?: string }) {
  return (
    <Button asChild size="lg" className={cn("w-full sm:w-auto", className)}>
      <Link href={VIND_CTA.href}>
        {VIND_CTA.label} <ArrowRight aria-hidden />
      </Link>
    </Button>
  );
}

/** Oprichtersverhaal; verschijnt pas als site.founderStory is ingevuld. */
function FounderStory() {
  const paragraphs = site.founderStory.split(/\n\s*\n/).filter(Boolean);
  if (!paragraphs.length) return null;
  return (
    <section className="border-t border-ink-100">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <Quote className="size-6 text-brand-600" aria-hidden />
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink-950">Waarom BouwCheck</h2>
        <div className="mt-4 space-y-4 text-lg leading-relaxed text-ink-700">
          {paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
          {site.founderName ? <p className="text-base font-medium text-ink-950">— {site.founderName}</p> : null}
        </div>
      </div>
    </section>
  );
}

