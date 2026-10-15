import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Mail, MapPin, Phone, Globe, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, DefinitionList, EmptyState, Notice, TableWrap, td, th } from "@/components/ui/misc";
import { AvailabilityBadge, DemoBadge, PriceLevelLabel, VerificationBadge } from "@/components/domain/badges";
import { MetricTile } from "@/components/domain/metric";
import { SourceTag } from "@/components/domain/source-tag";
import { FavoriteButton } from "@/components/domain/favorite-button";
import { FlagDialog } from "@/components/domain/flag-dialog";
import { getContractorDetail } from "@/lib/data/contractors";
import { getRegisterState } from "@/lib/data/registers";
import { RegisterSection } from "@/components/domain/register-section";
import { getFavoriteIds } from "@/lib/data/records";
import { getCurrentUser } from "@/lib/auth/session";
import { budgetDeviationPct, delayDays } from "@/lib/domain/metrics";
import { OUTCOME_VERIFICATION, PROVIDER_TYPES, RATE_UNITS, specialtyName, type OutcomeVerification } from "@/lib/domain/constants";
import { VERIFICATION_LEVELS } from "@/lib/domain/verification";
import { formatDate, formatDays, formatEuro, formatMoney, formatPercent } from "@/lib/format";
import { site } from "@/config/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getContractorDetail(slug);
  return { title: c ? c.company_name : "Uitvoerder niet gevonden" };
}

export default async function ContractorPage({ params }: Props) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const c = await getContractorDetail(slug, { includeInactive: user?.role === "beheerder" });
  if (!c) notFound();
  const [favorites, register] = await Promise.all([user ? getFavoriteIds(user.id) : Promise.resolve(new Set<string>()), getRegisterState(c.id)]);
  const m = c.metrics;
  const quoteHref = `/offerteaanvragen/nieuw?aannemer=${c.id}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6">
      <Link href={user ? "/projecten" : "/"} className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-950">
        <ArrowLeft className="size-4" aria-hidden /> {user ? "Naar je projecten" : "Naar home"}
      </Link>

      {c.status !== "actief" ? (
        <Notice tone="warning" className="mt-4" title={`Profielstatus: ${c.status}`}>
          Dit profiel is niet openbaar zichtbaar. Je ziet het omdat je beheerder bent.
        </Notice>
      ) : null}

      {/* Kop */}
      <div className="mt-5 flex flex-col gap-6 border-b border-ink-100 pb-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          <Avatar name={c.company_name} className="size-16 text-lg" />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-ink-950 sm:text-3xl">{c.company_name}</h1>
            <p className="mt-1 text-ink-600">{c.specialties.map((s) => s.name).join(" · ")}</p>
            <p className="mt-1 flex items-center gap-1 text-sm text-ink-500">
              <MapPin className="size-4" aria-hidden /> {c.city ? `${c.city} · ` : ""}Werkgebied: {c.areas.join(", ")}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone="muted">{PROVIDER_TYPES[c.provider_type].label}</Badge>
              {c.is_demo ? <DemoBadge /> : null}
              {c.verification.levels.map((l) => (
                <VerificationBadge key={l} level={l} isDemo={c.is_demo} />
              ))}
              <AvailabilityBadge status={c.availability_status} from={c.available_from} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button asChild>
            <Link href={user ? quoteHref : `/inloggen?next=${encodeURIComponent(quoteHref)}`}>
              <FileText aria-hidden /> Offerte aanvragen
            </Link>
          </Button>
          <FavoriteButton contractorId={c.id} name={c.company_name} initial={favorites.has(c.id)} loggedIn={Boolean(user)} size="md" />
        </div>
      </div>

      {c.is_demo ? (
        <Notice tone="demo" className="mt-6" title={site.demoLabel}>
          Dit is een fictief profiel voor demonstratiedoeleinden. Bedrijfsnaam, KvK-nummer, contactgegevens, tarieven, projectresultaten, beoordelingen én
          verificatiestatussen zijn verzonnen. Er heeft geen echte controle plaatsgevonden.
        </Notice>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-8">
          {/* Prestaties */}
          <section aria-labelledby="prestaties">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="prestaties" className="text-lg font-semibold text-ink-950">Prestaties op basis van projectresultaten</h2>
                <p className="text-sm text-ink-500">
                  {m.registeredProjects} geregistreerde projecten, waarvan {m.verifiedProjects} met documentatie gecontroleerd en {m.clientConfirmedProjects} door de opdrachtgever bevestigd.
                  {m.lastUpdated ? ` Laatst bijgewerkt: ${formatDate(m.lastUpdated)}.` : ""}
                </p>
              </div>
              <SourceTag source="project" />
            </div>
            {m.isStale ? (
              <Notice tone="warning" className="mb-3" title="Gegevens mogelijk verouderd">
                De meest recente projectgegevens zijn ouder dan {site.staleAfterMonths} maanden.
              </Notice>
            ) : null}
            {m.registeredProjects < site.minSampleSize ? (
              <Notice tone="info" className="mb-3" title="Onvoldoende gegevens voor een betrouwbare vergelijking">
                Er zijn minder dan {site.minSampleSize} goedgekeurde projectresultaten. Percentages en gemiddelden worden daarom niet getoond. Een klein aantal
                projecten zegt weinig — positief én negatief.
              </Notice>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <MetricTile label="Op tijd opgeleverd" metric={m.onTime} kind="percent" />
              <MetricTile label="Gemiddelde vertraging" metric={m.avgDelayDays} kind="signedDays" />
              <MetricTile label="Gem. budgetafwijking" metric={m.budgetDeviation} kind="signedPercent" />
              <MetricTile label="Herstelwerk nodig" metric={m.rework} kind="percent" />
              <MetricTile label="Gem. doorlooptijd" metric={m.avgDurationDays} kind="days" />
              <MetricTile label="Algemene beoordeling" metric={m.rating} kind="rating" />
            </div>
            {m.pendingProjects || m.excludedProjects ? (
              <p className="mt-3 text-xs text-ink-500">
                Niet meegeteld: {m.pendingProjects} resultaat/resultaten in behandeling bij beheer, {m.excludedProjects} betwist of afgewezen.
              </p>
            ) : null}
          </section>

          {/* Projectresultaten */}
          <section aria-labelledby="projecten">
            <h2 id="projecten" className="mb-3 text-lg font-semibold text-ink-950">Projectervaring</h2>
            {c.outcomes.length === 0 ? (
              <EmptyState title="Nog geen projectresultaten geregistreerd" description="Zodra opdrachtgevers projectresultaten registreren en beheer deze goedkeurt, verschijnen ze hier." />
            ) : (
              <TableWrap>
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr>
                      <th className={th}>Project</th>
                      <th className={th}>Werk</th>
                      <th className={`${th} text-right`}>Begroot</th>
                      <th className={`${th} text-right`}>Definitief</th>
                      <th className={`${th} text-right`}>Afwijking</th>
                      <th className={th}>Oplevering</th>
                      <th className={th}>Status gegevens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.outcomes.map((o) => {
                      const dev = budgetDeviationPct(o.initial_budget, o.final_cost);
                      const delay = delayDays(o.planned_completion_date, o.actual_completion_date);
                      const v = o.verification_status as OutcomeVerification;
                      return (
                        <tr key={o.id}>
                          <td className={td}>
                            <span className="font-medium text-ink-900">{o.renovation_type ?? "Onbekend"}</span>
                            <span className="block text-xs text-ink-500">
                              {o.property_type} · {o.city}
                            </span>
                          </td>
                          <td className={`${td} text-xs`}>{o.work_specialty_ids.map(specialtyName).join(", ")}</td>
                          <td className={`${td} tabular text-right`}>{formatEuro(o.initial_budget)}</td>
                          <td className={`${td} tabular text-right`}>{formatEuro(o.final_cost)}</td>
                          <td className={`${td} tabular text-right ${dev !== null && dev > 10 ? "text-danger-700" : ""}`}>{dev === null ? "Onbekend" : formatPercent(dev, { signed: true })}</td>
                          <td className={`${td} text-xs`}>
                            {o.actual_completion_date ? formatDate(o.actual_completion_date) : "Onbekend"}
                            {delay !== null ? (
                              <span className={`block ${delay > 0 ? "text-warn-700" : "text-brand-700"}`}>{delay > 0 ? `${formatDays(delay)} te laat` : "Op tijd"}</span>
                            ) : null}
                          </td>
                          <td className={td}>
                            <Badge tone={v === "documentatie_gecontroleerd" ? (o.is_demo ? "demo" : "positive") : v === "opdrachtgever_bevestigd" ? "info" : v === "betwist" ? "danger" : "muted"}>
                              {OUTCOME_VERIFICATION[v].short}
                              {o.is_demo && v !== "niet_gecontroleerd" ? " (fictief)" : ""}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="border-t border-ink-100 px-4 py-2 text-xs text-ink-500">
                  Bedragen exclusief btw tenzij anders vermeld. Budgetafwijking = (definitief − begroot) / begroot × 100.
                </p>
              </TableWrap>
            )}
          </section>

          {/* Referenties */}
          <section aria-labelledby="referenties">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <h2 id="referenties" className="text-lg font-semibold text-ink-950">Referentieprojecten</h2>
              <SourceTag source="zelf" />
            </div>
            {c.references.length === 0 ? (
              <EmptyState title="Geen referentieprojecten opgegeven" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {c.references.map((r) => (
                  <Card key={r.id}>
                    <CardContent>
                      <p className="font-medium text-ink-950">{r.title}</p>
                      <p className="text-xs text-ink-500">
                        {[r.city, r.property_type, r.renovation_type, r.year].filter(Boolean).join(" · ")}
                      </p>
                      <p className="mt-2 text-sm text-ink-700">{r.description}</p>
                      {r.work_items.length ? <p className="mt-2 text-xs text-ink-500">Werkzaamheden: {r.work_items.map(specialtyName).join(", ")}</p> : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-ink-500">Referentieprojecten zijn door het bedrijf zelf aangeleverd en tellen niet mee in de prestatiecijfers.</p>
          </section>

          {/* Reviews */}
          <section aria-labelledby="reviews">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="reviews" className="text-lg font-semibold text-ink-950">Beoordelingen van opdrachtgevers</h2>
                <p className="text-sm text-ink-500">Alleen beoordelingen die aan een geregistreerd project gekoppeld zijn en door beheer zijn gemodereerd.</p>
              </div>
              <SourceTag source="ervaring" />
            </div>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <MetricTile label="Kwaliteit" metric={m.qualityRating} kind="rating" help="Gemiddelde (1–5)." />
              <MetricTile label="Communicatie" metric={m.communicationRating} kind="rating" help="Gemiddelde (1–5)." />
              <MetricTile label="Nakomen afspraken" metric={m.reliabilityRating} kind="rating" help="Gemiddelde (1–5)." />
            </div>
            {c.reviews.length === 0 ? (
              <EmptyState title="Nog geen gepubliceerde beoordelingen" />
            ) : (
              <ul className="flex flex-col gap-3">
                {c.reviews.map((r) => (
                  <li key={r.id} className="rounded-[var(--radius-card)] border border-ink-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="tabular rounded bg-ink-900 px-1.5 py-0.5 text-sm font-semibold text-white" aria-label={`Beoordeling ${r.rating} van 5`}>
                          {r.rating}/5
                        </span>
                        <span className="text-sm text-ink-600">
                          {r.renovation_type} · {r.city}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={r.verification_status === "gecontroleerd" ? (r.is_demo ? "demo" : "positive") : r.verification_status === "opdrachtgever_bevestigd" ? "info" : "muted"}>
                          {r.verification_status === "gecontroleerd" ? "Project gecontroleerd" : r.verification_status === "opdrachtgever_bevestigd" ? "Opdrachtgever bevestigd" : "Niet gecontroleerd"}
                          {r.is_demo && r.verification_status !== "niet_gecontroleerd" ? " (fictief)" : ""}
                        </Badge>
                        <span className="text-xs text-ink-500">{formatDate(r.created_at)}</span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-ink-800">{r.review_text}</p>
                    {r.quality_rating || r.communication_rating || r.reliability_rating ? (
                      <p className="mt-2 text-xs text-ink-500">
                        Kwaliteit {r.quality_rating ?? "–"} · Communicatie {r.communication_rating ?? "–"} · Afspraken {r.reliability_rating ?? "–"}
                      </p>
                    ) : null}
                    {r.contractor_response ? (
                      <div className="mt-3 rounded-md border-l-2 border-ink-300 bg-ink-50 px-3 py-2 text-sm">
                        <p className="text-xs font-medium text-ink-600">Reactie van {c.company_name}</p>
                        <p className="mt-0.5 text-ink-800">{r.contractor_response}</p>
                      </div>
                    ) : null}
                    <div className="mt-2 flex justify-end">
                      <FlagDialog entityType="review" entityId={r.id} loggedIn={Boolean(user)} label="Meld beoordeling" defaultReason="verdachte_review" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Zijkolom */}
        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Bedrijfsinformatie</CardTitle>
              <SourceTag source="zelf" className="self-start" />
            </CardHeader>
            <CardContent className="py-2">
              <p className="py-2 text-sm leading-relaxed text-ink-700">{c.description}</p>
              <DefinitionList
                items={[
                  { term: "Vestigingsplaats", value: c.city ? `${c.city} (${c.hq_province})` : "Onbekend" },
                  { term: "Werkgebied", value: c.areas.join(", ") || "Onbekend" },
                  { term: "Type projecten", value: c.project_types.join(", ") || "Onbekend" },
                  { term: "Teamgrootte", value: c.team_size ? `${c.team_size} personen` : "Onbekend" },
                  { term: "Opgericht", value: c.founded_year ?? "Onbekend" },
                  { term: "Prijsniveau", value: <PriceLevelLabel level={c.price_level} /> },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Administratieve controle</CardTitle>
              <SourceTag source="admin" className="self-start" />
            </CardHeader>
            <CardContent className="text-sm">
              {c.businessVerification ? (
                <>
                  <VerificationBadge level="bedrijfsgegevens_gecontroleerd" isDemo={c.is_demo} />
                  <p className="mt-2 text-ink-700">
                    Gecontroleerd op {formatDate(c.businessVerification.reviewed_at)}. KvK: {c.kvk_number ?? "onbekend"}.
                  </p>
                  {c.is_demo ? <p className="mt-1 text-xs text-demo-700">Fictieve controle — demo-data.</p> : null}
                </>
              ) : (
                <>
                  <VerificationBadge level="zelf_opgegeven" isDemo={c.is_demo} />
                  <p className="mt-2 text-ink-600">{VERIFICATION_LEVELS.zelf_opgegeven.description}</p>
                </>
              )}
            </CardContent>
          </Card>

          <RegisterSection state={register} isDemo={c.is_demo} kvkNumber={c.kvk_number} />

          <Card>
            <CardHeader>
              <CardTitle>Beschikbaarheid</CardTitle>
              <SourceTag source="zelf" className="self-start" />
            </CardHeader>
            <CardContent className="text-sm">
              <AvailabilityBadge status={c.availability_status} from={c.available_from} />
              <p className="mt-2 flex items-center gap-1 text-xs text-ink-500">
                <Clock className="size-3.5" aria-hidden />
                {c.availability_updated_at ? `Laatst bijgewerkt: ${formatDate(c.availability_updated_at)}` : "Nooit bijgewerkt"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
              <CardDescription>Bij voorkeur via een offerteaanvraag vanuit je project.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {c.email ? (
                <p className="flex items-center gap-2 text-ink-700">
                  <Mail className="size-4 text-ink-400" aria-hidden /> {c.email}
                </p>
              ) : null}
              <p className="flex items-center gap-2 text-ink-700">
                <Phone className="size-4 text-ink-400" aria-hidden /> {c.phone ?? "Telefoonnummer niet beschikbaar"}
              </p>
              {c.website ? (
                <p className="flex items-center gap-2 text-ink-700">
                  <Globe className="size-4 text-ink-400" aria-hidden /> {c.website}
                </p>
              ) : null}
              {c.is_demo ? <p className="text-xs text-demo-700">Fictieve contactgegevens (.test-domein) — niet bruikbaar.</p> : null}
              <Button asChild className="mt-2">
                <Link href={user ? quoteHref : `/inloggen?next=${encodeURIComponent(quoteHref)}`}>Offerte aanvragen</Link>
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <FlagDialog entityType="aannemer" entityId={c.id} loggedIn={Boolean(user)} />
          </div>
        </aside>
      </div>

      {/* Tarieven */}
      <section aria-labelledby="tarieven" className="mt-10">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="tarieven" className="text-lg font-semibold text-ink-950">Indicatieve tarieven</h2>
            <p className="text-sm text-ink-500">Richtprijzen zonder bezichtiging. Geen offerte en geen afgesproken prijs.</p>
          </div>
          <SourceTag source="zelf" />
        </div>
        {c.rates.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="Geen indicatieve tarieven opgegeven" />
        ) : (
          <TableWrap>
            <table className="w-full min-w-[640px]">
              <thead>
                <tr>
                  <th className={th}>Vakgebied</th>
                  <th className={th}>Werkzaamheid</th>
                  <th className={`${th} text-right`}>Indicatie</th>
                  <th className={th}>Eenheid</th>
                  <th className={th}>Btw</th>
                  <th className={th}>Materiaal</th>
                </tr>
              </thead>
              <tbody>
                {c.rates.map((r) => (
                  <tr key={r.id}>
                    <td className={td}>{r.specialty_name}</td>
                    <td className={td}>{r.description}</td>
                    <td className={`${td} tabular whitespace-nowrap text-right font-medium`}>
                      {formatEuro(r.price_min)} – {formatEuro(r.price_max)}
                    </td>
                    <td className={td}>{RATE_UNITS[r.unit as keyof typeof RATE_UNITS]}</td>
                    <td className={td}>{r.vat_included ? "incl. btw" : "excl. btw"}</td>
                    <td className={td}>{r.materials_included === null ? "Onbekend" : r.materials_included ? "Inbegrepen" : "Niet inbegrepen"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
        <p className="mt-2 text-xs text-ink-500">
          Voorbeeld: {c.rates[0] ? `${c.rates[0].description} ${formatMoney(c.rates[0].price_min, c.rates[0].vat_included)} – ${formatMoney(c.rates[0].price_max, c.rates[0].vat_included)} ${RATE_UNITS[c.rates[0].unit as keyof typeof RATE_UNITS]}` : "—"}.
          Vraag altijd een offerte op basis van je eigen scope.
        </p>
      </section>
    </div>
  );
}
