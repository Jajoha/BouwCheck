import { expect, test } from "@playwright/test";

test.describe("Aannemersdatabase en profielen", () => {
  test("zoeken, filteren, sorteren en pagineren", async ({ page }) => {
    await page.goto("/aannemers");
    await expect(page.locator("#inhoud").getByText(/15\s+aannemers gevonden/)).toBeVisible();
    await expect(page.getByTestId("contractor-card")).toHaveCount(9);
    await page.getByRole("link", { name: "Volgende" }).click();
    await expect(page.getByText("Pagina 2 van 2")).toBeVisible();

    await page.goto("/aannemers");
    await page.getByLabel("Zoeken").fill("lindewaard");
    await page.getByRole("button", { name: "Toepassen" }).click();
    await expect(page.getByTestId("contractor-card")).toHaveCount(1);
    await expect(page.getByTestId("contractor-card")).toContainText("Bouwgroep Lindewaard");

    await page.goto("/aannemers");
    await page.getByLabel("Vakgebied").selectOption("elektricien");
    await page.getByRole("button", { name: "Toepassen" }).click();
    await expect(page.getByTestId("contractor-card")).toHaveCount(1);
    await expect(page.getByTestId("contractor-card")).toContainText("Elektro Vonkenberg");

    // Gecombineerde filters: provincie + vakgebied
    await page.goto("/aannemers?vakgebied=hoofdaannemer&provincie=Utrecht");
    await expect(page.locator("#inhoud").getByText(/4\s+aannemers gevonden/)).toBeVisible();

    // Sorteren op tijdige oplevering: aannemers zonder voldoende data onderaan, met uitleg
    await page.getByLabel("Sorteer op").selectOption("op_tijd");
    await page.getByRole("button", { name: "Sorteer" }).click();
    await expect(page.locator("#inhoud").getByText(/onvoldoende gegevens voor sortering op tijdige oplevering/)).toBeVisible();
    await expect(page.getByTestId("contractor-card").last()).toContainText("Klusbedrijf De Nieuwe Hoek");

    // Filter op beoordeling sluit aannemers met te weinig reviews uit
    await page.goto("/aannemers?beoordeling=4.5");
    const names = await page.getByTestId("contractor-card").locator("h3").allTextContents();
    expect(names).not.toContain("Keukenmontage Aanrechtwerk");
  });

  test("lege staat bij geen resultaten", async ({ page }) => {
    await page.goto("/aannemers?q=bestaatnietxyz");
    await expect(page.locator("#inhoud").getByText("Geen aannemers gevonden")).toBeVisible();
  });

  test("profiel toont bronnen, demolabels en onvoldoende-gegevens", async ({ page }) => {
    await page.goto("/aannemers?q=nieuwe%20hoek");
    await page.getByRole("link", { name: "Klusbedrijf De Nieuwe Hoek" }).first().click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Klusbedrijf De Nieuwe Hoek");
    await expect(page.getByText("Demo-data — niet geverifieerd").first()).toBeVisible();
    await expect(page.getByText("Onvoldoende gegevens voor een betrouwbare vergelijking")).toBeVisible();
    await expect(page.getByText("Bron: Zelf opgegeven door bedrijf").first()).toBeVisible();
    await expect(page.getByText("Bron: Ervaringen van opdrachtgevers")).toBeVisible();

    await page.goto("/aannemers/lindewaard");
    await expect(page.getByText("Bedrijfsgegevens gecontroleerd").first()).toBeVisible();
    await expect(page.getByText("(fictief)").first()).toBeVisible();
    await expect(page.getByText("Gebaseerd op 11 projecten").first()).toBeVisible();
  });

  test("niet-actieve profielen zijn niet openbaar", async ({ page }) => {
    await page.goto("/aannemers/vlakvloer");
    await expect(page.getByText("Pagina niet gevonden")).toBeVisible();
    await page.goto("/aannemers/stroomlijn");
    await expect(page.getByText("Pagina niet gevonden")).toBeVisible();
  });
});
