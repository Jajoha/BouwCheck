import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { IntakeWizard } from "@/components/intake/intake-wizard";
import { requireFlipper } from "@/lib/auth/session";
import { aiConfig } from "@/lib/ai/config";
import { getUserUsageThisMonth } from "@/lib/data/ai-usage";
import { getCheckByToken, getCheckLines } from "@/lib/data/offertecheck";
import { scopeFromReport } from "@/lib/domain/offertecheck";
import type { IntakePrefill, IntakeStart } from "@/components/intake/intake-wizard";
import { PRIORITEITEN, VERBOUWINGEN } from "@/content/homepage";
import { PROVINCES } from "@/lib/domain/constants";

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

/** Keuzes uit het hero-formulier op de homepage (?verbouwing=&provincie=&prioriteit=); onbekende waarden vallen weg. */
function startFor(params: { verbouwing?: string; provincie?: string; prioriteit?: string }): { start?: IntakeStart; query: URLSearchParams } {
  const verbouwing = VERBOUWINGEN.find((v) => v.value === params.verbouwing);
  const provincie = PROVINCES.find((p) => p === params.provincie);
  const prioriteit = PRIORITEITEN.find((p) => p.value === params.prioriteit);
  const query = new URLSearchParams();
  if (verbouwing) query.set("verbouwing", verbouwing.value);
  if (provincie) query.set("provincie", provincie);
  if (prioriteit) query.set("prioriteit", prioriteit.value);
  if (!verbouwing && !provincie && !prioriteit) return { query };
  return {
    query,
    start: {
      province: provincie,
      renovationType: verbouwing?.renovatieType || undefined,
      description: verbouwing?.omschrijving || undefined,
      priority: prioriteit ? { value: prioriteit.value, label: prioriteit.label } : undefined,
    },
  };
}

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ offertecheck?: string; verbouwing?: string; provincie?: string; prioriteit?: string }>;
}) {
  const params = await searchParams;
  const token = params.offertecheck && /^[\w-]{40,64}$/.test(params.offertecheck) ? params.offertecheck : undefined;
  const { start, query } = startFor(params);
  if (token) query.set("offertecheck", token);
  // Na inloggen of registreren komen de keuzes uit het hero-formulier mee terug
  const user = await requireFlipper(query.size ? `/projecten/nieuw?${query.toString()}` : "/projecten/nieuw");
  const [usage, prefill] = await Promise.all([getUserUsageThisMonth(user.id), prefillFor(token)]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-28 sm:px-6">
      <PageHeader
        title="Nieuw renovatieproject"
        description="Beschrijf wat er moet gebeuren. Voeg foto's toe als je wilt. Wij maken een lijst met werk. Daarna zie je teams van vakmensen, op prijs, snelheid of betrouwbaarheid."
      />
      <div className="mt-6 rounded-[var(--radius-card)] border border-ink-200 bg-white p-5 sm:p-8">
        <IntakeWizard
          aiEnabled={aiConfig.configured}
          maxPhotos={aiConfig.maxPhotos}
          defaultProvince={user.region ?? ""}
          usage={{ costUsd: usage.costUsd, limitUsd: aiConfig.monthlyLimitUsd }}
          prefill={prefill}
          start={start}
        />
      </div>
    </div>
  );
}
