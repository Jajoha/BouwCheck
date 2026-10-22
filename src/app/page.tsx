import Link from "next/link";
import {
  ArrowRight,
  Building,
  Building2,
  CalendarClock,
  Check,
  Coins,
  HardHat,
  Headset,
  History,
  Quote,
  Scale,
  ShieldCheck,
  Sparkles,
  Timer,
  Users,
} from "lucide-react";
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
  const [titelVoor, titelNa] = splitAccent(hero.titel, "vakmensen");
  return (
    <>
      {/* 4.1 Hero: donker vlak met bouwtekening-raster */}
      <section className="relative isolate overflow-hidden bg-ink-950 text-white">
        <div aria-hidden className="bg-blueprint absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black,transparent_92%)]" />
        <div aria-hidden className="absolute -left-40 -top-40 -z-10 size-[36rem] rounded-full bg-brand-500/25 blur-3xl" />
        <div aria-hidden className="absolute -bottom-48 right-0 -z-10 size-[30rem] rounded-full bg-accent-400/10 blur-3xl" />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-8 sm:px-6 sm:pt-14 lg:grid-cols-[1.08fr_1fr] lg:gap-14 lg:pb-28 lg:pt-20">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-ink-100 sm:text-sm">
              <span aria-hidden className="size-1.5 rounded-full bg-accent-400" />
              {hero.label}
            </p>
            <h1 className="font-display text-[2.15rem] font-bold leading-[1.05] tracking-tight sm:text-6xl">
              {titelVoor}
              <span className="relative whitespace-nowrap text-accent-400">
                vakmensen
                <svg aria-hidden viewBox="0 0 200 12" preserveAspectRatio="none" className="absolute -bottom-0.5 left-0 h-1.5 w-full text-accent-400/60 sm:-bottom-1 sm:h-2.5">
                  <path d="M2 9C50 3 150 3 198 8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
              {titelNa}
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-300 sm:mt-5">{hero.tekst}</p>
            <div className="mt-6 sm:mt-8">
              <StartForm echtePerProvincie={Object.fromEntries(Object.entries(counts).map(([p, c]) => [p, c.echt]))} minEchteVakmensen={site.minEchteVakmensen} offertecheck={offertecheck} />
            </div>
          </div>
          {teams.length ? (
            <section aria-labelledby="voorbeeld-teams" className="relative lg:pt-10">
              <h2 id="voorbeeld-teams" className="sr-only">
                Voorbeeld van een teamvoorstel
              </h2>
              <div className="mb-4 flex items-center gap-3">
                <Badge tone="demo" className="border-white/25 bg-white/10 text-white">
                  {hero.voorbeeld.label}
                </Badge>
                <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
              </div>
              <ul className="flex flex-col gap-3 lg:gap-4">
                {teams.map(({ priority, option }, i) => (
                  <li key={priority} className={cn("transition-transform duration-300 lg:hover:-translate-y-1", i === 1 && "lg:ml-8", i === 2 && "lg:ml-16")}>
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
              {fictief ? <p className="mt-4 text-sm text-ink-300 lg:ml-16">{VERZONNEN_VAKMENSEN}</p> : null}
            </section>
          ) : null}
        </div>
      </section>

      {/* 4.2 Voordelenstrip: zwevende balk over de rand van de hero */}
      <section aria-label="Voordelen" className="relative z-10 mx-auto -mt-8 max-w-5xl px-4 sm:px-6">
        <ul className="grid gap-3 rounded-2xl bg-white p-4 shadow-[var(--shadow-float)] ring-1 ring-ink-950/5 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-ink-100 sm:p-2">
          {voordelen.map((v, i) => {
            const Icon = [Users, Headset, ShieldCheck][i] ?? Check;
            return (
              <li key={v} className="flex items-center gap-3 text-[15px] font-semibold text-ink-900 sm:justify-center sm:px-4 sm:py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-200" aria-hidden>
                  <Icon className="size-4" />
                </span>
                {v}
              </li>
            );
          })}
        </ul>
      </section>

      {/* 4.3 Klaar met gokken op een aannemer? */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24" aria-labelledby="gokken-titel">
        <SectionTitle id="gokken-titel">{gokken.titel}</SectionTitle>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {gokken.kaarten.map((k, i) => {
            const Icon = [Scale, CalendarClock, History, Headset][i] ?? Check;
            return (
              <li key={k.kop} className="group flex gap-4 rounded-2xl border border-ink-200 bg-white p-5 transition duration-200 hover:-translate-y-1 hover:border-ink-300 hover:shadow-[var(--shadow-raised)] sm:block sm:p-6">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-ink-950 text-accent-400 transition-colors group-hover:bg-brand-700 group-hover:text-white" aria-hidden>
                  <Icon className="size-5" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink-950 sm:mt-5">{k.kop}</h3>
                  <p className="mt-1 text-ink-600 sm:mt-1.5">{k.tekst}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 4.4 Waar kies jij op? */}
      <section className="relative isolate overflow-hidden bg-brand-900 text-white" aria-labelledby="kiezen-titel">
        <div aria-hidden className="bg-blueprint absolute inset-0 -z-10 opacity-70" />
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <SectionTitle id="kiezen-titel" dark>
            {kiezen.titel}
          </SectionTitle>
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {kiezen.punten.map((p, i) => {
              const Icon = [Coins, Timer, ShieldCheck][i] ?? Check;
              return (
                <li key={p.kop} className="relative flex gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm md:block md:p-7">
                  <span aria-hidden className="absolute -right-3 -top-6 font-display text-[7rem] font-bold leading-none text-white/[0.05]">
                    {i + 1}
                  </span>
                  <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-400 text-ink-950" aria-hidden>
                    <Icon className="size-5" />
                  </span>
                  <div className="relative">
                    <h3 className="font-display text-xl font-semibold md:mt-5">{p.kop}</h3>
                    <p className="mt-1 text-brand-100/90 md:mt-1.5">{p.tekst}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <p className="inline-flex items-center gap-2 font-display text-lg font-semibold text-accent-300">
              <ShieldCheck className="size-5" aria-hidden />
              {kiezen.zin}
            </p>
            <Link href={kiezen.link.href} className="font-medium text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
              {kiezen.link.label}
            </Link>
          </div>
        </div>
      </section>

      {/* 4.5 Bewijs: alleen met echte data (gepubliceerde cases hebben geen naam of citaat en staan hier dus niet) */}
      {bewijsProvincies.length ? (
        <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-24" aria-labelledby="bewijs-titel">
          <h2 id="bewijs-titel" className="sr-only">
            {bewijs.titel}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bewijsProvincies.map(([provincie, c]) => (
              <li key={provincie} className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-5 font-display text-lg font-semibold text-ink-950">
                <ShieldCheck className="size-6 shrink-0 text-brand-700" aria-hidden />
                {bewijs.vakmensen(c.gecontroleerd, provincie)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 4.6 Zo werkt het */}
      <section id="zo-werkt-het" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24" aria-labelledby="zo-werkt-het-titel">
        <SectionTitle id="zo-werkt-het-titel">{zoWerktHet.titel}</SectionTitle>
        <ol className="relative mt-10 grid gap-8 md:grid-cols-3 md:gap-6">
          <span aria-hidden className="absolute left-6 top-6 hidden h-0.5 w-[calc(100%-3rem)] border-t-2 border-dashed border-ink-200 md:block" />
          {zoWerktHet.stappen.map((s, i) => (
            <li key={s} className="relative flex gap-4 md:flex-col md:gap-5">
              <span className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-accent-400 font-display text-xl font-bold text-ink-950 shadow-[0_0_0_6px_white]" aria-hidden>
                {i + 1}
              </span>
              <span className="pt-2.5 text-lg font-medium leading-snug text-ink-900 md:pt-0">{s}</span>
            </li>
          ))}
        </ol>
        <VindButton className="mt-12" />
      </section>

      {/* 4.7 Heb je al offertes? */}
      {offertecheck ? (
        <section className="relative isolate overflow-hidden bg-sand-100" aria-labelledby="offertes-titel">
          <div aria-hidden className="bg-blueprint-light absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
            <div>
              <SectionTitle id="offertes-titel">{offertes.titel}</SectionTitle>
              <p className="mt-4 text-lg text-ink-700">{offertes.tekst}</p>
              <Button asChild size="lg" variant="dark" className="mt-7 w-full sm:w-auto">
                <Link href={offertes.knop.href}>
                  {offertes.knop.label} <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
            <div className="lg:rotate-[0.6deg]">
              <CheckExample caption={offertes.onderVoorbeeld} />
            </div>
          </div>
        </section>
      ) : null}

      {/* 4.8 Voor wie */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24" aria-labelledby="voor-wie-titel">
        <h2 id="voor-wie-titel" className="sr-only">
          {voorWie.titel}
        </h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {voorWie.kaarten.map((k, i) => {
            const Icon = [Building2, Building, HardHat][i] ?? Check;
            const vakman = k.kop === "Vakman";
            return (
              <li
                key={k.kop}
                id={vakman ? "voor-vakmensen" : undefined}
                className={cn(
                  "flex scroll-mt-24 flex-col rounded-2xl p-6 sm:p-7",
                  vakman ? "bg-ink-950 text-white" : "border border-ink-200 bg-white transition duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-raised)]",
                )}
              >
                <span className={cn("flex size-11 items-center justify-center rounded-xl", vakman ? "bg-accent-400 text-ink-950" : "bg-brand-50 text-brand-700 ring-1 ring-brand-200")} aria-hidden>
                  <Icon className="size-5" />
                </span>
                <h3 className={cn("mt-5 font-display text-xl font-semibold", vakman ? "text-white" : "text-ink-950")}>{k.kop}</h3>
                <p className={cn("mt-1.5 flex-1", vakman ? "text-ink-300" : "text-ink-600")}>{k.tekst}</p>
                <Button asChild variant={vakman ? "accent" : "outline"} className="mt-6 h-auto min-h-11 whitespace-normal py-2.5">
                  <Link href={k.knop.href}>
                    {k.knop.label} <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 4.9 Wat het kost */}
      <section id="prijzen" className="scroll-mt-20 border-y border-sand-200 bg-sand-50" aria-labelledby="prijzen-titel">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <SectionTitle id="prijzen-titel">{prijzen.titel}</SectionTitle>
          <PrijsKaarten className="mt-10" offertecheck={offertecheck} />
          <p className="mt-6 text-ink-700">{prijzen.onderKaarten}</p>
        </div>
      </section>

      {/* 4.10 Eerste klanten */}
      {env.features.foundingMembers ? (
        <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-24" aria-labelledby="eerste-klanten-titel">
          <div className="relative isolate flex flex-col gap-6 overflow-hidden rounded-3xl bg-accent-400 p-6 text-ink-950 sm:p-10 md:flex-row md:items-center md:justify-between">
            <Sparkles aria-hidden className="absolute -right-6 -top-6 -z-10 size-40 text-white/30" />
            <div className="max-w-2xl">
              <h2 id="eerste-klanten-titel" className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                {eersteKlanten.titel}
              </h2>
              <p className="mt-2 text-ink-900">{eersteKlanten.tekst}</p>
            </div>
            <Button asChild size="lg" variant="dark" className="shrink-0">
              <Link href={eersteKlanten.knop.href}>
                {eersteKlanten.knop.label} <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </section>
      ) : null}

      <FounderStory />

      {/* 4.11 Vragen */}
      <section aria-labelledby="vragen-titel">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1fr_2fr] lg:gap-14">
          <div>
            <SectionTitle id="vragen-titel">{vragen.titel}</SectionTitle>
            <Link href={vragen.link.href} className="mt-4 inline-block font-medium text-brand-800 underline underline-offset-4 hover:text-brand-900">
              {vragen.link.label}
            </Link>
          </div>
          <ul className="flex flex-col gap-3">
            {vragen.items.map((f) => (
              <li key={f.vraag}>
                <details className="group rounded-2xl border border-ink-200 bg-white px-5 py-4 transition-colors open:border-ink-300 open:bg-sand-50 open:shadow-[var(--shadow-card)]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink-950 [&::-webkit-details-marker]:hidden">
                    {f.vraag}
                    <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink-100 text-lg leading-none text-ink-700 transition-transform group-open:rotate-45 group-open:bg-accent-400 group-open:text-ink-950">
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
      <section className="relative isolate overflow-hidden bg-ink-950 text-white" aria-labelledby="slot-titel">
        <div aria-hidden className="bg-blueprint absolute inset-0 -z-10" />
        <div aria-hidden className="absolute left-1/2 top-full -z-10 size-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6 sm:py-28">
          <h2 id="slot-titel" className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
            {slot.titel}
          </h2>
          <VindButton variant="accent" />
          {offertecheck ? (
            <Link href={OFFERTES_LINK.href("home-slot")} className="font-medium text-ink-200 underline decoration-white/40 underline-offset-4 hover:text-white">
              {slot.link}
            </Link>
          ) : null}
        </div>
      </section>
    </>
  );
}

/** Splitst de kop rond het woord dat geel wordt; de tekst zelf blijft ongewijzigd. */
function splitAccent(text: string, word: string): [string, string] {
  const i = text.indexOf(word);
  return i === -1 ? [text, ""] : [text.slice(0, i), text.slice(i + word.length)];
}

function SectionTitle({ id, dark, children }: { id: string; dark?: boolean; children: React.ReactNode }) {
  return (
    <h2 id={id} className={cn("max-w-3xl font-display text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.1]", dark ? "text-white" : "text-ink-950")}>
      {children}
    </h2>
  );
}

/** De primaire knop naar het hero-formulier. */
function VindButton({ className, variant = "primary" }: { className?: string; variant?: "primary" | "accent" }) {
  return (
    <Button asChild size="lg" variant={variant} className={cn("h-13 w-full px-7 text-base sm:w-auto", className)}>
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
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <Quote className="size-6 text-brand-600" aria-hidden />
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink-950">Waarom BouwCheck</h2>
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
