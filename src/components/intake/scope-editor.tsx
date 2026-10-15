"use client";

import * as React from "react";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-controls";
import { Badge } from "@/components/ui/badge";
import { SPECIALTIES } from "@/lib/domain/constants";

export type ScopeDraft = {
  key: string;
  specialty_id: string;
  description: string;
  quantity: string;
  unit: string;
  confidence: "hoog" | "middel" | "laag" | null;
  source: "ai" | "gebruiker";
  basis?: string;
};

const UNITS = [
  ["m2", "m²"],
  ["stuk", "stuk"],
  ["meter", "meter"],
  ["project", "project"],
  ["uur", "uur"],
] as const;

const confTone = { hoog: "positive", middel: "info", laag: "warning" } as const;

export function newScopeRow(partial: Partial<ScopeDraft> = {}): ScopeDraft {
  return { key: Math.random().toString(36).slice(2), specialty_id: "", description: "", quantity: "", unit: "", confidence: null, source: "gebruiker", ...partial };
}

/** Zet de bewerkbare rijen om naar het formaat dat de server valideert. */
export function serializeScope(rows: ScopeDraft[]) {
  return JSON.stringify(
    rows.map((r) => {
      const q = r.quantity.trim() === "" ? null : Number(r.quantity.replace(/\./g, "").replace(",", "."));
      return {
        specialty_id: r.specialty_id,
        description: r.description,
        quantity: q !== null && Number.isFinite(q) ? q : null,
        unit: r.unit || null,
        confidence: r.confidence,
        source: r.source,
      };
    }),
  );
}

export function validateScopeRows(rows: ScopeDraft[]): string | null {
  if (rows.length === 0) return "Voeg minimaal één werkzaamheid toe.";
  for (const [i, r] of rows.entries()) {
    if (!r.specialty_id) return `Regel ${i + 1}: kies een vakgebied.`;
    if (r.description.trim().length < 3) return `Regel ${i + 1}: omschrijf de werkzaamheid.`;
    const hasQ = r.quantity.trim() !== "";
    if (hasQ !== Boolean(r.unit)) return `Regel ${i + 1}: vul hoeveelheid én eenheid in, of laat beide leeg.`;
    if (hasQ && !(Number(r.quantity.replace(/\./g, "").replace(",", ".")) > 0)) return `Regel ${i + 1}: hoeveelheid moet een positief getal zijn.`;
  }
  return null;
}

export function ScopeEditor({ rows, onChange }: { rows: ScopeDraft[]; onChange: (rows: ScopeDraft[]) => void }) {
  const update = (key: string, patch: Partial<ScopeDraft>) =>
    // Een door de gebruiker aangepaste AI-regel wordt eigen invoer
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch, source: "gebruiker" as const, confidence: patch.confidence ?? (r.source === "ai" ? null : r.confidence) } : r)));
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {rows.map((r, i) => (
          <li key={r.key} className="rounded-lg border border-ink-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-ink-500">Onderdeel {i + 1}</span>
              <div className="flex items-center gap-1.5">
                {r.source === "ai" ? (
                  <Badge tone={r.confidence ? confTone[r.confidence] : "neutral"} title={r.basis}>
                    <Sparkles aria-hidden /> AI · zekerheid {r.confidence ?? "onbekend"}
                  </Badge>
                ) : (
                  <Badge tone="muted">Eigen invoer</Badge>
                )}
                <Button type="button" variant="ghost" size="icon" aria-label={`Onderdeel ${i + 1} verwijderen`} onClick={() => onChange(rows.filter((x) => x.key !== r.key))}>
                  <Trash2 />
                </Button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-[180px_1fr_110px_120px]">
              <Select aria-label={`Vakgebied onderdeel ${i + 1}`} value={r.specialty_id} onChange={(e) => update(r.key, { specialty_id: e.target.value })}>
                <option value="">Vakgebied…</option>
                {SPECIALTIES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <Input aria-label={`Omschrijving onderdeel ${i + 1}`} value={r.description} placeholder="Bijv. wanden sausklaar stucen" onChange={(e) => update(r.key, { description: e.target.value })} />
              <Input aria-label={`Hoeveelheid onderdeel ${i + 1}`} value={r.quantity} inputMode="decimal" placeholder="Aantal" onChange={(e) => update(r.key, { quantity: e.target.value })} />
              <Select aria-label={`Eenheid onderdeel ${i + 1}`} value={r.unit} onChange={(e) => update(r.key, { unit: e.target.value })}>
                <option value="">Eenheid…</option>
                {UNITS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            {r.source === "ai" && r.basis ? <p className="mt-1.5 text-xs text-ink-500">Basis: {r.basis}</p> : null}
          </li>
        ))}
      </ul>
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, newScopeRow()])}>
          <Plus aria-hidden /> Werkzaamheid toevoegen
        </Button>
      </div>
      <p className="text-xs text-ink-500">
        Hoeveelheden zijn nodig om een kostenindicatie te kunnen maken. Laat ze leeg als je ze niet weet; het team wordt dan wel samengesteld, maar dat onderdeel niet begroot.
      </p>
    </div>
  );
}
