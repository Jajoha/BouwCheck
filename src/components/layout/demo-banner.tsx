import { FlaskConical } from "lucide-react";
import { env } from "@/lib/env";

/** Altijd zichtbare melding zolang de applicatie in demo-modus draait. */
export function DemoBanner() {
  if (!env.demoMode) return null;
  return (
    <div className="border-b border-demo-700/20 bg-demo-100 text-demo-700">
      <p className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-1.5 text-xs sm:px-6">
        <FlaskConical className="size-3.5 shrink-0" aria-hidden />
        <span>
          <strong className="font-semibold">Demo-modus:</strong> alle aannemers, cijfers en beoordelingen zijn fictief. Offerteaanvragen worden niet extern verzonden.
        </span>
      </p>
    </div>
  );
}
