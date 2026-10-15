import { cn } from "@/lib/utils";
import type { Metric } from "@/lib/domain/metrics";
import { formatDays, formatNumber, formatPercent } from "@/lib/format";

export type MetricKind = "percent" | "signedPercent" | "days" | "signedDays" | "rating";

export function formatMetricValue(m: Metric, kind: MetricKind) {
  if (m.value === null) return null;
  switch (kind) {
    case "percent":
      return formatPercent(m.value);
    case "signedPercent":
      return formatPercent(m.value, { signed: true });
    case "days":
      return formatDays(m.value);
    case "signedDays":
      return `${m.value > 0.5 ? "+" : ""}${formatDays(m.value)}`;
    case "rating":
      return `${formatNumber(m.value, 1)} / 5`;
  }
}

/** Toont een statistiek altijd met het aantal onderliggende waarnemingen, of expliciet dat gegevens ontbreken. */
export function MetricValue({ metric, kind, className, compact }: { metric: Metric; kind: MetricKind; className?: string; compact?: boolean }) {
  if (metric.status !== "ok") {
    return (
      <span className={cn("text-sm text-ink-500", className)}>
        {metric.status === "geen" ? "Onbekend" : "Nog onvoldoende gegevens"}
        {!compact ? (
          <span className="block text-xs text-ink-400">
            {metric.n} van min. {metric.required} {metric.required === 1 ? "waarneming" : "waarnemingen"}
          </span>
        ) : null}
      </span>
    );
  }
  return (
    <span className={cn("tabular text-sm font-semibold text-ink-950", className)}>
      {formatMetricValue(metric, kind)}
      <span className="ml-1 text-xs font-normal text-ink-500">(n={metric.n})</span>
    </span>
  );
}

export function MetricTile({ label, metric, kind, help }: { label: string; metric: Metric; kind: MetricKind; help?: string }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <div className="mt-1.5">
        {metric.status === "ok" ? (
          <p className="tabular text-2xl font-semibold text-ink-950">{formatMetricValue(metric, kind)}</p>
        ) : (
          <p className="text-sm font-medium text-ink-600">{metric.status === "geen" ? "Geen gegevens" : "Nog onvoldoende gegevens"}</p>
        )}
        <p className="mt-1 text-xs text-ink-500">
          {metric.status === "ok" ? `Gebaseerd op ${metric.n} ${metric.n === 1 ? "project" : "projecten"}` : `${metric.n} van minimaal ${metric.required} waarnemingen`}
        </p>
      </div>
      {help ?? metric.method ? <p className="mt-2 border-t border-ink-100 pt-2 text-xs leading-relaxed text-ink-500">{help ?? metric.method}</p> : null}
    </div>
  );
}
