import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Je profiel instellen" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ rol?: string; next?: string }> }) {
  const user = await requireUser("/onboarding");
  const { rol, next } = await searchParams;
  return (
    <AuthCard title="Welkom bij BouwCheck" description="Nog een paar vragen, zodat we passende aannemers en projecten kunnen tonen. Je kunt dit later aanpassen.">
      <OnboardingForm
        defaults={{
          name: user.name,
          company: user.company_name ?? "",
          role: rol === "aannemer" ? "aannemer" : user.role,
          region: user.region ?? "",
          types: user.project_types,
          isAdmin: user.role === "beheerder",
          next: next && next.startsWith("/") && !next.startsWith("//") ? next : undefined,
        }}
      />
    </AuthCard>
  );
}
