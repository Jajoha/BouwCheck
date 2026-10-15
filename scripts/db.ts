/**
 * Databasebeheer vanaf de commandoregel.
 *   npm run db:migrate              — migraties toepassen
 *   npm run db:seed                 — demo-data laden (alleen in een lege database)
 *   npm run db:reset                — ALLEEN lokaal (PGlite): database wissen en opnieuw vullen
 *   npm run db:create-admin -- <e-mail> <naam> — beheerder aanmaken (wachtwoord via ADMIN_PASSWORD)
 */
import fs from "node:fs";
import path from "node:path";
import { openDatabase } from "../src/lib/db";
import { runMigrations } from "../src/lib/db/migrate";
import { seedDemoData } from "../src/lib/db/seed";
import { hashPassword } from "../src/lib/auth/password";
import { env, dbDriver } from "../src/lib/env";

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
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

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
