import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getCheckByToken } from "@/lib/data/offertecheck";

export const metadata: Metadata = { title: "Teamvoorstel starten", robots: { index: false, follow: false } };

/** Overgang van het rapport naar een teamvoorstel: ingelogd direct door, anders eerst een (gratis) account. */
export default async function StartTeamFromCheckPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const check = await getCheckByToken(token);
  if (!check) notFound();
  const next = `/projecten/nieuw?offertecheck=${token}`;
  const user = await getCurrentUser();
  if (user && user.role !== "aannemer") redirect(next);
  const q = new URLSearchParams({ next, ...(check.email ? { email: check.email } : {}) });
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold text-ink-950">Nog één stap: een gratis account</h1>
      <p className="mt-2 text-ink-600">
        Met een account bewaren we je project en de scope uit je check, en zie je de teamvoorstellen. Je zit nergens aan vast en er is geen betaling.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button asChild size="lg">
          <Link href={`/registreren?${q.toString()}`}>Account aanmaken</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href={`/inloggen?next=${encodeURIComponent(next)}`}>Ik heb al een account</Link>
        </Button>
      </div>
    </div>
  );
}
