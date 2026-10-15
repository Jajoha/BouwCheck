import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader, TableWrap, td, th } from "@/components/ui/misc";
import { ContractorStatusControl, LeadStatusSelect } from "@/components/admin/admin-widgets";
import { requireAdmin } from "@/lib/auth/session";
import { listAllContractors, listLeads } from "@/lib/data/admin";
import { LEAD_TYPES } from "@/lib/domain/constants";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Beheer — aanmeldingen" };

export default async function AdminSignups() {
  await requireAdmin("/beheer/aanmeldingen");
  const [contractors, leads] = await Promise.all([listAllContractors(), listLeads()]);
  const pending = contractors.filter((c) => c.status === "in_beoordeling");
  return (
    <>
      <PageHeader title="Aanmeldingen" description="Nieuwe aannemersprofielen en interesse-aanvragen van de prijspagina en het contactformulier." />
      <h2 className="mt-6 text-base font-semibold">Nieuwe aannemersprofielen ({pending.length})</h2>
      {pending.length === 0 ? (
        <EmptyState className="mt-3" title="Geen profielen te beoordelen" />
      ) : (
        <ul className="mt-3 divide-y divide-ink-100 rounded-[var(--radius-card)] border border-ink-200 bg-white">
          {pending.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link href={`/beheer/aannemers/${c.id}`} className="font-medium text-ink-950 hover:underline">
                  {c.company_name}
                </Link>
                <p className="text-xs text-ink-500">
                  {c.city} · account: {c.owner_email ?? "geen"} · {formatDate(c.updated_at)}
                </p>
              </div>
              <ContractorStatusControl id={c.id} status={c.status} name={c.company_name} />
            </li>
          ))}
        </ul>
      )}
      <h2 className="mt-10 text-base font-semibold">Interesse en contact ({leads.length})</h2>
      <TableWrap className="mt-3">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr>
              <th className={th}>Datum</th>
              <th className={th}>Type</th>
              <th className={th}>Contact</th>
              <th className={th}>Bericht</th>
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id}>
                <td className={`${td} whitespace-nowrap`}>{formatDate(l.created_at)}</td>
                <td className={td}>{LEAD_TYPES[l.lead_type as keyof typeof LEAD_TYPES]}</td>
                <td className={`${td} text-xs`}>
                  {l.name}
                  <span className="block text-ink-500">{l.email}</span>
                  {l.company ? <span className="block text-ink-500">{l.company}</span> : null}
                </td>
                <td className={`${td} max-w-md text-xs`}>{l.message ?? "—"}</td>
                <td className={td}>
                  <LeadStatusSelect id={l.id} status={l.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}
