import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, TableWrap, td, th } from "@/components/ui/misc";
import { DemoBadge } from "@/components/domain/badges";
import { ContractorStatusControl } from "@/components/admin/admin-widgets";
import { listAllContractors } from "@/lib/data/admin";
import { CONTRACTOR_STATUS } from "@/lib/domain/constants";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Beheer — aannemers" };

export default async function AdminContractors() {
  await requireAdmin("/beheer/aannemers");
  const list = await listAllContractors();
  return (
    <>
      <PageHeader
        title="Aannemers"
        description={`${list.length} profielen. Activeren, deactiveren en gegevens corrigeren.`}
        actions={
          <Button asChild>
            <Link href="/beheer/aannemers/nieuw">
              <Plus aria-hidden /> Uitvoerder toevoegen
            </Link>
          </Button>
        }
      />
      <TableWrap className="mt-6">
        <table className="w-full min-w-[860px]">
          <thead>
            <tr>
              <th className={th}>Bedrijf</th>
              <th className={th}>Status</th>
              <th className={th}>Bedrijfsgegevens</th>
              <th className={th}>Resultaten</th>
              <th className={th}>Account</th>
              <th className={th}>Gewijzigd</th>
              <th className={th}>Acties</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td className={td}>
                  <Link href={`/beheer/aannemers/${c.id}`} className="font-medium text-ink-950 hover:underline">
                    {c.company_name}
                  </Link>
                  <span className="block text-xs text-ink-500">{c.city}</span>
                  {c.is_demo ? <DemoBadge compact className="mt-1" /> : null}
                </td>
                <td className={td}>
                  <Badge tone={c.status === "actief" ? "positive" : c.status === "gedeactiveerd" ? "danger" : "warning"}>{CONTRACTOR_STATUS[c.status as keyof typeof CONTRACTOR_STATUS]}</Badge>
                </td>
                <td className={td}>{c.business_verified ? <Badge tone="positive">Gecontroleerd</Badge> : <Badge tone="muted">Zelf opgegeven</Badge>}</td>
                <td className={`${td} tabular`}>{c.outcomes}</td>
                <td className={`${td} text-xs`}>{c.owner_email ?? "Geen account"}</td>
                <td className={td}>{formatDate(c.updated_at)}</td>
                <td className={td}>
                  <ContractorStatusControl id={c.id} status={c.status} name={c.company_name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}
