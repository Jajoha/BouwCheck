import type { Metadata } from "next";
import Link from "next/link";
import { Notice, PageHeader, TableWrap, td, th } from "@/components/ui/misc";
import { getDb } from "@/lib/db";
import { pendingMigrations } from "@/lib/db/migrate";
import { getAdminCounts, listAdminActions } from "@/lib/data/admin";
import { formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Beheer" };

export default async function AdminHome() {
  await requireAdmin("/beheer");
  const [c, actions, pending] = await Promise.all([getAdminCounts(), listAdminActions(25), getDb().then(pendingMigrations)]);
  const tiles = [
    { label: "Actieve aannemers", value: c.contractors, href: "/beheer/aannemers" },
    { label: "Aanmeldingen te beoordelen", value: c.pending_contractors, href: "/beheer/aanmeldingen", attention: c.pending_contractors > 0 },
    { label: "Verificatieverzoeken", value: c.pending_verifications, href: "/beheer/verificaties", attention: c.pending_verifications > 0 },
    { label: "Resultaten te modereren", value: c.pending_outcomes, href: "/beheer/moderatie", attention: c.pending_outcomes > 0 },
    { label: "Open meldingen", value: c.open_flags, href: "/beheer/meldingen", attention: c.open_flags > 0 },
    { label: "Nieuwe leads", value: c.new_leads, href: "/beheer/aanmeldingen", attention: c.new_leads > 0 },
    { label: "Gebruikers", value: c.users, href: "/beheer/gebruikers" },
    { label: "Projecten", value: c.projects, href: "/beheer/projecten" },
    { label: "Offerteaanvragen", value: c.quote_requests, href: "/beheer/offerteaanvragen" },
    { label: "Gedeactiveerde aannemers", value: c.inactive_contractors, href: "/beheer/aannemers" },
  ];
  return (
    <>
      <PageHeader title="Beheer" description="Werkvoorraad en recente beheeracties. Alle acties worden gelogd." />
      {pending.length ? (
        <Notice tone="danger" className="mt-6" title={`Database niet bijgewerkt: ${pending.length} ${pending.length === 1 ? "migratie ontbreekt" : "migraties ontbreken"}`}>
          Nieuwe onderdelen (zoals Offertecheck, founding members of e-mail) werken pas na migreren. Ontbrekend: {pending.join(", ")}. Op Vercel migreren preview-deploys alleen
          met <code>MIGRATE_ON_PREVIEW=true</code>; anders <code>npm run db:migrate</code> met de databaseverbinding van deze omgeving.
        </Notice>
      ) : null}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className={`rounded-[var(--radius-card)] border bg-white p-4 hover:border-ink-300 ${t.attention ? "border-warn-700/40" : "border-ink-200"}`}>
            <p className="text-xs text-ink-500">{t.label}</p>
            <p className={`tabular mt-1 text-2xl font-semibold ${t.attention ? "text-warn-700" : "text-ink-950"}`}>{t.value}</p>
          </Link>
        ))}
      </div>
      <h2 className="mt-10 text-base font-semibold text-ink-950">Beheerlog</h2>
      <TableWrap className="mt-3">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr>
              <th className={th}>Tijdstip</th>
              <th className={th}>Beheerder</th>
              <th className={th}>Actie</th>
              <th className={th}>Object</th>
              <th className={th}>Details</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => (
              <tr key={a.id}>
                <td className={`${td} whitespace-nowrap`}>{formatDateTime(a.created_at)}</td>
                <td className={td}>{a.admin_name ?? "—"}</td>
                <td className={td}>{a.action.replaceAll("_", " ")}</td>
                <td className={td}>{a.entity_type}</td>
                <td className={`${td} text-xs text-ink-500`}>{Object.keys(a.details ?? {}).length ? JSON.stringify(a.details) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}
