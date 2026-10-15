import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { PageHeader, TableWrap, td, th } from "@/components/ui/misc";
import { quoteRequestTone } from "@/components/domain/badges";
import { requireAdmin } from "@/lib/auth/session";
import { listAllQuoteRequests } from "@/lib/data/admin";
import { QUOTE_REQUEST_STATUS, type QuoteRequestStatus } from "@/lib/domain/constants";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Beheer — offerteaanvragen" };

export default async function AdminQuoteRequests() {
  await requireAdmin("/beheer/offerteaanvragen");
  const list = await listAllQuoteRequests();
  return (
    <>
      <PageHeader title="Offerteaanvragen" description="Overzicht van alle aanvragen en het werkelijke verzendkanaal." />
      <TableWrap className="mt-6">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr>
              <th className={th}>Project</th>
              <th className={th}>Aannemer</th>
              <th className={th}>Aanvrager</th>
              <th className={th}>Status</th>
              <th className={th}>Kanaal</th>
              <th className={th}>Aangemaakt</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id}>
                <td className={td}>{r.project_name}</td>
                <td className={td}>{r.company_name}</td>
                <td className={td}>{r.requester}</td>
                <td className={td}>
                  <Badge tone={quoteRequestTone[r.status]}>{QUOTE_REQUEST_STATUS[r.status as QuoteRequestStatus]}</Badge>
                </td>
                <td className={`${td} text-xs`}>{r.delivery_channel === "platform" ? "Aannemersportaal" : r.delivery_channel === "demo" ? "Demo (niet verzonden)" : "—"}</td>
                <td className={td}>{formatDate(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}
