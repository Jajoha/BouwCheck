import type { Metadata } from "next";
import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/form-controls";
import { EmptyState, Notice, PageHeader } from "@/components/ui/misc";
import { QuoteRequestForm } from "@/components/quotes/quote-request-form";
import { requireFlipper } from "@/lib/auth/session";
import { getProjectAttachments, getProjectForUser, getShortlist, listProjects } from "@/lib/data/projects";
import { getContractorsByIds } from "@/lib/data/contractors";
import { parseCompareIds } from "@/lib/domain/comparison";

export const metadata: Metadata = { title: "Offerteaanvraag voorbereiden" };

export default async function NewQuoteRequestPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const self = `/offerteaanvragen/nieuw?${new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][])}`;
  const user = await requireFlipper(self);
  const preselected = parseCompareIds([sp.aannemer, sp.aannemers].filter(Boolean).join(","), 10);
  const project = sp.project ? await getProjectForUser(sp.project, user) : null;

  if (!project) {
    const projects = (await listProjects(user.id)).filter((p) => !["opgeleverd", "geannuleerd"].includes(p.status));
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 pb-28 sm:px-6">
        <PageHeader title="Offerteaanvraag voorbereiden" description="Een offerteaanvraag hoort altijd bij een renovatieproject, zodat alle aannemers dezelfde scope ontvangen." />
        {projects.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={FolderKanban}
            title="Maak eerst een renovatieproject aan"
            description="Daarin leg je de scope, planning en het budget vast die in de aanvraag worden gebruikt."
            action={
              <Button asChild>
                <Link href="/projecten/nieuw">Project aanmaken</Link>
              </Button>
            }
          />
        ) : (
          <form method="get" className="mt-6 flex flex-col gap-3 rounded-[var(--radius-card)] border border-ink-200 bg-white p-6">
            {preselected.length ? <input type="hidden" name="aannemers" value={preselected.join(",")} /> : null}
            <Label htmlFor="project">Voor welk project?</Label>
            <Select id="project" name="project" required defaultValue="">
              <option value="" disabled>
                Kies een project
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <div className="flex justify-between gap-2">
              <Button asChild variant="ghost">
                <Link href="/projecten/nieuw">Nieuw project</Link>
              </Button>
              <Button type="submit">Verder</Button>
            </div>
          </form>
        )}
      </div>
    );
  }

  const [shortlist, attachments, extra] = await Promise.all([getShortlist(project.id), getProjectAttachments(project.id), getContractorsByIds(preselected)]);
  const options = new Map<string, { id: string; name: string; checked: boolean; note?: string }>();
  for (const s of shortlist.filter((s) => s.contractor_status === "actief")) {
    options.set(s.contractor_id, { id: s.contractor_id, name: s.company_name, checked: preselected.length ? preselected.includes(s.contractor_id) : s.status === "shortlist" });
  }
  for (const c of extra) {
    if (!options.has(c.id)) options.set(c.id, { id: c.id, name: c.company_name, checked: true, note: "Wordt ook aan de shortlist toegevoegd" });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-28 sm:px-6">
      <PageHeader eyebrow={project.name} title="Offerteaanvraag voorbereiden" description="Stap 1 van 2: gegevens invullen. In stap 2 controleer je de aanvraag voordat je verzendt." />
      <Notice tone="info" className="mt-6">
        BouwCheck verstuurt (nog) geen e-mail. Aannemers met een BouwCheck-account ontvangen de aanvraag in hun portaal; bij andere aannemers wordt de aanvraag
        opgeslagen en duidelijk gemarkeerd als <strong>niet extern verzonden</strong>.
      </Notice>
      <div className="mt-6 rounded-[var(--radius-card)] border border-ink-200 bg-white p-5 sm:p-8">
        <QuoteRequestForm
          d={{
            projectId: project.id,
            contractors: [...options.values()],
            attachments: attachments.map((a) => ({ id: a.id, name: a.file_name })),
            work_description: `${project.description}${project.material_preferences ? `\n\nMateriaalvoorkeur: ${project.material_preferences}` : ""}${project.extra_requirements ? `\nBijzonderheden: ${project.extra_requirements}` : ""}`,
            specialty_ids: project.specialty_ids,
            budget: project.budget_amount?.toString() ?? "",
            budget_vat_included: project.budget_vat_included,
            start: project.desired_start_date ?? "",
            end: project.desired_completion_date ?? "",
            contact_name: user.name,
            contact_email: user.email,
          }}
        />
      </div>
    </div>
  );
}
