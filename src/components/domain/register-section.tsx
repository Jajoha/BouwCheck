import { AlertTriangle, Ban, CheckCircle2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SourceTag } from "@/components/domain/source-tag";
import { formatDate } from "@/lib/format";
import { MATCH_BASIS, REGISTER_MAX_AGE_DAYS, SIGNAL_KINDS } from "@/lib/domain/registers";
import type { RegisterState } from "@/lib/data/registers";

/**
 * Openbare registers op het profiel. Toont alleen goedgekeurde signalen, met bron en datum,
 * en óók wanneer er niets is gevonden (met de geraadpleegde registers).
 */
export function RegisterSection({ state, isDemo, kvkNumber }: { state: RegisterState; isDemo: boolean; kvkNumber: string | null }) {
  const { lastCheck, signals, stale } = state;
  return (
    <Card data-testid="register-section">
      <CardHeader>
        <CardTitle>Openbare registers</CardTitle>
        <SourceTag source="register" className="self-start" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {isDemo ? (
          <p className="text-ink-600">
            Demo-profiel: het KvK-nummer is fictief, dus er is niet in echte registers gezocht.
            {signals.length ? " De signalen hieronder zijn fictieve voorbeelden die laten zien hoe dit werkt." : ""}
          </p>
        ) : !lastCheck ? (
          <p className="text-ink-600">
            Nog niet gecontroleerd. {kvkNumber ? "Controle staat gepland." : "Zonder KvK-nummer kan BouwCheck niet in registers controleren."}
          </p>
        ) : (
          <>
            <p className="text-ink-700">
              Laatst gecontroleerd op <strong>{formatDate(lastCheck.created_at)}</strong>
              {stale ? <span className="text-warn-700"> (ouder dan {REGISTER_MAX_AGE_DAYS} dagen)</span> : null}. KvK-nummer {lastCheck.kvk_number}
              {lastCheck.kvk_confirmed ? " is door het register bevestigd." : " kon niet in een officiële bron worden bevestigd."}
            </p>
            {signals.length === 0 ? (
              <p className="flex gap-1.5 text-ink-700">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden />
                Geen bijzonderheden gevonden in de geraadpleegde registers. Dat is geen garantie: niet alles staat online.
              </p>
            ) : null}
            {lastCheck.sources_checked.length ? (
              <details className="text-xs text-ink-600">
                <summary className="cursor-pointer">Geraadpleegde registers ({lastCheck.sources_checked.length})</summary>
                <ul className="mt-1 list-disc pl-4">
                  {lastCheck.sources_checked.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">
                        {s.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        )}
        {signals.map((s) => (
          <div key={s.id} className="rounded-lg border border-ink-200 p-3" data-testid="register-signal">
            <p className="flex items-start gap-1.5 font-medium text-ink-950">
              {s.effect === "uitsluiting" ? (
                <Ban className="mt-0.5 size-4 shrink-0 text-danger-700" aria-hidden />
              ) : (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn-700" aria-hidden />
              )}
              <span>
                {SIGNAL_KINDS[s.kind].label}: {s.title}
              </span>
            </p>
            <p className="mt-1 text-ink-700">{s.summary}</p>
            <p className="mt-1 text-xs text-ink-500">
              {s.event_date ? `${formatDate(s.event_date)} · ` : ""}
              {MATCH_BASIS[s.match_basis]} ·{" "}
              <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline">
                {s.source_name} <ExternalLink className="size-3" aria-hidden />
              </a>
            </p>
            <p className="mt-1 text-xs text-ink-600">
              {s.effect === "uitsluiting"
                ? "Gevolg: niet opgenomen in teamvoorstellen (wel zichtbaar met deze reden)."
                : "Gevolg: waarschuwing bij teamvoorstellen; de vakman blijft gerangschikt."}
            </p>
            {s.contractor_response ? (
              <blockquote className="mt-2 border-l-2 border-ink-300 pl-2 text-xs text-ink-700">
                <span className="font-medium">Reactie van de vakman{s.responded_at ? ` (${formatDate(s.responded_at)})` : ""}:</span> {s.contractor_response}
              </blockquote>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
