import "server-only";
import { sql } from "@/lib/db";
import type { Queryable } from "@/lib/db";

export type ScopeRow = {
  id: string;
  specialty_id: string;
  description: string;
  quantity: number | null;
  unit: string | null;
  confidence: "hoog" | "middel" | "laag" | null;
  source: "ai" | "gebruiker";
};

export type AiSummary = {
  summary?: string;
  property_condition?: string;
  risks?: string[];
  open_questions?: string[];
  assumptions?: string[];
  model?: string;
  analyzed_at?: string;
  demo?: boolean;
};

export async function getScope(projectId: string) {
  return sql<ScopeRow>(
    "select id, specialty_id, description, quantity, unit, confidence, source from project_scope_items where project_id = $1 order by position, created_at",
    [projectId],
  );
}

/** Vervangt de scope van een project en synchroniseert de vakgebieden. */
export async function replaceScope(
  tx: Queryable,
  projectId: string,
  items: { specialty_id: string; description: string; quantity: number | null; unit: string | null; confidence: string | null; source: "ai" | "gebruiker" }[],
) {
  await tx.query("delete from project_scope_items where project_id = $1", [projectId]);
  for (const [i, it] of items.entries()) {
    await tx.query(
      "insert into project_scope_items (project_id, specialty_id, description, quantity, unit, confidence, source, position) values ($1,$2,$3,$4,$5,$6,$7,$8)",
      [projectId, it.specialty_id, it.description, it.quantity, it.unit, it.confidence, it.source, i],
    );
  }
  await tx.query("delete from project_specialties where project_id = $1", [projectId]);
  for (const s of [...new Set(items.map((i) => i.specialty_id))]) {
    await tx.query("insert into project_specialties (project_id, specialty_id) values ($1,$2)", [projectId, s]);
  }
}
