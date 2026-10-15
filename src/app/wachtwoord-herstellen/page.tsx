import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-forms";
import { Notice } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Wachtwoord herstellen" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthCard title="Nieuw wachtwoord instellen">
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <Notice tone="warning">
          Deze link is onvolledig. <Link href="/wachtwoord-vergeten">Vraag een nieuwe herstellink aan</Link>.
        </Notice>
      )}
    </AuthCard>
  );
}
