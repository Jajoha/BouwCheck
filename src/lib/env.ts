import os from "node:os";
import path from "node:path";

/**
 * Omgevingsconfiguratie. Alleen server-side gebruiken; bevat geen geheimen
 * die naar de browser mogen.
 */

/**
 * Maakt een Postgres-URL geschikt voor postgres.js. Neon voegt `channel_binding=require` toe;
 * postgres.js stuurt onbekende URL-parameters als serverinstelling mee, wat de verbinding laat mislukken.
 */
export function normalizeDatabaseUrl(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  try {
    const url = new URL(value);
    url.searchParams.delete("channel_binding");
    return url.toString();
  } catch {
    return value;
  }
}

/** Neon via Vercel zet DATABASE_URL (gepoold); oudere Vercel-koppelingen gebruiken POSTGRES_URL. */
const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL || process.env.POSTGRES_URL);
/** Directe (niet-gepoolde) verbinding voor migraties, als die beschikbaar is. */
const migrationDatabaseUrl =
  normalizeDatabaseUrl(process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING) ?? databaseUrl;
/** Vercel Blob: wordt automatisch gezet als een Blob-store aan het project is gekoppeld. */
const blobConfigured = Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());

/** Serverless platforms (Vercel, AWS Lambda) hebben een read-only projectmap; alleen /tmp is schrijfbaar. */
const serverless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

function parseBool(value: string | undefined): boolean | undefined {
  if (value === undefined || value === "") return undefined;
  return ["1", "true", "yes", "ja"].includes(value.toLowerCase());
}

export const env = {
  databaseUrl,
  migrationDatabaseUrl,
  blobConfigured,
  /** Lokale demo-modus: automatisch aan als er geen DATABASE_URL is. */
  demoMode: parseBool(process.env.DEMO_MODE) ?? !databaseUrl,
  dataDir: process.env.BOUWCHECK_DATA_DIR?.trim() || (serverless ? path.join(os.tmpdir(), "bouwcheck") : ".data"),
  /**
   * True als data in tijdelijke opslag staat (serverless zonder DATABASE_URL):
   * elke serverinstantie heeft dan een eigen database die bij een herstart verdwijnt.
   */
  ephemeralStorage: serverless && !databaseUrl,
  /** True als geüploade bestanden in tijdelijke opslag staan (serverless zonder Vercel Blob). */
  ephemeralUploads: serverless && !blobConfigured,
  serverless,
  appUrl: process.env.APP_URL?.trim() || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
  isProduction: process.env.NODE_ENV === "production",
  /** E-mailverzending is in deze bèta niet geïmplementeerd. */
  emailConfigured: false,
};

export const dbDriver: "postgres" | "pglite" = databaseUrl ? "postgres" : "pglite";
