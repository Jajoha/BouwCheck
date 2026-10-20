/** Datum van vandaag (JJJJ-MM-DD) in Nederlandse tijd. */
export function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date());
}

/** Huidig tijdstip in milliseconden (buiten de render aan te roepen, bijv. in datafuncties). */
export function nowMs() {
  return Date.now();
}
