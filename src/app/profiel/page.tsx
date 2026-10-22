import type { Metadata } from "next";
import { PageHeader, DefinitionList, Notice } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { requireUser } from "@/lib/auth/session";
import { USER_ROLES } from "@/lib/domain/constants";
import { aiConfig } from "@/lib/ai/config";
import { getUserUsageThisMonth } from "@/lib/data/ai-usage";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Profiel" };

export default async function ProfilePage() {
  const user = await requireUser("/profiel");
  const usage = await getUserUsageThisMonth(user.id);
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-28 sm:px-6">
      <PageHeader title="Profiel" description="Je accountgegevens en voorkeuren." />
      {user.is_demo ? (
        <Notice tone="demo" className="mt-6">
          Je bent ingelogd met een voorbeeldaccount. Dit account is verzonnen.
        </Notice>
      ) : null}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="py-1">
          <DefinitionList
            items={[
              { term: "E-mailadres", value: user.email },
              { term: "Rol", value: USER_ROLES[user.role] },
              {
                term: "AI-verbruik deze maand",
                value: `${usage.analyses} ${usage.analyses === 1 ? "analyse" : "analyses"} · $ ${usage.costUsd.toFixed(2)} van $ ${aiConfig.monthlyLimitUsd.toFixed(2)} · ${formatNumber(usage.inputTokens + usage.outputTokens)} tokens`,
              },
            ]}
          />
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Gegevens en voorkeuren</CardTitle>
        </CardHeader>
        <CardContent>
          <OnboardingForm
            defaults={{
              name: user.name,
              company: user.company_name ?? "",
              role: user.role,
              region: user.region ?? "",
              types: user.project_types,
              isAdmin: user.role === "beheerder",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
