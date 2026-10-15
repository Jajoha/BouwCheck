import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DefinitionList, Notice, PageHeader } from "@/components/ui/misc";
import { DemoBadge, quoteRequestTone } from "@/components/domain/badges";
import { RequestSummary } from "@/components/quotes/request-summary";
import { DeliveryNote } from "@/components/quotes/delivery-note";
import { DeleteRequestButton, DraftEditForm, SendRequestsButton, StatusButtons } from "@/components/quotes/quote-request-actions";
import { requireFlipper } from "@/lib/auth/session";
import { getQuoteRequest, getQuoteRequestAttachments } from "@/lib/data/records";
import { QUOTE_REQUEST_STATUS } from "@/lib/domain/constants";
import { formatDateTime } from "@/lib/format";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Offerteaanvraag" };

export default async function QuoteRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireFlipper(`/offerteaanvragen/${id}`);
  const r = await getQuoteRequest(id);
  if (!r || r.user_id !== user.id) notFound();
  const attachments = await getQuoteRequestAttachments(r.id);
  const editable = ["concept", "klaar"].includes(r.status);
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-28 sm:px-6">
      <Link href="/offerteaanvragen" className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-950">
        <ArrowLeft className="size-4" aria-hidden /> Alle offerteaanvragen
      </Link>
      <PageHeader
        className="mt-4"
        eyebrow={r.project_name}
        title={`Offerteaanvraag aan ${r.company_name}`}
        actions={
          <div className="flex items-center gap-2">
            {r.contractor_is_demo ? <DemoBadge compact /> : null}
            <Badge tone={quoteRequestTone[r.status]}>{QUOTE_REQUEST_STATUS[r.status]}</Badge>
          </div>
        }
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-4">
          <DeliveryNote r={r} demoMode={env.demoMode} />
          <Card>
            <CardHeader>
              <CardTitle>Inhoud van de aanvraag</CardTitle>
            </CardHeader>
            <CardContent>
              {editable ? (
                <details className="mb-4 rounded-lg border border-ink-200 p-4">
                  <summary className="cursor-pointer text-sm font-medium">Concept bewerken</summary>
                  <div className="mt-4">
                    <DraftEditForm id={r.id} work={r.work_description} notes={r.additional_notes ?? ""} />
                  </div>
                </details>
              ) : null}
              <RequestSummary r={r} attachments={attachments} />
            </CardContent>
          </Card>
          {r.contractor_response ? (
            <Card>
              <CardHeader>
                <CardTitle>Reactie van {r.company_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm text-ink-800">{r.contractor_response}</p>
                <p className="mt-2 text-xs text-ink-500">Ontvangen via het aannemersportaal op {formatDateTime(r.responded_at)}</p>
              </CardContent>
            </Card>
          ) : r.status === "reactie" && r.delivery_channel === "demo" ? (
            <Notice tone="demo">De status ‘reactie ontvangen’ is in de demo handmatig gezet. Leg ontvangen offertebedragen vast op de projectpagina.</Notice>
          ) : null}
        </div>
        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Acties</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {editable ? <SendRequestsButton ids={[r.id]} demoMode={env.demoMode} anyWithoutAccount={!r.contractor_has_account} /> : null}
              <StatusButtons id={r.id} status={r.status} />
              {editable || r.status === "geannuleerd" ? <DeleteRequestButton id={r.id} /> : null}
              <Link href={`/projecten/${r.project_id}`} className="text-sm text-brand-700 hover:underline">
                Naar project
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Historie</CardTitle>
            </CardHeader>
            <CardContent className="py-1">
              <DefinitionList
                items={[
                  { term: "Aangemaakt", value: formatDateTime(r.created_at) },
                  { term: "Verzonden", value: r.sent_at ? formatDateTime(r.sent_at) : "Nog niet" },
                  { term: "Kanaal", value: r.delivery_channel === "platform" ? "Aannemersportaal" : r.delivery_channel === "demo" ? "Demo (niet verzonden)" : "—" },
                  { term: "Laatst gewijzigd", value: formatDateTime(r.updated_at) },
                ]}
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
