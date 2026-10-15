/**
 * Prijzen per miljoen tokens (USD), Anthropic first-party API.
 * Bron: Anthropic-modeloverzicht, peildatum 2026-10-06. Controleer bij wijzigingen
 * en pas deze tabel aan; kosten worden per aanroep vastgelegd in ai_usage.cost_usd.
 * Cache-writes (5 min) kosten 1,25× het inputtarief, cache-reads 0,1×.
 */
export const MODEL_PRICES_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-fable-5-1": { input: 10, output: 50 },
  "claude-fable-5": { input: 10, output: 50 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-opus-4-7": { input: 5, output: 25 },
  "claude-opus-4-6": { input: 5, output: 25 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

export type TokenUsage = {
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
};

/** Kosten in USD. Onbekend model → hoogste bekende tarief (conservatief), zodat limieten niet te ruim uitvallen. */
export function costUsd(u: TokenUsage): { usd: number; priced: boolean } {
  const known = MODEL_PRICES_USD_PER_MTOK[u.model];
  const p = known ?? Object.values(MODEL_PRICES_USD_PER_MTOK).reduce((a, b) => (b.input > a.input ? b : a));
  const usd =
    (u.input_tokens * p.input + u.cache_creation_input_tokens * p.input * 1.25 + u.cache_read_input_tokens * p.input * 0.1 + u.output_tokens * p.output) / 1_000_000;
  return { usd, priced: Boolean(known) };
}

/** Webzoekopdrachten (server-side tool) worden apart gefactureerd: $10 per 1.000 zoekopdrachten. Ophalen van pagina's (web fetch) is niet apart geprijsd. */
export const WEB_SEARCH_USD_PER_REQUEST = 0.01;
