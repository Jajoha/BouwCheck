/**
 * Vergelijkbaarheidsanalyse van prijzen. Pure functies, getest in tests/unit.
 * Doel: nooit een "laagste prijs" markeren als bedragen niet één-op-één
 * vergelijkbaar zijn, en de gebruiker uitleggen waarom.
 */
import { specialtyName, PRICE_TYPES, type PriceType } from "./constants";

export type QuoteForComparison = {
  contractorId: string;
  contractorName: string;
  price_type: PriceType;
  amount: number;
  vat_included: boolean;
  materials_included: boolean | null;
  scope_specialty_ids: string[];
  exclusions: string | null;
  estimated_duration_days: number | null;
};

export type ComparabilityResult = {
  comparable: boolean;
  warnings: string[];
  lowestPriceContractorId: string | null;
  shortestDurationContractorId: string | null;
};

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

export function analyzeQuotes(
  contractorIds: string[],
  quotes: QuoteForComparison[],
): ComparabilityResult {
  const warnings: string[] = [];
  const missing = contractorIds.length - quotes.length;

  if (quotes.length === 0) {
    return {
      comparable: false,
      warnings: ["Er zijn nog geen offertes of prijsopgaven voor dit project vastgelegd. Alleen indicatieve tarieven zijn beschikbaar."],
      lowestPriceContractorId: null,
      shortestDurationContractorId: null,
    };
  }
  if (missing > 0) {
    warnings.push(
      `Voor ${missing} van de ${contractorIds.length} aannemers is nog geen bedrag voor dit project bekend.`,
    );
  }

  const priceTypes = new Set(quotes.map((q) => q.price_type));
  if (priceTypes.size > 1) {
    warnings.push(
      `Je vergelijkt verschillende soorten bedragen (${[...priceTypes]
        .map((t) => PRICE_TYPES[t].label.toLowerCase())
        .join(", ")}). Een indicatieve prijs is geen offerte en geen definitief afgesproken bedrag.`,
    );
  }

  const vat = new Set(quotes.map((q) => q.vat_included));
  if (vat.size > 1) {
    warnings.push("Sommige bedragen zijn inclusief btw en andere exclusief btw. Vergelijk niet zonder correctie.");
  }

  const materials = new Set(quotes.map((q) => q.materials_included));
  if (materials.size > 1) {
    warnings.push("Niet alle bedragen hebben dezelfde aanname over materialen (wel/niet inbegrepen of onbekend).");
  }

  const base = quotes[0].scope_specialty_ids;
  const scopeDiffers = quotes.some((q) => !sameSet(q.scope_specialty_ids, base));
  if (scopeDiffers) {
    const all = [...new Set(quotes.flatMap((q) => q.scope_specialty_ids))];
    for (const q of quotes) {
      const lacking = all.filter((s) => !q.scope_specialty_ids.includes(s));
      if (lacking.length) {
        warnings.push(
          `${q.contractorName} heeft ${lacking.map(specialtyName).join(", ").toLowerCase()} niet in de scope. De bedragen zijn niet één-op-één vergelijkbaar.`,
        );
      }
    }
  }

  const withExclusions = quotes.filter((q) => q.exclusions && q.exclusions.trim().length > 0);
  if (withExclusions.length > 0) {
    warnings.push(
      `Controleer de uitsluitingen van ${withExclusions.map((q) => q.contractorName).join(", ")} voordat je bedragen vergelijkt.`,
    );
  }

  const comparable =
    missing === 0 && priceTypes.size === 1 && vat.size === 1 && materials.size === 1 && !scopeDiffers && quotes.length >= 2;

  let lowestPriceContractorId: string | null = null;
  if (comparable) {
    const sorted = [...quotes].sort((a, b) => a.amount - b.amount);
    // Geen markering bij een gelijke stand
    if (sorted.length > 1 && sorted[0].amount < sorted[1].amount) lowestPriceContractorId = sorted[0].contractorId;
  }

  const durations = quotes.filter((q) => q.estimated_duration_days != null);
  let shortestDurationContractorId: string | null = null;
  if (durations.length >= 2) {
    const sorted = [...durations].sort((a, b) => a.estimated_duration_days! - b.estimated_duration_days!);
    if (sorted[0].estimated_duration_days! < sorted[1].estimated_duration_days!) {
      shortestDurationContractorId = sorted[0].contractorId;
    }
  }

  return { comparable, warnings, lowestPriceContractorId, shortestDurationContractorId };
}

/** Normaliseert een lijst aannemer-id's uit de URL: uniek, maximaal `max`. */
export function parseCompareIds(raw: string | string[] | undefined, max: number): string[] {
  const value = Array.isArray(raw) ? raw.join(",") : raw ?? "";
  const ids = value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[0-9a-f-]{36}$/i.test(s));
  return [...new Set(ids)].slice(0, max);
}
