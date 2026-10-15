import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, Notice, PageHeader } from "@/components/ui/misc";
import { quoteRequestTone } from "@/components/domain/badges";
import { RequestSummary } from "@/components/quotes/request-summary";
import { DeliveryNote } from "@/components/quotes/delivery-note";
import { SendRequestsButton } from "@/components/quotes/quote-request-actions";
import { requireFlipper } from "@/lib/auth/session";
import { getQuoteRequest, getQuoteRequestAttachments, type QuoteRequest } from "@/lib/data/records";
import { parseIdList } from "@/lib/ids";
import { QUOTE_REQUEST_STATUS } from "@/lib/domain/constants";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Offerteaanvraag controleren" };

export default async function ReviewRequestsPage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids: raw } = await searchParams;
  const user = await requireFlipper("/offerteaanvragen");
  const ids = parseIdList(raw, 10);
  const requests = (await Promise.all(ids.map((id) => getQuoteRequest(id)))).filter((r): r is QuoteRequest => Boolean(r && r.user_id === user.id));
  const attachments = await Promise.all(requests.map((r) => getQuoteRequestAttachments(r.id)));
  const sendable = requests.filter((r) => ["concept", "klaar"].includes(r.status));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-28 sm:px-6">
      <PageHeader
        eyebrow="Stap 2 van 2"
        title="Controleer je offerteaanvraag"
        description="De aanvragen zijn opgeslagen als concept. Controleer de inhoud; je kunt nu verzenden of later verder gaan."
      />
      {requests.length === 0 ? (
        <EmptyState className="mt-6" title="Geen aanvragen gevonden" action={<Button asChild variant="outline"><Link href="/offerteaanvragen">Naar offerteaanvragen</Link></Button>} />
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {requests.map((r, i) => (
            <Card key={r.id}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>{r.company_name}</CardTitle>
                <Badge tone={quoteRequestTone[r.status]}>{QUOTE_REQUEST_STATUS[r.status]}</Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <DeliveryNote r={r} demoMode={env.demoMode} />
                <RequestSummary r={r} attachments={attachments[i]} />
                <Link href={`/offerteaanvragen/${r.id}`} className="text-sm text-brand-700 hover:underline">
                  Bewerken of afzonderlijk beheren
                </Link>
              </CardContent>
            </Card>
          ))}
          <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-ink-200 bg-ink-50 p-5 sm:flex-row sm:items-start sm:justify-between">
            <Button asChild variant="outline">
              <Link href="/offerteaanvragen">Bewaren als concept</Link>
            </Button>
            {sendable.length === 0 ? (
              <Notice tone="success" title="Deze aanvragen zijn afgehandeld">
                Bekijk per aanvraag hierboven of deze via het aannemersportaal is verzonden of alleen als demo is gemarkeerd.{" "}
                <Link href="/offerteaanvragen">Naar alle aanvragen</Link>
              </Notice>
            ) : null}
            {sendable.length ? (
              <SendRequestsButton
                ids={sendable.map((r) => r.id)}
                label={`${sendable.length} ${sendable.length === 1 ? "aanvraag" : "aanvragen"} verzenden`}
                demoMode={env.demoMode}
                anyWithoutAccount={sendable.some((r) => !r.contractor_has_account)}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
