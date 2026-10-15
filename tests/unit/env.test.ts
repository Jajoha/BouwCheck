import { describe, expect, it } from "vitest";
import { normalizeDatabaseUrl } from "@/lib/env";

describe("normalizeDatabaseUrl", () => {
  it("verwijdert channel_binding (Neon) en behoudt sslmode", () => {
    const url = normalizeDatabaseUrl(
      "postgresql://user:pw@ep-x-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    );
    expect(url).toBe("postgresql://user:pw@ep-x-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require");
  });

  it("laat een URL zonder parameters ongemoeid", () => {
    expect(normalizeDatabaseUrl(" postgresql://u@h:5432/db ")).toBe("postgresql://u@h:5432/db");
  });

  it("geeft undefined bij een lege waarde", () => {
    expect(normalizeDatabaseUrl("")).toBeUndefined();
    expect(normalizeDatabaseUrl(undefined)).toBeUndefined();
  });
});
