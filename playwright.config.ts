import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

/**
 * E2E-tests draaien tegen een productiebuild met een aparte, verse demo-database
 * (.data-e2e), zodat je eigen lokale demo-data niet wordt aangeraakt.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : undefined,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // Nep-Anthropic-API: de echte SDK-aanroep wordt getest zonder echte sleutel of kosten
      command: "node tests/e2e/mock-anthropic.mjs",
      url: "http://127.0.0.1:3199",
      reuseExistingServer: false,
    },
    {
      command: `rm -rf .data-e2e && next build && next start -p ${PORT}`,
      url: `http://localhost:${PORT}`,
      timeout: 240_000,
      reuseExistingServer: false,
      env: {
        BOUWCHECK_DATA_DIR: ".data-e2e",
        DEMO_MODE: "true",
        ANTHROPIC_API_KEY: "test-sleutel-alleen-voor-mock",
        ANTHROPIC_BASE_URL: "http://127.0.0.1:3199",
        ANTHROPIC_MODEL: "claude-opus-5-5",
        RESEND_API_KEY: "test-resend",
        RESEND_BASE_URL: "http://127.0.0.1:3199/resend",
        EMAIL_FROM: "BouwCheck <test@bouwcheck.test>",
        FEATURE_OFFERTECHECK: "true",
        FEATURE_FOUNDING_MEMBERS: "true",
        OFFERTECHECK_AGENDA_URL: "https://agenda.voorbeeld.test/bouwcheck",
      },
    },
  ],
});
