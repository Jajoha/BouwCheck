import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { IntakeWizard } from "@/components/intake/intake-wizard";
import { requireFlipper } from "@/lib/auth/session";
import { aiConfig } from "@/lib/ai/config";
import { getUserUsageThisMonth } from "@/lib/data/ai-usage";

export const metadata: Metadata = { title: "Nieuw renovatieproject" };
// De AI-analyse kan bij veel foto's langer duren dan de standaardlimiet van een serverfunctie.
export const maxDuration = 300;

export default async function NewProjectPage() {
  const user = await requireFlipper("/projecten/nieuw");
  const usage = await getUserUsageThisMonth(user.id);
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-28 sm:px-6">
      <PageHeader
        title="Nieuw renovatieproject"
        description="Beschrijf wat er moet gebeuren en voeg foto's toe. BouwCheck bepaalt de werkzaamheden en stelt teams van aannemers voor, geordend op budget, kwaliteit en snelheid."
      />
      <div className="mt-6 rounded-[var(--radius-card)] border border-ink-200 bg-white p-5 sm:p-8">
        <IntakeWizard
          aiEnabled={aiConfig.configured}
          maxPhotos={aiConfig.maxPhotos}
          defaultProvince={user.region ?? ""}
          usage={{ costUsd: usage.costUsd, limitUsd: aiConfig.monthlyLimitUsd }}
        />
      </div>
    </div>
  );
}
