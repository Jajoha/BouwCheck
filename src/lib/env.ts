/**
 * Omgevingsconfiguratie. Alleen server-side gebruiken; bevat geen geheimen
 * die naar de browser mogen.
 */
const databaseUrl = process.env.DATABASE_URL?.trim() || undefined;

function parseBool(value: string | undefined): boolean | undefined {
  if (value === undefined || value === "") return undefined;
  return ["1", "true", "yes", "ja"].includes(value.toLowerCase());
}

export const env = {
  databaseUrl,
  /** Lokale demo-modus: automatisch aan als er geen DATABASE_URL is. */
  demoMode: parseBool(process.env.DEMO_MODE) ?? !databaseUrl,
  dataDir: process.env.BOUWCHECK_DATA_DIR?.trim() || ".data",
  appUrl: process.env.APP_URL?.trim() || "http://localhost:3000",
  isProduction: process.env.NODE_ENV === "production",
  /** E-mailverzending is in deze bèta niet geïmplementeerd. */
  emailConfigured: false,
};

export const dbDriver: "postgres" | "pglite" = databaseUrl ? "postgres" : "pglite";
