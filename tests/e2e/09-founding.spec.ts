import { expect, test } from "@playwright/test";
import { loginAs, logout } from "./helpers";

test.describe("Founding members en cases", () => {
  test("aanvraag, plekken per regio uit de database en reservering door beheer", async ({ page }) => {
    await page.goto("/founding-members");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Doe als een van de eersten mee en betaal minder");
    await expect(page.getByText("€ 149 per maand")).toBeVisible();
    await expect(page.getByText(/De volgende start is op/)).toBeVisible();
    const seats = page.getByRole("list", { name: "Vrije plekken per regio" });
    await expect(seats.getByRole("listitem").filter({ hasText: "Zeeland" })).toContainText("25/25");

    await page.getByRole("button", { name: "Plek aanvragen" }).click();
    await expect(page.getByText("Kies je regio.")).toBeVisible();
    await expect(page.getByText("Vul het aantal projecten per jaar in.")).toBeVisible();
    await page.getByLabel(/^Naam/).fill("Founding Tester");
    await page.getByLabel(/^E-mailadres/).fill("founding@voorbeeld.nl");
    await page.getByLabel(/^Regio/).selectOption("Zeeland");
    await page.getByLabel(/Projecten per jaar/).fill("4");
    await page.getByLabel(/toestemming/).check();
    await page.getByRole("button", { name: "Plek aanvragen" }).click();
    await expect(page).toHaveURL(/\/founding-members\/bedankt/);
    await expect(page.getByText("Er wordt nu niets afgerekend.", { exact: false })).toBeVisible();

    await loginAs(page, "beheerder");
    await page.goto("/beheer/founding-members");
    const row = page.getByRole("row").filter({ hasText: "founding@voorbeeld.nl" });
    await row.getByLabel("Status").selectOption("gereserveerd");
    await expect(page.getByText("Status bijgewerkt.")).toBeVisible();
    await page.goto("/beheer/funnel");
    for (const event of ["founding_member_interesse", "founding_member_gereserveerd"]) {
      await expect(page.getByRole("row").filter({ hasText: event }).getByRole("cell").last()).not.toHaveText("0");
    }
    await logout(page);
    await page.goto("/founding-members");
    await expect(page.getByRole("list", { name: "Vrije plekken per regio" }).getByRole("listitem").filter({ hasText: "Zeeland" })).toContainText("24/25");
  });

  test("interesse in de projectpas wordt als event vastgelegd", async ({ page }) => {
    await page.goto("/prijzen?plan=projectpas#aanvragen");
    await expect(page.getByLabel("Onderwerp")).toHaveValue("projectpas");
    await page.getByLabel(/^Naam/).fill("Pas Tester");
    await page.getByLabel("E-mailadres").fill("pas@voorbeeld.test");
    await page.getByLabel(/toestemming/).check();
    await page.getByRole("button", { name: "Aanvraag versturen" }).click();
    await expect(page).toHaveURL(/\/bedankt\?type=projectpas/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bedankt. We nemen binnen 1 werkdag contact met je op om te starten.");
    await loginAs(page, "beheerder");
    await page.goto("/beheer/funnel");
    await expect(page.getByRole("row").filter({ hasText: "projectpas_interesse" }).getByRole("cell").last()).not.toHaveText("0");
  });

  test("cases-blok verschijnt alleen met gepubliceerde cases", async ({ page }) => {
    await loginAs(page, "beheerder");
    await page.goto("/beheer/cases");
    await page.getByLabel(/^Titel/).fill("Tussenwoning Zwolle");
    await page.getByLabel(/^Samenvatting/).fill("Offertecheck vond een ontbrekende post voor de fundering; het team offreerde op één scope.");
    await page.getByLabel(/^Resultaat/).fill("€ 6.200 meerwerk voorkomen");
    await page.getByRole("button", { name: "Case toevoegen" }).click();
    await expect(page.getByText("Case opgeslagen (nog niet gepubliceerd).")).toBeVisible();
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Uit de praktijk" })).toHaveCount(0);
    await page.goto("/beheer/cases");
    await page.getByRole("listitem").filter({ hasText: "Tussenwoning Zwolle" }).getByRole("button", { name: "Publiceren" }).click();
    await expect(page.getByText("Case gepubliceerd.")).toBeVisible();
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Uit de praktijk" })).toBeVisible();
    await expect(page.getByText("€ 6.200 meerwerk voorkomen")).toBeVisible();
    await page.goto("/beheer/cases");
    await page.getByRole("listitem").filter({ hasText: "Tussenwoning Zwolle" }).getByRole("button", { name: "Verbergen" }).click();
    await expect(page.getByText("Case verborgen.")).toBeVisible();
  });
});
