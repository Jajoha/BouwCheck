import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth/session";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Inloggen" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(user.role === "aannemer" ? "/portaal" : user.role === "beheerder" ? "/beheer" : "/dashboard");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  return (
    <AuthCard
      title="Inloggen bij BouwCheck"
      description="Beheer je renovatieprojecten, teamvoorstellen en offerteaanvragen."
      footer={
        <>
          Nog geen account?{" "}
          <Link href={safeNext ? `/registreren?next=${encodeURIComponent(safeNext)}` : "/registreren"} className="font-medium text-brand-700 hover:underline">
            Registreren
          </Link>
        </>
      }
    >
      <LoginForm next={safeNext} demoMode={env.demoMode} />
    </AuthCard>
  );
}
