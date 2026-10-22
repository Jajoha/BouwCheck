import "server-only";
import { sql } from "@/lib/db";
import { PROVINCES } from "@/lib/domain/constants";

export type ProvinceCounts = {
  /** Actieve, niet-fictieve vakmensen die in de provincie werken. */
  echt: number;
  /** Daarvan met goedgekeurde controle van de bedrijfsgegevens (verificatieniveau 1 of hoger). */
  gecontroleerd: number;
};

/**
 * Aantal echte (niet-fictieve) vakmensen per provincie, op basis van het werkgebied.
 * Fictieve vakmensen (`contractors.is_demo`) tellen nooit mee.
 */
export async function countRealContractorsByProvince(): Promise<Record<string, ProvinceCounts>> {
  const rows = await sql<{ province: string; echt: number; gecontroleerd: number }>(
    `select a.province,
            count(distinct c.id)::int as echt,
            count(distinct c.id) filter (where exists (
              select 1 from verification_events v
               where v.contractor_id = c.id and v.verification_type = 'bedrijfsgegevens' and v.status = 'goedgekeurd'
            ))::int as gecontroleerd
       from contractors c join contractor_service_areas a on a.contractor_id = c.id
      where c.status = 'actief' and not c.is_demo
      group by a.province`,
  );
  const counts: Record<string, ProvinceCounts> = Object.fromEntries(PROVINCES.map((p) => [p, { echt: 0, gecontroleerd: 0 }]));
  for (const r of rows) counts[r.province] = { echt: r.echt, gecontroleerd: r.gecontroleerd };
  return counts;
}
