import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";

/**
 * Bestandsopslag voor projectbijlagen.
 * - Met BLOB_READ_WRITE_TOKEN: Vercel Blob, privé (alleen leesbaar met het token, dus via onze geautoriseerde route).
 * - Anders: lokale map (BOUWCHECK_DATA_DIR/uploads). Op serverless hosting is die tijdelijk.
 *
 * `storage_path` in de database bevat het voorvoegsel `blob:` voor bestanden in Vercel Blob,
 * zodat bestaande lokale bestanden leesbaar blijven na het koppelen van Blob.
 */
const BLOB_PREFIX = "blob:";
const BLOB_FOLDER = "projecten/";

export function uploadRoot() {
  return path.resolve(process.cwd(), env.dataDir, "uploads");
}

function localPath(storagePath: string): string | null {
  const root = uploadRoot();
  const full = path.resolve(root, storagePath);
  return full.startsWith(root + path.sep) ? full : null;
}

/** Slaat een bestand op onder `key` (bijv. `<projectId>/<uuid>.jpg`) en geeft het storage_path terug. */
export async function saveFile(key: string, buffer: Buffer, contentType: string): Promise<string> {
  if (env.blobConfigured) {
    const { put } = await import("@vercel/blob");
    const res = await put(BLOB_FOLDER + key, buffer, { access: "private", contentType, addRandomSuffix: false });
    return BLOB_PREFIX + res.pathname;
  }
  const full = localPath(key);
  if (!full) throw new Error("Ongeldig opslagpad");
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buffer);
  return key;
}

/** storage_path voor een bestand dat de browser rechtstreeks naar Vercel Blob heeft geüpload. */
export function blobStoragePath(pathname: string) {
  return BLOB_PREFIX + pathname;
}

/** Leest een opgeslagen bestand volledig in het geheugen; null als het niet (meer) bestaat. */
export async function readFileBuffer(storagePath: string): Promise<Buffer | null> {
  const data = await readFile(storagePath);
  if (!data) return null;
  if (data instanceof Uint8Array) return Buffer.from(data);
  return Buffer.from(await new Response(data).arrayBuffer());
}

/** Leest een opgeslagen bestand; null als het niet (meer) bestaat. */
export async function readFile(storagePath: string): Promise<ReadableStream<Uint8Array> | Uint8Array<ArrayBuffer> | null> {
  if (storagePath.startsWith(BLOB_PREFIX)) {
    if (!env.blobConfigured) return null;
    const { get } = await import("@vercel/blob");
    const res = await get(storagePath.slice(BLOB_PREFIX.length), { access: "private", useCache: false });
    return res?.statusCode === 200 ? res.stream : null;
  }
  const full = localPath(storagePath);
  if (!full) return null;
  try {
    return new Uint8Array(await fs.readFile(full));
  } catch {
    return null;
  }
}

/** Verwijdert bestanden; ontbrekende bestanden worden genegeerd. */
export async function deleteFiles(storagePaths: string[]): Promise<void> {
  const blobs = storagePaths.filter((p) => p.startsWith(BLOB_PREFIX)).map((p) => p.slice(BLOB_PREFIX.length));
  if (blobs.length && env.blobConfigured) {
    const { del } = await import("@vercel/blob");
    await del(blobs);
  }
  for (const p of storagePaths) {
    if (p.startsWith(BLOB_PREFIX)) continue;
    const full = localPath(p);
    if (full) await fs.rm(full, { force: true });
  }
}
