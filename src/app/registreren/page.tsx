import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Registreren" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ rol?: string }> }) {
  const { rol } = await searchParams;
  return (
    <AuthCard
      title={rol === "aannemer" ? "Bedrijf aanmelden" : "Account aanmaken"}
      description={
        rol === "aannemer"
          ? "Maak eerst een account aan. Daarna kies je de rol ‘Aannemer’ en vul je je bedrijfsprofiel in."
          : "Registreer je om projecten, vergelijkingen en offerteaanvragen op te slaan."
      }
      footer={
        <>
          Al een account?{" "}
          <Link href="/inloggen" className="font-medium text-brand-700 hover:underline">
            Inloggen
          </Link>
        </>
      }
    >
      <RegisterForm role={rol} />
    </AuthCard>
  );
}
