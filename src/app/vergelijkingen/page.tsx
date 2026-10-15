import type { Metadata } from "next";
import Link from "next/link";
import { Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { DeleteComparisonButton } from "@/components/compare/delete-comparison-button";
import { requireFlipper } from "@/lib/auth/session";
import { listComparisons } from "@/lib/data/records";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Vergelijkingen" };

export default async function ComparisonsPage() {
  const user = await requireFlipper("/vergelijkingen");
  const list = await listComparisons(user.id);
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-28 sm:px-6">
      <PageHeader
        title="Opgeslagen vergelijkingen"
        description="Open een vergelijking om de actuele gegevens te zien. Cijfers worden bij het openen opnieuw berekend."
        actions={
          <Button asChild>
            <Link href="/vergelijken">
              <Columns3 aria-hidden /> Nieuwe vergelijking
            </Link>
          </Button>
        }
      />
      {list.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={Columns3}
          title="Nog geen vergelijkingen"
          description="Kies 2 tot 4 aannemers in de database via ‘Vergelijken’ en sla de vergelijking op."
          action={
            <Button asChild variant="outline">
              <Link href="/aannemers">Naar aannemers</Link>
            </Button>
          }
        />
      ) : (
        <ul className="mt-6 divide-y divide-ink-100 rounded-[var(--radius-card)] border border-ink-200 bg-white">
          {list.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0">
                <Link href={`/vergelijken?ids=${c.contractor_ids.join(",")}${c.project_id ? `&project=${c.project_id}` : ""}`} className="font-medium text-ink-950 hover:underline">
                  {c.name}
                </Link>
                <p className="text-sm text-ink-600">{c.contractor_names.join(" · ")}</p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {c.project_name ? `Project: ${c.project_name} · ` : ""}Opgeslagen {formatDate(c.created_at)}
                </p>
                {c.notes ? <p className="mt-1 text-sm text-ink-700">{c.notes}</p> : null}
              </div>
              <DeleteComparisonButton id={c.id} name={c.name} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
