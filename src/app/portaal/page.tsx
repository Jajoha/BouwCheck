import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, ShieldCheck, Tag, FolderOpen, MessageSquare, Building2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DefinitionList, EmptyState, Notice, PageHeader, TableWrap, td, th } from "@/components/ui/misc";
import { DemoBadge, VerificationBadge, quoteRequestTone } from "@/components/domain/badges";
import { ContractorProfileForm } from "@/components/portal/contractor-profile-form";
import { emptyContractorProfile } from "@/components/portal/profile-defaults";
import { DeleteButton, RateForm, ReferenceForm, RespondToRequestForm, RespondToReviewForm, VerificationRequestForm } from "@/components/portal/portal-widgets";
import { saveOwnProfileAction } from "@/actions/portal";
import { requireRole } from "@/lib/auth/session";
import { getOwnContractor, getReviewsForContractorOwner, getVerificationEvents } from "@/lib/data/portal";
import { getContractorDetail } from "@/lib/data/contractors";
import { getQuoteRequestAttachments, listQuoteRequestsForContractor } from "@/lib/data/records";
import { AVAILABILITY, CONTRACTOR_STATUS, QUOTE_REQUEST_STATUS, RATE_UNITS, VERIFICATION_EVENT_STATUS, VERIFICATION_TYPES, specialtyName } from "@/lib/domain/constants";
import { formatDate, formatDateTime, formatEuro, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Aannemersportaal" };

export default async function PortalPage() {
  const user = await requireRole(["aannemer"], "/portaal");
  const own = await getOwnContractor(user.id);

  if (!own) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 pb-28 sm:px-6">
        <PageHeader eyebrow="Aannemersportaal" title="Bedrijfsprofiel aanmaken" description="Vul je bedrijfsgegevens in. Je profiel start als ‘Zelf opgegeven’ en is pas openbaar na beoordeling door BouwCheck." />
        <Notice tone="info" className="mt-6" title="Status na aanmaken: in beoordeling · niet geverifieerd">
          Verificatie van je bedrijfsgegevens vraag je daarna apart aan. Verificatie is niet te koop en geeft geen hogere positie in zoekresultaten.
        </Notice>
        <div className="mt-6 rounded-[var(--radius-card)] border border-ink-200 bg-white p-5 sm:p-8">
          <ContractorProfileForm action={saveOwnProfileAction} initial={{ ...emptyContractorProfile, company_name: user.company_name ?? "", hq_province: user.region ?? "" }} submitLabel="Profiel aanmaken" />
        </div>
      </div>
    );
  }

  const [detail, events, requests, reviews] = await Promise.all([
    getContractorDetail(own.slug, { includeInactive: true }),
    getVerificationEvents(own.id),
    listQuoteRequestsForContractor(own.id),
    getReviewsForContractorOwner(own.id),
  ]);
  const requestAttachments = await Promise.all(requests.map((r) => getQuoteRequestAttachments(r.id)));
  const openVerification = events.find((e) => e.verification_type === "bedrijfsgegevens" && e.status === "aangevraagd");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6">
      <PageHeader
        eyebrow="Aannemersportaal"
        title={own.company_name}
        description="Beheer je profiel, tarieven, referenties en ontvangen offerteaanvragen."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {own.is_demo ? <DemoBadge /> : null}
            <Badge tone={own.status === "actief" ? "positive" : own.status === "gedeactiveerd" ? "danger" : "warning"}>Profiel: {CONTRACTOR_STATUS[own.status as keyof typeof CONTRACTOR_STATUS]}</Badge>
            {own.status === "actief" ? (
              <Link href={`/aannemers/${own.slug}`} className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">
                Openbaar profiel <ExternalLink className="size-3.5" aria-hidden />
              </Link>
            ) : null}
          </div>
        }
      />
      {own.status === "in_beoordeling" ? (
        <Notice tone="warning" className="mt-6" title="Je profiel is nog niet openbaar">
          BouwCheck beoordeelt nieuwe aanmeldingen voordat ze in de aannemersdatabase verschijnen.
        </Notice>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Inbox className="size-4" aria-hidden /> Ontvangen offerteaanvragen ({requests.length})
              </CardTitle>
              <CardDescription>Aanvragen die opdrachtgevers via BouwCheck naar je hebben verzonden.</CardDescription>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <EmptyState icon={Inbox} title="Nog geen aanvragen ontvangen" />
              ) : (
                <ul className="flex flex-col gap-4">
                  {requests.map((r, i) => (
                    <li key={r.id} className="rounded-lg border border-ink-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-ink-950">{r.project_name}</p>
                        <Badge tone={quoteRequestTone[r.status]}>{QUOTE_REQUEST_STATUS[r.status]}</Badge>
                      </div>
                      <DefinitionList
                        className="mt-2"
                        items={[
                          { term: "Werkzaamheden", value: <span className="whitespace-pre-line">{r.work_description}</span> },
                          { term: "Vakgebieden", value: r.specialty_ids.map(specialtyName).join(", ") },
                          { term: "Budgetindicatie", value: r.budget_indication ? formatMoney(r.budget_indication, r.budget_vat_included) : "Niet gedeeld" },
                          { term: "Planning", value: `${formatDate(r.desired_start_date)} t/m ${formatDate(r.desired_completion_date)}` },
                          { term: "Toelichting", value: r.additional_notes ?? "—" },
                          {
                            term: "Bijlagen",
                            value: requestAttachments[i].length
                              ? requestAttachments[i].map((a) => (
                                  <a key={a.id} href={`/api/bijlagen/${a.id}`} className="mr-2 text-brand-700 underline" target="_blank" rel="noreferrer">
                                    {a.file_name}
                                  </a>
                                ))
                              : "Geen",
                          },
                          { term: "Contact", value: `${r.contact_name} · ${r.contact_email}${r.contact_phone ? ` · ${r.contact_phone}` : ""}` },
                          { term: "Ontvangen", value: formatDateTime(r.sent_at) },
                        ]}
                      />
                      {r.contractor_response ? (
                        <div className="mt-3 rounded-md bg-ink-50 p-3 text-sm">
                          <p className="text-xs font-medium text-ink-600">Jouw reactie ({formatDateTime(r.responded_at)})</p>
                          <p className="mt-1 whitespace-pre-line text-ink-800">{r.contractor_response}</p>
                        </div>
                      ) : ["verzonden", "reactie"].includes(r.status) ? (
                        <div className="mt-3">
                          <RespondToRequestForm requestId={r.id} />
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="size-4" aria-hidden /> Indicatieve tarieven
              </CardTitle>
              <CardDescription>Worden op je profiel getoond als ‘zelf opgegeven’ richtprijzen.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {detail?.rates.length ? (
                <TableWrap>
                  <table className="w-full min-w-[520px]">
                    <thead>
                      <tr>
                        <th className={th}>Werkzaamheid</th>
                        <th className={`${th} text-right`}>Indicatie</th>
                        <th className={th}>Eenheid</th>
                        <th className={th}>
                          <span className="sr-only">Acties</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.rates.map((r) => (
                        <tr key={r.id}>
                          <td className={td}>
                            {r.description}
                            <span className="block text-xs text-ink-500">{r.specialty_name}</span>
                          </td>
                          <td className={`${td} tabular text-right`}>
                            {formatEuro(r.price_min)} – {formatEuro(r.price_max)} <span className="text-xs text-ink-500">{r.vat_included ? "incl." : "excl."} btw</span>
                          </td>
                          <td className={td}>{RATE_UNITS[r.unit as keyof typeof RATE_UNITS]}</td>
                          <td className={`${td} text-right`}>
                            <DeleteButton kind="rate" id={r.id} label={r.description} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              ) : (
                <p className="text-sm text-ink-500">Nog geen tarieven opgegeven.</p>
              )}
              <details className="rounded-lg border border-ink-200 p-4">
                <summary className="cursor-pointer text-sm font-medium">Tarief toevoegen</summary>
                <div className="mt-4">
                  <RateForm specialties={own.specialty_ids} />
                </div>
              </details>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="size-4" aria-hidden /> Referentieprojecten
              </CardTitle>
              <CardDescription>Zelf opgegeven portfolio. Telt niet mee in prestatiecijfers; daarvoor zijn door opdrachtgevers geregistreerde resultaten nodig.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {detail?.references.length ? (
                <ul className="divide-y divide-ink-100">
                  {detail.references.map((r) => (
                    <li key={r.id} className="flex items-start justify-between gap-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-ink-950">{r.title}</p>
                        <p className="text-xs text-ink-500">{[r.city, r.renovation_type, r.year].filter(Boolean).join(" · ")}</p>
                      </div>
                      <DeleteButton kind="reference" id={r.id} label={r.title} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-500">Nog geen referentieprojecten.</p>
              )}
              <details className="rounded-lg border border-ink-200 p-4">
                <summary className="cursor-pointer text-sm font-medium">Referentieproject toevoegen</summary>
                <div className="mt-4">
                  <ReferenceForm />
                </div>
              </details>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="size-4" aria-hidden /> Beoordelingen
              </CardTitle>
              <CardDescription>Je kunt één openbare reactie plaatsen. Onjuiste gegevens? Meld dit via het openbare profiel (‘Meld beoordeling’).</CardDescription>
            </CardHeader>
            <CardContent>
              {reviews.length === 0 ? (
                <p className="text-sm text-ink-500">Nog geen beoordelingen.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {reviews.map((r) => (
                    <li key={r.id} className="rounded-lg border border-ink-200 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{r.rating}/5</span>
                        <Badge tone={r.moderation_status === "gepubliceerd" ? "positive" : "warning"}>{r.moderation_status === "gepubliceerd" ? "Gepubliceerd" : "In behandeling"}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-ink-800">{r.review_text}</p>
                      {r.contractor_response ? (
                        <p className="mt-2 rounded bg-ink-50 p-2 text-sm text-ink-700">Jouw reactie: {r.contractor_response}</p>
                      ) : (
                        <div className="mt-2">
                          <RespondToReviewForm reviewId={r.id} />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4" aria-hidden /> Verificatie
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-1.5">
                {detail?.verification.levels.map((l) => (
                  <VerificationBadge key={l} level={l} isDemo={own.is_demo} />
                ))}
              </div>
              {detail?.verification.businessVerified ? (
                <p className="text-sm text-ink-600">Je bedrijfsgegevens zijn gecontroleerd.</p>
              ) : openVerification ? (
                <Notice tone="info" title="Verificatie aangevraagd">
                  Ingediend op {formatDate(openVerification.created_at)}. Bewijsreferentie: {openVerification.evidence_reference}.
                </Notice>
              ) : (
                <VerificationRequestForm defaultEvidence={own.kvk_number ? `KvK ${own.kvk_number}` : ""} />
              )}
              {events.length ? (
                <ul className="divide-y divide-ink-100 text-xs">
                  {events.slice(0, 8).map((e) => (
                    <li key={e.id} className="flex justify-between gap-2 py-1.5">
                      <span>{VERIFICATION_TYPES[e.verification_type as keyof typeof VERIFICATION_TYPES]}</span>
                      <span className="text-ink-500">
                        {VERIFICATION_EVENT_STATUS[e.status as keyof typeof VERIFICATION_EVENT_STATUS]} · {formatDate(e.reviewed_at ?? e.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-4" aria-hidden /> Bedrijfsprofiel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <details>
                <summary className="cursor-pointer text-sm font-medium text-brand-700">Profiel bewerken</summary>
                <div className="mt-4">
                  <ContractorProfileForm
                    action={saveOwnProfileAction}
                    submitLabel="Profiel opslaan"
                    initial={{
                      company_name: own.company_name,
                      description: own.description,
                      city: own.city ?? "",
                      hq_province: own.hq_province ?? "",
                      kvk_number: own.kvk_number ?? "",
                      email: own.email ?? "",
                      phone: own.phone ?? "",
                      website: own.website ?? "",
                      price_level: own.price_level,
                      availability_status: own.availability_status,
                      available_from: own.available_from ?? "",
                      team_size: own.team_size?.toString() ?? "",
                      founded_year: own.founded_year?.toString() ?? "",
                      project_types: own.project_types,
                      specialty_ids: own.specialty_ids,
                      primary_specialty: own.primary_specialty ?? "",
                      areas: own.areas,
                    }}
                  />
                </div>
              </details>
              <DefinitionList
                className="mt-3"
                items={[
                  { term: "Specialisaties", value: own.specialty_ids.map(specialtyName).join(", ") },
                  { term: "Werkgebied", value: own.areas.join(", ") },
                  { term: "Beschikbaarheid", value: AVAILABILITY[own.availability_status as keyof typeof AVAILABILITY]?.label ?? "Onbekend" },
                ]}
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
