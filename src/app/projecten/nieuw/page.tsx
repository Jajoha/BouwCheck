import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { ProjectForm } from "@/components/projects/project-form";
import { createProjectAction } from "@/actions/projects";
import { requireFlipper } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Nieuw renovatieproject" };

export default async function NewProjectPage() {
  const user = await requireFlipper("/projecten/nieuw");
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-28 sm:px-6">
      <PageHeader title="Nieuw renovatieproject" description="Vier korte stappen. Velden met een * zijn verplicht; de rest kun je later aanvullen." />
      <div className="mt-6 rounded-[var(--radius-card)] border border-ink-200 bg-white p-5 sm:p-8">
        <ProjectForm
          mode="create"
          action={createProjectAction}
          cancelHref="/projecten"
          initial={{
            name: "",
            location: "",
            province: user.region ?? "",
            property_type: "",
            renovation_type: "",
            area_m2: "",
            budget_amount: "",
            budget_vat_included: false,
            desired_start_date: "",
            desired_completion_date: "",
            specialty_ids: [],
            description: "",
            material_preferences: "",
            extra_requirements: "",
          }}
        />
      </div>
    </div>
  );
}
