import { BadgeCheck, FileCheck2, FlaskConical, UserCheck, CircleDashed, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { site } from "@/config/site";
import { AVAILABILITY, PRICE_LEVELS, type AvailabilityStatus, type PriceLevel } from "@/lib/domain/constants";
import { VERIFICATION_LEVELS, type VerificationLevel } from "@/lib/domain/verification";
import { formatDate } from "@/lib/format";

export function DemoBadge({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <Badge tone="demo" className={className} title="Fictief demoprofiel: alle gegevens, cijfers en statussen zijn verzonnen.">
      <FlaskConical aria-hidden />
      {compact ? "Demo-data" : site.demoLabel}
    </Badge>
  );
}

const levelIcon = {
  zelf_opgegeven: CircleDashed,
  bedrijfsgegevens_gecontroleerd: BadgeCheck,
  opdrachtgever_bevestigd: UserCheck,
  projectgegevens_gecontroleerd: FileCheck2,
} as const;

/** Verificatiebadge. Bij demo-records altijd met expliciete "fictief"-markering. */
export function VerificationBadge({ level, isDemo, showDescription }: { level: VerificationLevel; isDemo: boolean; showDescription?: boolean }) {
  const Icon = levelIcon[level];
  const meta = VERIFICATION_LEVELS[level];
  const tone = level === "zelf_opgegeven" ? "muted" : isDemo ? "demo" : "positive";
  return (
    <Badge tone={tone} title={`${meta.description}${isDemo ? " Let op: dit is een fictief demoprofiel; er heeft geen echte controle plaatsgevonden." : ""}`}>
      <Icon aria-hidden />
      {meta.label}
      {isDemo && level !== "zelf_opgegeven" ? <span className="font-normal">(fictief)</span> : null}
      {showDescription ? <span className="sr-only">{meta.description}</span> : null}
    </Badge>
  );
}

export function VerificationBadges({ levels, isDemo }: { levels: VerificationLevel[]; isDemo: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {levels.map((l) => (
        <VerificationBadge key={l} level={l} isDemo={isDemo} />
      ))}
    </div>
  );
}

export function AvailabilityBadge({ status, from }: { status: AvailabilityStatus; from?: string | null }) {
  const meta = AVAILABILITY[status];
  return (
    <Badge tone={meta.tone as "positive" | "neutral" | "warning" | "muted"}>
      <CalendarClock aria-hidden />
      {meta.label}
      {from && status !== "direct" ? <span className="font-normal">· vanaf {formatDate(from)}</span> : null}
    </Badge>
  );
}

export function PriceLevelLabel({ level }: { level: PriceLevel }) {
  const meta = PRICE_LEVELS[level];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm" title={meta.description}>
      <span className="font-semibold tracking-wider text-ink-900">{meta.short}</span>
      <span className="text-ink-600">{meta.label}</span>
    </span>
  );
}

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "positive" | "warning" | "danger" | "info" | "muted" | "demo" | "dark" }) {
  return <Badge tone={tone}>{label}</Badge>;
}

export const quoteRequestTone: Record<string, "neutral" | "positive" | "warning" | "danger" | "info" | "muted"> = {
  concept: "muted",
  klaar: "info",
  verzonden: "neutral",
  reactie: "positive",
  afgerond: "positive",
  geannuleerd: "danger",
};

export const projectTone: Record<string, "neutral" | "positive" | "warning" | "danger" | "info" | "muted"> = {
  concept: "muted",
  orienteren: "info",
  offertes: "neutral",
  in_uitvoering: "warning",
  opgeleverd: "positive",
  geannuleerd: "danger",
};
