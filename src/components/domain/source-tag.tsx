import { CircleDashed, BadgeCheck, FileCheck2, MessageSquareQuote, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

const SOURCES = {
  zelf: { label: "Zelf ingevuld door de vakman", Icon: CircleDashed, cls: "text-ink-500 border-ink-200 bg-white" },
  admin: { label: "Administratief gecontroleerd", Icon: BadgeCheck, cls: "text-info-700 border-info-100 bg-info-100/40" },
  project: { label: "Projectgegevens (per regel gelabeld)", Icon: FileCheck2, cls: "text-brand-800 border-brand-200 bg-brand-50" },
  ervaring: { label: "Ervaringen van opdrachtgevers", Icon: MessageSquareQuote, cls: "text-warn-700 border-warn-100 bg-warn-50" },
  register: { label: "Openbare registers, door beheer beoordeeld", Icon: Landmark, cls: "text-ink-700 border-ink-300 bg-ink-50" },
} as const;

/** Bronlabel: maakt per sectie duidelijk waar de informatie vandaan komt. */
export function SourceTag({ source, className }: { source: keyof typeof SOURCES; className?: string }) {
  const { label, Icon, cls } = SOURCES[source];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", cls, className)}>
      <Icon className="size-3" aria-hidden /> Bron: {label}
    </span>
  );
}
