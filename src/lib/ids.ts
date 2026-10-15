/** Normaliseert een lijst uuid's uit de URL: alleen geldige id's, uniek, maximaal `max`. */
export function parseIdList(raw: string | string[] | undefined, max: number): string[] {
  const value = Array.isArray(raw) ? raw.join(",") : raw ?? "";
  const ids = value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s));
  return [...new Set(ids)].slice(0, max);
}
