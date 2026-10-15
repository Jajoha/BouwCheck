import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { PageHeader, TableWrap, td, th } from "@/components/ui/misc";
import { DemoBadge, projectTone } from "@/components/domain/badges";
import { requireAdmin } from "@/lib/auth/session";
import { listAllProjects } from "@/lib/data/admin";
import { PROJECT_STATUS, type ProjectStatus } from "@/lib/domain/constants";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Beheer — projecten" };

export default async function AdminProjects() {
  await requireAdmin("/beheer/projecten");
  const list = await listAllProjects();
  return (
    <>
      <PageHeader title="Projecten" description="Alle renovatieprojecten (alleen-lezen). Projectinhoud is privé; raadpleeg alleen wanneer nodig voor controle." />
      <TableWrap className="mt-6">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr>
              <th className={th}>Project</th>
              <th className={th}>Eigenaar</th>
              <th className={th}>Status</th>
              <th className={`${th} text-right`}>Budget</th>
              <th className={th}>Shortlist</th>
              <th className={th}>Resultaten</th>
              <th className={th}>Aangemaakt</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td className={td}>
                  <span className="font-medium">{p.name}</span>
                  <span className="block text-xs text-ink-500">{p.location}</span>
                  {p.is_demo ? <DemoBadge compact className="mt-1" /> : null}
                </td>
                <td className={`${td} text-xs`}>
                  {p.owner}
                  <span className="block text-ink-500">{p.owner_email}</span>
                </td>
                <td className={td}>
                  <Badge tone={projectTone[p.status]}>{PROJECT_STATUS[p.status as ProjectStatus]}</Badge>
                </td>
                <td className={`${td} tabular text-right`}>{formatMoney(p.budget_amount, p.budget_vat_included)}</td>
                <td className={`${td} tabular`}>{p.shortlist}</td>
                <td className={`${td} tabular`}>{p.outcomes}</td>
                <td className={td}>{formatDate(p.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}
