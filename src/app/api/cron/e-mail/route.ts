import { timingSafeEqual } from "node:crypto";
import { processDueEmails } from "@/lib/email";
import { purgeStaleConcepts } from "@/lib/data/offertecheck";

/**
 * Dagelijks onderhoud (Vercel Cron, zie vercel.json): verstuurt geplande e-mails (opvolgreeksen) die aan de beurt zijn
 * en ruimt Offertecheck-concepten op die nooit zijn ingediend (inclusief hun bestanden).
 * Vercel stuurt `Authorization: Bearer <CRON_SECRET>` mee; zonder CRON_SECRET is deze route uit.
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
  const counts = await processDueEmails(100);
  const concepten = await purgeStaleConcepts();
  return Response.json({ verwerkt: counts, opgeruimde_concepten: concepten });
}
