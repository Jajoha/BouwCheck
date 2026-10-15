import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll } from "./helpers";

test.describe("Publieke site", () => {
  test("homepage toont propositie, navigatie en werkende CTA's", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto("/");
    await expect(page).toHaveTitle(/BouwCheck/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("De juiste aannemer maakt het verschil tussen winst en verlies.");
    await expect(page.getByText("Demo-modus:")).toBeVisible();
    // productpreview met echte demo-data
    await expect(page.getByRole("figure", { name: "Voorbeeld van een vergelijking" })).toContainText("Bouwgroep Lindewaard");
    await page.getByRole("link", { name: "Bekijk hoe het werkt" }).click();
    await expect(page.getByRole("heading", { name: "Hoe het werkt" })).toBeInViewport();
    await page.getByRole("link", { name: "Vind een aannemer" }).click();
    await expect(page).toHaveURL(/\/aannemers$/);
    expect(errors).toEqual([]);
  });

  test("geen oude productnaam in de interface", async ({ page }) => {
    for (const path of ["/", "/aannemers", "/prijzen", "/inloggen", "/transparantie"]) {
      await page.goto(path);
      await expect(page.locator("body")).not.toContainText("FlipSelect");
    }
  });

  test("juridische conceptpagina's en prijspagina met testprijzen", async ({ page }) => {
    for (const path of ["/privacy", "/voorwaarden", "/disclaimer"]) {
      await page.goto(path);
      await expect(page.getByText("Concepttekst — niet juridisch gecontroleerd")).toBeVisible();
    }
    await page.goto("/prijzen");
    await expect(page.getByText("Voorlopige testprijzen")).toBeVisible();
    await expect(page.getByText("€ 199")).toBeVisible();
    await expect(page.getByText("€ 499 – € 999")).toBeVisible();
    await expect(page.getByText("€ 99", { exact: true })).toBeVisible();
  });

  test("interesseformulier valideert en slaat op", async ({ page }) => {
    await page.goto("/prijzen?plan=pro#aanvragen");
    await expect(page.getByLabel("Onderwerp")).toHaveValue("pro");
    await page.getByRole("button", { name: "Aanvraag versturen" }).click();
    await expect(page.getByText("Naam is verplicht.")).toBeVisible();
    await expect(page.getByText("Geef toestemming om contact met je op te nemen.")).toBeVisible();
    await page.getByLabel(/^Naam/).fill("E2E Tester");
    await page.getByLabel("E-mailadres").fill("e2e@voorbeeld.test");
    await page.getByLabel(/toestemming/).check();
    await page.getByRole("button", { name: "Aanvraag versturen" }).click();
    await expect(page).toHaveURL(/\/bedankt\?type=pro/);
    await expect(page.getByText("geen betaling gestart", { exact: false })).toBeVisible();
  });

  test("mobiel: geen horizontale scroll en werkend menu", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ["/", "/aannemers", "/aannemers/lindewaard", "/prijzen"]) {
      await page.goto(path);
      await expectNoHorizontalScroll(page);
    }
    await page.goto("/");
    await page.getByRole("button", { name: "Menu openen" }).click();
    await page.getByRole("navigation", { name: "Mobiele navigatie" }).getByRole("link", { name: "Prijzen" }).click();
    await expect(page).toHaveURL(/\/prijzen/);
  });
});
