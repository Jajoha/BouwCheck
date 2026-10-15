import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/misc";
import { ScopeForm } from "@/components/intake/scope-form";
import { AiFindings } from "@/components/intake/ai-findings";
import { requireFlipper } from "@/lib/auth/session";
import { getProjectForUser } from "@/lib/data/projects";
import { getScope, type AiSummary } from "@/lib/data/scope";

export const metadata: Metadata = { title: "Werkzaamheden" };

export default async function ScopePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireFlipper(`/projecten/${id}/werkzaamheden`);
  const p = await getProjectForUser(id, user);
  if (!p) notFound();
  const scope = await getScope(p.id);
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-28 sm:px-6">
      <PageHeader eyebrow={p.name} title="Werkzaamheden" description="Pas vakgebieden, omschrijvingen en hoeveelheden aan. De teamvoorstellen worden daarna opnieuw berekend." />
      {p.ai_summary ? (
        <div className="mt-6">
          <AiFindings findings={p.ai_summary as AiSummary} />
        </div>
      ) : null}
      <div className="mt-6 rounded-[var(--radius-card)] border border-ink-200 bg-ink-50/40 p-4 sm:p-6">
        <ScopeForm
          projectId={p.id}
          initial={scope.map((s) => ({
            specialty_id: s.specialty_id,
            description: s.description,
            quantity: s.quantity === null ? "" : String(s.quantity).replace(".", ","),
            unit: s.unit ?? "",
            confidence: s.confidence,
            source: s.source,
          }))}
        />
      </div>
    </div>
  );
}
