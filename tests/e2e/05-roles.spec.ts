import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Rollen, beheer en aannemersportaal", () => {
  test("beheer is server-side afgeschermd", async ({ page, request }) => {
    // Anoniem
    await page.goto("/beheer");
    await expect(page).toHaveURL(/\/inloggen/);
    // Flipper krijgt geen beheerinhoud
    await loginAs(page, "vastgoedondernemer");
    for (const path of ["/beheer", "/beheer/gebruikers", "/beheer/moderatie", "/portaal"]) {
      await page.goto(path);
      await expect(page.getByText("Pagina niet gevonden")).toBeVisible();
      await expect(page.locator("body")).not.toContainText("Beheerlog");
    }
    // Bijlagen zijn niet anoniem op te vragen
    const res = await request.get("/api/bijlagen/00000000-0000-4000-8000-000000000001");
    expect(res.status()).toBe(401);
  });

  test("beheerder modereert een resultaat en beheert verificatie", async ({ page }) => {
    await loginAs(page, "beheerder");
    await expect(page).toHaveURL(/\/beheer/);
    await expect(page.getByText("Beheerlog")).toBeVisible();

    // verificatieverzoek Kwastenburg: goedkeuren zonder bewijs kan niet
    await page.goto("/beheer/verificaties");
    const card = page.locator("li", { hasText: "Schildersbedrijf Kwastenburg" }).first();
    await card.getByLabel("Bewijsreferentie").fill("");
    await card.getByRole("button", { name: "Goedkeuren" }).click();
    await expect(card.getByText(/vereist een bewijsreferentie/)).toBeVisible();
    await card.getByLabel("Bewijsreferentie").fill("E2E: fictieve KvK-controle");
    await card.getByRole("button", { name: "Goedkeuren" }).click();
    await expect(page.getByText("Verificatieverzoek afgehandeld.")).toBeVisible();

    // moderatie: openstaand resultaat goedkeuren
    await page.goto("/beheer/moderatie");
    const item = page.locator("li", { hasText: "Schildersbedrijf Kwastenburg" }).first();
    await item.getByLabel("Moderatie").selectOption("goedgekeurd");
    await item.getByRole("button", { name: "Opslaan" }).click();
    await expect(page.getByText("Projectresultaat bijgewerkt.")).toBeVisible();

    // aannemer deactiveren en weer activeren
    await page.goto("/beheer/aannemers");
    const row = page.locator("tr", { hasText: "Isolatiebedrijf Warmwand" });
    await row.getByRole("button", { name: "Deactiveren" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Deactiveren" }).click();
    await expect(row).toContainText("Gedeactiveerd");
    await page.goto("/aannemers/warmwand");
    await expect(page.locator("#inhoud").getByText("Profielstatus: gedeactiveerd")).toBeVisible();
    await page.goto("/beheer/aannemers");
    await page.locator("tr", { hasText: "Isolatiebedrijf Warmwand" }).getByRole("button", { name: "Activeren" }).click();
    await expect(page.locator("tr", { hasText: "Isolatiebedrijf Warmwand" })).toContainText("Actief");

    // AI-gebruik per account (analyse uit de intake-test)
    await page.goto("/beheer/ai-gebruik");
    await expect(page.getByRole("heading", { name: "AI-gebruik per account" })).toBeVisible();
    await expect(page.getByRole("cell", { name: /E2E Flipper/ }).first()).toBeVisible();
    await expect(page.getByText(/Actief · claude-opus-5-5/)).toBeVisible();

    // beheerlog bevat de acties
    await page.goto("/beheer");
    await expect(page.locator("table")).toContainText("verificatie goedgekeurd");
    await expect(page.locator("table")).toContainText("resultaat beoordeeld");
  });

  test("aannemer ziet ontvangen aanvraag en reageert", async ({ page }) => {
    await loginAs(page, "aannemer");
    await expect(page).toHaveURL(/\/portaal/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Schildersbedrijf Kwastenburg");
    await expect(page.getByText("Demo-project Arnhem — schilderwerk")).toBeVisible();
    await page.getByLabel("Reactie aan opdrachtgever").fill("Bezichtiging mogelijk op dinsdag; offerte volgt binnen een week.");
    await page.getByRole("button", { name: "Reactie versturen" }).click();
    await expect(page.getByText(/Reactie verzonden naar de opdrachtgever/)).toBeVisible();
    await expect(page.getByText("Jouw reactie")).toBeVisible();
    // aannemer kan niet bij de flipper-omgeving
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/portaal/);
  });

  test("nieuwe aannemer: profiel start als in beoordeling en zelf opgegeven", async ({ page }) => {
    const email = `aannemer-${Date.now()}@voorbeeld.test`;
    await page.goto("/registreren?rol=aannemer");
    await page.getByLabel("Naam").fill("E2E Aannemer");
    await page.getByLabel("E-mailadres").fill(email);
    await page.getByLabel(/^Wachtwoord/).fill("aannemer-wachtwoord-1");
    await page.getByLabel("Herhaal wachtwoord").fill("aannemer-wachtwoord-1");
    await page.getByLabel(/gebruiksvoorwaarden/).check();
    await page.getByRole("button", { name: "Account aanmaken" }).click();
    await expect(page).toHaveURL(/\/onboarding\?rol=aannemer/);
    await expect(page.getByLabel(/^Aannemer/)).toBeChecked();
    await page.getByRole("button", { name: "Opslaan en doorgaan" }).click();
    await expect(page).toHaveURL(/\/portaal/);

    await page.getByRole("radio", { name: /^Klusser/ }).check();
    await page.getByLabel("Bedrijfs- of handelsnaam").fill("E2E Testbouw");
    await page.getByLabel("Omschrijving").fill("Testbedrijf voor geautomatiseerde tests van BouwCheck.");
    await page.getByLabel("Vestigingsplaats").fill("Zwolle");
    await page.getByLabel("Provincie vestiging").selectOption("Overijssel");
    await page.getByLabel("Timmerman").check();
    await page.getByRole("checkbox", { name: "Overijssel" }).check();
    await page.getByRole("button", { name: "Profiel aanmaken" }).click();
    await expect(page.getByText("Je profiel is nog niet openbaar")).toBeVisible();
    await expect(page.getByText("Zelf opgegeven").first()).toBeVisible();
  });
});
