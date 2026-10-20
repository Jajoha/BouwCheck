import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";
import { registerFile, verifyConcept } from "@/lib/data/offertecheck";
import { saveFile } from "@/lib/storage";
import { hasValidSignature, safeFileName } from "@/lib/uploads";
import { OFFERTECHECK_MAX_BYTES, OFFERTECHECK_TYPES } from "@/lib/domain/offertecheck";

/**
 * Upload via de server, alleen zonder Vercel Blob (lokaal en in tests).
 * Met Blob uploadt de browser rechtstreeks (zie ../upload/route.ts).
 */
export async function POST(request: Request): Promise<Response> {
  if (!env.features.offertecheck || env.blobConfigured) return new Response("Niet beschikbaar", { status: 404 });
  const fd = await request.formData();
  const checkId = String(fd.get("checkId") ?? "");
  const secret = String(fd.get("secret") ?? "");
  const file = fd.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Geen bestand" }, { status: 400 });
  if (!(await verifyConcept(checkId, secret))) return Response.json({ error: "Deze check is verlopen. Begin opnieuw." }, { status: 403 });
  if (!(OFFERTECHECK_TYPES as readonly string[]).includes(file.type)) return Response.json({ error: "Alleen pdf, jpg en png zijn toegestaan." }, { status: 400 });
  if (file.size > OFFERTECHECK_MAX_BYTES) return Response.json({ error: "Een bestand mag maximaal 15 MB zijn." }, { status: 400 });
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!hasValidSignature(file.type, buffer)) return Response.json({ error: "Het bestand is geen geldige pdf, jpg of png." }, { status: 400 });
  const ext = file.type === "application/pdf" ? ".pdf" : file.type === "image/png" ? ".png" : ".jpg";
  const storagePath = await saveFile(`offertechecks/${checkId}/${randomUUID()}${ext}`, buffer, file.type);
  const id = await registerFile(checkId, { storagePath, bestandsnaam: safeFileName(file.name, ext), mimeType: file.type, grootte: buffer.length });
  if (!id) return Response.json({ error: "Maximaal 5 bestanden per check." }, { status: 400 });
  return Response.json({ ok: true });
}
