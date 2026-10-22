import { Badge } from "@/components/ui/badge";
import { VOORBEELD_LABEL, ZONDER_BTW } from "@/content/homepage";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Een cel: een bedrag uit de offerte, of een ontbrekende post met wat de andere offertes ervoor rekenen. */
type Cell = { bedrag: number } | { ontbreekt: number };

/**
 * Statische, verzonnen voorbeeldcheck voor de homepage: drie offertes voor dezelfde woning.
 * Offerte A lijkt het goedkoopst, maar mist puin afvoeren, de meterkast en vloer egaliseren.
 * Het bedrag bij een ontbrekende post is het gemiddelde van de andere twee offertes.
 */
const ROWS: { post: string; cells: [Cell, Cell, Cell] }[] = [
  { post: "Sloopwerk", cells: [{ bedrag: 3200 }, { bedrag: 3100 }, { bedrag: 3000 }] },
  { post: "Puin afvoeren", cells: [{ ontbreekt: 1200 }, { bedrag: 1100 }, { bedrag: 1300 }] },
  { post: "Meterkast", cells: [{ ontbreekt: 1900 }, { bedrag: 1800 }, { bedrag: 2000 }] },
  { post: "Stucwerk", cells: [{ bedrag: 6400 }, { bedrag: 6000 }, { bedrag: 6200 }] },
  { post: "Vloer egaliseren", cells: [{ ontbreekt: 1500 }, { bedrag: 1400 }, { bedrag: 1600 }] },
  { post: "Schilderwerk", cells: [{ bedrag: 4400 }, { bedrag: 4200 }, { bedrag: 4000 }] },
];

const COLS = [0, 1, 2] as const;
const inOfferte = (i: number) => ROWS.reduce((sum, r) => sum + ("bedrag" in r.cells[i] ? r.cells[i].bedrag : 0), 0);
const metOntbrekend = (i: number) => ROWS.reduce((sum, r) => sum + ("bedrag" in r.cells[i] ? r.cells[i].bedrag : r.cells[i].ontbreekt), 0);

/** `caption`: de tekst onder het voorbeeld (uit src/content/homepage.ts). */
export function CheckExample({ caption }: { caption: string }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-[var(--shadow-raised)]" aria-label="Voorbeeld van een Offertecheck">
      <div className="flex items-center justify-between gap-2 border-b border-ink-100 bg-ink-50 px-3 py-2.5 sm:px-4">
        <span className="truncate text-xs font-medium text-ink-600">Offertecheck · 3 offertes</span>
        <Badge tone="demo">{VOORBEELD_LABEL}</Badge>
      </div>
      <table className="w-full text-xs sm:text-sm">
        <caption className="sr-only">Drie offertes naast elkaar. Bedragen {ZONDER_BTW}.</caption>
        <thead>
          <tr className="text-ink-500">
            <th scope="col" className="px-3 py-2 text-left font-medium sm:px-4">
              Post
            </th>
            {["A", "B", "C"].map((l) => (
              <th key={l} scope="col" className="px-2 py-2 text-right font-medium sm:px-3">
                Offerte {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.post} className="border-t border-ink-100">
              <th scope="row" className="px-3 py-2 text-left font-normal text-ink-900 sm:px-4">
                {r.post}
              </th>
              {r.cells.map((c, i) => (
                <td key={i} className="px-2 py-2 text-right sm:px-3">
                  {"bedrag" in c ? (
                    <span className="tabular text-ink-800">{formatEuro(c.bedrag)}</span>
                  ) : (
                    <span className="inline-flex flex-col items-end rounded-md bg-danger-50 px-1.5 py-0.5 font-medium text-danger-700 ring-1 ring-danger-100">
                      <span>Ontbreekt</span> <span className="tabular font-normal">± {formatEuro(c.ontbreekt)}</span>
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-ink-200">
            <th scope="row" className="px-3 py-2 text-left font-medium text-ink-700 sm:px-4">
              In de offerte
            </th>
            {COLS.map((i) => (
              <td key={i} className={cn("tabular px-2 py-2 text-right sm:px-3", i === 0 ? "font-semibold text-brand-800" : "text-ink-800")}>
                {formatEuro(inOfferte(i))}
              </td>
            ))}
          </tr>
          <tr className="border-t border-ink-100 bg-ink-50">
            <th scope="row" className="px-3 py-2 text-left font-semibold text-ink-950 sm:px-4">
              Met wat er mist
            </th>
            {COLS.map((i) => (
              <td key={i} className={cn("tabular px-2 py-2 text-right font-semibold sm:px-3", i === 0 ? "text-danger-700" : "text-ink-950")}>
                {formatEuro(metOntbrekend(i))}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
      <figcaption className="border-t border-ink-100 px-3 py-3 text-xs text-ink-600 sm:px-4">
        <p className="text-sm text-ink-800">{caption}</p>
        <p className="mt-1 text-ink-500">Verzonnen offertes. Bedragen {ZONDER_BTW}.</p>
      </figcaption>
    </figure>
  );
}
