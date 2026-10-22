import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalScroll, FORBIDDEN_CUSTOMER_WORDS } from "./helpers";

const VIND = "Vind mijn vakmensen – gratis";
const CARDS = [
  { name: "Teamvoorstel", price: "Gratis", button: "Vind mijn vakmensen", href: "/#start" },
  { name: "Offertecheck", price: "Gratis", button: "Check mijn offertes", href: "/offertecheck#upload" },
  { name: "Projectpas", price: "€ 299", note: "per verbouwing (zonder btw)", button: "Start met de Projectpas", href: "/prijzen?plan=projectpas#aanvragen" },
  { name: "Pro", price: "€ 199", note: "per maand (zonder btw)", button: "Start met Pro", href: "/prijzen?plan=pro#aanvragen" },
];

async function expectCards(page: Page, level: 2 | 3) {
  for (const c of CARDS) {
    const card = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: c.name, exact: true, level }) });
    await expect(card).toContainText(c.price);
    if (c.note) await expect(card).toContainText(c.note);
    await expect(card.getByRole("link", { name: c.button, exact: true })).toHaveAttribute("href", c.href);
  }
  await expect(page.locator("#projectpas")).toBeVisible();
  await expect(page.locator("#pro")).toContainText("Voordeligst bij meerdere panden");
  await expect(page.getByText("Acht verbouwingen per jaar of meer? Dan is Pro voordeliger.")).toBeVisible();
}

test.describe("Publieke site", () => {
  test("homepage: teksten in vaste volgorde, navigatie en werkende knoppen", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto("/");
    await expect(page).toHaveTitle(/BouwCheck/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kies de beste vakmensen voor je verbouwing.");
    await expect(page.getByText("Voor vastgoedondernemers en projectontwikkelaars", { exact: true })).toBeVisible();
    await expect(page.getByText("Kies op prijs, snelheid of betrouwbaarheid. Binnen 72 uur zie je wie het werk kan doen.")).toBeVisible();
    // blokken in deze volgorde (zichtbare koppen)
    const h2 = await page.getByRole("main").locator("h2:not(.sr-only)").allTextContents();
    expect(h2).toEqual([
      "Klaar met gokken op een aannemer?",
      "Waar kies jij op?",
      "Zo werkt het",
      "Heb je al offertes?",
      "Wat het kost",
      "Eerste klanten",
      "Vragen",
      "Vind de beste vakmensen voor je verbouwing.",
    ]);
    // voorbeeldteams in de hero: drie kaarten, drie verschillende teams, label Voorbeeld
    const cards = page.getByTestId("team-option-compact");
    await expect(cards.getByRole("heading")).toHaveText(["Goedkoopst", "Snelst", "Meest betrouwbaar"]);
    const teams = await cards.locator("p").allTextContents();
    expect(new Set(teams).size).toBe(3);
    for (const c of await cards.all()) {
      await expect(c).toContainText(/van €\s.+ tot €\s.+ \(zonder btw\)/);
      await expect(c).toContainText(/kan beginnen op|startdatum nog onbekend/);
      await expect(c).toContainText(/betrouwbaar: (\d(,\d)? van 5|nog te weinig klussen)/);
    }
    await expect(page.getByText("Dit voorbeeld bevat nog verzonnen vakmensen.")).toBeVisible();
    await expect(page.getByRole("main").getByText("Voorbeeld", { exact: true })).toHaveCount(2);
    // voordelen, keuzes, offertevoorbeeld
    for (const v of ["Binnen 72 uur een team", "Eén vaste contactpersoon", "Niemand betaalt voor een betere plek"]) await expect(page.getByText(v, { exact: true })).toBeVisible();
    await expect(page.getByText("Niemand kan betalen om hoger te staan.")).toBeVisible();
    const example = page.getByRole("figure", { name: "Voorbeeld van een Offertecheck" });
    await expect(example.getByText("Ontbreekt", { exact: true })).toHaveCount(3);
    for (const post of ["Puin afvoeren", "Meterkast", "Vloer egaliseren"]) await expect(example).toContainText(post);
    await expect(example).toContainText("Offerte A lijkt het goedkoopst. Tel wat er mist erbij op. Dan is hij dat niet meer.");
    // voor wie, prijzen, vragen
    await expect(page.getByRole("link", { name: "Bekijk de Projectpas" })).toHaveAttribute("href", "/prijzen#projectpas");
    await expect(page.getByRole("link", { name: "Bekijk Pro" })).toHaveAttribute("href", "/prijzen#pro");
    await expect(page.getByRole("main").getByRole("link", { name: "Aanmelden als vakman" })).toHaveAttribute("href", "/registreren?rol=aannemer");
    await expectCards(page, 3);
    await expect(page.getByText("Wie is mijn contactpersoon?")).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Staat je vraag er niet bij? Neem contact op →" })).toHaveAttribute("href", "/contact");
    await expect(page.getByRole("main").getByRole("link", { name: "Zo controleren wij →" })).toHaveAttribute("href", "/transparantie");
    // weg: demo-melding, verificatieniveaus, oprichtersplaceholder, oude blokken, fasetaal
    for (const gone of ["Herken je dit?", "Waarom je ons kunt vertrouwen", "Niet alle informatie is even hard", "Uit de praktijk"]) await expect(page.getByText(gone)).toHaveCount(0);
    await expect(page.getByText(/Placeholder/)).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(FORBIDDEN_CUSTOMER_WORDS);
    await expect(page.locator("body")).not.toContainText("Demo-modus");
    // knoppen naar het hero-formulier en de Offertecheck
    for (const l of await page.getByRole("main").getByRole("link", { name: VIND }).all()) await expect(l).toHaveAttribute("href", "/#start");
    for (const l of await page.getByRole("main").getByRole("link", { name: "Heb je al offertes? Laat ze gratis checken →" }).all()) {
      await expect(l).toHaveAttribute("href", /^\/offertecheck\?bron=home-(hero|slot)#upload$/);
    }
    await expect(page.getByRole("main").getByRole("link", { name: "Check mijn offertes – gratis" }).first()).toHaveAttribute("href", "/offertecheck#upload");
    // navigatie en footer
    const nav = page.getByRole("navigation", { name: "Hoofdnavigatie" });
    await expect(nav.getByRole("link")).toHaveText(["Hoe het werkt", "Prijzen", "Voor vakmensen"]);
    await expect(nav.getByRole("link", { name: "Hoe het werkt" })).toHaveAttribute("href", "/#zo-werkt-het");
    await expect(nav.getByRole("link", { name: "Prijzen" })).toHaveAttribute("href", "/#prijzen");
    await expect(page.getByRole("banner").getByRole("link", { name: "Inloggen" })).toHaveAttribute("href", "/inloggen");
    await expect(page.getByRole("banner").getByRole("link", { name: "Vind mijn vakmensen", exact: true })).toHaveAttribute("href", "/#start");
    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("heading", { name: "Voor vakmensen" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Aanmelden als vakman" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Inloggen" })).toHaveCount(1);
    await nav.getByRole("link", { name: "Hoe het werkt" }).click();
    await expect(page.getByRole("heading", { name: "Zo werkt het" })).toBeInViewport();
    await page.locator("#zo-werkt-het").getByRole("link", { name: VIND }).click();
    await expect(page.locator("#start")).toBeInViewport();
    expect(errors).toEqual([]);
  });

  test("hero-formulier: radiogroep, regiomelding en de teamvoorstel-flow met vooraf ingevulde keuzes", async ({ page }) => {
    await page.goto("/");
    const form = page.locator("form#start");
    await expect(form.getByRole("radio")).toHaveCount(3);
    for (const r of await form.getByRole("radio").all()) await expect(r).not.toBeChecked();
    await expect(form.getByRole("radiogroup", { name: "Wat vind je het belangrijkst?" })).toBeVisible();
    await expect(form.getByLabel("Wat ga je verbouwen?").locator("option:not([disabled])")).toHaveText(["Badkamer", "Keuken", "Complete renovatie", "Anders"]);
    await expect(form.getByLabel("In welke provincie?").locator("option:not([disabled])")).toHaveCount(12);
    // De e2e-database bevat alleen verzonnen vakmensen: overal te weinig echte
    await expect(page.getByText("In deze provincie bouwen we ons netwerk nog op.", { exact: false })).toHaveCount(0);
    await form.getByLabel("In welke provincie?").selectOption("Utrecht");
    const melding = page.getByRole("status").filter({ hasText: "In deze provincie bouwen we ons netwerk nog op." });
    await expect(melding).toBeVisible();
    await expect(melding.getByRole("link", { name: "Check mijn offertes – gratis" })).toHaveAttribute("href", "/offertecheck#upload");
    await form.getByLabel("Wat ga je verbouwen?").selectOption("badkamer");
    await form.getByText("Meest betrouwbaar", { exact: true }).click();
    await form.getByRole("button", { name: "Vind mijn vakmensen – gratis" }).click();
    await expect(page).toHaveURL(/\/inloggen\?next=/);
    await page.getByLabel("E-mailadres").fill("flipper@demo.bouwcheck.test");
    await page.getByLabel("Wachtwoord").fill("demo-bouwcheck");
    await page.getByRole("button", { name: "Inloggen", exact: true }).click();
    await expect(page).toHaveURL(/\/projecten\/nieuw\?verbouwing=badkamer&provincie=Utrecht&prioriteit=kwaliteit/);
    await expect(page.getByLabel(/^Provincie/)).toHaveValue("Utrecht");
    await expect(page.getByLabel(/^Type renovatie/)).toHaveValue("Badkamer en/of keuken");
    await expect(page.getByText("Je koos: Meest betrouwbaar")).toBeVisible();
    await expect(page.locator('input[name="prioriteit"]')).toHaveValue("kwaliteit");
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
    await expect(page.getByLabel("Onderwerp").locator("option")).toHaveText(["Teamvoorstel", "Offertecheck", "Projectpas", "Pro", "Contact"]);
    await page.getByRole("main").getByRole("link", { name: "Check mijn offertes", exact: true }).click();
    await expect(page).toHaveURL(/\/offertecheck#upload$/);
  });

  test("klantpagina's noemen geen fasetaal of vaktaal", async ({ page }) => {
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
    await page.getByLabel(/contact met mij opnemen/).check();
    await page.getByRole("button", { name: "Aanvraag versturen" }).click();
    await expect(page).toHaveURL(/\/bedankt\?type=pro/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bedankt. We bellen of mailen je binnen 1 werkdag.");
    await expect(page.getByText("Er wordt nu niets afgerekend.", { exact: false })).toBeVisible();
  });

  test("mobiel (375 px): geen horizontale scroll, formulier direct onder de kop, werkend menu", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    for (const path of ["/", "/transparantie", "/aannemers/lindewaard", "/prijzen", "/founding-members", "/offertecheck"]) {
      await page.goto(path);
      await expectNoHorizontalScroll(page);
    }
    await page.goto("/");
    const h1 = (await page.getByRole("heading", { level: 1 }).boundingBox())!;
    expect(Math.round(h1.x)).toBe(16);
    const form = (await page.locator("form#start").boundingBox())!;
    const cards = (await page.getByTestId("team-option-compact").first().boundingBox())!;
    expect(form.y).toBeGreaterThan(h1.y);
    expect(form.y).toBeLessThan(cards.y);
    await expect(page.getByLabel("Wat ga je verbouwen?")).toBeInViewport();
    await page.getByRole("button", { name: "Menu openen" }).click();
    await page.getByRole("navigation", { name: "Mobiele navigatie" }).getByRole("link", { name: "Prijzen" }).click();
    await expect(page).toHaveURL(/\/#prijzen$/);
  });
});
