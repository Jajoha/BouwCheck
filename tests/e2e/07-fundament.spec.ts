import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Fundament: e-mail en funnel", () => {
  test("beheer verstuurt een testmail; een geweigerd adres wordt als mislukt vastgelegd", async ({ page }) => {
    await loginAs(page, "beheerder");
    await page.goto("/beheer/e-mail");
    await expect(page.getByText("Verzending actief via Resend")).toBeVisible();

    await page.getByLabel("Testmail naar").fill("ontvanger@voorbeeld.nl");
    await page.getByRole("button", { name: "Testmail versturen" }).click();
    await expect(page.getByText("Testmail verzonden.")).toBeVisible();
    const row = page.getByRole("row").filter({ hasText: "ontvanger@voorbeeld.nl" });
    await expect(row.getByText("verzonden", { exact: true })).toBeVisible();

    await page.getByLabel("Testmail naar").fill("weiger@voorbeeld.nl");
    await page.getByRole("button", { name: "Testmail versturen" }).click();
    const failed = page.getByRole("row").filter({ hasText: "weiger@voorbeeld.nl" });
    await expect(failed.getByText("mislukt", { exact: true })).toBeVisible();
    await expect(failed.getByText(/Resend 422/)).toBeVisible();
  });

  test("events uit bestaande flows verschijnen in de funnel", async ({ page }) => {
    // Eerdere specs maken projecten via de intake (teamvoorstel_gestart) en openen teamvoorstellen
    await loginAs(page, "beheerder");
    await page.goto("/beheer/funnel");
    await expect(page.getByRole("cell", { name: "offertecheck_gestart" })).toBeVisible();
    for (const event of ["teamvoorstel_gestart", "teamvoorstel_ontvangen"]) {
      const total = page.getByRole("row").filter({ hasText: event }).getByRole("cell").last();
      await expect(total).not.toHaveText("0");
    }
  });

  test("ongeldige afmeldlink geeft een nette melding", async ({ page }) => {
    await page.goto("/afmelden/onbekend-token-1234567890abcdef");
    await page.getByRole("button", { name: "Afmelden" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "niet (meer) geldig" })).toBeVisible();
  });
});
