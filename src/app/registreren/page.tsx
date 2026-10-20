import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Registreren" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ rol?: string; next?: string; email?: string }> }) {
  const { rol, next, email } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  return (
    <AuthCard
      title={rol === "aannemer" ? "Aanmelden als uitvoerder" : "Account aanmaken"}
      description={
        rol === "aannemer"
          ? "Voor aannemersbedrijven, zzp-vakmensen en klussers. Maak eerst een account aan; daarna vul je je profiel in."
          : "Registreer je om je project te beschrijven en teamvoorstellen te ontvangen."
      }
      footer={
        <>
          Al een account?{" "}
          <Link href={safeNext ? `/inloggen?next=${encodeURIComponent(safeNext)}` : "/inloggen"} className="font-medium text-brand-700 hover:underline">
            Inloggen
          </Link>
        </>
      }
    >
      <RegisterForm role={rol} next={safeNext} email={email?.slice(0, 200)} />
    </AuthCard>
  );
}
