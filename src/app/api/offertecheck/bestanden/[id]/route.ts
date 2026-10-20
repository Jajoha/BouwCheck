import { sqlOne } from "@/lib/db";
import { readFile } from "@/lib/storage";
import { getCurrentUser } from "@/lib/auth/session";

/** Downloadt een geüploade offerte. Alleen voor beheer (beoordeling van de check). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "beheerder") return new Response("Geen toegang", { status: 403 });
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Niet gevonden", { status: 404 });
  const file = await sqlOne<{ storage_path: string; mime_type: string; bestandsnaam: string }>(
    "select storage_path, mime_type, bestandsnaam from offerte_bestanden where id = $1",
    [id],
  );
  if (!file) return new Response("Niet gevonden", { status: 404 });
  const data = await readFile(file.storage_path);
  if (!data) return new Response("Bestand ontbreekt", { status: 410 });
  return new Response(data, {
    headers: {
      "Content-Type": file.mime_type,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.bestandsnaam)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
