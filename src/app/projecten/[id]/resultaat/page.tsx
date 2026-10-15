import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { OutcomeForm } from "@/components/projects/outcome-form";
import { requireFlipper } from "@/lib/auth/session";
import { getProjectForUser, getShortlist } from "@/lib/data/projects";
import { getOutcomesForProject, getQuotesForProject } from "@/lib/data/records";

export const metadata: Metadata = { title: "Projectresultaat registreren" };

export default async function OutcomePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aannemer?: string }> }) {
  const { id } = await params;
  const { aannemer } = await searchParams;
  const user = await requireFlipper(`/projecten/${id}/resultaat`);
  const p = await getProjectForUser(id, user);
  if (!p) notFound();
  const [shortlist, outcomes, quotes] = await Promise.all([getShortlist(p.id), getOutcomesForProject(p.id), getQuotesForProject(p.id)]);
  const done = new Set(outcomes.map((o) => o.contractor_id));
  const contractors = shortlist.filter((s) => !done.has(s.contractor_id)).map((s) => ({ id: s.contractor_id, name: s.company_name }));
  const quote = aannemer ? quotes.find((q) => q.contractor_id === aannemer && q.price_type !== "indicatief") : undefined;
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-28 sm:px-6">
      <PageHeader eyebrow={p.name} title="Projectresultaat registreren" description="Leg vast hoe het project met deze aannemer is verlopen. Bereken afwijkingen pas als begroting én eindbedrag bekend zijn." />
      <div className="mt-6 rounded-[var(--radius-card)] border border-ink-200 bg-white p-5 sm:p-8">
        {contractors.length === 0 ? (
          <EmptyState
            title="Geen aannemers beschikbaar"
            description="Zet eerst een aannemer op de shortlist. Voor aannemers waarvoor al een resultaat is geregistreerd, kun je geen tweede resultaat invoeren."
            action={
              <Button asChild variant="outline">
                <Link href={`/projecten/${p.id}`}>Terug naar project</Link>
              </Button>
            }
          />
        ) : (
          <OutcomeForm
            projectId={p.id}
            contractors={contractors}
            defaultContractor={contractors.some((c) => c.id === aannemer) ? aannemer : undefined}
            defaults={{
              initial_budget: quote ? String(quote.amount) : "",
              planned: p.desired_completion_date ?? "",
              start: p.desired_start_date ?? "",
              specialties: quote?.scope_specialty_ids ?? p.specialty_ids,
            }}
          />
        )}
      </div>
    </div>
  );
}
