import type { Metadata } from "next";
import { EmptyState, PageHeader, TableWrap, td, th } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth/session";
import { sql } from "@/lib/db";
import { FUNNEL_EVENTS } from "@/lib/events";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Beheer — funnel" };

type Count = { event: string; week: number; total: number };
type Recent = { id: string; event: string; subject_type: string | null; subject_id: string | null; created_at: string };

export default async function AdminFunnel() {
  await requireAdmin("/beheer/funnel");
  const [counts, recent] = await Promise.all([
    sql<Count>(
      `select event, count(*) filter (where created_at > now() - interval '7 days')::int as week, count(*)::int as total
       from funnel_events group by event`,
    ),
    sql<Recent>("select id, event, subject_type, subject_id::text, created_at::text from funnel_events order by created_at desc limit 50"),
  ]);
  const byEvent = new Map(counts.map((c) => [c.event, c]));
  return (
    <>
      <PageHeader title="Funnel" description="Events uit de eigen database (geen externe trackers)." />
      <TableWrap className="mt-6">
        <table className="w-full min-w-[480px]">
          <thead>
            <tr>
              <th className={th}>Event</th>
              <th className={`${th} text-right`}>Laatste 7 dagen</th>
              <th className={`${th} text-right`}>Totaal</th>
            </tr>
          </thead>
          <tbody>
            {FUNNEL_EVENTS.map((e) => (
              <tr key={e}>
                <td className={td}>
                  <code className="text-xs">{e}</code>
                </td>
                <td className={`${td} tabular text-right`}>{byEvent.get(e)?.week ?? 0}</td>
                <td className={`${td} tabular text-right`}>{byEvent.get(e)?.total ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
      <h2 className="mt-10 text-base font-semibold">Laatste events</h2>
      {recent.length === 0 ? (
        <EmptyState className="mt-3" title="Nog geen events" />
      ) : (
        <ul className="mt-3 divide-y divide-ink-100 rounded-[var(--radius-card)] border border-ink-200 bg-white text-sm">
          {recent.map((r) => (
            <li key={r.id} className="flex flex-wrap justify-between gap-2 px-4 py-2.5">
              <code className="text-xs">{r.event}</code>
              <span className="text-xs text-ink-500">
                {r.subject_type ? `${r.subject_type} · ` : ""}
                {formatDateTime(r.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
