import type { Metadata } from "next";
import { UnsubscribeForm } from "@/components/admin/email-widgets";

export const metadata: Metadata = { title: "Afmelden" };

/**
 * Afmelden voor opvolgmails. Bewust een knop in plaats van afmelden bij openen:
 * virusscanners in mailclients openen links automatisch.
 */
export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold text-ink-950">Afmelden voor opvolgmails</h1>
      <p className="mt-2 text-ink-600">
        Je ontvangt daarna geen opvolgmails meer van BouwCheck. Berichten over een dienst die je zelf hebt aangevraagd (zoals je rapport) blijven we sturen.
      </p>
      <div className="mt-6 flex justify-center">
        <UnsubscribeForm token={token} />
      </div>
    </div>
  );
}
