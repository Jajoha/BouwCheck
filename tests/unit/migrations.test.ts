import { describe, expect, it } from "vitest";
import { pendingMigrations } from "@/lib/db/migrate";
import { isMissingTableError } from "@/lib/db";

describe("pendingMigrations", () => {
  it("noemt migraties die nog niet zijn toegepast", async () => {
    const db = { query: async () => [{ name: "20261015000000_init.sql" }] as never[] };
    const pending = await pendingMigrations(db);
    expect(pending).not.toContain("20261015000000_init.sql");
    expect(pending).toContain("20261022000000_offertecheck.sql");
  });

  it("zonder schema_migrations ontbreken alle migraties", async () => {
    const db = { query: async () => Promise.reject(new Error("relation does not exist")) };
    expect((await pendingMigrations(db)).length).toBeGreaterThan(3);
  });
});

describe("isMissingTableError", () => {
  it("herkent Postgres-fout 42P01", () => {
    expect(isMissingTableError({ code: "42P01" })).toBe(true);
    expect(isMissingTableError({ code: "23505" })).toBe(false);
    expect(isMissingTableError(new Error("x"))).toBe(false);
  });
});
