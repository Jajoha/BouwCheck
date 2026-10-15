import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/misc";
import { ProjectForm } from "@/components/projects/project-form";
import { updateProjectAction } from "@/actions/projects";
import { requireFlipper } from "@/lib/auth/session";
import { getProjectForUser } from "@/lib/data/projects";

export const metadata: Metadata = { title: "Project bewerken" };

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireFlipper(`/projecten/${id}/bewerken`);
  const p = await getProjectForUser(id, user);
  if (!p) notFound();
  const action = updateProjectAction.bind(null, p.id);
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-28 sm:px-6">
      <PageHeader title="Project bewerken" description={p.name} />
      <div className="mt-6 rounded-[var(--radius-card)] border border-ink-200 bg-white p-5 sm:p-8">
        <ProjectForm
          mode="edit"
          action={action}
          cancelHref={`/projecten/${p.id}`}
          initial={{
            name: p.name,
            location: p.location,
            province: p.province ?? "",
            property_type: p.property_type,
            renovation_type: p.renovation_type,
            area_m2: p.area_m2?.toString() ?? "",
            budget_amount: p.budget_amount?.toString() ?? "",
            budget_vat_included: p.budget_vat_included,
            desired_start_date: p.desired_start_date ?? "",
            desired_completion_date: p.desired_completion_date ?? "",
            specialty_ids: p.specialty_ids,
            description: p.description,
            material_preferences: p.material_preferences ?? "",
            extra_requirements: p.extra_requirements ?? "",
            status: p.status,
          }}
        />
      </div>
    </div>
  );
}
