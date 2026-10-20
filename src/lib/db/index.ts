import path from "node:path";
import fs from "node:fs";
import { env, dbDriver } from "@/lib/env";
import { runMigrations } from "./migrate";

export type Row = Record<string, unknown>;

export interface Queryable {
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
}

export interface Database extends Queryable {
  /** Voert meerdere SQL-statements zonder parameters uit (migraties). */
  exec(text: string): Promise<void>;
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  driver: "postgres" | "pglite";
}

async function createPglite(): Promise<Database> {
  const { PGlite, types } = await import("@electric-sql/pglite");
  const dir = path.resolve(process.cwd(), env.dataDir, "pglite");
  fs.mkdirSync(dir, { recursive: true });
  const pg = new PGlite(dir, {
    parsers: {
      [types.DATE]: (v: string) => v,
      [types.NUMERIC]: (v: string) => Number(v),
      [types.INT8]: (v: string) => Number(v),
    },
  });
  await pg.waitReady;
  const wrap = (q: { query: typeof pg.query }): Queryable => ({
    async query<T>(text: string, params: unknown[] = []) {
      const res = await q.query<T>(text, params);
      return res.rows;
    },
  });
  return {
    ...wrap(pg),
    driver: "pglite",
    async exec(text) {
      await pg.exec(text);
    },
    async transaction(fn) {
      return pg.transaction(async (tx) => fn(wrap(tx)));
    },
    async close() {
      await pg.close();
    },
  };
}

async function createPostgres(url: string, max = Number(process.env.DATABASE_POOL_SIZE ?? 5)): Promise<Database> {
  const { default: postgres } = await import("postgres");
  const sql = postgres(url, {
    max,
    // Gepoolde verbindingen (Neon/Supabase pooler, transactiemodus) ondersteunen geen prepared statements
    prepare: false,
    onnotice: () => {},
    types: {
      date: { to: 1082, from: [1082], serialize: (x: string) => x, parse: (x: string) => x },
      numeric: { to: 1700, from: [1700], serialize: (x: unknown) => String(x), parse: (x: string) => Number(x) },
      bigint: { to: 20, from: [20], serialize: (x: unknown) => String(x), parse: (x: string) => Number(x) },
    },
  });
  const wrap = (q: typeof sql): Queryable => ({
    async query<T>(text: string, params: unknown[] = []) {
      const rows = await q.unsafe(text, params as never[]);
      return rows as unknown as T[];
    },
  });
  return {
    ...wrap(sql),
    driver: "postgres",
    async exec(text) {
      await sql.unsafe(text).simple();
    },
    async transaction(fn) {
      return (await sql.begin(async (tx) => fn(wrap(tx as unknown as typeof sql)))) as never;
    },
    async close() {
      await sql.end();
    },
  };
}

type GlobalDb = { __bouwcheckDb?: Promise<Database> };
const g = globalThis as unknown as GlobalDb;

async function init(): Promise<Database> {
  const database = dbDriver === "postgres" ? await createPostgres(env.databaseUrl!) : await createPglite();
  if (database.driver === "pglite") {
    // Lokale demo-database: schema automatisch bijwerken en demo-data laden.
    await runMigrations(database);
    const [{ n }] = await database.query<{ n: number }>("select count(*)::int as n from users");
    if (n === 0 && env.demoMode) {
      const { seedDemoData } = await import("./seed");
      await seedDemoData(database);
    }
  }
  return database;
}

export function getDb(): Promise<Database> {
  if (!g.__bouwcheckDb) {
    g.__bouwcheckDb = init().catch((err) => {
      g.__bouwcheckDb = undefined;
      throw err;
    });
  }
  return g.__bouwcheckDb;
}

/** True als een query faalde omdat een tabel (nog) niet bestaat, bijv. door een niet-toegepaste migratie. */
export function isMissingTableError(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && "code" in err && (err as { code: unknown }).code === "42P01");
}

/** Korte helper voor een enkele query. */
export async function sql<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  const database = await getDb();
  return database.query<T>(text, params);
}

export async function sqlOne<T = Row>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await sql<T>(text, params);
  return rows[0] ?? null;
}

export async function transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T> {
  const database = await getDb();
  return database.transaction(fn);
}

/** Voor scripts: één directe (niet-gepoolde, indien beschikbaar) verbinding zonder auto-seed. */
export async function openDatabase(): Promise<Database> {
  return dbDriver === "postgres" ? createPostgres(env.migrationDatabaseUrl!, 1) : createPglite();
}
