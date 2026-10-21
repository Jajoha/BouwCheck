import { AlertTriangle, Ban, CircleHelp, FileWarning, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TableWrap, td, th } from "@/components/ui/misc";
import { formatEuro } from "@/lib/format";
import { specialtyName } from "@/lib/domain/constants";
import { POST_STATUS_LABELS, type PostStatus, type Report } from "@/lib/domain/offertecheck";

const STATUS_TONE: Record<PostStatus, "positive" | "neutral" | "warning" | "danger" | "muted"> = {
  geprijsd: "positive",
  inbegrepen: "neutral",
  stelpost: "warning",
  uitgesloten: "danger",
  ontbreekt: "danger",
};

function Section({ icon: Icon, title, description, children }: { icon: React.ElementType; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-950">
        <Icon className="size-5 text-ink-500" aria-hidden /> {title}
      </h2>
      {description ? <p className="mt-1 text-sm text-ink-600">{description}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** "Vinden we niets? Dan zeggen we dat eerlijk": geen enkel signaal in het rapport. */
export function nothingFound(r: Report) {
  return !r.ontbrekend.length && !r.stelposten.length && !r.uitsluitingen.length && !r.prijsverschillen.length;
}

/** Het rapport van een Offertecheck. `showContractor` alleen in beheer: aannemersnamen zijn intern. */
export function ReportView({ report, showContractor = false }: { report: Report; showContractor?: boolean }) {
  const label = (l: string) => `Offerte ${l}`;
  return (
    <div>
      {report.samenvatting ? <p className="text-base text-ink-800">{report.samenvatting}</p> : null}
      {nothingFound(report) ? (
        <div className="mt-5 rounded-[var(--radius-card)] border border-brand-200 bg-brand-50 p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-brand-800">We vonden niets opvallends</h2>
          <p className="mt-1 text-sm text-ink-700">
            In deze offertes vonden we geen ontbrekende posten, stelposten, uitsluitingen of grote prijsverschillen. Lees wel de voorwaarden en eventuele vragen hieronder.
          </p>
        </div>
      ) : null}
      {report.bevindingen.length ? (
        <div className="mt-5 rounded-[var(--radius-card)] border border-ink-200 bg-ink-50 p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-ink-950">Belangrijkste bevindingen</h2>
          <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink-800">
            {report.bevindingen.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {report.offertes.map((o) => (
          <li key={o.label} className="rounded-[var(--radius-card)] border border-ink-200 bg-white p-4">
            <p className="text-sm font-semibold text-ink-950">{label(o.label)}</p>
            <p className="truncate text-xs text-ink-500" title={o.bestandsnaam}>
              {o.bestandsnaam}
              {showContractor && o.aannemer ? ` · ${o.aannemer}` : ""}
            </p>
            <p className="tabular mt-2 text-xl font-semibold text-ink-950">{o.totaal_excl_btw !== null ? formatEuro(o.totaal_excl_btw) : "Geen totaal"}</p>
            <p className="text-xs text-ink-500">excl. btw, zoals in de offerte</p>
          </li>
        ))}
      </ul>

      <Section icon={Scale} title="Alle posten op één scope" description="Per onderdeel van het werk: wat elke offerte wel en niet bevat. Bedragen excl. btw.">
        <TableWrap>
          <table className="w-full" style={{ minWidth: `${280 + report.offertes.length * 140}px` }}>
            <thead>
              <tr>
                <th className={th}>Post</th>
                {report.offertes.map((o) => (
                  <th key={o.label} className={`${th} text-right`}>
                    {label(o.label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.posten.map((p) => (
                <tr key={p.key}>
                  <td className={td}>
                    {p.omschrijving}
                    <span className="block text-xs text-ink-500">{specialtyName(p.vakgebied)}</span>
                  </td>
                  {p.per_offerte.map((x, i) => (
                    <td key={i} className={`${td} text-right`}>
                      {x.bedrag !== null ? <span className="tabular block font-medium">{formatEuro(x.bedrag)}</span> : null}
                      {x.status !== "geprijsd" ? <Badge tone={STATUS_TONE[x.status]}>{POST_STATUS_LABELS[x.status]}</Badge> : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <p className="mt-2 text-xs text-ink-500">
          <strong>Inbegrepen</strong> = genoemd, maar zonder eigen bedrag. <strong>Stelpost</strong> = voorlopig bedrag, kan hoger uitvallen. <strong>Uitgesloten</strong> = staat
          uitdrukkelijk niet in de prijs.
        </p>
      </Section>

      {report.ontbrekend.length ? (
        <Section icon={FileWarning} title="Ontbrekende posten" description="Posten die een andere offerte wel noemt, met wat die offertes ervoor rekenen: een indicatie van wat het je later kan kosten. Vraag na of dit werk elders zit of echt ontbreekt.">
          <div className="grid gap-3 sm:grid-cols-2">
            {report.ontbrekend.map((m) => (
              <div key={m.offerte} className="rounded-[var(--radius-card)] border border-danger-100 bg-danger-50/40 p-4">
                <p className="text-sm font-semibold text-ink-950">{label(m.offerte)}</p>
                <ul className="mt-1.5 list-disc pl-5 text-sm text-ink-800">
                  {m.posten.map((p, i) => {
                    const range = m.indicaties?.[i];
                    return (
                      <li key={p}>
                        {p}
                        {range ? (
                          <span className="tabular block text-xs text-ink-600">
                            Andere offertes: {range.min === range.max ? formatEuro(range.min) : `${formatEuro(range.min)} – ${formatEuro(range.max)}`} excl. btw
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {report.stelposten.length || report.uitsluitingen.length ? (
        <Section icon={AlertTriangle} title="Stelposten en uitsluitingen" description="Hier zit het risico op meerwerk: het bedrag ligt nog niet vast, of het werk zit niet in de prijs.">
          <ul className="flex flex-col gap-2">
            {report.stelposten.map((s, i) => (
              <li key={`s${i}`} className="rounded-lg border border-warn-100 bg-warn-50/50 p-3 text-sm">
                <span className="flex flex-wrap items-center gap-2">
                  <Badge tone="warning">Stelpost</Badge>
                  <span className="font-medium text-ink-950">{s.omschrijving}</span>
                  <span className="text-ink-500">· {label(s.offerte)}</span>
                  {s.bedrag !== null ? <span className="tabular text-ink-700">· {formatEuro(s.bedrag)}</span> : null}
                </span>
                {s.toelichting ? <span className="mt-1 block text-ink-700">{s.toelichting}</span> : null}
              </li>
            ))}
            {report.uitsluitingen.map((s, i) => (
              <li key={`u${i}`} className="rounded-lg border border-danger-100 bg-danger-50/40 p-3 text-sm">
                <span className="flex flex-wrap items-center gap-2">
                  <Badge tone="danger">
                    <Ban aria-hidden /> Uitgesloten
                  </Badge>
                  <span className="font-medium text-ink-950">{s.omschrijving}</span>
                  <span className="text-ink-500">· {label(s.offerte)}</span>
                </span>
                {s.toelichting ? <span className="mt-1 block text-ink-700">{s.toelichting}</span> : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {report.prijsverschillen.length ? (
        <Section icon={Scale} title="Grote prijsverschillen" description="Posten waar de hoogste prijs minstens anderhalf keer de laagste is. Bij de hoogste prijs betaal je mogelijk te veel; een opvallend lage prijs kan betekenen dat er werk ontbreekt. Vaak zit het verschil in hoeveelheden of kwaliteit.">
          <ul className="flex flex-col gap-2">
            {report.prijsverschillen.map((g) => (
              <li key={g.post} className="flex flex-col gap-0.5 rounded-lg border border-ink-200 bg-white p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-ink-950">{g.post}</span>
                <span className="tabular text-ink-700">
                  {formatEuro(g.laagste.bedrag)} ({label(g.laagste.offerte)}) – {formatEuro(g.hoogste.bedrag)} ({label(g.hoogste.offerte)}) · ×{String(g.factor).replace(".", ",")}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {report.open_vragen.length ? (
        <Section icon={CircleHelp} title="Je onderhandelingslijst" description="De vragen die je aan elke aannemer stelt voordat je tekent.">
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-ink-800">
            {report.open_vragen.map((q, i) => (
              <li key={i}>
                {q.vraag}
                {q.offerte ? <span className="text-ink-500"> ({label(q.offerte)})</span> : null}
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {report.voorwaarden.length ? (
        <Section icon={FileWarning} title="Voorwaarden in de offertes">
          <ul className="list-disc pl-5 text-sm text-ink-700">
            {report.voorwaarden.map((v, i) => (
              <li key={i}>
                {v.omschrijving} <span className="text-ink-500">({label(v.offerte)})</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
