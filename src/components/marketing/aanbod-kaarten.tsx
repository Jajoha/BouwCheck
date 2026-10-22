import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { homepage } from "@/content/homepage";
import { cn } from "@/lib/utils";

/**
 * De vier prijskaarten; dezelfde tekst op de homepage (#prijzen) en op /prijzen, met ankers per kaart.
 * Zonder FEATURE_OFFERTECHECK valt de Offertecheck-kaart weg.
 */
export function PrijsKaarten({ headingLevel = "h3", className, offertecheck }: { headingLevel?: "h2" | "h3"; className?: string; offertecheck: boolean }) {
  const Heading = headingLevel;
  const kaarten = homepage.prijzen.kaarten.filter((k) => offertecheck || k.id !== "offertecheck");
  return (
    <ul className={cn("grid gap-4 md:grid-cols-2", kaarten.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3", className)}>
      {kaarten.map((k) => (
        <li
          key={k.id}
          id={k.id}
          className={cn("flex scroll-mt-24 flex-col rounded-xl border bg-white p-5", "markering" in k ? "border-ink-900 shadow-[var(--shadow-raised)]" : "border-ink-200")}
        >
          {"markering" in k ? (
            <p className="mb-3">
              <Badge tone="dark" className="whitespace-normal">
                {k.markering}
              </Badge>
            </p>
          ) : null}
          <Heading className="text-lg font-semibold text-ink-950">{k.naam}</Heading>
          <p className="mt-1.5 text-ink-700">{k.tekst}</p>
          <p className="mt-4">
            <span className="tabular text-2xl font-semibold text-ink-950">{k.prijs}</span>
            {k.prijsToelichting ? <span className="ml-1.5 text-sm text-ink-600"> {k.prijsToelichting}</span> : null}
          </p>
          <div className="flex-1" />
          <Button asChild className="mt-5 h-auto min-h-10 whitespace-normal py-2" variant={"markering" in k ? "primary" : "outline"}>
            <Link href={k.knop.href}>{k.knop.label}</Link>
          </Button>
        </li>
      ))}
    </ul>
  );
}
