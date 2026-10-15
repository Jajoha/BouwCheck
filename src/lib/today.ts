/** Datum van vandaag (JJJJ-MM-DD) in Nederlandse tijd. */
export function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date());
}
