import "server-only";
import { sql, sqlOne } from "@/lib/db";
import { freeSeats } from "@/lib/domain/ladder";

export type RegionSeats = { regio: string; plekken: number; bezet: number; vrij: number };

/** Plekken per regio uit de database; bezet = reserveringen met status 'gereserveerd'. */
export async function listRegionSeats(): Promise<RegionSeats[]> {
  const rows = await sql<{ regio: string; plekken: number; bezet: number }>(
    `select r.regio, r.plekken, count(f.id) filter (where f.status = 'gereserveerd')::int as bezet
       from founding_member_regios r left join founding_member_reserveringen f on f.regio = r.regio
      group by r.regio, r.plekken, r.sort_order order by r.sort_order, r.regio`,
  );
  return rows.map((r) => ({ ...r, vrij: freeSeats(r.plekken, r.bezet) }));
}

export async function createReservation(input: { naam: string; email: string; regio: string; projecten_per_jaar: number; userId: string | null }) {
  const region = await sqlOne("select 1 as x from founding_member_regios where regio = $1", [input.regio]);
  if (!region) return null;
  return sqlOne<{ id: string }>(
    "insert into founding_member_reserveringen (naam, email, regio, projecten_per_jaar, user_id) values ($1,$2,$3,$4,$5) returning id",
    [input.naam, input.email, input.regio, input.projecten_per_jaar, input.userId],
  );
}

export async function listReservations() {
  return sql<{ id: string; created_at: string; naam: string; email: string; regio: string; projecten_per_jaar: number; status: string }>(
    "select id, created_at::text, naam, email, regio, projecten_per_jaar, status from founding_member_reserveringen order by created_at desc limit 500",
  );
}

export type CaseRow = { id: string; titel: string; regio: string | null; samenvatting: string; resultaat: string | null; gepubliceerd: boolean };

export async function listPublishedCases() {
  return sql<CaseRow>("select id, titel, regio, samenvatting, resultaat, gepubliceerd from cases where gepubliceerd order by sort_order, created_at desc limit 6");
}

export async function listAllCases() {
  return sql<CaseRow>("select id, titel, regio, samenvatting, resultaat, gepubliceerd from cases order by created_at desc");
}
