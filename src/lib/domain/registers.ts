/**
 * Signalen uit openbare registers (faillissementen, KvK, rechtspraak).
 *
 * Beleid:
 * - Alleen juridische feiten (faillissement, surseance, opgeheven KvK-inschrijving) die via het
 *   KvK-nummer aan de uitvoerder zijn gekoppeld, sluiten uit van teamvoorstellen — altijd zichtbaar
 *   met de reden. De database dwingt dit ook af.
 * - Al het andere is een waarschuwing: de uitvoerder blijft gerangschikt, de flipper beslist.
 * - Niets telt mee voordat een beheerder het signaal heeft goedgekeurd.
 * - Er is geen score: een signaal is een feit met een bron.
 */

export const SIGNAL_KINDS = {
  faillissement: { label: "Faillissement", legal: true },
  surseance: { label: "Surseance van betaling", legal: true },
  kvk_uitgeschreven: { label: "KvK-inschrijving opgeheven", legal: true },
  jonge_inschrijving: { label: "Recente KvK-inschrijving", legal: false },
  doorstart_zelfde_adres: { label: "Mogelijke doorstart op hetzelfde adres", legal: false },
  rechterlijke_uitspraak: { label: "Rechterlijke uitspraak", legal: false },
  overig: { label: "Overig registerfeit", legal: false },
} as const;
export type SignalKind = keyof typeof SIGNAL_KINDS;
export const SIGNAL_KIND_IDS = Object.keys(SIGNAL_KINDS) as [SignalKind, ...SignalKind[]];

export const MATCH_BASIS = {
  kvk_nummer: "Gekoppeld op KvK-nummer",
  naam_en_adres: "Gekoppeld op naam en adres",
  naam: "Alleen op naam gekoppeld",
} as const;
export type MatchBasis = keyof typeof MATCH_BASIS;
export const MATCH_BASIS_IDS = Object.keys(MATCH_BASIS) as [MatchBasis, ...MatchBasis[]];

export type SignalEffect = "uitsluiting" | "waarschuwing";
export type SignalStatus = "voorgesteld" | "goedgekeurd" | "afgewezen" | "ingetrokken";

export const SIGNAL_STATUS: Record<SignalStatus, string> = {
  voorgesteld: "Voorgesteld (nog niet beoordeeld)",
  goedgekeurd: "Goedgekeurd",
  afgewezen: "Afgewezen",
  ingetrokken: "Ingetrokken",
};

/** Een registercontrole ouder dan dit aantal dagen geldt als verouderd. */
export const REGISTER_MAX_AGE_DAYS = 90;

/** Het maximale effect dat het beleid toestaat. Een beheerder mag alleen afzwakken, nooit verzwaren. */
export function policyEffect(kind: SignalKind, matchBasis: MatchBasis): SignalEffect {
  return SIGNAL_KINDS[kind].legal && matchBasis === "kvk_nummer" ? "uitsluiting" : "waarschuwing";
}

/** Effect na beoordeling: het gevraagde effect, maar nooit zwaarder dan het beleid toestaat. */
export function allowedEffect(kind: SignalKind, matchBasis: MatchBasis, requested: SignalEffect): SignalEffect {
  return requested === "uitsluiting" && policyEffect(kind, matchBasis) === "uitsluiting" ? "uitsluiting" : "waarschuwing";
}

export type RegisterSignal = {
  id: string;
  kind: SignalKind;
  effect: SignalEffect;
  status: SignalStatus;
  title: string;
  summary: string;
  source_name: string;
  source_url: string;
  event_date: string | null;
  match_basis: MatchBasis;
  contractor_response: string | null;
};

export type RegisterImpact = {
  /** Eerste goedgekeurde uitsluitende signaal, of null. */
  exclusion: RegisterSignal | null;
  /** Goedgekeurde waarschuwingen (uitvoerder blijft gerangschikt). */
  warnings: RegisterSignal[];
};

/** Wat goedgekeurde signalen betekenen voor teamvoorstellen. Voorgestelde of afgewezen signalen tellen niet mee. */
export function registerImpact(signals: RegisterSignal[]): RegisterImpact {
  const approved = signals.filter((s) => s.status === "goedgekeurd");
  return {
    exclusion: approved.find((s) => s.effect === "uitsluiting") ?? null,
    warnings: approved.filter((s) => s.effect === "waarschuwing"),
  };
}

/** Leesbare reden voor uitsluiting, met bron. */
export function exclusionReason(s: RegisterSignal): string {
  const date = s.event_date ? ` op ${s.event_date.split("-").reverse().join("-")}` : "";
  return `${SIGNAL_KINDS[s.kind].label}${date} (bron: ${s.source_name})`;
}

/** Dagen sinds de laatste voltooide controle; null als er nooit is gecontroleerd. */
export function checkAgeDays(lastCheckedIso: string | null, todayIso: string): number | null {
  if (!lastCheckedIso) return null;
  const ms = Date.parse(todayIso.slice(0, 10)) - Date.parse(lastCheckedIso.slice(0, 10));
  return Math.max(0, Math.round(ms / 86_400_000));
}

export function isCheckStale(lastCheckedIso: string | null, todayIso: string, maxAgeDays = REGISTER_MAX_AGE_DAYS): boolean {
  const age = checkAgeDays(lastCheckedIso, todayIso);
  return age === null || age > maxAgeDays;
}
