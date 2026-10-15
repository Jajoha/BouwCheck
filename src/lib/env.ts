import os from "node:os";
import path from "node:path";

/**
 * Omgevingsconfiguratie. Alleen server-side gebruiken; bevat geen geheimen
 * die naar de browser mogen.
 */
const databaseUrl = process.env.DATABASE_URL?.trim() || undefined;

/** Serverless platforms (Vercel, AWS Lambda) hebben een read-only projectmap; alleen /tmp is schrijfbaar. */
const serverless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

function parseBool(value: string | undefined): boolean | undefined {
  if (value === undefined || value === "") return undefined;
  return ["1", "true", "yes", "ja"].includes(value.toLowerCase());
}

export const env = {
  databaseUrl,
  /** Lokale demo-modus: automatisch aan als er geen DATABASE_URL is. */
  demoMode: parseBool(process.env.DEMO_MODE) ?? !databaseUrl,
  dataDir: process.env.BOUWCHECK_DATA_DIR?.trim() || (serverless ? path.join(os.tmpdir(), "bouwcheck") : ".data"),
  /**
   * True als data in tijdelijke opslag staat (serverless zonder DATABASE_URL):
   * elke serverinstantie heeft dan een eigen database die bij een herstart verdwijnt.
   */
  ephemeralStorage: serverless && !databaseUrl,
  serverless,
  appUrl: process.env.APP_URL?.trim() || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
  isProduction: process.env.NODE_ENV === "production",
  /** E-mailverzending is in deze bèta niet geïmplementeerd. */
  emailConfigured: false,
};

export const dbDriver: "postgres" | "pglite" = databaseUrl ? "postgres" : "pglite";
