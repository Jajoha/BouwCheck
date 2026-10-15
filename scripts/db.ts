/**
 * Databasebeheer vanaf de commandoregel.
 *   npm run db:migrate              — migraties toepassen
 *   npm run db:seed                 — demo-data laden (alleen in een lege database)
 *   npm run db:reset                — ALLEEN lokaal (PGlite): database wissen en opnieuw vullen
 *   npm run db:create-admin -- <e-mail> <naam> — beheerder aanmaken (wachtwoord via ADMIN_PASSWORD)
 *   npm run db:deploy               — bij een (Vercel-)build: migreren, en in demo-modus een lege database vullen
 */
import fs from "node:fs";
import path from "node:path";
import { openDatabase } from "../src/lib/db";
import { runMigrations } from "../src/lib/db/migrate";
import { seedDemoData } from "../src/lib/db/seed";
import { hashPassword } from "../src/lib/auth/password";
import { env, dbDriver } from "../src/lib/env";

/**
 * Draait tijdens `vercel-build`, vóór `next build`.
 * - Zonder database: niets te doen (de app gebruikt dan tijdelijke opslag).
 * - Preview-deploys migreren alleen met MIGRATE_ON_PREVIEW=true, zodat een preview-branch
 *   nooit ongemerkt het schema van de productiedatabase wijzigt. Zet dit aan als Neon per
 *   preview een eigen databasebranch aanmaakt.
 */
async function deploy() {
  if (dbDriver !== "postgres") {
    console.log("[db:deploy] Geen DATABASE_URL: migreren overgeslagen (tijdelijke opslag).");
    return;
  }
  if (process.env.VERCEL_ENV === "preview" && process.env.MIGRATE_ON_PREVIEW !== "true") {
    console.log("[db:deploy] Preview-deploy: migreren overgeslagen (zet MIGRATE_ON_PREVIEW=true bij een eigen databasebranch per preview).");
    return;
  }
  const db = await openDatabase();
  try {
    await runMigrations(db, (m) => console.log(`[db:deploy] ${m}`));
    const [{ n }] = await db.query<{ n: number }>("select count(*)::int as n from users");
    if (n === 0 && env.demoMode) {
      await seedDemoData(db, (m) => console.log(`[db:deploy] ${m}`));
    } else if (n === 0) {
      console.log("[db:deploy] Lege database zonder demo-modus: geen demo-data geladen. Maak een beheerder aan met db:create-admin.");
    }
    console.log("[db:deploy] Database is bijgewerkt.");
  } finally {
    await db.close();
  }
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === "deploy") return deploy();
  if (cmd === "reset") {
    if (dbDriver !== "pglite") throw new Error("db:reset is alleen toegestaan voor de lokale PGlite-database.");
    fs.rmSync(path.resolve(process.cwd(), env.dataDir, "pglite"), { recursive: true, force: true });
    console.log("Lokale database verwijderd.");
  }
  const db = await openDatabase();
  try {
    await runMigrations(db, console.log);
    if (cmd === "seed" || cmd === "reset") {
      const [{ n }] = await db.query<{ n: number }>("select count(*)::int as n from users");
      if (n > 0) console.log("Database bevat al gebruikers; seed overgeslagen. Gebruik db:reset (lokaal) voor een schone demo.");
      else await seedDemoData(db, console.log);
    }
    if (cmd === "create-admin") {
      const [email, ...nameParts] = args;
      const password = process.env.ADMIN_PASSWORD;
      if (!email || !password || password.length < 12) {
        throw new Error("Gebruik: ADMIN_PASSWORD='<min. 12 tekens>' npm run db:create-admin -- <e-mail> <naam>");
      }
      await db.query(
        `insert into users (email, name, password_hash, role, onboarded_at) values ($1,$2,$3,'beheerder', now())
         on conflict (email) do update set role = 'beheerder', password_hash = excluded.password_hash`,
        [email.toLowerCase(), nameParts.join(" ") || "Beheerder", await hashPassword(password)],
      );
      console.log(`Beheerder ${email} aangemaakt/bijgewerkt.`);
    }
  } finally {
    await db.close();
  }
}

/** Vertaalt veelvoorkomende database-fouten naar een concrete oplossing (zichtbaar in het Vercel-buildlog). */
function hintFor(err: unknown): string | null {
  const code = (err as { code?: string })?.code;
  switch (code) {
    case "42P07":
    case "42710":
      return "De database bevat al tabellen die niet van BouwCheck zijn (waarschijnlijk van een ander project, zoals een gedeelde Neon-database). Koppel een eigen, lege Neon-database aan BouwCheck: Vercel → Storage → Create Database → Neon.";
    case "28P01":
    case "28000":
      return "Inloggen bij de database is geweigerd. Controleer DATABASE_URL / DATABASE_URL_UNPOOLED, of koppel de Neon-database opnieuw aan dit project zodat Vercel de variabelen ververst.";
    case "3D000":
      return "De database in DATABASE_URL bestaat niet (meer). Koppel de Neon-database opnieuw aan dit project.";
    case "ENOTFOUND":
    case "ECONNREFUSED":
    case "ETIMEDOUT":
    case "CONNECT_TIMEOUT":
      return "De databaseserver is niet bereikbaar. Controleer of de Neon-database bestaat en aan dit project gekoppeld is, en of DATABASE_URL klopt.";
    default:
      return null;
  }
}

main().catch((err) => {
  const code = (err as { code?: string })?.code;
  console.error(`[db] MISLUKT: ${err instanceof Error ? err.message : String(err)}${code ? ` (code ${code})` : ""}`);
  const hint = hintFor(err);
  if (hint) console.error(`[db] Oplossing: ${hint}`);
  process.exit(1);
});
