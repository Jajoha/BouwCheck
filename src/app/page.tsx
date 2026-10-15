import Link from "next/link";
import {
  ArrowRight,
  FileQuestion,
  TrendingUp,
  CalendarX2,
  Handshake,
  Scale,
  ClipboardList,
  Columns3,
  CheckCircle2,
  Receipt,
  HardHat,
  CalendarRange,
  ShieldAlert,
  FileText,
  CircleDashed,
  BadgeCheck,
  UserCheck,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { site } from "@/config/site";
import { sql } from "@/lib/db";
import { getContractorsByIds, type ContractorSummary } from "@/lib/data/contractors";
import { MetricValue } from "@/components/domain/metric";
import { AvailabilityBadge, DemoBadge, PriceLevelLabel } from "@/components/domain/badges";
import { formatMoney } from "@/lib/format";

async function getPreview(): Promise<{ contractors: ContractorSummary[]; quotes: Map<string, { amount: number; days: number | null; scope: number }> }> {
  const preferred = await sql<{ id: string }>(
    "select id from contractors where slug in ('lindewaard','snelbouw-oost','nieuwe-hoek') and status = 'actief' order by array_position(array['lindewaard','snelbouw-oost','nieuwe-hoek'], slug)",
  );
  const ids = preferred.length >= 2 ? preferred.map((r) => r.id) : (await sql<{ id: string }>("select id from contractors where status = 'actief' order by company_name limit 3")).map((r) => r.id);
  const contractors = await getContractorsByIds(ids);
  const quotes = new Map<string, { amount: number; days: number | null; scope: number }>();
  if (ids.length) {
    const rows = await sql<{ contractor_id: string; amount: number; estimated_duration_days: number | null; scope: number }>(
      `select distinct on (q.contractor_id) q.contractor_id, q.amount, q.estimated_duration_days, cardinality(q.scope_specialty_ids) as scope
         from quotes q where q.contractor_id = any($1::uuid[]) and q.price_type = 'offerte' and q.is_demo order by q.contractor_id, q.created_at desc`,
      [ids],
    );
    for (const r of rows) quotes.set(r.contractor_id, { amount: r.amount, days: r.estimated_duration_days, scope: r.scope });
  }
  return { contractors, quotes };
}

const PROBLEMS = [
  { icon: FileQuestion, title: "Onduidelijke offertes", text: "Offertes met verschillende scopes, stelposten en uitsluitingen zijn lastig naast elkaar te leggen." },
  { icon: TrendingUp, title: "Onverwachte meerkosten", text: "Meerwerk dat pas tijdens de uitvoering op tafel komt, gaat direct van je marge af." },
  { icon: CalendarX2, title: "Uitlopende renovaties", text: "Elke week vertraging kost rente, vaste lasten en soms een verkoopmoment." },
  { icon: Handshake, title: "Onbetrouwbare afspraken", text: "Of een aannemer afspraken nakomt, hoor je meestal pas achteraf — of via via." },
  { icon: Scale, title: "Moeilijk te vergelijken", text: "Reviews zeggen weinig over budgetafwijking, doorlooptijd of herstelwerk bij vergelijkbare projecten." },
];

const STEPS = [
  { icon: ClipboardList, title: "Beschrijf je renovatieproject", text: "Locatie, type woning, budget, planning en de benodigde vakgebieden. Zo weet BouwCheck welke aannemers relevant zijn." },
  { icon: Columns3, title: "Vergelijk passende aannemers", text: "Zet twee tot vier aannemers naast elkaar: prijs, beschikbaarheid, doorlooptijd, projectresultaten en verificatiestatus." },
  { icon: CheckCircle2, title: "Kies onderbouwd", text: "Zie per gegeven hoeveel projecten erachter zitten en wat ontbreekt. Leg je keuze en offertes vast in je project." },
];

const BENEFITS = [
  { icon: Receipt, title: "Prijzen en offertes vergelijken", text: "Indicatieve tarieven, concrete offertes en definitieve bedragen worden apart getoond — met waarschuwingen als de scope verschilt." },
  { icon: HardHat, title: "Inzicht in projectervaring", text: "Aantallen geregistreerde en gecontroleerde projecten per aannemer, per type renovatie." },
  { icon: CalendarRange, title: "Beschikbaarheid beoordelen", text: "Zie wanneer een aannemer kan starten en wanneer die informatie voor het laatst is bijgewerkt." },
  { icon: ShieldAlert, title: "Budget- en tijdsrisico's herkennen", text: "Op-tijdpercentage en gemiddelde budgetafwijking — alleen getoond als er genoeg onderliggende projecten zijn." },
  { icon: FileText, title: "Beslissingen documenteren", text: "Shortlist, offertes, aanvragen, notities en een tijdlijn per project. Handig richting financier of partner." },
];

const LEVELS = [
  { icon: CircleDashed, title: "Zelf opgegeven", text: "Informatie die het bedrijf zelf heeft ingevuld, zoals tarieven, werkgebied en beschikbaarheid. Niet gecontroleerd." },
  { icon: BadgeCheck, title: "Bedrijfsgegevens gecontroleerd", text: "Administratieve controle van bijvoorbeeld de KvK-inschrijving. Zegt niets over de kwaliteit van het werk." },
  { icon: UserCheck, title: "Opdrachtgever bevestigd", text: "Een projectresultaat dat door de opdrachtgever is bevestigd." },
  { icon: FileCheck2, title: "Projectgegevens gecontroleerd", text: "Begroting, eindafrekening en opleverdata gecontroleerd aan de hand van projectdocumentatie." },
];

const FAQ = [
  {
    q: "Waar komen de gegevens over aannemers vandaan?",
    a: "Uit drie bronnen: wat het bedrijf zelf opgeeft, administratieve controles door BouwCheck en projectresultaten die opdrachtgevers registreren. Bij ieder gegeven tonen we de bron en verificatiestatus. In deze bèta zijn alle aannemersprofielen fictieve demo-data.",
  },
  {
    q: "Waarom zie ik soms 'Nog onvoldoende gegevens'?",
    a: `Een percentage op basis van één of twee projecten is misleidend. Daarom tonen we statistieken pas vanaf ${site.minSampleSize} geldige waarnemingen, en altijd met het aantal projecten erbij.`,
  },
  {
    q: "Heeft BouwCheck een totaalscore per aannemer?",
    a: "Nee. Een samengestelde score verbergt onzekerheid en weegt dingen die voor jouw project misschien niet belangrijk zijn. De beste keuze hangt af van je project: budget, planning en risicobereidheid.",
  },
  {
    q: "Kunnen aannemers betalen voor een hogere positie?",
    a: "Nee. Sortering gebeurt uitsluitend op de criteria die je zelf kiest. Verificatiestatussen en beoordelingen zijn niet te koop.",
  },
  {
    q: "Worden offerteaanvragen echt verstuurd?",
    a: "Alleen naar aannemers die zelf een account op BouwCheck hebben; die zien de aanvraag in hun portaal. E-mailverzending is in deze bèta nog niet actief. Waar een aanvraag niet echt is verstuurd, staat dat er duidelijk bij.",
  },
  {
    q: "Wat kost BouwCheck?",
    a: "We testen in deze bèta verschillende modellen. Zie de prijspagina voor de voorlopige testprijzen; er worden nu geen betalingen verwerkt.",
  },
];

export default async function HomePage() {
  const { contractors, quotes } = await getPreview();
  return (
    <>
      {/* Hero */}
      <section className="border-b border-ink-100 bg-gradient-to-b from-ink-50/80 to-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:pb-24 lg:pt-20">
          <div>
            <Badge tone="neutral" className="mb-5">
              Bèta voor vastgoedflippers en -investeerders
            </Badge>
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-ink-950 sm:text-5xl">{site.hero.title}</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-600">{site.hero.subtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/aannemers">
                  {site.hero.primaryCta} <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#hoe-het-werkt">{site.hero.secondaryCta}</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-ink-500">Geen totaalscores. Altijd zichtbaar hoeveel projecten achter een cijfer zitten.</p>
          </div>
          <HeroPreview contractors={contractors} quotes={quotes} />
        </div>
      </section>

      {/* Probleem */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-ink-950">Je rendement wordt op de bouwplaats bepaald</h2>
          <p className="mt-3 text-ink-600">Herkenbaar? De aankoop is doorgerekend, maar de renovatie blijft de grootste onzekere factor.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PROBLEMS.map((p) => (
            <div key={p.title} className="rounded-xl border border-ink-200 bg-white p-5">
              <p.icon className="size-5 text-ink-700" aria-hidden />
              <h3 className="mt-3 font-semibold text-ink-950">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Hoe het werkt */}
      <section id="hoe-het-werkt" className="scroll-mt-20 border-y border-ink-100 bg-ink-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight">Hoe het werkt</h2>
          <p className="mt-3 max-w-2xl text-ink-300">Van projectomschrijving naar een onderbouwde keuze, in drie stappen.</p>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative rounded-xl border border-white/10 bg-white/[0.03] p-6">
                <div className="flex items-center gap-3">
                  <span className="tabular flex size-8 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white">{i + 1}</span>
                  <s.icon className="size-5 text-ink-300" aria-hidden />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-300">{s.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10">
            <Button asChild size="lg">
              <Link href="/projecten/nieuw">
                Beschrijf je renovatieproject <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Voordelen */}
      <section id="voor-vastgoedflippers" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-ink-950">Gebouwd voor vastgoedflippers</h2>
            <p className="mt-3 text-ink-600">
              Minder zoekwerk, betere vergelijkbaarheid en meer grip op renovatierisico&apos;s. Geen bedrijvengids, maar een vergelijkingsinstrument op projectgegevens.
            </p>
          </div>
          <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <div key={b.title} className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-200">
                  <b.icon className="size-5" aria-hidden />
                </div>
                <div>
                  <h3 className="font-semibold text-ink-950">{b.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-600">{b.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transparantie */}
      <section className="border-y border-ink-100 bg-ink-50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-ink-950">Niet alle informatie is even hard</h2>
            <p className="mt-3 text-ink-600">
              Daarom label we elk gegeven met zijn bron en verificatieniveau. Een status wordt alleen toegekend als er een passende controle aan voorafgaat — en is niet te koop.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LEVELS.map((l, i) => (
              <div key={l.title} className="rounded-xl border border-ink-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <l.icon className={i === 0 ? "size-5 text-ink-500" : "size-5 text-brand-600"} aria-hidden />
                  <span className="text-xs text-ink-400">Niveau {i}</span>
                </div>
                <h3 className="mt-3 font-semibold text-ink-950">{l.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{l.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-4 text-sm text-ink-700 md:grid-cols-3">
            <p className="rounded-lg border border-ink-200 bg-white p-4">
              <strong className="font-semibold text-ink-950">Minimaal {site.minSampleSize} projecten</strong> voordat we een percentage of gemiddelde tonen.
            </p>
            <p className="rounded-lg border border-ink-200 bg-white p-4">
              <strong className="font-semibold text-ink-950">Eén resultaat per aannemer per project</strong>, gemodereerd voordat het meetelt.
            </p>
            <p className="rounded-lg border border-ink-200 bg-white p-4">
              <strong className="font-semibold text-ink-950">Ruimte voor bezwaar</strong>: aannemers kunnen reageren en betwiste resultaten tellen niet mee.
            </p>
          </div>
          <Link href="/transparantie" className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
            Lees hoe we gegevens beoordelen <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>

      {/* Aannemers */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="flex flex-col gap-6 rounded-2xl border border-ink-200 p-8 md:flex-row md:items-center md:justify-between md:p-10">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-ink-950">Aannemer of onderaannemer?</h2>
            <p className="mt-2 text-ink-600">
              Maak een bedrijfsprofiel aan, vul tarieven, werkgebied en beschikbaarheid in en ontvang offerteaanvragen van vastgoedinvesteerders. Nieuwe profielen starten als &lsquo;Zelf opgegeven&rsquo;; verificatie vraag je aan in het portaal.
            </p>
          </div>
          <Button asChild variant="dark" size="lg">
            <Link href="/registreren?rol=aannemer">Bedrijf aanmelden</Link>
          </Button>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-ink-100">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-ink-950">Veelgestelde vragen</h2>
            <p className="mt-3 text-ink-600">
              Staat je vraag er niet bij? <Link href="/contact" className="text-brand-700 underline">Neem contact op</Link>.
            </p>
          </div>
          <div className="divide-y divide-ink-200 border-y border-ink-200">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink-950 [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden className="text-xl leading-none text-ink-400 group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-800 text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Probeer de bèta met je volgende project</h2>
            <p className="mt-2 text-brand-100">Start een renovatieproject of vergelijk direct de demo-aannemers.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-white text-brand-900 hover:bg-brand-50">
              <Link href="/projecten/nieuw">Start een renovatieproject</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10">
              <Link href="/aannemers">Bekijk aannemers</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function HeroPreview({ contractors, quotes }: { contractors: ContractorSummary[]; quotes: Map<string, { amount: number; days: number | null; scope: number }> }) {
  if (contractors.length < 2) {
    return (
      <div className="rounded-2xl border border-ink-200 bg-white p-8 text-sm text-ink-500 shadow-[var(--shadow-raised)]">
        Nog geen aannemers beschikbaar om te vergelijken.
      </div>
    );
  }
  const maxScope = Math.max(...[...quotes.values()].map((q) => q.scope), 0);
  return (
    <figure className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-[var(--shadow-raised)]" aria-label="Voorbeeld van een vergelijking">
      <div className="flex items-center justify-between border-b border-ink-100 bg-ink-50 px-4 py-2.5">
        <span className="text-xs font-medium text-ink-600">Vergelijking · Tussenwoning Amersfoort</span>
        {contractors.some((c) => c.is_demo) ? <DemoBadge compact /> : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr>
              <th className="w-36 px-4 py-3 text-left text-xs font-medium text-ink-500" scope="col">
                <span className="sr-only">Kenmerk</span>
              </th>
              {contractors.map((c) => (
                <th key={c.id} scope="col" className="px-3 py-3 text-left align-bottom text-[13px] font-semibold leading-tight text-ink-950">
                  {c.company_name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_td]:border-t [&_td]:border-ink-100 [&_td]:px-3 [&_td]:py-2.5 [&_th]:border-t [&_th]:border-ink-100 [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:text-ink-500">
            <tr>
              <th scope="row">Offerte</th>
              {contractors.map((c) => {
                const q = quotes.get(c.id);
                return (
                  <td key={c.id} className="tabular">
                    {q ? <span className="font-semibold text-ink-950">{formatMoney(q.amount, false)}</span> : <span className="text-ink-400">—</span>}
                    {q && q.scope < maxScope ? <span className="mt-0.5 block text-[11px] font-medium text-warn-700">Kleinere scope</span> : null}
                  </td>
                );
              })}
            </tr>
            <tr>
              <th scope="row">Prijsniveau</th>
              {contractors.map((c) => (
                <td key={c.id}>
                  <PriceLevelLabel level={c.price_level} />
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Beschikbaar</th>
              {contractors.map((c) => (
                <td key={c.id}>
                  <AvailabilityBadge status={c.availability_status} />
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Op tijd opgeleverd</th>
              {contractors.map((c) => (
                <td key={c.id}>
                  <MetricValue metric={c.metrics.onTime} kind="percent" compact />
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Budgetafwijking</th>
              {contractors.map((c) => (
                <td key={c.id}>
                  <MetricValue metric={c.metrics.budgetDeviation} kind="signedPercent" compact />
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Gecontroleerde projecten</th>
              {contractors.map((c) => (
                <td key={c.id} className="tabular font-medium text-ink-900">
                  {c.metrics.verifiedProjects} <span className="font-normal text-ink-500">van {c.metrics.registeredProjects}</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <figcaption className="border-t border-ink-100 px-4 py-2.5 text-xs text-ink-500">
        Live uit de demo-database. Geen &lsquo;beste&rsquo; aannemer: de keuze hangt af van budget, planning en risico.
      </figcaption>
    </figure>
  );
}
