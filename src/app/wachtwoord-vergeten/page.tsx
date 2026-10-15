import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { RequestResetForm } from "@/components/auth/reset-forms";

export const metadata: Metadata = { title: "Wachtwoord vergeten" };

export default function ForgotPage() {
  return (
    <AuthCard
      title="Wachtwoord vergeten"
      description="Vul je e-mailadres in om een herstellink aan te vragen."
      footer={
        <Link href="/inloggen" className="text-brand-700 hover:underline">
          Terug naar inloggen
        </Link>
      }
    >
      <RequestResetForm />
    </AuthCard>
  );
}
