import type { Metadata } from "next";
import Link from "next/link";
import { Plus, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { DemoBadge, projectTone } from "@/components/domain/badges";
import { requireFlipper } from "@/lib/auth/session";
import { listProjects } from "@/lib/data/projects";
import { PROJECT_STATUS, specialtyName } from "@/lib/domain/constants";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Renovatieprojecten" };

export default async function ProjectsPage() {
  const user = await requireFlipper("/projecten");
  const projects = await listProjects(user.id);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6">
      <PageHeader
        title="Renovatieprojecten"
        description="Beschrijf je project, zet passende aannemers op de shortlist en leg offertes en resultaten vast."
        actions={
          <Button asChild>
            <Link href="/projecten/nieuw">
              <Plus aria-hidden /> Nieuw project
            </Link>
          </Button>
        }
      />
      {projects.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={FolderKanban}
          title="Je hebt nog geen renovatieprojecten"
          description="Beschrijf je project en voeg foto's toe; je krijgt teamvoorstellen op prijs, snelheid en betrouwbaarheid."
          action={
            <Button asChild>
              <Link href="/projecten/nieuw">Eerste project aanmaken</Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {projects.map((p) => (
            <Link key={p.id} href={`/projecten/${p.id}`} className="group rounded-[var(--radius-card)] border border-ink-200 bg-white p-5 transition-colors hover:border-ink-300">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold text-ink-950 group-hover:underline">{p.name}</h2>
                <Badge tone={projectTone[p.status]}>{PROJECT_STATUS[p.status]}</Badge>
              </div>
              <p className="mt-1 text-sm text-ink-600">
                {p.location} · {p.property_type} · {p.area_m2 ? `${formatNumber(p.area_m2)} m²` : "oppervlak onbekend"}
              </p>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-ink-500">Budget</dt>
                  <dd className="tabular font-medium text-ink-900">{formatMoney(p.budget_amount, p.budget_vat_included)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-500">Start</dt>
                  <dd className="text-ink-900">{formatDate(p.desired_start_date)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-500">Oplevering</dt>
                  <dd className="text-ink-900">{formatDate(p.desired_completion_date)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-ink-500">{p.specialty_ids.map(specialtyName).join(" · ")}</p>
              <div className="mt-3 flex items-center gap-3 border-t border-ink-100 pt-3 text-xs text-ink-600">
                <span>{p.shortlist_count} op shortlist</span>
                <span>{p.quote_count} offertes</span>
                <span>{p.request_count} aanvragen</span>
                {p.is_demo ? <DemoBadge compact className="ml-auto" /> : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
