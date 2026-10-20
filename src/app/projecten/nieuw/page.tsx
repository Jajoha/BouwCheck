import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { IntakeWizard } from "@/components/intake/intake-wizard";
import { requireFlipper } from "@/lib/auth/session";
import { aiConfig } from "@/lib/ai/config";
import { getUserUsageThisMonth } from "@/lib/data/ai-usage";
import { getCheckByToken, getCheckLines } from "@/lib/data/offertecheck";
import { scopeFromReport } from "@/lib/domain/offertecheck";
import type { IntakePrefill } from "@/components/intake/intake-wizard";

export const metadata: Metadata = { title: "Nieuw renovatieproject" };
// maxDuration staat in de root-layout (zie daar waarom niet per pagina).

/** Met ?offertecheck=<token> staat de scope uit een Offertecheck al klaar. */
async function prefillFor(token: string | undefined): Promise<IntakePrefill | undefined> {
  if (!token) return undefined;
  const check = await getCheckByToken(token);
  if (!check?.rapport_json) return undefined;
  const scope = scopeFromReport(check.rapport_json, await getCheckLines(check.id));
  if (!scope.length) return undefined;
  return { offertecheckToken: token, description: check.projectomschrijving ?? "", province: check.provincie, scope };
}

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ offertecheck?: string }> }) {
  const { offertecheck } = await searchParams;
  const token = offertecheck && /^[\w-]{40,64}$/.test(offertecheck) ? offertecheck : undefined;
  const user = await requireFlipper(token ? `/projecten/nieuw?offertecheck=${token}` : "/projecten/nieuw");
  const [usage, prefill] = await Promise.all([getUserUsageThisMonth(user.id), prefillFor(token)]);
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
          prefill={prefill}
        />
      </div>
    </div>
  );
}
