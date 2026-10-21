import type { Metadata } from "next";
import { EmptyState, Notice, PageHeader, TableWrap, td, th } from "@/components/ui/misc";
import { RegionSeatsInput, ReservationStatusSelect } from "@/components/admin/founding-widgets";
import { requireAdmin } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { listRegionSeats, listReservations } from "@/lib/data/founding";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Beheer — founding members" };

export default async function AdminFoundingMembers() {
  await requireAdmin("/beheer/founding-members");
  const [regions, reservations] = await Promise.all([listRegionSeats(), listReservations()]);
  return (
    <>
      <PageHeader
        title="Founding members"
        description="Aanvragen van /founding-members. Een plek is pas bezet bij status ‘gereserveerd’ (handmatig, of later na een aanbetaling)."
      />
      {!env.features.foundingMembers ? (
        <Notice tone="warning" className="mt-4">
          <code>FEATURE_FOUNDING_MEMBERS</code> staat uit: de pagina is niet bereikbaar voor bezoekers.
        </Notice>
      ) : null}
      <h2 className="mt-8 text-base font-semibold">Aanvragen ({reservations.length})</h2>
      {reservations.length === 0 ? (
        <EmptyState className="mt-3" title="Nog geen aanvragen" />
      ) : (
        <TableWrap className="mt-3">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr>
                <th className={th}>Datum</th>
                <th className={th}>Contact</th>
                <th className={th}>Regio</th>
                <th className={`${th} text-right`}>Projecten/jaar</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id}>
                  <td className={`${td} text-xs`}>{formatDate(r.created_at)}</td>
                  <td className={td}>
                    {r.naam}
                    <span className="block text-xs text-ink-500">{r.email}</span>
                  </td>
                  <td className={td}>{r.regio}</td>
                  <td className={`${td} tabular text-right`}>{r.projecten_per_jaar}</td>
                  <td className={td}>
                    <ReservationStatusSelect key={r.status} id={r.id} status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
      <h2 className="mt-10 text-base font-semibold">Plekken per regio</h2>
      <TableWrap className="mt-3">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr>
              <th className={th}>Regio</th>
              <th className={`${th} text-right`}>Bezet</th>
              <th className={`${th} text-right`}>Vrij</th>
              <th className={th}>Plekken</th>
            </tr>
          </thead>
          <tbody>
            {regions.map((r) => (
              <tr key={r.regio}>
                <td className={td}>{r.regio}</td>
                <td className={`${td} tabular text-right`}>{r.bezet}</td>
                <td className={`${td} tabular text-right`}>{r.vrij}</td>
                <td className={td}>
                  <RegionSeatsInput regio={r.regio} plekken={r.plekken} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}
