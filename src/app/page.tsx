import Link from "next/link";
import {
  ArrowRight,
  FileQuestion,
  TrendingUp,
  CalendarX2,
  Handshake,
  Scale,
  Sparkles,
  Users,
  ClipboardList,
  CheckCircle2,
  Receipt,
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
import { sqlOne } from "@/lib/db";
import { getScope } from "@/lib/data/scope";
import { proposalsFor } from "@/lib/data/teams";
import { DemoBadge } from "@/components/domain/badges";
import { formatDate, formatEuro, formatNumber } from "@/lib/format";
import type { Priority, TeamOption } from "@/lib/domain/teams";

/** Live voorbeeld: teamvoorstellen voor het demoproject, berekend met dezelfde motor als in de app. */
async function getPreview(): Promise<{ project: { name: string; is_demo: boolean } | null; best: { priority: Priority; option: TeamOption | null }[] }> {
  const project = await sqlOne<{ id: string; name: string; is_demo: boolean; province: string | null; area_m2: number | null; budget_amount: number | null; desired_start_date: string | null }>(
    `select p.id, p.name, p.is_demo, p.province, p.area_m2, p.budget_amount, p.desired_start_date from projects p
      where p.is_demo and exists (select 1 from project_scope_items s where s.project_id = p.id)
      order by (select count(*) from project_scope_items s where s.project_id = p.id) desc, p.created_at limit 1`,
  );
  if (!project) return { project: null, best: [] };
  const scope = await getScope(project.id);
  const proposals = await proposalsFor(
    scope.map((s) => ({ specialty_id: s.specialty_id, description: s.description, quantity: s.quantity, unit: s.unit })),
    { province: project.province, area_m2: project.area_m2, budget_amount: project.budget_amount, desired_start_date: project.desired_start_date },
  );
  return { project, best: proposals.map((p) => ({ priority: p.priority, option: p.ranked[0] ?? null })) };
}

const PROBLEMS = [
  { icon: FileQuestion, title: "Onduidelijke offertes", text: "Offertes met verschillende scopes, stelposten en uitsluitingen zijn lastig naast elkaar te leggen." },
  { icon: TrendingUp, title: "Onverwachte meerkosten", text: "Meerwerk dat pas tijdens de uitvoering op tafel komt, gaat direct van je marge af." },
  { icon: CalendarX2, title: "Uitlopende renovaties", text: "Elke week vertraging kost rente, vaste lasten en soms een verkoopmoment." },
  { icon: Handshake, title: "Onbetrouwbare afspraken", text: "Of een aannemer afspraken nakomt, hoor je meestal pas achteraf — of via via." },
  { icon: Scale, title: "Moeilijk te vergelijken", text: "Reviews zeggen weinig over budgetafwijking, doorlooptijd of herstelwerk bij vergelijkbare projecten." },
];

const STEPS = [
  { icon: ClipboardList, title: "Beschrijf je project en voeg foto's toe", text: "In je eigen woorden: wat moet eruit, wat moet er nieuw, hoe is de staat van de woning. Foto's van badkamer, meterkast of dak helpen." },
  { icon: Sparkles, title: "AI zet het om in werkzaamheden", text: "Per vakgebied, met hoeveelheden, risico's en open vragen. Jij controleert en corrigeert; de AI noemt geen prijzen en kiest geen aannemers." },
  { icon: CheckCircle2, title: "Ontvang teams op budget, kwaliteit en snelheid", text: "BouwCheck stelt teams samen uit aannemers in jouw regio en ordent ze per prioriteit — met de onderbouwing en wat er nog ontbreekt." },
];

const BENEFITS = [
  { icon: Users, title: "Wie wat kan doen, al samengesteld", text: "Een hoofdaannemer of een team van vakspecialisten dat samen alle werkzaamheden dekt — je hoeft zelf niet te zoeken of te vergelijken." },
  { icon: Receipt, title: "Kostenindicatie per onderdeel", text: "Bandbreedtes op basis van opgegeven tarieven × hoeveelheden, getoetst aan je budget. Indicatie, geen offerte — dat staat er altijd bij." },
  { icon: CalendarRange, title: "Wanneer het team kan starten", text: "De datum waarop het hele team beschikbaar is, naast je gewenste start." },
  { icon: ShieldAlert, title: "Risico's vóór je offertes opvraagt", text: "De intake signaleert risico's en open vragen (asbest, draagconstructie, onduidelijke scope), zodat offertes vergelijkbaar worden." },
  { icon: FileText, title: "Van keuze naar offerteaanvraag", text: "Kies een team; de offerteaanvraag op één gestandaardiseerde scope staat klaar. Shortlist, offertes en tijdlijn per project." },
];

const LEVELS = [
  { icon: CircleDashed, title: "Zelf opgegeven", text: "Informatie die het bedrijf zelf heeft ingevuld, zoals tarieven, werkgebied en beschikbaarheid. Niet gecontroleerd." },
  { icon: BadgeCheck, title: "Bedrijfsgegevens gecontroleerd", text: "Administratieve controle van bijvoorbeeld de KvK-inschrijving. Zegt niets over de kwaliteit van het werk." },
  { icon: UserCheck, title: "Opdrachtgever bevestigd", text: "Een projectresultaat dat door de opdrachtgever is bevestigd." },
  { icon: FileCheck2, title: "Projectgegevens gecontroleerd", text: "Begroting, eindafrekening en opleverdata gecontroleerd aan de hand van projectdocumentatie." },
];

const FAQ = [
  {
    q: "Wat doet de AI precies?",
    a: "De AI leest je beschrijving en foto's en stelt een lijst werkzaamheden voor met hoeveelheden, risico's en open vragen. Jij controleert die. De AI noemt geen prijzen en kiest geen aannemers: het samenstellen en ordenen van teams gebeurt met vaste, controleerbare regels.",
  },
  {
    q: "Hoe worden de teams geordend?",
    a: `Per prioriteit op één criterium. Budget: laagste kostenindicatie uit opgegeven tarieven. Kwaliteit: de beoordeling van de zwakste schakel in het team (min. ${site.minSampleSize} beoordelingen per aannemer). Snelheid: de datum waarop het hele team beschikbaar is.`,
  },
  {
    q: "Waarom staat een team soms bij ‘niet gerangschikt’?",
    a: "Omdat er voor dat criterium te weinig gegevens zijn: geen passend tarief, te weinig beoordelingen of onbekende beschikbaarheid. Liever eerlijk ‘onbekend’ dan een misleidende plek in de ranglijst.",
  },
  {
    q: "Waar komen de gegevens over aannemers vandaan?",
    a: "Uit wat het bedrijf zelf opgeeft (tarieven, werkgebied, beschikbaarheid), administratieve controles door BouwCheck en projectresultaten die opdrachtgevers registreren. In deze bèta zijn alle aannemersprofielen fictieve demo-data.",
  },
  {
    q: "Kunnen aannemers betalen voor een plek in een voorstel?",
    a: "Nee. Teams worden uitsluitend samengesteld op vakgebied, werkgebied en het gekozen criterium. Verificatiestatussen en beoordelingen zijn niet te koop.",
  },
  {
    q: "Worden offerteaanvragen echt verstuurd?",
    a: "Alleen naar aannemers met een eigen BouwCheck-account; die zien de aanvraag in hun portaal. E-mailverzending is in deze bèta nog niet actief. Waar een aanvraag niet echt is verstuurd, staat dat er duidelijk bij.",
  },
];

export default async function HomePage() {
  const preview = await getPreview();
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
                <Link href="/projecten/nieuw">
                  {site.hero.primaryCta} <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#hoe-het-werkt">{site.hero.secondaryCta}</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-ink-500">Geen zoekwerk, geen totaalscores. Altijd zichtbaar waarop een voorstel is gebaseerd.</p>
          </div>
          <HeroPreview {...preview} />
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
          <p className="mt-3 max-w-2xl text-ink-300">Van projectomschrijving naar een samengesteld team, in drie stappen.</p>
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
                Start je project <ArrowRight aria-hidden />
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
              Je vertelt wat er moet gebeuren; BouwCheck levert wie het kan doen, geordend op wat voor jou het zwaarst weegt. Geen bedrijvengids, geen zelf vergelijken.
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
            <p className="mt-2 text-brand-100">Beschrijf je project en zie binnen enkele minuten welke teams het kunnen uitvoeren.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-white text-brand-900 hover:bg-brand-50">
              <Link href="/projecten/nieuw">Start een renovatieproject</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10">
              <Link href="/transparantie">Hoe wij selecteren</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

const PREVIEW_LABEL: Record<Priority, string> = { budget: "Budget", kwaliteit: "Kwaliteit", snelheid: "Snelheid" };

function HeroPreview({ project, best }: Awaited<ReturnType<typeof getPreview>>) {
  if (!project) {
    return (
      <div className="rounded-2xl border border-ink-200 bg-white p-8 text-sm text-ink-500 shadow-[var(--shadow-raised)]">
        Nog geen voorbeeldproject beschikbaar.
      </div>
    );
  }
  return (
    <figure className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-[var(--shadow-raised)]" aria-label="Voorbeeld van teamvoorstellen">
      <div className="flex items-center justify-between gap-2 border-b border-ink-100 bg-ink-50 px-4 py-2.5">
        <span className="truncate text-xs font-medium text-ink-600">Teamvoorstellen · {project.name}</span>
        {project.is_demo ? <DemoBadge compact /> : null}
      </div>
      <ul className="divide-y divide-ink-100">
        {best.map(({ priority, option }) => (
          <li key={priority} className="grid grid-cols-[88px_1fr] gap-3 px-4 py-3.5 sm:grid-cols-[100px_1fr_auto]">
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-700">{PREVIEW_LABEL[priority]}</span>
            {option ? (
              <>
                <span className="text-sm font-medium text-ink-950">
                  {option.members.map((m) => m.contractor.company_name).join(" + ")}
                  <span className="block text-xs font-normal text-ink-500">
                    {option.structure === "hoofdaannemer" ? "Hoofdaannemer" : `${option.members.length} vakspecialisten`}
                  </span>
                </span>
                <span className="col-span-2 flex gap-4 text-xs text-ink-600 sm:col-span-1 sm:flex-col sm:gap-0.5 sm:text-right">
                  <span className="tabular font-semibold text-ink-900">
                    {formatEuro(option.cost.min)} – {formatEuro(option.cost.max)}
                  </span>
                  <span>vanaf {option.start ? formatDate(option.start) : "onbekend"}</span>
                  <span>{option.qualitySufficient && option.weakest ? `zwakste ${formatNumber(option.weakest.quality.rating, 1)}/5` : "kwaliteit: te weinig data"}</span>
                </span>
              </>
            ) : (
              <span className="text-sm text-ink-500">Onvoldoende gegevens voor dit criterium</span>
            )}
          </li>
        ))}
      </ul>
      <figcaption className="border-t border-ink-100 px-4 py-2.5 text-xs text-ink-500">
        Live berekend uit de demo-database. Bedragen excl. btw, indicatief op basis van opgegeven tarieven. Per prioriteit het best passende team.
      </figcaption>
    </figure>
  );
}
