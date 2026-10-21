import { DemoBadge } from "@/components/domain/badges";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";

type Cell = { bedrag?: number; status?: "ontbreekt" | "stelpost" | "uitgesloten" };

/** Statische, fictieve voorbeeldcheck voor de homepage: drie offertes naast elkaar op één scope. */
const ROWS: { post: string; cells: [Cell, Cell, Cell] }[] = [
  { post: "Sloopwerk en afvoer", cells: [{ bedrag: 3200 }, { bedrag: 2900 }, { status: "ontbreekt" }] },
  { post: "Stucwerk wanden en plafonds", cells: [{ bedrag: 6400 }, { bedrag: 5800 }, { bedrag: 9900 }] },
  { post: "Badkamer compleet", cells: [{ bedrag: 14500 }, { bedrag: 4000, status: "stelpost" }, { bedrag: 13800 }] },
  { post: "Elektra: groepenkast", cells: [{ bedrag: 1850 }, { status: "uitgesloten" }, { bedrag: 2100 }] },
  { post: "Schilderwerk", cells: [{ bedrag: 4200 }, { bedrag: 3900 }, { bedrag: 4100 }] },
];

const TONE = {
  ontbreekt: "bg-danger-50 text-danger-700 ring-danger-100",
  uitgesloten: "bg-danger-50 text-danger-700 ring-danger-100",
  stelpost: "bg-warn-50 text-warn-700 ring-warn-100",
};
const LABEL = { ontbreekt: "Ontbreekt", uitgesloten: "Uitgesloten", stelpost: "Stelpost" };

export function CheckExample() {
  return (
    <figure className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-[var(--shadow-raised)]" aria-label="Voorbeeld van een Offertecheck">
      <div className="flex items-center justify-between gap-2 border-b border-ink-100 bg-ink-50 px-4 py-2.5">
        <span className="truncate text-xs font-medium text-ink-600">Offertecheck · 3 offertes op één scope</span>
        <DemoBadge compact />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-xs text-ink-500">
              <th className="px-4 py-2 text-left font-medium">Post</th>
              {["A", "B", "C"].map((l) => (
                <th key={l} className="px-3 py-2 text-right font-medium">
                  Offerte {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.post} className="border-t border-ink-100">
                <td className="px-4 py-2.5 text-ink-900">{r.post}</td>
                {r.cells.map((c, i) => (
                  <td key={i} className="px-3 py-2.5 text-right">
                    {c.status ? (
                      <span className={cn("inline-flex flex-col items-end rounded-md px-1.5 py-0.5 text-xs font-medium ring-1", TONE[c.status])}>
                        {LABEL[c.status]}
                        {c.bedrag ? <span className="tabular font-normal">{formatEuro(c.bedrag)}</span> : null}
                      </span>
                    ) : (
                      <span className="tabular text-ink-800">{formatEuro(c.bedrag)}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="space-y-1 border-t border-ink-100 px-4 py-3 text-xs text-ink-600">
        <p>
          <strong className="text-ink-900">Offerte C</strong> mist het sloopwerk. <strong className="text-ink-900">Offerte B</strong> lijkt het goedkoopst, maar rekent de
          badkamer als stelpost en sluit de groepenkast uit.
        </p>
        <p className="text-ink-500">Fictieve voorbeeldofferte (demo). Bedragen excl. btw.</p>
      </figcaption>
    </figure>
  );
}
