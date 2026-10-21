import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalScroll, FORBIDDEN_CUSTOMER_WORDS } from "./helpers";

const CTA = "Check mijn offertes – gratis";
const CARDS = [
  { name: "Offertecheck", price: "Gratis", button: "Check mijn offertes", href: "/offertecheck#upload" },
  { name: "Teamvoorstel", price: "Gratis", button: "Vraag een teamvoorstel aan", href: "/projecten/nieuw" },
  { name: "Projectpas", price: "€ 299", note: "per verbouwing, excl. btw", button: "Start met de Projectpas", href: "/prijzen?plan=projectpas#aanvragen" },
  { name: "Pro", price: "€ 199", note: "per maand, excl. btw", button: "Start met Pro", href: "/prijzen?plan=pro#aanvragen" },
];

async function expectCards(page: Page, level: 2 | 3) {
  for (const c of CARDS) {
    const card = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: c.name, exact: true, level }) });
    await expect(card).toContainText(c.price);
    if (c.note) await expect(card).toContainText(c.note);
    await expect(card.getByRole("link", { name: c.button, exact: true })).toHaveAttribute("href", c.href);
  }
  const pro = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Pro", exact: true, level }) });
  await expect(pro).toContainText("Meest gekozen voor meerdere panden");
  await expect(page.getByText("Acht verbouwingen per jaar of meer? Dan is Pro voordeliger.")).toBeVisible();
}

test.describe("Publieke site", () => {
  test("homepage: teksten in vaste volgorde, navigatie en werkende knoppen", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto("/");
    await expect(page).toHaveTitle(/BouwCheck/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Laat je offertes gratis checken voordat je tekent");
    await expect(page.getByText("Voor vastgoedondernemers en projectontwikkelaars die verbouwen", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByRole("listitem").filter({ hasText: "waar je te veel betaalt." })).toBeVisible();
    // blokken in deze volgorde
    const h2 = await page.getByRole("main").getByRole("heading", { level: 2 }).allTextContents();
    expect(h2).toEqual([
      "Zo ziet een check eruit",
      "Herken je dit?",
      "Wat je bij ons kunt krijgen",
      "Waarom je ons kunt vertrouwen",
      "Eerste klanten",
      "Ben je aannemer, zzp'er of klusser?",
      "Vragen",
      "Teken pas als je weet wat je koopt",
    ]);
    // voorbeeldcheck: label, drie offertes, drie ontbrekende posten bij A
    const example = page.getByRole("figure", { name: "Voorbeeld van een Offertecheck" });
    await expect(page.locator("#hoe-het-werkt").getByText("Voorbeeld", { exact: true }).first()).toBeVisible();
    await expect(example.getByText("Ontbreekt", { exact: true })).toHaveCount(3);
    for (const post of ["Afvoer van puin", "Meterkast", "Vloer egaliseren"]) await expect(example).toContainText(post);
    await expectCards(page, 3);
    await expect(page.getByRole("main").getByRole("link", { name: "Zo controleren wij" })).toHaveAttribute("href", "/transparantie");
    await expect(page.getByRole("main").getByRole("link", { name: "Bekijk het aanbod" })).toHaveAttribute("href", "/founding-members");
    await expect(page.getByRole("link", { name: "Aanmelden als vakman" }).first()).toHaveAttribute("href", "/registreren?rol=aannemer");
    await expect(page.getByText("Kiest de computer de aannemer voor mij?")).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Neem contact op" })).toHaveAttribute("href", "/contact");
    // weg: demo-melding, verificatieniveaus, oprichtersplaceholder, fasetaal
    await expect(page.getByText("Niet alle informatie is even hard")).toHaveCount(0);
    await expect(page.getByText(/Placeholder/)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Uit de praktijk" })).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(FORBIDDEN_CUSTOMER_WORDS);
    await expect(page.locator("body")).not.toContainText("Demo-modus");
    // elke primaire knop naar de Offertecheck
    const ctas = page.getByRole("main").getByRole("link", { name: CTA });
    await expect(ctas).toHaveCount(3);
    for (const l of await ctas.all()) await expect(l).toHaveAttribute("href", "/offertecheck#upload");
    // navigatie en footer
    const nav = page.getByRole("navigation", { name: "Hoofdnavigatie" });
    await expect(nav.getByRole("link")).toHaveText(["Hoe het werkt", "Prijzen", "Voor vakmensen"]);
    await expect(page.getByRole("banner").getByRole("link", { name: "Inloggen" })).toHaveAttribute("href", "/inloggen");
    await expect(page.getByRole("banner").getByRole("link", { name: "Check mijn offertes", exact: true })).toHaveAttribute("href", "/offertecheck#upload");
    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("heading", { name: "Voor vakmensen" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Aanmelden als vakman" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Inloggen" })).toHaveCount(1);
    // knoppen
    await nav.getByRole("link", { name: "Hoe het werkt" }).click();
    await expect(page.getByRole("heading", { name: "Zo ziet een check eruit" })).toBeInViewport();
    await ctas.first().click();
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

  test("juridische conceptpagina's en prijspagina met dezelfde vier kaarten", async ({ page }) => {
    for (const path of ["/privacy", "/voorwaarden", "/disclaimer"]) {
      await page.goto(path);
      await expect(page.getByText("Concepttekst — niet juridisch gecontroleerd")).toBeVisible();
    }
    await page.goto("/prijzen");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Prijzen");
    await expectCards(page, 2);
    await expect(page.getByText("Portfolio")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(FORBIDDEN_CUSTOMER_WORDS);
    await expect(page.locator("body")).not.toContainText(/nu gratis/i);
    await expect(page.getByLabel("Onderwerp").locator("option")).toHaveText(["Offertecheck", "Teamvoorstel", "Projectpas", "Pro", "Contact"]);
    await page.getByRole("main").getByRole("link", { name: "Check mijn offertes", exact: true }).click();
    await expect(page).toHaveURL(/\/offertecheck#upload$/);
  });

  test("klantpagina's noemen geen fasetaal", async ({ page }) => {
    for (const path of ["/offertecheck", "/transparantie", "/founding-members", "/registreren", "/registreren?rol=aannemer", "/contact", "/bedankt?type=pro", "/offertecheck/bedankt", "/voorwaarden", "/disclaimer", "/aannemers/lindewaard"]) {
      await page.goto(path);
      await expect(page.locator("body"), path).not.toContainText(FORBIDDEN_CUSTOMER_WORDS);
      await expect(page.getByRole("heading", { level: 1 }), path).toHaveCount(1);
    }
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
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bedankt. We nemen binnen 1 werkdag contact met je op om te starten.");
    await expect(page.getByText("Er wordt nu niets afgerekend.", { exact: false })).toBeVisible();
  });

  test("mobiel: geen horizontale scroll en werkend menu", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    for (const path of ["/", "/transparantie", "/aannemers/lindewaard", "/prijzen", "/founding-members", "/offertecheck"]) {
      await page.goto(path);
      await expectNoHorizontalScroll(page);
    }
    await page.goto("/");
    await page.getByRole("button", { name: "Menu openen" }).click();
    await page.getByRole("navigation", { name: "Mobiele navigatie" }).getByRole("link", { name: "Prijzen" }).click();
    await expect(page).toHaveURL(/\/prijzen/);
  });
});
