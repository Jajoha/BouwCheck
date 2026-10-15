import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, TableWrap, td, th } from "@/components/ui/misc";
import { quoteRequestTone } from "@/components/domain/badges";
import { requireFlipper } from "@/lib/auth/session";
import { listQuoteRequestsForUser } from "@/lib/data/records";
import { QUOTE_REQUEST_STATUS } from "@/lib/domain/constants";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Offerteaanvragen" };

export default async function QuoteRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireFlipper("/offerteaanvragen");
  const { status } = await searchParams;
  const all = await listQuoteRequestsForUser(user.id);
  const list = status && status in QUOTE_REQUEST_STATUS ? all.filter((r) => r.status === status) : all;
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6">
      <PageHeader
        title="Offerteaanvragen"
        description="Alle aanvragen per aannemer, met status en verzendkanaal."
        actions={
          <Button asChild>
            <Link href="/offerteaanvragen/nieuw">
              <Plus aria-hidden /> Nieuwe aanvraag
            </Link>
          </Button>
        }
      />
      <nav aria-label="Filter op status" className="mt-6 flex flex-wrap gap-2">
        <Link href="/offerteaanvragen" className={`rounded-full border px-3 py-1 text-sm ${!status ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-700 hover:bg-ink-50"}`}>
          Alle ({all.length})
        </Link>
        {Object.entries(QUOTE_REQUEST_STATUS).map(([k, v]) => {
          const n = all.filter((r) => r.status === k).length;
          return (
            <Link key={k} href={`/offerteaanvragen?status=${k}`} className={`rounded-full border px-3 py-1 text-sm ${status === k ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-700 hover:bg-ink-50"}`}>
              {v} ({n})
            </Link>
          );
        })}
      </nav>
      {list.length === 0 ? (
        <EmptyState className="mt-6" icon={FileText} title="Geen offerteaanvragen" description="Kies een teamvoorstel in je project; de offerteaanvraag wordt dan voor je voorbereid." />
      ) : (
        <TableWrap className="mt-6">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr>
                <th className={th}>Aannemer</th>
                <th className={th}>Project</th>
                <th className={th}>Status</th>
                <th className={th}>Verzonden</th>
                <th className={th}>Bijgewerkt</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="hover:bg-ink-50/60">
                  <td className={td}>
                    <Link href={`/offerteaanvragen/${r.id}`} className="font-medium text-ink-950 hover:underline">
                      {r.company_name}
                    </Link>
                  </td>
                  <td className={td}>
                    <Link href={`/projecten/${r.project_id}`} className="hover:underline">
                      {r.project_name}
                    </Link>
                  </td>
                  <td className={td}>
                    <Badge tone={quoteRequestTone[r.status]}>{QUOTE_REQUEST_STATUS[r.status]}</Badge>
                  </td>
                  <td className={`${td} text-xs`}>
                    {r.delivery_channel === "platform" ? "Via aannemersportaal" : r.delivery_channel === "demo" ? <span className="text-demo-700">Demo — niet echt verzonden</span> : "Nog niet verzonden"}
                  </td>
                  <td className={td}>{formatDate(r.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </div>
  );
}
