import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, loginAs } from "./helpers";

test.describe("Vergelijkingsmodule", () => {
  test("2–4 aannemers toevoegen, verwijderen en limiet", async ({ page }) => {
    await page.goto("/aannemers?vakgebied=hoofdaannemer");
    const cards = page.getByTestId("contractor-card");
    for (let i = 0; i < 4; i++) await cards.nth(i).getByRole("button", { name: /Vergelijken/ }).click();
    await expect(page.getByRole("region", { name: "Vergelijkingsselectie" })).toContainText("4/4");
    // vijfde wordt geweigerd
    await cards.nth(4).getByRole("button", { name: /Vergelijken/ }).click();
    await expect(page.getByText(/maximaal 4 aannemers/i)).toBeVisible();

    await page.getByRole("link", { name: /Vergelijk 4 aannemers/ }).click();
    await expect(page).toHaveURL(/\/vergelijken\?ids=/);
    const table = page.getByRole("table");
    await expect(table.locator("thead th")).toHaveCount(5);
    await expect(page.getByText("Er is niet één beste aannemer")).toBeVisible();

    // verwijderen
    await page.getByRole("link", { name: /verwijderen uit vergelijking/ }).first().click();
    await expect(table.locator("thead th")).toHaveCount(4);
    // toevoegen via keuzelijst
    await page.getByLabel("Aannemer toevoegen").selectOption({ label: "Elektro Vonkenberg" });
    await page.getByRole("button", { name: "Toevoegen aan vergelijking" }).click();
    await expect(table.locator("thead")).toContainText("Elektro Vonkenberg");
    // metrieken met n of expliciet ontbrekend
    await expect(table).toContainText("(n=");
    await expect(table).toContainText("Ontbrekende gegevens");
    // bij 4 aannemers kan er geen vijfde bij
    await expect(page.getByLabel("Aannemer toevoegen")).toBeDisabled();
  });

  test("vergelijking voor project: scopewaarschuwing, geen 'laagste' bij ongelijke scope, opslaan", async ({ page }) => {
    await loginAs(page, "vastgoedflipper");
    await page.goto("/vergelijkingen");
    await page.getByRole("link", { name: "Amersfoort — hoofdaannemer" }).click();
    await expect(page.getByText("Bedragen zijn niet één-op-één vergelijkbaar", { exact: true })).toBeVisible();
    await expect(page.getByText(/De Nieuwe Hoek heeft elektricien, loodgieter niet in de scope/)).toBeVisible();
    await expect(page.getByText("Laagste bedrag")).toHaveCount(0);
    await expect(page.getByRole("table").getByText("Kortste doorlooptijd")).toBeVisible();
    await expect(page.getByText("€ 59.900 excl. btw")).toBeVisible();

    // sorteren op kortste doorlooptijd → Snelbouw (35 dagen) eerst
    await page.getByLabel("Sorteer kolommen op").selectOption("doorlooptijd");
    await page.getByRole("button", { name: "Sorteer" }).click();
    await expect(page.locator("thead th").nth(1)).toContainText("Snelbouw Oost");

    await page.getByLabel("Naam").fill("E2E vergelijking");
    await page.getByRole("button", { name: "Vergelijking opslaan" }).click();
    await expect(page.getByText("Vergelijking opgeslagen.")).toBeVisible();
    await page.goto("/vergelijkingen");
    await expect(page.getByRole("link", { name: "E2E vergelijking" })).toBeVisible();
  });

  test("mobiel: vergelijking scrolt binnen de tabel, niet de pagina", async ({ page }) => {
    await loginAs(page, "vastgoedflipper");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/vergelijkingen");
    await page.getByRole("link", { name: "Amersfoort — hoofdaannemer" }).click();
    await expect(page.getByRole("region", { name: "Vergelijkingstabel" })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});
