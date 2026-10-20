import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { CaseControls, CaseForm } from "@/components/admin/founding-widgets";
import { requireAdmin } from "@/lib/auth/session";
import { listAllCases } from "@/lib/data/founding";

export const metadata: Metadata = { title: "Beheer — cases" };

export default async function AdminCases() {
  await requireAdmin("/beheer/cases");
  const cases = await listAllCases();
  return (
    <>
      <PageHeader title="Cases" description="Echte projecten voor het bewijsblok op de homepage. Het blok verschijnt pas als er minstens één case gepubliceerd is. Alleen met toestemming van de opdrachtgever." />
      <div className="mt-6 rounded-[var(--radius-card)] border border-ink-200 bg-white p-4 sm:p-5">
        <CaseForm />
      </div>
      {cases.length === 0 ? (
        <EmptyState className="mt-6" title="Nog geen cases" />
      ) : (
        <ul className="mt-6 divide-y divide-ink-100 rounded-[var(--radius-card)] border border-ink-200 bg-white">
          {cases.map((c) => (
            <li key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-medium text-ink-950">
                  {c.titel} <Badge tone={c.gepubliceerd ? "positive" : "muted"}>{c.gepubliceerd ? "Gepubliceerd" : "Verborgen"}</Badge>
                </p>
                <p className="mt-1 text-sm text-ink-600">{c.samenvatting}</p>
              </div>
              <CaseControls id={c.id} published={c.gepubliceerd} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
