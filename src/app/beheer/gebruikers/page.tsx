import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { PageHeader, TableWrap, td, th } from "@/components/ui/misc";
import { DemoBadge } from "@/components/domain/badges";
import { UserActiveToggle, UserRoleSelect } from "@/components/admin/admin-widgets";
import { requireAdmin } from "@/lib/auth/session";
import { listUsers } from "@/lib/data/admin";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Beheer — gebruikers" };

export default async function AdminUsers() {
  const me = await requireAdmin("/beheer/gebruikers");
  const users = await listUsers();
  return (
    <>
      <PageHeader title="Gebruikers" description="Rollen beheren en accounts blokkeren. Je kunt je eigen rol en account niet wijzigen." />
      <TableWrap className="mt-6">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr>
              <th className={th}>Naam</th>
              <th className={th}>E-mail</th>
              <th className={th}>Rol</th>
              <th className={th}>Projecten</th>
              <th className={th}>Status</th>
              <th className={th}>Sinds</th>
              <th className={th}>
                <span className="sr-only">Acties</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className={td}>
                  {u.name}
                  {u.company_name ? <span className="block text-xs text-ink-500">{u.company_name}</span> : null}
                  {u.is_demo ? <DemoBadge compact className="mt-1" /> : null}
                </td>
                <td className={`${td} text-xs`}>{u.email}</td>
                <td className={td}>
                  <UserRoleSelect id={u.id} role={u.role} disabled={u.id === me.id} />
                </td>
                <td className={`${td} tabular`}>{u.projects}</td>
                <td className={td}>{u.is_active ? <Badge tone="positive">Actief</Badge> : <Badge tone="danger">Geblokkeerd</Badge>}</td>
                <td className={td}>{formatDate(u.created_at)}</td>
                <td className={td}>
                  <UserActiveToggle id={u.id} active={u.is_active} name={u.name} disabled={u.id === me.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}
