import { AlertTriangle, HelpCircle, Info, Home } from "lucide-react";
import { formatDateTime } from "@/lib/format";

export type Findings = {
  summary?: string;
  property_condition?: string;
  risks?: string[];
  open_questions?: string[];
  assumptions?: string[];
  model?: string;
  analyzed_at?: string;
  demo?: boolean;
};

function List({ title, items, icon: Icon, tone }: { title: string; items?: string[]; icon: typeof Info; tone: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className={`flex items-center gap-1.5 text-sm font-semibold ${tone}`}>
        <Icon className="size-4" aria-hidden /> {title}
      </p>
      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink-700">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

/** Bevindingen uit de AI-intake. Altijd gelabeld als AI-inschatting. */
export function AiFindings({ findings }: { findings: Findings }) {
  return (
    <div className="grid gap-4 rounded-lg border border-ink-200 bg-white p-4 md:grid-cols-2">
      {findings.summary ? (
        <div className="md:col-span-2">
          <p className="text-sm text-ink-800">{findings.summary}</p>
          <p className="mt-1 text-xs text-ink-500">
            AI-inschatting{findings.demo ? " (demovoorbeeld, niet door AI gegenereerd)" : ""}
            {findings.analyzed_at ? ` · ${formatDateTime(findings.analyzed_at)}` : ""}
            {findings.model ? ` · ${findings.model}` : ""}
          </p>
        </div>
      ) : null}
      {findings.property_condition ? (
        <div className="md:col-span-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
            <Home className="size-4" aria-hidden /> Staat van de woning
          </p>
          <p className="mt-1 text-sm text-ink-700">{findings.property_condition}</p>
        </div>
      ) : null}
      <List title="Risico's voor budget of planning" items={findings.risks} icon={AlertTriangle} tone="text-warn-700" />
      <List title="Open vragen — uitzoeken vóór offertes" items={findings.open_questions} icon={HelpCircle} tone="text-info-700" />
      <List title="Aannames" items={findings.assumptions} icon={Info} tone="text-ink-700" />
    </div>
  );
}
