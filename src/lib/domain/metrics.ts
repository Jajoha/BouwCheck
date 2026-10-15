/**
 * Prestatiestatistieken per aannemer.
 *
 * Uitgangspunten (zie ook README → "Hoe worden statistieken berekend"):
 * - Alleen projectresultaten die door beheer zijn goedgekeurd en niet betwist of
 *   afgewezen zijn, tellen mee.
 * - Een statistiek wordt pas getoond vanaf `minSample` geldige waarnemingen.
 * - Er is bewust géén samengestelde betrouwbaarheidsscore.
 */

export type OutcomeInput = {
  moderation_status: string;
  verification_status: string;
  initial_budget: number | null;
  final_cost: number | null;
  planned_completion_date: string | null;
  actual_completion_date: string | null;
  start_date: string | null;
  rework_required: boolean | null;
  created_at: string | Date;
  updated_at?: string | Date;
};

export type ReviewInput = {
  moderation_status: string;
  rating: number;
  quality_rating: number | null;
  communication_rating: number | null;
  reliability_rating: number | null;
  created_at: string | Date;
};

export type Metric = {
  /** ok = voldoende gegevens; onvoldoende = te weinig waarnemingen; geen = geen enkele waarneming */
  status: "ok" | "onvoldoende" | "geen";
  value: number | null;
  n: number;
  required: number;
  method: string;
};

export type ContractorMetrics = {
  /** Goedgekeurde, niet-betwiste projectresultaten */
  registeredProjects: number;
  /** Waarvan projectgegevens met documentatie zijn gecontroleerd */
  verifiedProjects: number;
  /** Waarvan door de opdrachtgever bevestigd (maar niet met documentatie gecontroleerd) */
  clientConfirmedProjects: number;
  /** Nog in behandeling bij beheer: telt niet mee */
  pendingProjects: number;
  /** Betwist of afgewezen: telt niet mee */
  excludedProjects: number;
  onTime: Metric;
  avgDelayDays: Metric;
  budgetDeviation: Metric;
  rework: Metric;
  avgDurationDays: Metric;
  rating: Metric;
  qualityRating: Metric;
  communicationRating: Metric;
  reliabilityRating: Metric;
  reviewCount: number;
  lastUpdated: string | null;
  isStale: boolean;
};

const DAY_MS = 86_400_000;

function parseDate(value: string): number {
  // datums als 'YYYY-MM-DD' → UTC-middernacht, zodat tijdzones geen effect hebben
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseDate(to) - parseDate(from)) / DAY_MS);
}

/** Budgetafwijking (%) = (definitieve kosten − begroot) / begroot × 100. Positief = duurder dan begroot. */
export function budgetDeviationPct(initial: number | null, final: number | null): number | null {
  if (initial == null || final == null || initial <= 0) return null;
  return ((final - initial) / initial) * 100;
}

/** Vertraging in dagen: werkelijke − geplande opleverdatum. Positief = later dan gepland. */
export function delayDays(planned: string | null, actual: string | null): number | null {
  if (!planned || !actual) return null;
  return daysBetween(planned, actual);
}

function metric(values: number[], minSample: number, method: string, reducer: (v: number[]) => number): Metric {
  const n = values.length;
  if (n === 0) return { status: "geen", value: null, n, required: minSample, method };
  if (n < minSample) return { status: "onvoldoende", value: null, n, required: minSample, method };
  return { status: "ok", value: reducer(values), n, required: minSample, method };
}

const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;

export function isCountableOutcome(o: Pick<OutcomeInput, "moderation_status" | "verification_status">) {
  return o.moderation_status === "goedgekeurd" && !["betwist", "afgewezen"].includes(o.verification_status);
}

function toIso(v: string | Date): string {
  return typeof v === "string" ? v : v.toISOString();
}

export function computeMetrics(
  outcomes: OutcomeInput[],
  reviews: ReviewInput[],
  opts: { minSample: number; staleAfterMonths: number; now?: Date },
): ContractorMetrics {
  const { minSample } = opts;
  const now = opts.now ?? new Date();
  const countable = outcomes.filter(isCountableOutcome);
  const pending = outcomes.filter((o) => o.moderation_status === "in_behandeling").length;
  const excluded = outcomes.filter(
    (o) => o.moderation_status === "afgewezen" || ["betwist", "afgewezen"].includes(o.verification_status),
  ).length;

  const delays = countable
    .map((o) => delayDays(o.planned_completion_date, o.actual_completion_date))
    .filter((v): v is number => v !== null);
  const deviations = countable
    .map((o) => budgetDeviationPct(o.initial_budget, o.final_cost))
    .filter((v): v is number => v !== null);
  const reworkFlags = countable.filter((o) => o.rework_required !== null).map((o) => (o.rework_required ? 1 : 0));
  const durations = countable
    .filter((o) => o.start_date && o.actual_completion_date)
    .map((o) => daysBetween(o.start_date!, o.actual_completion_date!))
    .filter((d) => d >= 0);

  const published = reviews.filter((r) => r.moderation_status === "gepubliceerd");
  const pick = (k: "quality_rating" | "communication_rating" | "reliability_rating") =>
    published.map((r) => r[k]).filter((v): v is number => typeof v === "number");

  const dates = [...countable.map((o) => toIso(o.updated_at ?? o.created_at)), ...published.map((r) => toIso(r.created_at))].sort();
  const lastUpdated = dates.length ? dates[dates.length - 1] : null;
  const staleLimit = new Date(now);
  staleLimit.setMonth(staleLimit.getMonth() - opts.staleAfterMonths);
  const isStale = lastUpdated !== null && new Date(lastUpdated) < staleLimit;

  return {
    registeredProjects: countable.length,
    verifiedProjects: countable.filter((o) => o.verification_status === "documentatie_gecontroleerd").length,
    clientConfirmedProjects: countable.filter((o) => o.verification_status === "opdrachtgever_bevestigd").length,
    pendingProjects: pending,
    excludedProjects: excluded,
    onTime: metric(
      delays,
      minSample,
      "Aandeel projecten waarvan de werkelijke opleverdatum op of vóór de geplande opleverdatum lag.",
      (v) => (v.filter((d) => d <= 0).length / v.length) * 100,
    ),
    avgDelayDays: metric(
      delays,
      minSample,
      "Gemiddelde van (werkelijke − geplande opleverdatum) in kalenderdagen. Negatief = eerder opgeleverd.",
      mean,
    ),
    budgetDeviation: metric(
      deviations,
      minSample,
      "Gemiddelde van (definitieve kosten − oorspronkelijk begroot) / begroot × 100. Positief = duurder dan begroot.",
      mean,
    ),
    rework: metric(
      reworkFlags,
      minSample,
      "Aandeel projecten waarbij na oplevering herstelwerk nodig was, op basis van projecten waarvan dit bekend is.",
      (v) => mean(v) * 100,
    ),
    avgDurationDays: metric(
      durations,
      minSample,
      "Gemiddeld aantal kalenderdagen tussen start en werkelijke oplevering.",
      mean,
    ),
    rating: metric(
      published.map((r) => r.rating),
      minSample,
      "Gemiddelde algemene beoordeling (1–5) van gepubliceerde, aan een project gekoppelde beoordelingen.",
      mean,
    ),
    qualityRating: metric(pick("quality_rating"), minSample, "Gemiddelde beoordeling kwaliteit (1–5).", mean),
    communicationRating: metric(pick("communication_rating"), minSample, "Gemiddelde beoordeling communicatie (1–5).", mean),
    reliabilityRating: metric(pick("reliability_rating"), minSample, "Gemiddelde beoordeling nakomen van afspraken (1–5).", mean),
    reviewCount: published.length,
    lastUpdated,
    isStale,
  };
}

/**
 * Datacompleetheid (0–1) — uitsluitend gebruikt om te sorteren op "meest complete
 * projectdata". Het is het aandeel van onderstaande gegevens dat beschikbaar is;
 * het zegt niets over de kwaliteit van de aannemer.
 */
export function dataCompleteness(
  m: ContractorMetrics,
  extra: { hasRates: boolean; availabilityKnown: boolean; priceLevelKnown: boolean; businessVerified: boolean },
): number {
  const checks = [
    m.onTime.status === "ok",
    m.budgetDeviation.status === "ok",
    m.rework.status === "ok",
    m.avgDurationDays.status === "ok",
    m.rating.status === "ok",
    m.verifiedProjects > 0,
    extra.hasRates,
    extra.availabilityKnown,
    extra.priceLevelKnown,
    extra.businessVerified,
  ];
  return checks.filter(Boolean).length / checks.length;
}
