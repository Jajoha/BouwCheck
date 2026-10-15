import { timingSafeEqual } from "node:crypto";
import { aiConfig } from "@/lib/ai/config";
import { listStaleContractors, runRegisterCheck } from "@/lib/data/registers";

/**
 * Geplande registercontrole (Vercel Cron, zie vercel.json). Controleert per run een klein aantal
 * actieve uitvoerders waarvan de laatste controle ontbreekt of verouderd is. Bevindingen blijven
 * voorstellen tot een beheerder ze beoordeelt.
 *
 * Vercel stuurt `Authorization: Bearer <CRON_SECRET>` mee als CRON_SECRET is ingesteld.
 * Zonder CRON_SECRET is deze route uitgeschakeld.
 */
function authorized(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response("Niet toegestaan", { status: 401 });
  if (!aiConfig.configured) return Response.json({ skipped: "ANTHROPIC_API_KEY ontbreekt" });
  const batch = Math.min(5, Math.max(1, Number(process.env.REGISTER_CRON_BATCH ?? 2) || 2));
  const due = await listStaleContractors(batch);
  const results = [];
  for (const c of due) {
    const res = await runRegisterCheck(c.id, null);
    results.push({ uitvoerder: c.company_name, ok: res.ok, melding: res.message });
  }
  return Response.json({ gecontroleerd: results.length, resultaten: results });
}
