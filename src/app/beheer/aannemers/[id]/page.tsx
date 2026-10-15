import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { DemoBadge } from "@/components/domain/badges";
import { ContractorProfileForm } from "@/components/portal/contractor-profile-form";
import { AddVerificationForm, ContractorStatusControl, InternalNotesForm, RevokeVerificationButton } from "@/components/admin/admin-widgets";
import { adminSaveContractorAction } from "@/actions/admin";
import { getContractorPrivate } from "@/lib/data/admin";
import { getContractorForEdit, getVerificationEvents } from "@/lib/data/portal";
import { VERIFICATION_EVENT_STATUS, VERIFICATION_TYPES } from "@/lib/domain/constants";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Beheer — aannemer" };

export default async function AdminContractor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin(`/beheer/aannemers/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const c = await getContractorForEdit({ id });
  if (!c) notFound();
  const [events, priv] = await Promise.all([getVerificationEvents(c.id), getContractorPrivate(c.id)]);
  const action = adminSaveContractorAction.bind(null, c.id);
  const business = events.filter((e) => !e.project_outcome_id);
  return (
    <>
      <PageHeader
        eyebrow="Aannemer"
        title={c.company_name}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {c.is_demo ? <DemoBadge /> : null}
            <ContractorStatusControl id={c.id} status={c.status} name={c.company_name} />
            <Link href={`/aannemers/${c.slug}`} className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">
              Profiel bekijken <ExternalLink className="size-3.5" aria-hidden />
            </Link>
          </div>
        }
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Gegevens corrigeren</CardTitle>
            <CardDescription>Wijzigingen worden gelogd in het beheerlog.</CardDescription>
          </CardHeader>
          <CardContent>
            <ContractorProfileForm
              action={action}
              showStatus
              submitLabel="Wijzigingen opslaan"
              initial={{
                company_name: c.company_name,
                description: c.description,
                city: c.city ?? "",
                hq_province: c.hq_province ?? "",
                kvk_number: c.kvk_number ?? "",
                email: c.email ?? "",
                phone: c.phone ?? "",
                website: c.website ?? "",
                price_level: c.price_level,
                availability_status: c.availability_status,
                available_from: c.available_from ?? "",
                team_size: c.team_size?.toString() ?? "",
                founded_year: c.founded_year?.toString() ?? "",
                project_types: c.project_types,
                specialty_ids: c.specialty_ids,
                primary_specialty: c.primary_specialty ?? "",
                areas: c.areas,
                status: c.status,
              }}
            />
          </CardContent>
        </Card>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Verificatie bedrijfsgegevens</CardTitle>
              <CardDescription>Ken alleen toe na een daadwerkelijke controle, met bewijsreferentie.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {business.length ? (
                <ul className="divide-y divide-ink-100 text-sm">
                  {business.map((e) => (
                    <li key={e.id} className="flex items-start justify-between gap-2 py-2">
                      <div>
                        <p>
                          {VERIFICATION_TYPES[e.verification_type as keyof typeof VERIFICATION_TYPES]}{" "}
                          <Badge tone={e.status === "goedgekeurd" ? "positive" : e.status === "aangevraagd" ? "warning" : "muted"}>
                            {VERIFICATION_EVENT_STATUS[e.status as keyof typeof VERIFICATION_EVENT_STATUS]}
                          </Badge>
                        </p>
                        <p className="text-xs text-ink-500">
                          {e.evidence_reference ?? "Geen bewijsreferentie"} · {formatDate(e.reviewed_at ?? e.created_at)}
                        </p>
                      </div>
                      {e.status === "goedgekeurd" ? <RevokeVerificationButton id={e.id} /> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-500">Nog geen verificaties.</p>
              )}
              <AddVerificationForm contractorId={c.id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Interne gegevens</CardTitle>
              <CardDescription>Niet openbaar. Contactpersoon: {priv?.contact_person_name ?? "—"} {priv?.contact_person_email ? `(${priv.contact_person_email})` : ""}</CardDescription>
            </CardHeader>
            <CardContent>
              <InternalNotesForm contractorId={c.id} notes={priv?.internal_notes ?? ""} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
