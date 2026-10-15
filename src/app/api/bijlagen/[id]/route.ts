import { sqlOne } from "@/lib/db";
import { readFile } from "@/lib/storage";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Downloadt een projectbijlage. Toegang: eigenaar van het project, beheer, of de
 * aannemer die de bijlage via een verzonden (platform)aanvraag heeft ontvangen.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response("Niet ingelogd", { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Niet gevonden", { status: 404 });
  const file = await sqlOne<{ storage_path: string; mime_type: string; file_name: string; owner: string; project_id: string }>(
    `select a.storage_path, a.mime_type, a.file_name, p.user_id as owner, p.id as project_id
       from project_attachments a join projects p on p.id = a.project_id where a.id = $1`,
    [id],
  );
  if (!file) return new Response("Niet gevonden", { status: 404 });
  let allowed = file.owner === user.id || user.role === "beheerder";
  if (!allowed && user.role === "aannemer") {
    allowed = Boolean(
      await sqlOne(
        `select 1 from quote_request_attachments qa join quote_requests qr on qr.id = qa.quote_request_id
           join contractors c on c.id = qr.contractor_id
          where qa.attachment_id = $1 and c.owner_user_id = $2 and qr.delivery_channel = 'platform'`,
        [id, user.id],
      ),
    );
  }
  if (!allowed) return new Response("Geen toegang", { status: 403 });
  const data = await readFile(file.storage_path);
  if (!data) return new Response("Bestand ontbreekt", { status: 410 });
  return new Response(data, {
    headers: {
      "Content-Type": file.mime_type,
      "Content-Disposition": `${file.mime_type === "application/pdf" || file.mime_type.startsWith("image/") ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.file_name)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
