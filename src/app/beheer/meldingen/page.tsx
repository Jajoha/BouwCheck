import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { FlagResolveForm } from "@/components/admin/admin-widgets";
import { requireAdmin } from "@/lib/auth/session";
import { listFlags } from "@/lib/data/admin";
import { FLAG_REASONS, FLAG_STATUS } from "@/lib/domain/constants";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Beheer — meldingen" };

export default async function AdminFlags({ searchParams }: { searchParams: Promise<{ alle?: string }> }) {
  await requireAdmin("/beheer/meldingen");
  const { alle } = await searchParams;
  const flags = await listFlags(!alle);
  return (
    <>
      <PageHeader
        title="Meldingen"
        description="Gemelde onjuiste of verdachte gegevens. Zet betwiste projectresultaten via ‘Resultaten & reviews’ op ‘Betwist’ zodat ze niet meetellen."
        actions={
          <Link href={alle ? "/beheer/meldingen" : "/beheer/meldingen?alle=1"} className="text-sm text-brand-700 hover:underline">
            {alle ? "Alleen open meldingen" : "Toon ook afgehandelde"}
          </Link>
        }
      />
      {flags.length === 0 ? (
        <EmptyState className="mt-6" title="Geen meldingen" />
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {flags.map((f) => (
            <li key={f.id} className="rounded-[var(--radius-card)] border border-ink-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-ink-950">
                  {FLAG_REASONS[f.reason as keyof typeof FLAG_REASONS]} · <span className="font-normal">{f.entity_type}</span>
                </p>
                <Badge tone={f.status === "open" ? "warning" : f.status === "in_behandeling" ? "info" : "muted"}>{FLAG_STATUS[f.status as keyof typeof FLAG_STATUS]}</Badge>
              </div>
              <p className="mt-1 text-xs text-ink-500">
                {f.company_name ? (
                  <Link href={`/beheer/aannemers/${f.contractor_id}`} className="hover:underline">
                    {f.company_name}
                  </Link>
                ) : null}{" "}
                · gemeld door {f.reporter ?? "systeem/onbekend"} op {formatDate(f.created_at)}
                {f.entity_type === "projectresultaat" ? (
                  <>
                    {" "}
                    ·{" "}
                    <Link href="/beheer/moderatie?filter=alle" className="text-brand-700 hover:underline">
                      naar resultaten
                    </Link>
                  </>
                ) : null}
              </p>
              <p className="mt-2 text-sm text-ink-800">{f.details}</p>
              <div className="mt-3">
                <FlagResolveForm id={f.id} status={f.status} resolution={f.resolution} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
