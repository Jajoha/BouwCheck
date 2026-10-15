import "server-only";
import { randomUUID } from "node:crypto";
import type { Queryable } from "@/lib/db";
import { saveFile } from "@/lib/storage";

export const ALLOWED_UPLOADS = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["application/pdf", ".pdf"],
]);

/** Controleert de bestandssignatuur, niet alleen het opgegeven MIME-type. */
export function hasValidSignature(type: string, buffer: Buffer) {
  const sig = buffer.subarray(0, 4).toString("hex");
  return (
    (type === "application/pdf" && buffer.subarray(0, 4).toString() === "%PDF") ||
    (type === "image/png" && sig === "89504e47") ||
    (type === "image/jpeg" && sig.startsWith("ffd8ff")) ||
    (type === "image/webp" && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP")
  );
}

export function safeFileName(name: string, ext: string) {
  return name.replace(/[^\w.\- ()À-ÿ]/g, "_").slice(0, 150) || `bijlage${ext}`;
}

/** Slaat een gevalideerd bestand op en registreert het als projectbijlage. */
export async function storeProjectFile(
  db: Queryable,
  opts: { projectId: string; userId: string; kind: string; fileName: string; type: string; buffer: Buffer },
) {
  const ext = ALLOWED_UPLOADS.get(opts.type);
  if (!ext) throw new Error("Bestandstype niet toegestaan");
  const storagePath = await saveFile(`${opts.projectId}/${randomUUID()}${ext}`, opts.buffer, opts.type);
  const name = safeFileName(opts.fileName, ext);
  await db.query(
    "insert into project_attachments (project_id, user_id, kind, file_name, mime_type, size_bytes, storage_path) values ($1,$2,$3,$4,$5,$6,$7)",
    [opts.projectId, opts.userId, opts.kind, name, opts.type, opts.buffer.length, storagePath],
  );
  return name;
}
