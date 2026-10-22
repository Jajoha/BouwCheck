import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, loginAs } from "./helpers";

test.describe("Intake en teamvoorstellen", () => {
  test("teamvoorstellen voor het demoproject: drie prioriteiten met onderbouwing", async ({ page }) => {
    await loginAs(page, "vastgoedondernemer");
    await page.goto("/projecten");
    await page.getByRole("link", { name: /Tussenwoning Amersfoort/ }).first().click();
    await page.getByRole("link", { name: "Teamvoorstellen" }).first().click();
    await expect(page).toHaveURL(/\/voorstellen$/);
    for (const id of ["budget", "kwaliteit", "snelheid"]) {
      const section = page.locator(`#${id}`);
      await expect(section.getByText("Criterium:")).toBeVisible();
      await expect(section.getByTestId("team-option").first()).toBeVisible();
    }
    // De goedkoopste hoofdaannemer heeft te weinig beoordelingen: niet gerangschikt op betrouwbaarheid (intern: kwaliteit)
    const kwaliteit = page.locator("#kwaliteit");
    await kwaliteit.getByText(/niet gerangschikt op betrouwbaarheid/).click();
    await expect(kwaliteit.getByText(/Onvoldoende beoordelingen.*Klusbedrijf De Nieuwe Hoek/)).toBeVisible();
    // Kostenindicatie altijd met btw-vermelding
    await expect(page.locator("#budget").getByText("(zonder btw)").first()).toBeVisible();
    // Geen vergelijk-UI meer
    await expect(page.getByText(/Vergelijk(en)? /)).toHaveCount(0);
  });

  test("handmatige intake zonder AI en werkzaamheden aanpassen", async ({ page }) => {
    await loginAs(page, "vastgoedondernemer");
    await page.goto("/projecten/nieuw");
    await page.getByLabel("Wat wil je laten doen?").fill("Alle wanden en plafonds opnieuw schilderen in een bovenwoning.");
    await page.getByLabel("Locatie (plaats of postcode)").fill("Arnhem");
    await page.getByLabel("Provincie").selectOption("Gelderland");
    await page.getByLabel("Type woning").selectOption("Bovenwoning");
    await page.getByLabel("Type renovatie").selectOption("Cosmetische opknapbeurt");
    await page.getByRole("button", { name: "Werkzaamheden zelf invullen" }).click();

    await page.getByRole("button", { name: "Opslaan en teamvoorstellen bekijken" }).click();
    await expect(page.getByText("Regel 1: kies een vakgebied.").first()).toBeVisible();
    await page.getByLabel("Vakgebied onderdeel 1").selectOption("schilder");
    await page.getByLabel("Omschrijving onderdeel 1").fill("Binnenschilderwerk wanden en plafonds");
    await page.getByLabel("Hoeveelheid onderdeel 1").fill("180");
    await page.getByRole("button", { name: "Opslaan en teamvoorstellen bekijken" }).click();
    await expect(page.getByText("Regel 1: vul hoeveelheid én eenheid in, of laat beide leeg.").first()).toBeVisible();
    await page.getByLabel("Eenheid onderdeel 1").selectOption("m2");
    await page.getByRole("button", { name: "Opslaan en teamvoorstellen bekijken" }).click();

    await expect(page).toHaveURL(/\/voorstellen/);
    await expect(page.locator("#budget").getByText("Schildersbedrijf Kwastenburg").first()).toBeVisible();
    // 180 m² × € 9–15 (midden prijsniveau) = € 1.620 – € 2.700
    await expect(page.locator("#budget").getByText("€ 1.620 – € 2.700").first()).toBeVisible();

    await page.getByRole("link", { name: "Werkzaamheden aanpassen" }).click();
    await page.getByLabel("Hoeveelheid onderdeel 1").fill("100");
    await page.getByRole("button", { name: "Opslaan en teamvoorstellen bekijken" }).click();
    await expect(page.locator("#budget").getByText("€ 900 – € 1.500").first()).toBeVisible();
  });

  test("mobiel: intake en voorstellen zonder horizontale scroll", async ({ page }) => {
    await loginAs(page, "vastgoedondernemer");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/projecten/nieuw");
    await expectNoHorizontalScroll(page);
    await page.goto("/projecten");
    await page.getByRole("link", { name: /Tussenwoning Amersfoort/ }).first().click();
    await page.getByRole("link", { name: "Teamvoorstellen" }).first().click();
    await expectNoHorizontalScroll(page);
  });
});
