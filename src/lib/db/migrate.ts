import fs from "node:fs";
import path from "node:path";
import type { Database } from "./index";

export async function runMigrations(db: Database, log: (m: string) => void = () => {}) {
  await db.query(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const dir = path.resolve(process.cwd(), "supabase", "migrations");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const applied = new Set(
    (await db.query<{ name: string }>("select name from schema_migrations")).map((r) => r.name),
  );
  for (const file of files) {
    if (applied.has(file)) continue;
    const content = fs.readFileSync(path.join(dir, file), "utf8");
    await db.exec(content);
    await db.query("insert into schema_migrations (name) values ($1)", [file]);
    log(`Migratie toegepast: ${file}`);
  }
}
