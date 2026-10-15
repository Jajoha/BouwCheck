/** Vooraf aangemaakte demo-accounts (alleen in de demo-seed; nooit echte gebruikers). */
export const DEMO_PASSWORD = "demo-bouwcheck";
export const DEMO_ACCOUNTS = {
  flipper: "flipper@demo.bouwcheck.test",
  admin: "beheer@demo.bouwcheck.test",
  contractor: "aannemer@demo.bouwcheck.test",
} as const;

export const DEMO_EMAILS: readonly string[] = Object.values(DEMO_ACCOUNTS);
