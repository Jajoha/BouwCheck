import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalScroll, loginAs, logout } from "./helpers";
import { makePdf } from "./pdf";

const OFFERTE_ALFA = makePdf([
  "OFFERTE ALFA - Bouwbedrijf Alfa B.V., offertenummer 2026-118",
  "Opdrachtgever: J. Jansen, Kerkstraat 12, 3811 AB Amersfoort, jansen@voorbeeld.nl, 06-12345678",
  "Schilderwerk wanden en plafonds, 100 m2 a EUR 20,00 = EUR 2.000,00",
  "Tegelwerk badkamer wand en vloer = EUR 3.000,00",
  "Stelpost sanitair = EUR 1.500,00",
  "Betaling in drie termijnen. Totaal excl. btw EUR 6.500,00",
]);
const OFFERTE_BETA = makePdf([
  "OFFERTE BETA - Klusbedrijf Beta, prijsopgave renovatie",
  "Schilderen van alle wanden en plafonds = EUR 3.600,00",
  "Exclusief: tegelwerk badkamer, door opdrachtgever te regelen",
  "Totaal excl. btw EUR 3.600,00, geldig 30 dagen",
]);

async function fillAndSubmit(page: Page, email: string) {
  await page.goto("/offertecheck");
  await page.getByLabel("Offertes kiezen").setInputFiles([
    { name: "offerte-alfa.pdf", mimeType: "application/pdf", buffer: OFFERTE_ALFA },
    { name: "offerte-beta.pdf", mimeType: "application/pdf", buffer: OFFERTE_BETA },
  ]);
  await page.getByLabel(/Korte projectomschrijving/).fill("Tussenwoning in Amersfoort: schilderwerk en een nieuwe badkamer.");
  await page.getByLabel(/Provincie van het project/).selectOption("Utrecht");
  await page.getByLabel(/^Naam/).fill("Test Flipper");
  await page.getByLabel(/^E-mailadres/).fill(email);
  await page.getByLabel(/toestemming om contact/).check();
  await page.getByLabel(/geanonimiseerd worden gebruikt/).check();
  await page.getByRole("button", { name: "Offertes laten checken" }).click();
  await expect(page).toHaveURL(/\/offertecheck\/bedankt/);
}

test.describe("Offertecheck", () => {
  test("landingspagina zonder hoofdmenu, met validatie", async ({ page }) => {
    await page.goto("/offertecheck");
    await expect(page.getByRole("heading", { name: "Upload je offertes. Weet binnen 48 uur wat ze je niet vertellen." })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Hoofdnavigatie" })).toHaveCount(0);
    await expect(page.getByText("Niet gedeeld met aannemers")).toBeVisible();

    await page.getByRole("button", { name: "Offertes laten checken" }).click();
    await expect(page.getByText("Voeg minimaal één offerte toe.")).toBeVisible();

    await page.getByLabel("Offertes kiezen").setInputFiles([{ name: "notitie.txt", mimeType: "text/plain", buffer: Buffer.from("hallo") }]);
    await expect(page.getByText("notitie.txt: alleen pdf, jpg of png.")).toBeVisible();

    await page.getByLabel("Offertes kiezen").setInputFiles([{ name: "a.pdf", mimeType: "application/pdf", buffer: OFFERTE_ALFA }]);
    await page.getByRole("button", { name: "Offertes laten checken" }).click();
    await expect(page.getByText("Naam is verplicht.")).toBeVisible();
    await expect(page.getByText("Geef toestemming om contact met je op te nemen over de check.")).toBeVisible();
  });

  test("mobiel: geen horizontale scroll", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/offertecheck");
    await expectNoHorizontalScroll(page);
  });

  test("volledige keten: upload, analyse, review, rapport, mail, teamvoorstel en verwijderen", async ({ page }) => {
    await fillAndSubmit(page, "keten@voorbeeld.nl");
    await expect(page.getByRole("heading", { name: "Je check volgt binnen 48 uur" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Plan een kort gesprek/ })).toHaveAttribute("href", "https://agenda.voorbeeld.test/bouwcheck");

    // Beheer: de analyse draait op de achtergrond en zet de check klaar voor beoordeling
    await loginAs(page, "beheerder");
    await page.goto("/beheer/offertechecks");
    const row = page.getByRole("row").filter({ hasText: "keten@voorbeeld.nl" });
    await expect(async () => {
      await page.reload();
      await expect(row.getByText("Te beoordelen")).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 30_000 });
    await expect(row.getByText(/nog \d+ uur/)).toBeVisible();
    await row.getByRole("link").click();
    await expect(page).toHaveURL(/\/beheer\/offertechecks\/[0-9a-f-]{36}$/);
    const checkId = page.url().split("/").pop()!;

    // Voorvertoning: ontbrekende posten, stelpost, uitsluiting, prijsverschil, en aannemersnaam alleen in beheer
    await expect(page.getByText("Bouwbedrijf Alfa").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ontbrekende posten" })).toBeVisible();
    await expect(page.getByText("Keuze sanitair ligt nog niet vast").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Grote prijsverschillen" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Geëxtraheerde regels \(6\)/ })).toBeVisible();

    // Rapport aanpassen en goedkeuren
    await page.getByLabel(/Belangrijkste bevindingen/).fill("Offerte B rekent geen tegelwerk.\nDe stelpost sanitair kan hoger uitvallen.");
    await page.getByRole("button", { name: "Rapport opslaan" }).click();
    await expect(page.getByText("Rapport opgeslagen.")).toBeVisible();
    await page.getByRole("button", { name: "Goedkeuren en versturen" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Goedkeuren en versturen" }).click();
    await expect(page.getByText(/Rapport goedgekeurd\. De klant heeft een mail ontvangen\./)).toBeVisible();
    const reportHref = await page.getByRole("link", { name: "Rapport openen" }).getAttribute("href");
    expect(reportHref).toMatch(/\/rapport\/[\w-]{40,}$/);
    const reportPath = new URL(reportHref!).pathname;

    await page.goto("/beheer/e-mail");
    const mail = page.getByRole("row").filter({ hasText: "keten@voorbeeld.nl" });
    await expect(mail.getByText("Je Offertecheck staat klaar")).toBeVisible();
    await expect(mail.getByText("verzonden", { exact: true })).toBeVisible();

    await page.goto("/beheer/funnel");
    for (const event of ["offertecheck_gestart", "offertecheck_ingediend", "offertecheck_rapport_verstuurd"]) {
      await expect(page.getByRole("row").filter({ hasText: event }).getByRole("cell").last()).not.toHaveText("0");
    }

    // De klant opent het rapport (zonder account)
    await logout(page);
    await page.goto(reportPath);
    await expect(page.getByRole("heading", { name: "Je 2 offertes op één scope" })).toBeVisible();
    await expect(page.getByText("Offerte B rekent geen tegelwerk.")).toBeVisible();
    await expect(page.getByText("Bouwbedrijf Alfa")).toHaveCount(0);
    await expect(page.getByText("Is het tegelwerk elders begroot")).toBeVisible();
    await page.setViewportSize({ width: 375, height: 800 });
    await expectNoHorizontalScroll(page);
    await page.setViewportSize({ width: 1280, height: 800 });

    // Doorklik naar een teamvoorstel: eerst een account, dan de vooraf ingevulde scope
    await page.getByRole("link", { name: "Start een teamvoorstel met deze scope" }).click();
    await expect(page.getByRole("heading", { name: "Nog één stap: een gratis account" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Account aanmaken" })).toHaveAttribute("href", /email=keten%40voorbeeld\.nl/);
    await loginAs(page, "vastgoedflipper");
    await page.goto(`${reportPath}/teamvoorstel`);
    await expect(page).toHaveURL(/\/projecten\/nieuw\?offertecheck=/);
    await expect(page.getByText("Scope uit je Offertecheck")).toBeVisible();
    await expect(page.getByLabel("Wat wil je laten doen?")).toHaveValue(/schilderwerk en een nieuwe badkamer/);
    await page.getByLabel("Locatie (plaats of postcode)").fill("Amersfoort");
    await page.getByLabel("Type woning").selectOption("Tussenwoning");
    await page.getByLabel("Type renovatie").selectOption("Gedeeltelijke renovatie");
    await page.getByRole("button", { name: "Verder met de scope uit je check" }).click();
    await expect(page.locator('input[value="Schilderwerk wanden en plafonds"]')).toBeVisible();
    await expect(page.locator('input[value="Tegelwerk badkamer"]')).toBeVisible();
    await page.getByRole("button", { name: "Opslaan en teamvoorstellen bekijken" }).click();
    await expect(page).toHaveURL(/\/projecten\/[0-9a-f-]+\/voorstellen/);

    // De klant verwijdert de check: geen bestanden meer, rapport weg
    await logout(page);
    await page.goto(reportPath);
    await page.getByRole("button", { name: "Verwijder mijn check en bestanden" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Definitief verwijderen" }).click();
    await expect(page).toHaveURL(/\/offertecheck\/verwijderd/);
    const res = await page.goto(reportPath);
    expect(res?.status()).toBe(404);
    const dir = path.resolve(".data-e2e", "uploads", "offertechecks", checkId);
    expect(fs.existsSync(dir) ? fs.readdirSync(dir) : []).toEqual([]);

    await loginAs(page, "beheerder");
    await page.goto(`/beheer/offertechecks/${checkId}`);
    await expect(page.getByText("Verwijderd").first()).toBeVisible();
    await expect(page.getByText("keten@voorbeeld.nl")).toHaveCount(0);
  });

  test("beheer verwijdert een check inclusief bestanden", async ({ page }) => {
    await fillAndSubmit(page, "verwijder@voorbeeld.nl");
    await loginAs(page, "beheerder");
    await page.goto("/beheer/offertechecks");
    await page.getByRole("row").filter({ hasText: "verwijder@voorbeeld.nl" }).getByRole("link").click();
    await expect(page).toHaveURL(/\/beheer\/offertechecks\/[0-9a-f-]{36}$/);
    const checkId = page.url().split("/").pop()!;
    const dir = path.resolve(".data-e2e", "uploads", "offertechecks", checkId);
    expect(fs.readdirSync(dir)).toHaveLength(2);
    await page.getByRole("button", { name: "Verwijderen" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Definitief verwijderen" }).click();
    await expect(page.getByText("Offertecheck verwijderd, inclusief bestanden.")).toBeVisible();
    expect(fs.existsSync(dir) ? fs.readdirSync(dir) : []).toEqual([]);
  });

  test("bestanden zijn alleen voor beheer te downloaden", async ({ page }) => {
    const res = await page.request.get("/api/offertecheck/bestanden/00000000-0000-0000-0000-000000000000");
    expect(res.status()).toBe(403);
  });
});
