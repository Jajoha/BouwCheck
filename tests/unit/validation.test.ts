import { describe, expect, it } from "vitest";
import { outcomeSchema, parseForm, projectSchema, quoteSchema, registerSchema, scopeListSchema, intakeProjectSchema } from "@/lib/validation";
import { summarizeVerification } from "@/lib/domain/verification";

const uuid = "00000000-0000-4000-8000-000000000001";

describe("projectSchema", () => {
  const valid = {
    name: "Tussenwoning test",
    location: "Utrecht",
    property_type: "Tussenwoning",
    renovation_type: "Complete renovatie",
    description: "Complete renovatie van de woning.",
    budget_amount: "85.000",
  };
  it("accepteert een geldig project en parseert bedragen in Nederlandse notatie", () => {
    const r = parseForm(projectSchema, valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.budget_amount).toBe(85000);
  });
  it("weigert ontbrekende verplichte velden met Nederlandse meldingen", () => {
    const r = parseForm(projectSchema, { ...valid, name: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.name[0]).toBe("Projectnaam is verplicht.");
  });
  it("weigert een opleverdatum vóór de startdatum", () => {
    const r = parseForm(projectSchema, { ...valid, desired_start_date: "2027-02-01", desired_completion_date: "2027-01-01" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.desired_completion_date).toBeDefined();
  });
  it("intake vereist provincie en een omschrijving van minimaal 20 tekens", () => {
    const r = parseForm(intakeProjectSchema, { location: "Utrecht", property_type: "Tussenwoning", renovation_type: "Complete renovatie", description: "kort" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fieldErrors.province[0]).toMatch(/provincie/);
      expect(r.fieldErrors.description[0]).toMatch(/minimaal 20/);
    }
  });
});

describe("overige schema's", () => {
  it("registratie vereist gelijke wachtwoorden en akkoord", () => {
    const r = parseForm(registerSchema, { name: "Test", email: "a@b.nl", password: "geheim-wachtwoord", password_confirm: "anders-wachtwoord" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fieldErrors.password_confirm).toBeDefined();
      expect(r.fieldErrors.terms).toBeDefined();
    }
  });
  it("offerte vereist een positief bedrag en een scope", () => {
    const r = parseForm(quoteSchema, { project_id: uuid, contractor_id: uuid, price_type: "offerte", amount: "0", scope_description: "abc", materials_included: "onbekend" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fieldErrors.amount).toBeDefined();
      expect(r.fieldErrors.scope_specialty_ids).toBeDefined();
    }
  });
  it("projectresultaat vereist beoordeling, toelichting en waarheidsverklaring", () => {
    const r = parseForm(outcomeSchema, { project_id: uuid, contractor_id: uuid, work_specialty_ids: ["schilder"], rework_required: "onbekend" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fieldErrors.rating).toBeDefined();
      expect(r.fieldErrors.review_text).toBeDefined();
      expect(r.fieldErrors.truthful).toBeDefined();
    }
  });
});

describe("summarizeVerification", () => {
  it("is standaard 'zelf opgegeven' zonder goedgekeurde gebeurtenissen", () => {
    const s = summarizeVerification({ approvedEventTypes: [], clientConfirmedProjects: 0, verifiedProjects: 0 });
    expect(s.highest).toBe("zelf_opgegeven");
    expect(s.businessVerified).toBe(false);
  });
  it("leidt niveaus uitsluitend af uit gebeurtenissen en gecontroleerde projecten", () => {
    const s = summarizeVerification({ approvedEventTypes: ["bedrijfsgegevens"], clientConfirmedProjects: 0, verifiedProjects: 2 });
    expect(s.levels).toEqual(["bedrijfsgegevens_gecontroleerd", "projectgegevens_gecontroleerd"]);
    expect(s.highest).toBe("projectgegevens_gecontroleerd");
  });
});

import { parseDutchNumber } from "@/lib/validation";
describe("parseDutchNumber", () => {
  it.each([
    ["85.000", 85000],
    ["85.000,50", 85000.5],
    ["12,5", 12.5],
    ["12.5", 12.5],
    ["112", 112],
    ["€ 1 250", 1250],
    ["1.250.000", 1250000],
  ])("%s → %d", (input, expected) => expect(parseDutchNumber(input)).toBe(expected));
  it("ongeldige invoer geeft NaN", () => expect(parseDutchNumber("abc")).toBeNaN());
});

describe("scopeListSchema", () => {
  const item = { specialty_id: "schilder", description: "Binnenschilderwerk", quantity: 100, unit: "m2", confidence: null, source: "gebruiker" };
  it("accepteert een geldige scope", () => expect(scopeListSchema.safeParse([item]).success).toBe(true));
  it("vereist minimaal één regel", () => expect(scopeListSchema.safeParse([]).success).toBe(false));
  it("weigert onbekende vakgebieden", () => expect(scopeListSchema.safeParse([{ ...item, specialty_id: "astronaut" }]).success).toBe(false));
  it("hoeveelheid en eenheid horen bij elkaar", () => {
    expect(scopeListSchema.safeParse([{ ...item, unit: null }]).success).toBe(false);
    expect(scopeListSchema.safeParse([{ ...item, quantity: null, unit: null }]).success).toBe(true);
  });
});
