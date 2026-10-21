"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const MESSAGES: Record<string, string> = {
  "project-aangemaakt": "Project aangemaakt.",
  "project-bijgewerkt": "Project bijgewerkt.",
  "project-verwijderd": "Project verwijderd.",
  "resultaat-geregistreerd": "Projectresultaat geregistreerd. Het telt mee in statistieken zodra beheer het heeft beoordeeld.",
  "aanvraag-verwijderd": "Offerteaanvraag verwijderd.",
  "profiel-aangemaakt": "Bedrijfsprofiel aangemaakt. Status: in beoordeling, niet geverifieerd.",
  uitgelogd: "Je bent uitgelogd.",
  welkom: "Welkom bij BouwCheck. Je profiel is ingesteld.",
  "wachtwoord-gewijzigd": "Je wachtwoord is gewijzigd. Log opnieuw in.",
  "demo-hersteld": "De demo-data is teruggezet. Log opnieuw in.",
  opgeslagen: "Opgeslagen.",
  "scope-opgeslagen": "Werkzaamheden opgeslagen. De teamvoorstellen zijn opnieuw berekend.",
  "check-verwijderd": "Offertecheck verwijderd, inclusief bestanden.",
};

/** Toont een bevestiging na een redirect (?melding=...) en verwijdert de parameter weer. */
export function FlashToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const key = params.get("melding");
  useEffect(() => {
    if (!key) return;
    const msg = MESSAGES[key];
    if (msg) toast.success(msg, { id: key });
    const next = new URLSearchParams(params.toString());
    next.delete("melding");
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }, [key, params, pathname, router]);
  return null;
}
