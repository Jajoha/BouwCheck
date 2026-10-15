import type { Metadata } from "next";
import { Notice, PageHeader } from "@/components/ui/misc";
import { ResetDemoButton } from "@/components/admin/admin-widgets";
import { requireAdmin } from "@/lib/auth/session";
import { getDb, sqlOne } from "@/lib/db";
import { env } from "@/lib/env";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/db/seed";

export const metadata: Metadata = { title: "Beheer — demo-data" };

export default async function AdminDemo() {
  await requireAdmin("/beheer/demo-data");
  const db = await getDb();
  const counts = await sqlOne<{ contractors: number; projects: number; outcomes: number; reviews: number; users: number }>(
    `select (select count(*)::int from contractors where is_demo) as contractors, (select count(*)::int from projects where is_demo) as projects,
            (select count(*)::int from project_outcomes where is_demo) as outcomes, (select count(*)::int from reviews where is_demo) as reviews,
            (select count(*)::int from users where is_demo) as users`,
  );
  const canReset = env.demoMode && db.driver === "pglite";
  return (
    <>
      <PageHeader title="Demo-data" description="Alle demo-records hebben is_demo = true en worden overal gelabeld als ‘Demo-data — niet geverifieerd’." />
      <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {Object.entries(counts ?? {}).map(([k, v]) => (
          <div key={k} className="rounded-[var(--radius-card)] border border-ink-200 bg-white p-4">
            <dt className="text-xs text-ink-500">Demo-{k}</dt>
            <dd className="tabular mt-1 text-2xl font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Notice tone="info" title="Demo-accounts">
          <ul className="mt-1 space-y-0.5">
            <li>Vastgoedflipper: {DEMO_ACCOUNTS.flipper}</li>
            <li>Aannemer: {DEMO_ACCOUNTS.contractor}</li>
            <li>Beheerder: {DEMO_ACCOUNTS.admin}</li>
            <li>Wachtwoord (alle): {env.demoMode ? DEMO_PASSWORD : "verborgen buiten demo-modus"}</li>
          </ul>
        </Notice>
        <div className="rounded-[var(--radius-card)] border border-ink-200 bg-white p-5">
          <h2 className="font-semibold">Demo terugzetten</h2>
          <p className="mt-1 text-sm text-ink-600">Handig vóór een nieuwe demonstratie. Verwijdert alle lokale gegevens en laadt de standaard demo-data opnieuw.</p>
          <div className="mt-4">
            {canReset ? <ResetDemoButton /> : <Notice tone="warning">Alleen beschikbaar in de lokale demo-modus (PGlite). Op een productiedatabase is terugzetten uitgeschakeld.</Notice>}
          </div>
        </div>
      </div>
    </>
  );
}
