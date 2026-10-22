import Link from "next/link";
import { ArrowRight, Check, FileSearch, KeyRound, Layers, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { homepage } from "@/content/homepage";
import { cn } from "@/lib/utils";

const ICON = { teamvoorstel: Users, offertecheck: FileSearch, projectpas: KeyRound, pro: Layers } as const;

/**
 * De vier prijskaarten; dezelfde tekst op de homepage (#prijzen) en op /prijzen, met ankers per kaart.
 * Zonder FEATURE_OFFERTECHECK valt de Offertecheck-kaart weg.
 */
export function PrijsKaarten({ headingLevel = "h3", className, offertecheck }: { headingLevel?: "h2" | "h3"; className?: string; offertecheck: boolean }) {
  const Heading = headingLevel;
  const kaarten = homepage.prijzen.kaarten.filter((k) => offertecheck || k.id !== "offertecheck");
  return (
    <ul className={cn("grid gap-4 md:grid-cols-2", kaarten.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3", className)}>
      {kaarten.map((k) => {
        const Icon = ICON[k.id];
        const uitgelicht = "markering" in k;
        const gratis = k.prijs === "Gratis";
        return (
          <li
            key={k.id}
            id={k.id}
            className={cn(
              "relative flex scroll-mt-24 flex-col rounded-2xl p-6",
              uitgelicht
                ? "bg-ink-950 text-white shadow-[var(--shadow-float)] xl:-my-3 xl:py-9"
                : "border border-ink-200 bg-white transition duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-raised)]",
            )}
          >
            {uitgelicht ? (
              <p className="absolute -top-3 left-6">
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-400 px-3 py-1 text-xs font-bold text-ink-950 shadow-sm">
                  <Check className="size-3.5" strokeWidth={3} aria-hidden />
                  {k.markering}
                </span>
              </p>
            ) : null}
            <span className={cn("flex size-11 items-center justify-center rounded-xl", uitgelicht ? "bg-white/10 text-accent-400" : "bg-brand-50 text-brand-700 ring-1 ring-brand-200")} aria-hidden>
              <Icon className="size-5" />
            </span>
            <Heading className={cn("mt-5 font-display text-xl font-semibold", uitgelicht ? "text-white" : "text-ink-950")}>{k.naam}</Heading>
            <p className={cn("mt-1.5", uitgelicht ? "text-ink-300" : "text-ink-600")}>{k.tekst}</p>
            <p className="mt-5">
              <span className={cn("tabular font-display text-4xl font-bold tracking-tight", uitgelicht ? "text-white" : gratis ? "text-brand-700" : "text-ink-950")}>{k.prijs}</span>
              {k.prijsToelichting ? <span className={cn("mt-1 block text-sm", uitgelicht ? "text-ink-300" : "text-ink-500")}> {k.prijsToelichting}</span> : null}
            </p>
            <div className="flex-1" />
            <Button asChild className="mt-6 h-auto min-h-11 whitespace-normal py-2.5" variant={uitgelicht ? "accent" : "outline"}>
              <Link href={k.knop.href}>
                {k.knop.label} <ArrowRight aria-hidden />
              </Link>
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
