import { z } from "zod";
import {
  AVAILABILITY,
  FLAG_REASONS,
  LEAD_TYPES,
  PRICE_LEVELS,
  PRICE_TYPES,
  PROJECT_STATUS,
  PROPERTY_TYPES,
  PROVINCES,
  RATE_UNITS,
  RENOVATION_TYPES,
  SPECIALTY_IDS,
  ATTACHMENT_KINDS,
} from "@/lib/domain/constants";

// ── Hulpfuncties voor FormData ──────────────────────────────
const empty = (v: unknown) => (v === "" || v === null || v === undefined ? undefined : v);
const trimmed = (v: unknown) => (typeof v === "string" ? v.trim() : v);

export const text = (min: number, max: number, label: string) =>
  z.preprocess(
    trimmed,
    z
      .string({ error: `${label} is verplicht.` })
      .min(1, `${label} is verplicht.`)
      .min(min, `${label} moet minimaal ${min} tekens bevatten.`)
      .max(max, `${label} mag maximaal ${max} tekens bevatten.`),
  );

export const optionalText = (max: number) =>
  z.preprocess((v) => empty(trimmed(v)), z.string().max(max, `Maximaal ${max} tekens.`).optional());

/**
 * Leest getallen in Nederlandse én internationale notatie:
 * "85.000" → 85000, "85.000,50" → 85000.5, "12,5" → 12.5, "12.5" → 12.5, "€ 1 250" → 1250.
 */
export function parseDutchNumber(input: string): number {
  let v = input.replace(/[€\s]/g, "");
  if (v.includes(",")) v = v.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(v)) v = v.replace(/\./g, "");
  return v === "" ? NaN : Number(v);
}

const toNumber = (v: unknown) => {
  const e = empty(trimmed(v));
  if (e === undefined) return undefined;
  return parseDutchNumber(String(e));
};

function numberSchema(opts: { min?: number; max?: number; int?: boolean; label: string }) {
  let n = z.number({
    error: (iss) => (iss.input === undefined ? `${opts.label} is verplicht.` : `${opts.label} moet een getal zijn.`),
  });
  if (opts.int) n = n.int(`${opts.label} moet een heel getal zijn.`);
  if (opts.min !== undefined) n = n.min(opts.min, `${opts.label} moet minimaal ${opts.min} zijn.`);
  if (opts.max !== undefined) n = n.max(opts.max, `${opts.label} mag maximaal ${opts.max} zijn.`);
  return n;
}

const optionalNumber = (opts: { min?: number; max?: number; int?: boolean; label: string }) => z.preprocess(toNumber, numberSchema(opts).optional());
const requiredNumber = (opts: { min?: number; max?: number; int?: boolean; label: string }) => z.preprocess(toNumber, numberSchema(opts));

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige datum.");
const optionalDate = z.preprocess((v) => empty(v), isoDate.optional());

const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
const triState = z.preprocess((v) => (v === "ja" ? true : v === "nee" ? false : null), z.boolean().nullable());

const stringArray = z.preprocess((v) => (v === undefined || v === null || v === "" ? [] : Array.isArray(v) ? v : [v]), z.array(z.string()));
const enumArray = <T extends [string, ...string[]]>(values: T) =>
  z.preprocess((v) => (v === undefined || v === null || v === "" ? [] : Array.isArray(v) ? v : [v]), z.array(z.enum(values)));
const uuid = z.string().regex(/^[0-9a-f-]{36}$/i, "Ongeldige verwijzing.");
const optionalEnum = <T extends [string, ...string[]]>(values: T) => z.preprocess((v) => empty(v), z.enum(values).optional());

const PROVINCE_VALUES = [...PROVINCES] as unknown as [string, ...string[]];
const PROPERTY_VALUES = [...PROPERTY_TYPES] as unknown as [string, ...string[]];
const RENOVATION_VALUES = [...RENOVATION_TYPES] as unknown as [string, ...string[]];
const keys = <T extends object>(o: T) => Object.keys(o) as [string, ...string[]];

/** Zet FormData om naar een object; herhaalde velden worden arrays. Bestanden worden genegeerd. */
export function formDataToObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of new Set(fd.keys())) {
    const values = fd.getAll(key).filter((v) => typeof v === "string");
    if (values.length === 0) continue;
    out[key] = values.length > 1 || key.endsWith("[]") ? values : values[0];
  }
  for (const key of Object.keys(out)) {
    if (key.endsWith("[]")) {
      out[key.slice(0, -2)] = out[key];
      delete out[key];
    }
  }
  return out;
}

export type FieldErrors = Record<string, string[]>;

export function parseForm<T extends z.ZodType>(schema: T, fd: FormData | Record<string, unknown>):
  | { ok: true; data: z.infer<T> }
  | { ok: false; fieldErrors: FieldErrors } {
  const input = fd instanceof FormData ? formDataToObject(fd) : fd;
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, fieldErrors };
}

// ── Authenticatie ───────────────────────────────────────────
const email = z.preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() : v), z.email("Vul een geldig e-mailadres in."));
const password = z.string().min(10, "Het wachtwoord moet minimaal 10 tekens bevatten.").max(200);

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Vul je wachtwoord in."),
  next: optionalText(300),
});

export const registerSchema = z
  .object({
    name: text(2, 120, "Naam"),
    email,
    password,
    password_confirm: z.string(),
    terms: checkbox.refine((v) => v, "Je moet akkoord gaan met de (concept)voorwaarden."),
  })
  .refine((d) => d.password === d.password_confirm, { path: ["password_confirm"], message: "De wachtwoorden komen niet overeen." });

export const resetRequestSchema = z.object({ email });
export const resetPasswordSchema = z
  .object({ token: z.string().min(20), password, password_confirm: z.string() })
  .refine((d) => d.password === d.password_confirm, { path: ["password_confirm"], message: "De wachtwoorden komen niet overeen." });

export const onboardingSchema = z.object({
  name: text(2, 120, "Naam"),
  company_name: optionalText(120),
  role: z.enum(["flipper", "investeerder", "aannemer"], { error: "Kies je rol." }),
  region: optionalEnum(PROVINCE_VALUES),
  project_types: z.preprocess((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]), z.array(z.enum(RENOVATION_VALUES))),
});

// ── Projecten ───────────────────────────────────────────────
export const projectSchema = z
  .object({
    name: text(3, 120, "Projectnaam"),
    location: text(2, 120, "Locatie"),
    province: optionalEnum(PROVINCE_VALUES),
    property_type: z.enum(PROPERTY_VALUES, { error: "Kies het type vastgoed." }),
    renovation_type: z.enum(RENOVATION_VALUES, { error: "Kies het type renovatie." }),
    area_m2: optionalNumber({ min: 1, max: 100000, label: "Oppervlak" }),
    budget_amount: optionalNumber({ min: 0, max: 100_000_000, label: "Budget" }),
    budget_vat_included: checkbox,
    desired_start_date: optionalDate,
    desired_completion_date: optionalDate,
    specialty_ids: enumArray(SPECIALTY_IDS).refine((v) => v.length > 0, "Kies minimaal één vakgebied."),
    description: text(10, 5000, "Omschrijving"),
    material_preferences: optionalText(2000),
    extra_requirements: optionalText(2000),
    status: optionalEnum(keys(PROJECT_STATUS)),
  })
  .refine((d) => !d.desired_start_date || !d.desired_completion_date || d.desired_completion_date >= d.desired_start_date, {
    path: ["desired_completion_date"],
    message: "De opleverdatum moet na de startdatum liggen.",
  });

export const projectNotesSchema = z.object({ notes: optionalText(5000) });

// ── Offerteaanvragen ────────────────────────────────────────
export const quoteRequestSchema = z
  .object({
    project_id: uuid,
    contractor_ids: stringArray.pipe(z.array(uuid).min(1, "Kies minimaal één aannemer.").max(10, "Maximaal 10 aannemers per keer.")),
    work_description: text(10, 5000, "Omschrijving van de werkzaamheden"),
    specialty_ids: enumArray(SPECIALTY_IDS).refine((v) => v.length > 0, "Kies minimaal één vakgebied."),
    budget_indication: optionalNumber({ min: 0, max: 100_000_000, label: "Budgetindicatie" }),
    budget_vat_included: checkbox,
    desired_start_date: optionalDate,
    desired_completion_date: optionalDate,
    additional_notes: optionalText(3000),
    contact_name: text(2, 120, "Naam contactpersoon"),
    contact_email: email,
    contact_phone: optionalText(30),
    attachment_ids: stringArray.pipe(z.array(uuid)),
  })
  .refine((d) => !d.desired_start_date || !d.desired_completion_date || d.desired_completion_date >= d.desired_start_date, {
    path: ["desired_completion_date"],
    message: "De opleverdatum moet na de startdatum liggen.",
  });

export const quoteRequestStatusSchema = z.object({
  id: uuid,
  status: z.enum(["concept", "klaar", "verzonden", "reactie", "afgerond", "geannuleerd"]),
});

// ── Offertes ────────────────────────────────────────────────
export const quoteSchema = z.object({
  project_id: uuid,
  contractor_id: uuid,
  price_type: z.enum(keys(PRICE_TYPES)),
  amount: requiredNumber({ min: 1, max: 100_000_000, label: "Bedrag" }),
  vat_included: checkbox,
  materials_included: triState,
  scope_specialty_ids: enumArray(SPECIALTY_IDS).refine((v) => v.length > 0, "Kies welke vakgebieden in de prijs zijn inbegrepen."),
  scope_description: text(3, 3000, "Omschrijving van de scope"),
  inclusions: optionalText(3000),
  exclusions: optionalText(3000),
  estimated_duration_days: optionalNumber({ min: 1, max: 2000, int: true, label: "Doorlooptijd" }),
  earliest_start_date: optionalDate,
  validity_date: optionalDate,
});

// ── Projectresultaten & reviews ─────────────────────────────
const rating = (label: string) => requiredNumber({ min: 1, max: 5, int: true, label });
const optionalRating = (label: string) => optionalNumber({ min: 1, max: 5, int: true, label });

export const outcomeSchema = z
  .object({
    project_id: uuid,
    contractor_id: uuid,
    work_specialty_ids: enumArray(SPECIALTY_IDS).refine((v) => v.length > 0, "Kies de uitgevoerde werkzaamheden."),
    initial_budget: optionalNumber({ min: 1, max: 100_000_000, label: "Oorspronkelijk begroot bedrag" }),
    final_cost: optionalNumber({ min: 1, max: 100_000_000, label: "Definitief bedrag" }),
    amounts_vat_included: checkbox,
    extra_costs_reason: optionalText(2000),
    start_date: optionalDate,
    planned_completion_date: optionalDate,
    actual_completion_date: optionalDate,
    rework_required: triState,
    rework_description: optionalText(2000),
    evidence_reference: optionalText(300),
    rating: rating("Algemene beoordeling"),
    quality_rating: optionalRating("Kwaliteit"),
    communication_rating: optionalRating("Communicatie"),
    reliability_rating: optionalRating("Nakomen van afspraken"),
    review_text: text(20, 4000, "Toelichting"),
    truthful: checkbox.refine((v) => v, "Bevestig dat de gegevens naar waarheid zijn ingevuld."),
  })
  .refine((d) => !d.start_date || !d.actual_completion_date || d.actual_completion_date >= d.start_date, {
    path: ["actual_completion_date"],
    message: "De werkelijke opleverdatum ligt vóór de startdatum.",
  });

export const contractorResponseSchema = z.object({ review_id: uuid, response: text(5, 2000, "Reactie") });

// ── Aannemersprofiel (portaal en beheer) ────────────────────
export const contractorProfileSchema = z.object({
  company_name: text(2, 120, "Bedrijfsnaam"),
  description: text(20, 3000, "Bedrijfsomschrijving"),
  city: text(2, 80, "Vestigingsplaats"),
  hq_province: z.enum(PROVINCE_VALUES, { error: "Kies een provincie." }),
  kvk_number: z.preprocess((v) => empty(trimmed(v)), z.string().regex(/^\d{8}( \(fictief\))?$/, "Een KvK-nummer bestaat uit 8 cijfers.").optional()),
  email: z.preprocess((v) => empty(trimmed(v)), z.email("Ongeldig e-mailadres.").optional()),
  phone: optionalText(30),
  website: z.preprocess((v) => empty(trimmed(v)), z.url("Ongeldige website (begin met https://).").optional()),
  price_level: z.enum(keys(PRICE_LEVELS)),
  availability_status: z.enum(keys(AVAILABILITY)),
  available_from: optionalDate,
  team_size: optionalNumber({ min: 1, max: 5000, int: true, label: "Teamgrootte" }),
  founded_year: optionalNumber({ min: 1850, max: 2100, int: true, label: "Oprichtingsjaar" }),
  project_types: z.preprocess((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]), z.array(z.enum(RENOVATION_VALUES))),
  specialty_ids: enumArray(SPECIALTY_IDS).refine((v) => v.length > 0, "Kies minimaal één vakgebied."),
  primary_specialty: z.preprocess((v) => empty(v), z.enum(SPECIALTY_IDS).optional()),
  areas: z.preprocess((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]), z.array(z.enum(PROVINCE_VALUES))).refine((v) => v.length > 0, "Kies minimaal één provincie."),
});

export const rateSchema = z
  .object({
    specialty_id: z.enum(SPECIALTY_IDS, { error: "Kies een vakgebied." }),
    description: text(3, 200, "Omschrijving"),
    unit: z.enum(keys(RATE_UNITS)),
    price_min: requiredNumber({ min: 0, max: 10_000_000, label: "Minimumprijs" }),
    price_max: requiredNumber({ min: 0, max: 10_000_000, label: "Maximumprijs" }),
    vat_included: checkbox,
    materials_included: triState,
  })
  .refine((d) => d.price_max >= d.price_min, { path: ["price_max"], message: "Maximum moet groter of gelijk zijn aan minimum." });

export const referenceSchema = z.object({
  title: text(3, 160, "Titel"),
  city: optionalText(80),
  property_type: optionalEnum(PROPERTY_VALUES),
  renovation_type: optionalEnum(RENOVATION_VALUES),
  year: optionalNumber({ min: 1950, max: 2100, int: true, label: "Jaar" }),
  description: text(10, 2000, "Omschrijving"),
  work_items: enumArray(SPECIALTY_IDS),
});

// ── Overig ──────────────────────────────────────────────────
export const leadSchema = z.object({
  lead_type: z.enum(keys(LEAD_TYPES)),
  name: text(2, 120, "Naam"),
  email,
  company: optionalText(120),
  phone: optionalText(30),
  message: optionalText(3000),
  consent: checkbox.refine((v) => v, "Geef toestemming om contact met je op te nemen."),
});

export const flagSchema = z.object({
  entity_type: z.enum(["aannemer", "review", "projectresultaat"]),
  entity_id: uuid,
  reason: z.enum(keys(FLAG_REASONS)),
  details: text(10, 2000, "Toelichting"),
});

export const comparisonSaveSchema = z.object({
  name: text(2, 120, "Naam"),
  project_id: z.preprocess((v) => empty(v), uuid.optional()),
  contractor_ids: stringArray.pipe(z.array(uuid).min(2, "Een vergelijking bevat minimaal 2 aannemers.").max(4, "Maximaal 4 aannemers.")),
  notes: optionalText(2000),
});

export const attachmentKindSchema = z.enum(keys(ATTACHMENT_KINDS));
