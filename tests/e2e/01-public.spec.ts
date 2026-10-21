import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, OFFER_BENEFITS, OFFER_EYEBROW, OFFER_INTRO } from "./helpers";

test.describe("Publieke site", () => {
  test("homepage rond de Offertecheck: propositie, navigatie en werkende CTA's", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto("/");
    await expect(page).toHaveTitle(/BouwCheck/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Zie het meerwerk vóórdat het je marge opeet.");
    await expect(page.getByText(OFFER_EYEBROW, { exact: true })).toBeVisible();
    await expect(page.getByText(OFFER_INTRO, { exact: true })).toBeVisible();
    const benefits = page.getByRole("heading", { name: "Wat je krijgt", level: 2 }).locator("xpath=following-sibling::ul[1]");
    await expect(benefits.getByRole("listitem")).toHaveText(OFFER_BENEFITS);
    await expect(page.getByRole("main").getByRole("link", { name: "Gratis Offertecheck" }).first()).toHaveAttribute("href", "/offertecheck#upload");
    await expect(page.getByText("Werk je met meerdere panden per jaar?")).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Bekijk BouwCheck Pro." })).toHaveAttribute("href", "/prijzen#pro");
    await expect(page.getByText("Demo-modus:")).toBeVisible();
    // statische voorbeeldcheck, als demo gelabeld
    const example = page.getByRole("figure", { name: "Voorbeeld van een Offertecheck" });
    await expect(example).toContainText("Ontbreekt");
    await expect(example).toContainText("Stelpost");
    await expect(example).toContainText("Demo");
    // teamvoorstellen met echte demo-data blijven op de pagina
    const preview = page.getByRole("figure", { name: "Voorbeeld van teamvoorstellen" });
    for (const label of ["Budget", "Kwaliteit", "Snelheid"]) await expect(preview).toContainText(label);
    // navigatie
    const nav = page.getByRole("navigation", { name: "Hoofdnavigatie" });
    for (const label of ["Hoe het werkt", "Offertecheck", "Prijzen", "Voor vakmensen"]) await expect(nav.getByRole("link", { name: label })).toBeVisible();
    await expect(page.getByRole("banner").getByRole("link", { name: "Gratis Offertecheck" })).toHaveAttribute("href", "/offertecheck#upload");
    // ladder, verhaal (placeholder), founding members, vakmensen en nieuwe FAQ
    for (const step of ["Offertecheck", "Teamvoorstel", "Projectpas", "Pro"]) await expect(page.locator("#hoe-het-werkt").getByRole("heading", { name: step, exact: true })).toBeVisible();
    await expect(page.getByText("Placeholder — oprichtersverhaal.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "25 plekken per regio, prijs blijvend vast" })).toBeVisible();
    await expect(page.getByText("Geen leadkosten, en elke aanvraag op een duidelijke scope.")).toBeVisible();
    await expect(page.getByText("Ziet de aannemer dat ik een check doe?")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Uit de praktijk" })).toHaveCount(0);
    // CTA's
    await nav.getByRole("link", { name: "Hoe het werkt" }).click();
    await expect(page.getByRole("heading", { name: "Hoe het werkt" })).toBeInViewport();
    await page.getByRole("main").getByRole("link", { name: "Gratis Offertecheck" }).first().click();
    await expect(page).toHaveURL(/\/offertecheck#upload$/);
    await expect(page.getByRole("heading", { name: "Upload je offertes", level: 2 })).toBeInViewport();
    expect(errors).toEqual([]);
  });

  test("geen oude productnaam in de interface", async ({ page }) => {
    for (const path of ["/", "/aannemers/lindewaard", "/prijzen", "/inloggen", "/transparantie"]) {
      await page.goto(path);
      await expect(page.locator("body")).not.toContainText("FlipSelect");
    }
  });

  test("juridische conceptpagina's en prijspagina met de vijf treden", async ({ page }) => {
    for (const path of ["/privacy", "/voorwaarden", "/disclaimer"]) {
      await page.goto(path);
      await expect(page.getByText("Concepttekst — niet juridisch gecontroleerd")).toBeVisible();
    }
    await page.goto("/prijzen");
    for (const name of ["Offertecheck", "Teamvoorstel", "Projectpas", "BouwCheck Pro", "Portfolio"]) {
      await expect(page.getByRole("heading", { name, exact: true, level: 2 })).toBeVisible();
    }
    await expect(page.getByText("€ 299", { exact: true })).toBeVisible();
    await expect(page.getByText("€ 199", { exact: true })).toBeVisible();
    await expect(page.getByText("€ 595", { exact: true })).toBeVisible();
    await expect(page.getByText("Aanbevolen")).toBeVisible();
    await expect(page.getByText("Nu gratis, alleen werkelijke kosten").first()).toBeVisible();
    // rekenvoorbeeld komt uit de prijzen en klopt dus altijd
    await expect(page.getByText("8 projecten per jaar")).toBeVisible();
    await page.getByRole("link", { name: "Check starten" }).click();
    await expect(page).toHaveURL(/\/offertecheck$/);
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
    for (const path of ["/", "/transparantie", "/aannemers/lindewaard", "/prijzen", "/founding-members"]) {
      await page.goto(path);
      await expectNoHorizontalScroll(page);
    }
    await page.goto("/");
    await page.getByRole("button", { name: "Menu openen" }).click();
    await page.getByRole("navigation", { name: "Mobiele navigatie" }).getByRole("link", { name: "Prijzen" }).click();
    await expect(page).toHaveURL(/\/prijzen/);
  });
});
