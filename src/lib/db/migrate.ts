import fs from "node:fs";
import path from "node:path";
import type { Database } from "./index";

// Willekeurige, vaste sleutel voor pg_advisory_lock: voorkomt dat twee gelijktijdige deploys tegelijk migreren.
const MIGRATION_LOCK = 724_310_515;

export async function runMigrations(db: Database, log: (m: string) => void = () => {}) {
  if (db.driver !== "postgres") return applyPending(db, log);
  await db.query("select pg_advisory_lock($1)", [MIGRATION_LOCK]);
  try {
    await applyPending(db, log);
  } finally {
    await db.query("select pg_advisory_unlock($1)", [MIGRATION_LOCK]);
  }
}

function migrationFiles() {
  const dir = path.resolve(process.cwd(), "supabase", "migrations");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

/**
 * Migraties die in de code staan maar nog niet op deze database zijn toegepast.
 * Op Vercel slaan preview-deploys migreren over zonder MIGRATE_ON_PREVIEW=true; dan ontbreken nieuwe tabellen.
 */
export async function pendingMigrations(db: Pick<Database, "query">): Promise<string[]> {
  let applied: Set<string>;
  try {
    applied = new Set((await db.query<{ name: string }>("select name from schema_migrations")).map((r) => r.name));
  } catch {
    applied = new Set();
  }
  let files: string[];
  try {
    files = migrationFiles();
  } catch {
    return []; // migratiebestanden niet meegebundeld: niets te vergelijken
  }
  return files.filter((f) => !applied.has(f));
}

async function applyPending(db: Database, log: (m: string) => void) {
  await db.query(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const dir = path.resolve(process.cwd(), "supabase", "migrations");
  const files = migrationFiles();
  const applied = new Set(
    (await db.query<{ name: string }>("select name from schema_migrations")).map((r) => r.name),
  );
  for (const file of files) {
    if (applied.has(file)) continue;
    const content = fs.readFileSync(path.join(dir, file), "utf8");
    // Migratie en registratie in één batch: bij een fout wordt geen van beide vastgelegd.
    await db.exec(`${content}\n;\ninsert into schema_migrations (name) values ('${file.replace(/'/g, "''")}');`);
    log(`Migratie toegepast: ${file}`);
  }
}
