import type { Metadata } from "next";
import Link from "next/link";
import { Columns3, X, Plus, FileText, Info, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label, Select } from "@/components/ui/form-controls";
import { EmptyState, Notice, PageHeader } from "@/components/ui/misc";
import { AvailabilityBadge, DemoBadge, PriceLevelLabel, VerificationBadge } from "@/components/domain/badges";
import { MetricValue } from "@/components/domain/metric";
import { SyncCompare } from "@/components/compare/sync-compare";
import { SaveComparisonForm } from "@/components/compare/save-comparison-form";
import { ShortlistButton } from "@/components/compare/shortlist-button";
import { getContractorsByIds, getRatesForContractors, listContractorOptions, type ContractorSummary, type ContractorRate } from "@/lib/data/contractors";
import { getLatestQuotes, type Quote } from "@/lib/data/records";
import { getProjectForUser, getShortlist, listProjects, type Project } from "@/lib/data/projects";
import { getCurrentUser } from "@/lib/auth/session";
import { analyzeQuotes, parseCompareIds } from "@/lib/domain/comparison";
import { AVAILABILITY_ORDER, PRICE_LEVEL_ORDER, PRICE_TYPES, RATE_UNITS, specialtyName } from "@/lib/domain/constants";
import { formatDate, formatDays, formatEuro, formatMoney } from "@/lib/format";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Aannemers vergelijken" };

type SP = Record<string, string | string[] | undefined>;
const SORTS = [
  { value: "", label: "Volgorde van selectie" },
  { value: "prijs", label: "Laagste prijs" },
  { value: "doorlooptijd", label: "Kortste doorlooptijd" },
  { value: "prestaties", label: "Beste geregistreerde prestaties" },
  { value: "compleetheid", label: "Meest complete projectdata" },
];

type Column = {
  c: ContractorSummary;
  quote: Quote | null;
  rates: (ContractorRate & { contractor_id: string })[];
  missing: string[];
  matchedSpecialties: string[];
  missingSpecialties: string[];
  regionMatch: boolean | null;
};

function missingData(col: Omit<Column, "missing">, project: Project | null): string[] {
  const m = col.c.metrics;
  const out: string[] = [];
  if (project && !col.quote) out.push("Geen offerte of prijsopgave voor dit project");
  if (col.rates.length === 0) out.push("Geen indicatieve tarieven");
  if (col.c.availability_status === "onbekend") out.push("Beschikbaarheid onbekend");
  if (!col.c.verification.businessVerified) out.push("Bedrijfsgegevens niet gecontroleerd");
  if (m.onTime.status !== "ok") out.push(`Op-tijdpercentage (${m.onTime.n}/${m.onTime.required} projecten)`);
  if (m.budgetDeviation.status !== "ok") out.push(`Budgetafwijking (${m.budgetDeviation.n}/${m.budgetDeviation.required} projecten)`);
  if (m.rating.status !== "ok") out.push(`Beoordeling (${m.rating.n}/${m.rating.required} beoordelingen)`);
  if (m.verifiedProjects === 0) out.push("Geen projecten met gecontroleerde documentatie");
  if (m.isStale) out.push("Projectgegevens verouderd");
  return out;
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const isFlipper = user && user.role !== "aannemer";
  let ids = parseCompareIds(sp.ids, site.maxCompare);
  const add = typeof sp.toevoegen === "string" ? parseCompareIds(sp.toevoegen, 1)[0] : undefined;
  if (add && !ids.includes(add) && ids.length < site.maxCompare) ids = [...ids, add];
  const projectId = typeof sp.project === "string" ? sp.project : undefined;
  const sort = typeof sp.sort === "string" ? sp.sort : "";

  const [contractors, options, projects] = await Promise.all([
    getContractorsByIds(ids),
    listContractorOptions(),
    isFlipper ? listProjects(user.id) : Promise.resolve([]),
  ]);
  const project = isFlipper && projectId ? await getProjectForUser(projectId, user) : null;
  ids = contractors.map((c) => c.id);

  const [quotes, rates, shortlist] = await Promise.all([
    project ? getLatestQuotes(project.id, ids) : Promise.resolve([]),
    getRatesForContractors(ids),
    project ? getShortlist(project.id) : Promise.resolve([]),
  ]);
  const shortlisted = new Set(shortlist.map((s) => s.contractor_id));
  const relevantSpecs = project?.specialty_ids ?? [];

  let columns: Column[] = contractors.map((c) => {
    const quote = quotes.find((q) => q.contractor_id === c.id) ?? null;
    const own = rates.filter((r) => r.contractor_id === c.id);
    const relevant = relevantSpecs.length ? own.filter((r) => relevantSpecs.includes(r.specialty_id)) : own;
    const specIds = c.specialties.map((s) => s.id);
    const base = {
      c,
      quote,
      rates: relevant,
      matchedSpecialties: relevantSpecs.filter((s) => specIds.includes(s) || specIds.includes("hoofdaannemer")),
      missingSpecialties: relevantSpecs.filter((s) => !specIds.includes(s) && !specIds.includes("hoofdaannemer")),
      regionMatch: project?.province ? c.areas.includes(project.province) : null,
    };
    return { ...base, missing: missingData(base, project) };
  });

  const analysis = analyzeQuotes(
    ids,
    quotes.map((q) => ({
      contractorId: q.contractor_id,
      contractorName: q.company_name,
      price_type: q.price_type,
      amount: q.amount,
      vat_included: q.vat_included,
      materials_included: q.materials_included,
      scope_specialty_ids: q.scope_specialty_ids,
      exclusions: q.exclusions,
      estimated_duration_days: q.estimated_duration_days,
    })),
  );

  // Sortering van kolommen; aannemers zonder gegevens voor het criterium gaan achteraan.
  const last = Number.POSITIVE_INFINITY;
  if (sort === "prijs") {
    columns = [...columns].sort((a, b) =>
      analysis.comparable ? (a.quote?.amount ?? last) - (b.quote?.amount ?? last) : PRICE_LEVEL_ORDER[a.c.price_level] - PRICE_LEVEL_ORDER[b.c.price_level],
    );
  } else if (sort === "doorlooptijd") {
    const dur = (x: Column) => x.quote?.estimated_duration_days ?? (x.c.metrics.avgDurationDays.status === "ok" ? x.c.metrics.avgDurationDays.value! : last);
    columns = [...columns].sort((a, b) => dur(a) - dur(b));
  } else if (sort === "prestaties") {
    const perf = (x: Column) => (x.c.metrics.onTime.status === "ok" ? x.c.metrics.onTime.value! : -1);
    columns = [...columns].sort((a, b) => perf(b) - perf(a) || b.c.metrics.verifiedProjects - a.c.metrics.verifiedProjects);
  } else if (sort === "compleetheid") {
    columns = [...columns].sort((a, b) => b.c.completeness - a.c.completeness);
  }

  // Subtiele markeringen — alleen waar gegevens werkelijk vergelijkbaar zijn.
  const okOnTime = columns.filter((x) => x.c.metrics.onTime.status === "ok");
  const bestOnTime = okOnTime.length >= 2 ? okOnTime.reduce((a, b) => (b.c.metrics.onTime.value! > a.c.metrics.onTime.value! ? b : a)) : null;
  const okDev = columns.filter((x) => x.c.metrics.budgetDeviation.status === "ok");
  const bestDev = okDev.length >= 2 ? okDev.reduce((a, b) => (b.c.metrics.budgetDeviation.value! < a.c.metrics.budgetDeviation.value! ? b : a)) : null;
  const mostVerified = columns.length >= 2 ? columns.reduce((a, b) => (b.c.metrics.verifiedProjects > a.c.metrics.verifiedProjects ? b : a)) : null;
  const earliest = columns.filter((x) => x.c.availability_status !== "onbekend");
  const soonest = earliest.length >= 2 ? earliest.reduce((a, b) => (AVAILABILITY_ORDER[b.c.availability_status] < AVAILABILITY_ORDER[a.c.availability_status] ? b : a)) : null;

  const hrefWith = (next: Partial<{ ids: string[]; project: string | null; sort: string }>) => {
    const p = new URLSearchParams();
    const nextIds = next.ids ?? ids;
    if (nextIds.length) p.set("ids", nextIds.join(","));
    const pr = next.project === undefined ? project?.id : next.project;
    if (pr) p.set("project", pr);
    const s = next.sort ?? sort;
    if (s) p.set("sort", s);
    return `/vergelijken?${p}`;
  };
  const available = options.filter((o) => !ids.includes(o.id));
  const quoteRequestHref = `/offerteaanvragen/nieuw?aannemers=${ids.join(",")}${project ? `&project=${project.id}` : ""}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-16 sm:px-6">
      <SyncCompare items={contractors.map((c) => ({ id: c.id, name: c.company_name }))} />
      <PageHeader
        eyebrow="Vergelijking"
        title={project ? `Vergelijking voor ${project.name}` : "Aannemers naast elkaar"}
        description="Vergelijk twee tot vier aannemers. Bij iedere metriek staat hoe die is berekend en op hoeveel projecten hij is gebaseerd."
        actions={
          contractors.length >= 2 ? (
            <Button asChild>
              <Link href={user ? quoteRequestHref : `/inloggen?next=${encodeURIComponent(quoteRequestHref)}`}>
                <FileText aria-hidden /> Offerteaanvraag starten
              </Link>
            </Button>
          ) : null
        }
      />

      {/* Bediening */}
      <div className="mt-6 grid gap-4 rounded-[var(--radius-card)] border border-ink-200 bg-ink-50/60 p-4 md:grid-cols-3">
        <form method="get" action="/vergelijken" className="flex flex-col gap-1.5">
          <input type="hidden" name="ids" value={ids.join(",")} />
          {project ? <input type="hidden" name="project" value={project.id} /> : null}
          {sort ? <input type="hidden" name="sort" value={sort} /> : null}
          <Label htmlFor="toevoegen">Aannemer toevoegen</Label>
          <div className="flex gap-2">
            <Select id="toevoegen" name="toevoegen" disabled={ids.length >= site.maxCompare} defaultValue="">
              <option value="" disabled>
                {ids.length >= site.maxCompare ? `Maximaal ${site.maxCompare} aannemers` : "Kies een aannemer…"}
              </option>
              {available.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.company_name}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="outline" disabled={ids.length >= site.maxCompare} aria-label="Toevoegen aan vergelijking">
              <Plus aria-hidden />
            </Button>
          </div>
        </form>
        <form method="get" action="/vergelijken" className="flex flex-col gap-1.5">
          <input type="hidden" name="ids" value={ids.join(",")} />
          {sort ? <input type="hidden" name="sort" value={sort} /> : null}
          <Label htmlFor="project">Vergelijk voor project</Label>
          {isFlipper ? (
            <div className="flex gap-2">
              <Select id="project" name="project" defaultValue={project?.id ?? ""}>
                <option value="">Geen project (alleen profielgegevens)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <Button type="submit" variant="outline">
                Kies
              </Button>
            </div>
          ) : (
            <p className="text-sm text-ink-500">
              <Link href={`/inloggen?next=${encodeURIComponent(hrefWith({}))}`} className="text-brand-700 underline">
                Log in
              </Link>{" "}
              om offertes uit je eigen project mee te vergelijken.
            </p>
          )}
        </form>
        <form method="get" action="/vergelijken" className="flex flex-col gap-1.5">
          <input type="hidden" name="ids" value={ids.join(",")} />
          {project ? <input type="hidden" name="project" value={project.id} /> : null}
          <Label htmlFor="sort">Sorteer kolommen op</Label>
          <div className="flex gap-2">
            <Select id="sort" name="sort" defaultValue={sort}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="outline">
              Sorteer
            </Button>
          </div>
        </form>
      </div>

      {contractors.length < 2 ? (
        <EmptyState
          className="mt-8"
          icon={Columns3}
          title={contractors.length === 0 ? "Nog geen aannemers geselecteerd" : "Kies nog minimaal één aannemer"}
          description="Voeg hierboven aannemers toe, of gebruik de knop ‘Vergelijken’ in de aannemersdatabase. Je kunt 2 tot 4 aannemers vergelijken."
          action={
            <Button asChild variant="outline">
              <Link href="/aannemers">Naar de aannemersdatabase</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-3">
            <Notice tone="info" title="Er is niet één beste aannemer">
              De beste keuze hangt af van je project: wat weegt zwaarder — prijs, startdatum of aantoonbare prestaties? BouwCheck berekent daarom geen totaalscore.
              Markeringen gelden alleen voor één criterium en alleen als de gegevens vergelijkbaar zijn.
            </Notice>
            {project && analysis.warnings.length ? (
              <Notice tone="warning" title={analysis.comparable ? "Let op bij het vergelijken van bedragen" : "Bedragen zijn niet één-op-één vergelijkbaar"}>
                <ul className="list-disc space-y-1 pl-4">
                  {analysis.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </Notice>
            ) : null}
            {!project ? (
              <Notice tone="info">Zonder project worden alleen indicatieve tarieven getoond. Kies een project om offertes en projectgeschiktheid mee te vergelijken.</Notice>
            ) : null}
          </div>

          {/* Vergelijkingstabel */}
          <div className="relative mt-6 overflow-x-auto rounded-[var(--radius-card)] border border-ink-200 bg-white" role="region" aria-label="Vergelijkingstabel" tabIndex={0}>
            <table className="w-full border-collapse text-sm" style={{ minWidth: 150 + columns.length * 210 }}>
              <caption className="sr-only">Vergelijking van {columns.length} aannemers</caption>
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 z-10 w-[140px] border-b border-r border-ink-200 bg-ink-50 px-3 py-4 sm:w-[220px] sm:px-4 text-left align-bottom text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Kenmerk
                  </th>
                  {columns.map((x) => (
                    <th key={x.c.id} scope="col" className="w-[230px] border-b border-ink-200 bg-ink-50 px-4 py-4 text-left align-top">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/aannemers/${x.c.slug}`} className="font-semibold leading-snug text-ink-950 hover:underline">
                          {x.c.company_name}
                        </Link>
                        <Link
                          href={hrefWith({ ids: ids.filter((id) => id !== x.c.id) })}
                          className="rounded p-1 text-ink-400 hover:bg-ink-200 hover:text-ink-900"
                          aria-label={`${x.c.company_name} verwijderen uit vergelijking`}
                        >
                          <X className="size-4" />
                        </Link>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">{x.c.is_demo ? <DemoBadge compact /> : null}</div>
                      {project && isFlipper ? (
                        <div className="mt-2">
                          {shortlisted.has(x.c.id) ? (
                            <Badge tone="positive">Op shortlist van project</Badge>
                          ) : (
                            <ShortlistButton projectId={project.id} contractorId={x.c.id} />
                          )}
                        </div>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <Group label="Algemeen" span={columns.length} />
                <Row label="Vakgebieden" help="Zelf opgegeven door het bedrijf.">
                  {columns.map((x) => (
                    <Cell key={x.c.id}>{x.c.specialties.map((s) => s.name).join(", ")}</Cell>
                  ))}
                </Row>
                {project ? (
                  <Row label="Projectgeschiktheid" help={`Vakgebieden en regio van je project (${project.province ?? "regio onbekend"}). Een hoofdaannemer dekt in principe alle vakgebieden (eventueel via onderaannemers).`}>
                    {columns.map((x) => (
                      <Cell key={x.c.id}>
                        <p className={x.missingSpecialties.length ? "text-warn-700" : "text-brand-800"}>
                          {x.matchedSpecialties.length}/{relevantSpecs.length} vakgebieden
                        </p>
                        {x.missingSpecialties.length ? <p className="text-xs text-ink-500">Ontbreekt: {x.missingSpecialties.map(specialtyName).join(", ")}</p> : null}
                        <p className="mt-1 text-xs text-ink-600">{x.regionMatch === null ? "Regio onbekend" : x.regionMatch ? "Werkt in jouw regio" : "Werkt niet in jouw regio"}</p>
                      </Cell>
                    ))}
                  </Row>
                ) : null}
                <Row label="Werkgebied" help="Provincies waarin het bedrijf werkt (zelf opgegeven).">
                  {columns.map((x) => (
                    <Cell key={x.c.id}>{x.c.areas.join(", ")}</Cell>
                  ))}
                </Row>
                <Row label="Verificatiestatus" help="Afgeleid uit goedgekeurde verificaties. Bij demo-data fictief.">
                  {columns.map((x) => (
                    <Cell key={x.c.id}>
                      <div className="flex flex-col items-start gap-1">
                        {x.c.verification.levels.map((l) => (
                          <VerificationBadge key={l} level={l} isDemo={x.c.is_demo} />
                        ))}
                      </div>
                    </Cell>
                  ))}
                </Row>

                <Group label="Prijs" span={columns.length} />
                {project ? (
                  <Row label="Bedrag voor dit project" help="Meest recente bedrag dat je voor dit project hebt vastgelegd. Indicatief ≠ offerte ≠ overeengekomen prijs.">
                    {columns.map((x) => (
                      <Cell key={x.c.id} highlight={analysis.lowestPriceContractorId === x.c.id ? "Laagste bedrag" : undefined}>
                        {x.quote ? (
                          <>
                            <p className="tabular text-base font-semibold text-ink-950">{formatMoney(x.quote.amount, x.quote.vat_included)}</p>
                            <Badge tone={x.quote.price_type === "indicatief" ? "muted" : x.quote.price_type === "offerte" ? "info" : "positive"} className="mt-1">
                              {PRICE_TYPES[x.quote.price_type].label}
                            </Badge>
                            {x.quote.validity_date ? <p className="mt-1 text-xs text-ink-500">Geldig tot {formatDate(x.quote.validity_date)}</p> : null}
                          </>
                        ) : (
                          <Missing>Nog geen bedrag</Missing>
                        )}
                      </Cell>
                    ))}
                  </Row>
                ) : null}
                <Row label="Indicatieve prijs per werkzaamheid" help={`Zelf opgegeven richtprijzen${project ? " voor de vakgebieden van je project" : ""}. Eenheden zoals vermeld.`}>
                  {columns.map((x) => (
                    <Cell key={x.c.id}>
                      {x.rates.length ? (
                        <ul className="space-y-1.5">
                          {x.rates.slice(0, 4).map((r) => (
                            <li key={r.id} className="text-xs">
                              <span className="text-ink-600">{r.description}</span>
                              <span className="tabular block font-medium text-ink-900">
                                {formatEuro(r.price_min)}–{formatEuro(r.price_max)} {RATE_UNITS[r.unit as keyof typeof RATE_UNITS]}, {r.vat_included ? "incl." : "excl."} btw
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <Missing>Geen tarieven opgegeven</Missing>
                      )}
                      <p className="mt-2">
                        <PriceLevelLabel level={x.c.price_level} />
                      </p>
                    </Cell>
                  ))}
                </Row>
                {project ? (
                  <>
                    <Row label="Inbegrepen werkzaamheden" help="Scope van het vastgelegde bedrag.">
                      {columns.map((x) => (
                        <Cell key={x.c.id}>
                          {x.quote ? (
                            <>
                              <p className="text-xs font-medium text-ink-800">{x.quote.scope_specialty_ids.map(specialtyName).join(", ")}</p>
                              <p className="mt-1 text-xs text-ink-600">{x.quote.inclusions ?? x.quote.scope_description}</p>
                            </>
                          ) : (
                            <Missing>Onbekend</Missing>
                          )}
                        </Cell>
                      ))}
                    </Row>
                    <Row label="Uitgesloten werkzaamheden" help="Expliciet niet in het bedrag opgenomen.">
                      {columns.map((x) => (
                        <Cell key={x.c.id}>
                          {x.quote ? x.quote.exclusions ? <p className="text-xs text-warn-700">{x.quote.exclusions}</p> : <p className="text-xs text-ink-600">Geen uitsluitingen vermeld</p> : <Missing>Onbekend</Missing>}
                        </Cell>
                      ))}
                    </Row>
                    <Row label="Materiaal inbegrepen" help="Volgens het vastgelegde bedrag.">
                      {columns.map((x) => (
                        <Cell key={x.c.id}>{x.quote ? x.quote.materials_included === null ? <Missing>Onbekend</Missing> : x.quote.materials_included ? "Ja" : "Nee" : <Missing>Onbekend</Missing>}</Cell>
                      ))}
                    </Row>
                  </>
                ) : null}

                <Group label="Planning" span={columns.length} />
                <Row label="Beschikbaarheid" help="Zelf opgegeven; zie datum van laatste update.">
                  {columns.map((x) => (
                    <Cell key={x.c.id} highlight={soonest?.c.id === x.c.id ? "Eerst beschikbaar" : undefined}>
                      <AvailabilityBadge status={x.c.availability_status} from={x.c.available_from} />
                      <p className="mt-1 text-xs text-ink-500">Bijgewerkt: {formatDate(x.c.availability_updated_at)}</p>
                    </Cell>
                  ))}
                </Row>
                <Row label="Verwachte startdatum" help="Uit de offerte; anders de opgegeven beschikbaarheidsdatum.">
                  {columns.map((x) => (
                    <Cell key={x.c.id}>
                      {x.quote?.earliest_start_date ? (
                        <>
                          {formatDate(x.quote.earliest_start_date)}
                          <span className="block text-xs text-ink-500">volgens offerte</span>
                        </>
                      ) : x.c.available_from ? (
                        <>
                          {formatDate(x.c.available_from)}
                          <span className="block text-xs text-ink-500">volgens profiel</span>
                        </>
                      ) : x.c.availability_status === "direct" ? (
                        "Direct"
                      ) : (
                        <Missing>Onbekend</Missing>
                      )}
                    </Cell>
                  ))}
                </Row>
                <Row label="Verwachte doorlooptijd" help="Uit de offerte (kalenderdagen). Ter referentie: historische gemiddelde doorlooptijd uit projectresultaten.">
                  {columns.map((x) => (
                    <Cell key={x.c.id} highlight={project && analysis.shortestDurationContractorId === x.c.id ? "Kortste doorlooptijd" : undefined}>
                      {x.quote?.estimated_duration_days ? <p className="tabular font-medium text-ink-900">{formatDays(x.quote.estimated_duration_days)}</p> : <Missing>Niet opgegeven</Missing>}
                      <p className="mt-1 text-xs text-ink-500">
                        Historisch: <MetricValue metric={x.c.metrics.avgDurationDays} kind="days" compact className="text-xs" />
                      </p>
                    </Cell>
                  ))}
                </Row>

                <Group label="Geregistreerde prestaties" span={columns.length} />
                <Row label="Geregistreerde projecten" help="Goedgekeurde, niet-betwiste projectresultaten op BouwCheck.">
                  {columns.map((x) => (
                    <Cell key={x.c.id}>
                      <span className="tabular font-semibold text-ink-950">{x.c.metrics.registeredProjects}</span>
                    </Cell>
                  ))}
                </Row>
                <Row label="Gecontroleerde projecten" help="Projectresultaten gecontroleerd met documentatie (offerte, eindfactuur, opleverdatum).">
                  {columns.map((x) => (
                    <Cell key={x.c.id} highlight={mostVerified?.c.id === x.c.id && x.c.metrics.verifiedProjects > 0 ? "Meeste gecontroleerd" : undefined}>
                      <span className="tabular font-semibold text-ink-950">{x.c.metrics.verifiedProjects}</span>
                      <span className="text-xs text-ink-500"> + {x.c.metrics.clientConfirmedProjects} door opdrachtgever bevestigd</span>
                    </Cell>
                  ))}
                </Row>
                <Row label="Op tijd opgeleverd" help={columns[0].c.metrics.onTime.method}>
                  {columns.map((x) => (
                    <Cell key={x.c.id} highlight={bestOnTime?.c.id === x.c.id ? "Hoogste percentage" : undefined}>
                      <MetricValue metric={x.c.metrics.onTime} kind="percent" />
                    </Cell>
                  ))}
                </Row>
                <Row label="Gem. budgetafwijking" help={columns[0].c.metrics.budgetDeviation.method}>
                  {columns.map((x) => (
                    <Cell key={x.c.id} highlight={bestDev?.c.id === x.c.id ? "Kleinste afwijking" : undefined}>
                      <MetricValue metric={x.c.metrics.budgetDeviation} kind="signedPercent" />
                    </Cell>
                  ))}
                </Row>
                <Row label="Herstelwerk na oplevering" help={columns[0].c.metrics.rework.method}>
                  {columns.map((x) => (
                    <Cell key={x.c.id}>
                      <MetricValue metric={x.c.metrics.rework} kind="percent" />
                    </Cell>
                  ))}
                </Row>
                <Row label="Kwaliteitsbeoordeling" help="Gemiddelde (1–5) van gepubliceerde, aan projecten gekoppelde beoordelingen.">
                  {columns.map((x) => (
                    <Cell key={x.c.id}>
                      <MetricValue metric={x.c.metrics.qualityRating} kind="rating" />
                      <p className="mt-1 text-xs text-ink-500">
                        Algemeen: <MetricValue metric={x.c.metrics.rating} kind="rating" compact className="text-xs" />
                      </p>
                    </Cell>
                  ))}
                </Row>
                <Row label="Ontbrekende gegevens" help="Wat je nog niet weet over deze aannemer. Vraag dit na vóór je kiest.">
                  {columns.map((x) => (
                    <Cell key={x.c.id}>
                      {x.missing.length ? (
                        <ul className="list-disc space-y-0.5 pl-4 text-xs text-ink-600">
                          {x.missing.map((mm) => (
                            <li key={mm}>{mm}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-brand-800">Geen ontbrekende kerngegevens</p>
                      )}
                    </Cell>
                  ))}
                </Row>
              </tbody>
            </table>
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs text-ink-500 md:hidden">
            <Info className="size-3.5" aria-hidden /> Scroll horizontaal om alle aannemers te zien.
          </p>

          {/* Acties */}
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[var(--radius-card)] border border-ink-200 bg-white p-5">
              <h2 className="flex items-center gap-2 font-semibold text-ink-950">
                <Scale className="size-4" aria-hidden /> Vergelijking opslaan
              </h2>
              {isFlipper ? (
                <SaveComparisonForm contractorIds={ids} projectId={project?.id ?? null} defaultName={project ? `${project.name} — vergelijking` : columns.map((x) => x.c.company_name.split(" ").slice(-1)[0]).join(" vs. ")} />
              ) : (
                <p className="mt-2 text-sm text-ink-600">
                  <Link href={`/inloggen?next=${encodeURIComponent(hrefWith({}))}`} className="text-brand-700 underline">
                    Log in
                  </Link>{" "}
                  om deze vergelijking op te slaan.
                </p>
              )}
            </div>
            <div className="rounded-[var(--radius-card)] border border-ink-200 bg-white p-5">
              <h2 className="flex items-center gap-2 font-semibold text-ink-950">
                <FileText className="size-4" aria-hidden /> Volgende stap
              </h2>
              <p className="mt-2 text-sm text-ink-600">
                Vraag offertes aan op basis van dezelfde scope, zodat bedragen vergelijkbaar worden. Je controleert de aanvraag voordat er iets wordt verzonden.
              </p>
              <Button asChild className="mt-4">
                <Link href={user ? quoteRequestHref : `/inloggen?next=${encodeURIComponent(quoteRequestHref)}`}>Offerteaanvraag voorbereiden</Link>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Group({ label, span }: { label: string; span: number }) {
  return (
    <tr>
      <th colSpan={span + 1} scope="colgroup" className="border-y border-ink-200 bg-ink-100/70 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-700">
        <span className="sticky left-4">{label}</span>
      </th>
    </tr>
  );
}

function Row({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <tr className="align-top">
      <th scope="row" className="sticky left-0 z-10 w-[140px] border-b border-r border-ink-100 bg-white px-3 py-3 text-left text-[13px] font-medium text-ink-900 sm:w-[220px] sm:px-4 sm:text-sm">
        {label}
        {help ? <span className="mt-1 block text-[11px] font-normal leading-snug text-ink-500 sm:text-xs">{help}</span> : null}
      </th>
      {children}
    </tr>
  );
}

function Cell({ children, highlight }: { children: React.ReactNode; highlight?: string }) {
  return (
    <td className={cn("border-b border-ink-100 px-4 py-3 text-ink-800", highlight && "bg-brand-50/60")}>
      {highlight ? <span className="mb-1.5 inline-block rounded bg-brand-100 px-1.5 py-0.5 text-[11px] font-medium text-brand-800">{highlight}</span> : null}
      <div>{children}</div>
    </td>
  );
}

function Missing({ children }: { children: React.ReactNode }) {
  return <span className="text-sm text-ink-400">{children}</span>;
}
