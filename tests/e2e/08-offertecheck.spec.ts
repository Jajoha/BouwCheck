import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalScroll, loginAs, logout, OFFER_BENEFITS, OFFER_EYEBROW, OFFER_INTRO } from "./helpers";
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
  test("aanbod bovenaan, zonder hoofdmenu, en capaciteit berekend uit ingediende checks", async ({ page }) => {
    await page.goto("/offertecheck");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Zie het meerwerk vóórdat het je marge opeet.");
    await expect(page.getByText(OFFER_EYEBROW, { exact: true })).toBeVisible();
    await expect(page.getByText(OFFER_INTRO, { exact: true })).toBeVisible();
    const benefits = page.getByRole("heading", { name: "Wat je krijgt", level: 2 }).locator("xpath=following-sibling::ul[1]");
    await expect(benefits.getByRole("listitem")).toHaveText(OFFER_BENEFITS);
    await expect(page.getByRole("heading", { name: "Bonus", level: 2 })).toBeVisible();
    await expect(
      page.getByText("Wil je teams die op deze ene scope offreren? Je krijgt binnen 72 uur een gratis teamvoorstel van aannemers, zzp-vakmensen en klussers, geordend op budget, kwaliteit of snelheid.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Onze belofte", level: 2 })).toBeVisible();
    await expect(
      page.getByText("Je rapport binnen 48 uur, anders krijg je je teamvoorstel met voorrang. Vinden we niets? Dan zeggen we dat eerlijk, en teken je met een gerust hart.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Privé", level: 2 })).toBeVisible();
    await expect(page.getByText("Je offertes worden niet gedeeld met aannemers. Je kunt ze op elk moment laten verwijderen.", { exact: true })).toBeVisible();
    // OFFERTECHECK_MAX_PER_WEEK=40 in de e2e-omgeving; resterende plekken komen uit de database
    await expect(page.getByText("Elke check wordt door een mens nagekeken. Daarom nemen we er maximaal 40 per week aan.", { exact: true })).toBeVisible();
    const left = Number((await page.getByText(/^Nog \d+ plekken? deze week\.$/).textContent())!.match(/\d+/)![0]);
    expect(left).toBeLessThanOrEqual(40);
    const cta = page.getByRole("main").getByRole("link", { name: "Gratis Offertecheck" });
    await expect(cta).toHaveAttribute("href", "/offertecheck#upload");
    await cta.click();
    await expect(page).toHaveURL(/#upload$/);
    await expect(page.getByRole("heading", { name: "Upload je offertes", level: 2 })).toBeInViewport();
    await expect(page.getByRole("navigation", { name: "Hoofdnavigatie" })).toHaveCount(0);
    await expect(page.getByText("Werk je met meerdere panden per jaar?")).toHaveCount(0);
    await expect(page.getByText("Niet gedeeld met aannemers", { exact: true })).toBeVisible();
    await expect(page.getByText("Demo-modus:")).toBeVisible();

    await page.getByRole("button", { name: "Offertes laten checken" }).click();
    await expect(page.getByText("Voeg minimaal één offerte toe.")).toBeVisible();

    await page.getByLabel("Offertes kiezen").setInputFiles([{ name: "notitie.txt", mimeType: "text/plain", buffer: Buffer.from("hallo") }]);
    await expect(page.getByText("notitie.txt: alleen pdf, jpg of png.")).toBeVisible();

    await page.getByLabel("Offertes kiezen").setInputFiles([{ name: "a.pdf", mimeType: "application/pdf", buffer: OFFERTE_ALFA }]);
    await page.getByRole("button", { name: "Offertes laten checken" }).click();
    await expect(page.getByText("Naam is verplicht.")).toBeVisible();
    await expect(page.getByText("Geef toestemming om contact met je op te nemen over de check.")).toBeVisible();
  });

  test("mobiel (375 px): geen horizontale scroll, 16 px marge en knop direct na de intro", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/offertecheck");
    await expectNoHorizontalScroll(page);
    const h1 = await page.getByRole("heading", { level: 1 }).boundingBox();
    expect(Math.round(h1!.x)).toBe(16);
    const intro = await page.getByText(OFFER_INTRO, { exact: true }).boundingBox();
    const cta = await page.getByRole("main").getByRole("link", { name: "Gratis Offertecheck" }).boundingBox();
    expect(cta!.y).toBeGreaterThan(intro!.y + intro!.height - 1);
    expect(cta!.y - (intro!.y + intro!.height)).toBeLessThan(48);
    await expect(page.getByRole("main").getByRole("link", { name: "Gratis Offertecheck" })).toBeInViewport();
    await page.goto("/");
    await expectNoHorizontalScroll(page);
    await expect(page.getByRole("main").getByRole("link", { name: "Gratis Offertecheck" }).first()).toBeVisible();
    await expect(page.getByText(OFFER_EYEBROW, { exact: true })).toBeVisible();
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
    await loginAs(page, "vastgoedondernemer");
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

  test("beheer verwijdert een check inclusief bestanden; de check telt mee voor de weekcapaciteit", async ({ page }) => {
    const plekken = async () => {
      await page.goto("/offertecheck");
      return Number((await page.getByText(/^Nog \d+ plekken? deze week\.$/).textContent())!.match(/\d+/)![0]);
    };
    const before = await plekken();
    await fillAndSubmit(page, "verwijder@voorbeeld.nl");
    expect(await plekken()).toBe(before - 1);
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
