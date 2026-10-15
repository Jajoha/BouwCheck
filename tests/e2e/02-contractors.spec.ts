import { expect, test } from "@playwright/test";

test.describe("Aannemersprofielen (geen zelf zoeken of vergelijken)", () => {
  test("de oude aannemerslijst en vergelijkpagina's bestaan niet meer", async ({ page }) => {
    await page.goto("/aannemers");
    await expect(page).toHaveURL(/\/inloggen\?next=%2Fprojecten%2Fnieuw/);
    for (const path of ["/vergelijken", "/vergelijkingen"]) {
      const res = await page.goto(path);
      expect(res?.status()).toBe(404);
    }
  });

  test("profiel toont bronnen, demolabels en onvoldoende-gegevens", async ({ page }) => {
    await page.goto("/aannemers/nieuwe-hoek");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Klusbedrijf De Nieuwe Hoek");
    await expect(page.getByText("Demo-data — niet geverifieerd").first()).toBeVisible();
    await expect(page.getByText("Onvoldoende gegevens voor een betrouwbare vergelijking")).toBeVisible();
    await expect(page.getByText("Bron: Zelf opgegeven door uitvoerder").first()).toBeVisible();
    await expect(page.getByText("Bron: Ervaringen van opdrachtgevers")).toBeVisible();

    await page.goto("/aannemers/lindewaard");
    await expect(page.getByText("Bedrijfsgegevens gecontroleerd").first()).toBeVisible();
    await expect(page.getByText("(fictief)").first()).toBeVisible();
    await expect(page.getByText("Gebaseerd op 11 projecten").first()).toBeVisible();
  });

  test("niet-actieve profielen zijn niet openbaar", async ({ page }) => {
    for (const slug of ["vlakvloer", "stroomlijn"]) {
      const res = await page.goto(`/aannemers/${slug}`);
      expect(res?.status()).toBe(404);
    }
  });
});
