import Link from "next/link";
import { ArrowRight, Check, FileQuestion, TrendingUp, CalendarX2, Handshake, Scale, Sparkles, Users, ClipboardList, CheckCircle2, Receipt, CalendarRange, ShieldAlert, ShieldCheck, FileText, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { site } from "@/config/site";
import { homepage, OFFERTECHECK_CTA, VERZONNEN_VAKMENSEN, VOORBEELD_LABEL } from "@/content/homepage";
import { env } from "@/lib/env";
import { listPublishedCases, type CaseRow } from "@/lib/data/founding";
import { CheckExample } from "@/components/marketing/check-example";
import { AanbodKaarten } from "@/components/marketing/aanbod-kaarten";
import { sqlOne } from "@/lib/db";
import { getScope } from "@/lib/data/scope";
import { proposalsFor } from "@/lib/data/teams";
import { formatDate, formatEuro, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
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
  const { proposals } = await proposalsFor(
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
  { icon: CheckCircle2, title: "Ontvang teams op budget, kwaliteit en snelheid", text: "BouwCheck stelt teams samen uit aannemers, zzp-vakmensen en klussers in jouw regio en ordent ze per prioriteit — met de onderbouwing en wat er nog ontbreekt." },
];

const BENEFITS = [
  { icon: Users, title: "Wie wat kan doen, al samengesteld", text: "Een hoofdaannemer, of een team van vakspecialisten en klussers dat samen alle werkzaamheden dekt — je hoeft zelf niet te zoeken of te vergelijken." },
  { icon: Receipt, title: "Kostenindicatie per onderdeel", text: "Bandbreedtes op basis van opgegeven tarieven × hoeveelheden, getoetst aan je budget. Indicatie, geen offerte — dat staat er altijd bij." },
  { icon: CalendarRange, title: "Wanneer het team kan starten", text: "De datum waarop het hele team beschikbaar is, naast je gewenste start." },
  { icon: ShieldAlert, title: "Risico's vóór je offertes opvraagt", text: "De intake signaleert risico's en open vragen (asbest, draagconstructie, onduidelijke scope), zodat offertes vergelijkbaar worden." },
  { icon: FileText, title: "Van keuze naar offerteaanvraag", text: "Kies een team; de offerteaanvraag op één gestandaardiseerde scope staat klaar. Shortlist, offertes en tijdlijn per project." },
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
    q: "Waar komen de gegevens over uitvoerders vandaan?",
    a: "Uit wat de uitvoerder zelf opgeeft (tarieven, werkgebied, beschikbaarheid), administratieve controles door BouwCheck, projectresultaten die opdrachtgevers registreren en openbare registers (faillissementen, KvK, rechtspraak), gecontroleerd door een AI-agent en beoordeeld door BouwCheck. Zolang er verzonnen voorbeeldprofielen tussen staan, zie je dat bij het profiel.",
  },
  {
    q: "Kunnen aannemers betalen voor een plek in een voorstel?",
    a: "Nee. Teams worden uitsluitend samengesteld op vakgebied, werkgebied en het gekozen criterium. Verificatiestatussen en beoordelingen zijn niet te koop.",
  },
  {
    q: "Worden offerteaanvragen echt verstuurd?",
    a: "Alleen naar aannemers met een eigen BouwCheck-account. Zij zien de aanvraag in hun portaal. Is een aanvraag niet verstuurd, dan staat dat erbij.",
  },
];

export default async function HomePage() {
  if (env.features.offertecheck) return <OffertecheckHome />;
  const preview = await getPreview();
  return (
    <>
      {/* Hero */}
      <section className="border-b border-ink-100 bg-gradient-to-b from-ink-50/80 to-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:pb-24 lg:pt-20">
          <div>
            <Badge tone="neutral" className="mb-5">
              Voor vastgoedondernemers en projectontwikkelaars
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

      <ProblemsSection />

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

      <BenefitsSection />

      <ContractorsSection />

      <FaqSection items={FAQ} />

      {/* CTA */}
      <section className="bg-brand-800 text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Start met je volgende project</h2>
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

function ProblemsSection() {
  return (
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
    
      
  );
}

function BenefitsSection() {
  return (
      <section id="voor-vastgoedondernemers" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-ink-950">Gebouwd voor vastgoedondernemers en projectontwikkelaars</h2>
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
    
      
  );
}

function ContractorsSection() {
  return (
      <section id="voor-vakmensen" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="flex flex-col gap-6 rounded-2xl border border-ink-200 p-8 md:flex-row md:items-center md:justify-between md:p-10">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-ink-950">Aannemer, zzp-vakman of klusser?</h2>
            <p className="mt-2 text-ink-600">
              BouwCheck is niet alleen voor aannemersbedrijven: ook zelfstandige vakmensen en klussers worden in teams opgenomen. Maak een profiel aan, vul tarieven,
              werkgebied en beschikbaarheid in en ontvang offerteaanvragen van vastgoedondernemers en projectontwikkelaars. Nieuwe profielen starten als &lsquo;Zelf opgegeven&rsquo;; verificatie vraag je aan in het portaal.
            </p>
          </div>
          <Button asChild variant="dark" size="lg">
            <Link href="/registreren?rol=aannemer">Aanmelden als vakman</Link>
          </Button>
        </div>
      </section>
    
      
  );
}

function FaqSection({ items }: { items: { q: string; a: string }[] }) {
  return (
      <section className="border-t border-ink-100">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-ink-950">Veelgestelde vragen</h2>
            <p className="mt-3 text-ink-600">
              Staat je vraag er niet bij? <Link href="/contact" className="text-brand-700 underline">Neem contact op</Link>.
            </p>
          </div>
          <div className="divide-y divide-ink-200 border-y border-ink-200">
            {items.map((f) => (
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
    
      
  );
}

/** Homepage rond de Offertecheck (FEATURE_OFFERTECHECK). Alle teksten staan in src/content/homepage.ts. */
async function OffertecheckHome() {
  const cases = await listPublishedCases();
  const { hero, voorbeeld, herkenning, aanbod, vertrouwen, eersteKlanten, vakmensen, vragen, slot } = homepage;
  return (
    <>
      <section className="border-b border-ink-100 bg-gradient-to-b from-ink-50/80 to-white">
        <div className="mx-auto max-w-3xl px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-14 lg:pb-20 lg:pt-20">
          <p className="mb-3 text-sm font-semibold text-brand-800 sm:text-base">{hero.label}</p>
          <h1 className="text-3xl font-semibold leading-[1.15] tracking-tight text-ink-950 sm:text-5xl sm:leading-[1.1]">{hero.titel}</h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-700">{hero.intro}</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-lg leading-relaxed text-ink-700">
            {hero.punten.map((p) => (
              <li key={p} className="flex gap-2.5">
                <span className="mt-1.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white" aria-hidden>
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-lg leading-relaxed text-ink-700">{hero.slot}</p>
          <OffertecheckButton className="mt-6" />
        </div>
      </section>

      <section id="hoe-het-werkt" className="mx-auto max-w-4xl scroll-mt-20 px-4 pt-14 sm:px-6 sm:pt-20" aria-labelledby="voorbeeld-titel">
        <h2 id="voorbeeld-titel" className="text-2xl font-semibold tracking-tight text-ink-950 sm:text-3xl">
          {voorbeeld.titel}
        </h2>
        <p className="mt-3 max-w-2xl text-ink-700">{voorbeeld.tekst}</p>
        <div className="mt-6">
          <CheckExample />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20" aria-labelledby="herkenning-titel">
        <h2 id="herkenning-titel" className="text-2xl font-semibold tracking-tight text-ink-950 sm:text-3xl">
          {herkenning.titel}
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {herkenning.punten.map((p) => (
            <li key={p.kop} className="rounded-xl border border-ink-200 bg-white p-5 text-ink-700">
              <strong className="block font-semibold text-ink-950">{p.kop}</strong> {p.tekst}
            </li>
          ))}
        </ul>
      </section>

      <section id="aanbod" className="scroll-mt-20 border-y border-ink-100 bg-ink-50" aria-labelledby="aanbod-titel">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <h2 id="aanbod-titel" className="text-2xl font-semibold tracking-tight text-ink-950 sm:text-3xl">
            {aanbod.titel}
          </h2>
          <AanbodKaarten className="mt-8" />
          <p className="mt-6 text-ink-700">{aanbod.onderKaarten}</p>
          <OffertecheckButton className="mt-6" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20" aria-labelledby="vertrouwen-titel">
        <h2 id="vertrouwen-titel" className="text-2xl font-semibold tracking-tight text-ink-950 sm:text-3xl">
          {vertrouwen.titel}
        </h2>
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {vertrouwen.punten.map((p) => (
            <li key={p} className="flex gap-3 text-ink-700">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <Link href={vertrouwen.link.href} className="mt-6 inline-flex items-center gap-1 font-medium text-brand-800 hover:underline">
          {vertrouwen.link.label} <ArrowRight className="size-4" aria-hidden />
        </Link>
      </section>

      <FounderStory />
      {cases.length ? <CasesSection cases={cases} /> : null}

      {env.features.foundingMembers ? (
        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 sm:pb-20" aria-labelledby="eerste-klanten-titel">
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

      <section id="voor-vakmensen" className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-14 sm:px-6 sm:pb-20" aria-labelledby="vakmensen-titel">
        <div className="flex flex-col gap-6 rounded-2xl border border-ink-200 p-6 sm:p-8 md:flex-row md:items-center md:justify-between md:p-10">
          <div className="max-w-2xl">
            <h2 id="vakmensen-titel" className="text-2xl font-semibold tracking-tight text-ink-950">
              {vakmensen.titel}
            </h2>
            <p className="mt-2 text-ink-700">{vakmensen.tekst}</p>
          </div>
          <Button asChild variant="dark" size="lg">
            <Link href={vakmensen.knop.href}>{vakmensen.knop.label}</Link>
          </Button>
        </div>
      </section>

      <section className="border-t border-ink-100" aria-labelledby="vragen-titel">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1fr_2fr]">
          <div>
            <h2 id="vragen-titel" className="text-2xl font-semibold tracking-tight text-ink-950 sm:text-3xl">
              {vragen.titel}
            </h2>
            <p className="mt-3 text-ink-700">
              {vragen.link.tekst}{" "}
              <Link href={vragen.link.href} className="font-medium text-brand-800 underline">
                {vragen.link.label}
              </Link>
            </p>
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

      <section className="bg-brand-800 text-white" aria-labelledby="slot-titel">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-14 sm:px-6 sm:py-16 md:flex-row md:items-center md:justify-between">
          <h2 id="slot-titel" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {slot.titel}
          </h2>
          <OffertecheckButton className="bg-white text-brand-900 hover:bg-brand-50" />
        </div>
      </section>
    </>
  );
}

/** De primaire knop naar het uploadformulier van de Offertecheck. */
function OffertecheckButton({ className }: { className?: string }) {
  return (
    <Button asChild size="lg" className={cn("w-full sm:w-auto", className)}>
      <Link href={OFFERTECHECK_CTA.href}>
        {OFFERTECHECK_CTA.label} <ArrowRight aria-hidden />
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

function CasesSection({ cases }: { cases: CaseRow[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <h2 className="text-3xl font-semibold tracking-tight text-ink-950">Uit de praktijk</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cases.map((c) => (
          <article key={c.id} className="rounded-xl border border-ink-200 bg-white p-5">
            <h3 className="font-semibold text-ink-950">{c.titel}</h3>
            {c.regio ? <p className="text-xs text-ink-500">{c.regio}</p> : null}
            <p className="mt-2 text-sm leading-relaxed text-ink-600">{c.samenvatting}</p>
            {c.resultaat ? <p className="mt-3 text-sm font-semibold text-brand-800">{c.resultaat}</p> : null}
          </article>
        ))}
      </div>
    </section>
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
  const fictief = best.some(({ option }) => option?.members.some((m) => m.contractor.is_demo));
  return (
    <figure className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-[var(--shadow-raised)]" aria-label="Voorbeeld van teamvoorstellen">
      <div className="flex items-center justify-between gap-2 border-b border-ink-100 bg-ink-50 px-4 py-2.5">
        <span className="truncate text-xs font-medium text-ink-600">Teamvoorstellen · {project.name}</span>
        {project.is_demo || fictief ? <Badge tone="demo">{VOORBEELD_LABEL}</Badge> : null}
      </div>
      <ul className="divide-y divide-ink-100">
        {best.map(({ priority, option }) => (
          <li key={priority} className="flex flex-col gap-1.5 px-4 py-3.5 sm:grid sm:grid-cols-[1fr_auto] sm:gap-x-4">
            <span className="sm:col-span-2">
              <Badge tone="positive">{PREVIEW_LABEL[priority]}</Badge>
            </span>
            {option ? (
              <>
                <span className="text-sm font-medium text-ink-950">
                  {option.members.map((m) => m.contractor.company_name).join(" + ")}
                  <span className="block text-xs font-normal text-ink-500">
                    {option.structure === "hoofdaannemer" ? "Hoofdaannemer" : `${option.members.length} vakspecialisten`}
                  </span>
                </span>
                <span className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-600 sm:flex-col sm:text-right">
                  <span className="tabular font-semibold text-ink-900">
                    {formatEuro(option.cost.min)} – {formatEuro(option.cost.max)} excl. btw
                  </span>
                  <span>vanaf {option.start ? formatDate(option.start) : "onbekend"}</span>
                  <span>
                    {option.qualitySufficient && option.weakest ? `zwakste schakel: ${formatNumber(option.weakest.quality.rating, 1)}/5` : "kwaliteit: te weinig gegevens"}
                  </span>
                </span>
              </>
            ) : (
              <span className="text-sm text-ink-500">Te weinig gegevens voor dit criterium</span>
            )}
          </li>
        ))}
      </ul>
      <figcaption className="space-y-1 border-t border-ink-100 px-4 py-2.5 text-xs text-ink-500">
        {fictief ? <p className="font-medium text-demo-700">{VERZONNEN_VAKMENSEN}</p> : null}
        <p>Per prioriteit het best passende team. Bedragen excl. btw, op basis van de tarieven die vakmensen zelf opgeven.</p>
      </figcaption>
    </figure>
  );
}
