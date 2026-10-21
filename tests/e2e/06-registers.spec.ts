import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe.serial("Uitvoerders (klussers/zzp) en openbare registers", () => {
  test("klusser en zzp'er verschijnen als uitvoerder, met registersectie en reactie", async ({ page }) => {
    await page.goto("/aannemers/handige-henk");
    await expect(page.getByText("Klusser", { exact: true }).first()).toBeVisible();
    const register = page.getByTestId("register-section");
    await expect(register.getByRole("heading", { name: "Openbare registers" })).toBeVisible();
    await expect(register.getByText(/fictieve voorbeelden/)).toBeVisible();
    await expect(register.getByText(/Mogelijke doorstart op hetzelfde adres/)).toBeVisible();
    await expect(register.getByText(/Reactie van de uitvoerder/)).toBeVisible();
    await page.goto("/aannemers/timmerwerk-de-vries");
    await expect(page.getByText("Zelfstandig vakman (zzp)")).toBeVisible();
  });

  test("teamvoorstellen tonen uitgesloten uitvoerders apart, met reden en bron", async ({ page }) => {
    await loginAs(page, "vastgoedondernemer");
    await page.goto("/projecten");
    await page.getByRole("link", { name: /Tussenwoning Amersfoort/ }).first().click();
    await page.getByRole("link", { name: "Teamvoorstellen" }).first().click();
    const box = page.getByTestId("register-exclusions");
    await expect(box.getByText("Bouwbedrijf Gebroeders Stal")).toBeVisible();
    await expect(box.getByText(/Faillissement.*Centraal Insolventieregister/)).toBeVisible();
    // en de uitgesloten uitvoerder zit in geen enkel team
    await expect(page.getByTestId("team-option").filter({ hasText: "Bouwbedrijf Gebroeders Stal" })).toHaveCount(0);
  });

  test("beheer: agent controleert een uitvoerder, beheerder beoordeelt, uitsluiting wordt zichtbaar", async ({ page }) => {
    test.setTimeout(120_000);
    await loginAs(page, "beheerder");
    // nieuwe, niet-demo uitvoerder met geldig KvK-nummer
    await page.goto("/beheer/aannemers/nieuw");
    await page.getByRole("radio", { name: /^Zelfstandig vakman/ }).check();
    await page.getByLabel("Bedrijfs- of handelsnaam").fill("E2E Registertest Stucwerk");
    await page.getByLabel("Omschrijving").fill("Zzp-stukadoor voor geautomatiseerde tests van de registercontrole.");
    await page.getByLabel("Vestigingsplaats").fill("Utrecht");
    await page.getByLabel("Provincie vestiging").selectOption("Utrecht");
    await page.getByLabel("KvK-nummer").fill("12345678");
    await page.getByRole("checkbox", { name: "Stukadoor" }).check();
    await page.getByRole("checkbox", { name: "Utrecht" }).check();
    await page.getByLabel("Profielstatus").selectOption("actief");
    await page.getByRole("button", { name: "Uitvoerder opslaan" }).click();
    await expect(page).toHaveURL(/\/beheer\/aannemers\/[0-9a-f-]{36}/);

    await page.getByRole("button", { name: "Registercontrole E2E Registertest Stucwerk" }).click();
    await expect(page.getByText(/Controle voltooid: 2 nieuwe bevinding/)).toBeVisible({ timeout: 30_000 });

    await page.goto("/beheer/registers");
    const pending = page.getByTestId("pending-signal").filter({ hasText: "E2E Registertest Stucwerk" });
    await expect(pending).toHaveCount(2);
    // de uitspraak alleen op naam: afwijzen vereist een notitie
    const nameOnly = pending.filter({ hasText: "Uitspraak over een onderneming" });
    await expect(nameOnly.getByText("Beleid staat alleen een waarschuwing toe.")).toBeVisible();
    await nameOnly.getByLabel("Besluit").selectOption("afgewezen");
    await nameOnly.getByRole("button", { name: "Besluit vastleggen" }).click();
    await expect(nameOnly.getByText("Geef aan waarom het signaal wordt afgewezen.")).toBeVisible();
    await nameOnly.getByLabel(/^Notitie/).fill("Andere onderneming met dezelfde naam.");
    await nameOnly.getByRole("button", { name: "Besluit vastleggen" }).click();
    await expect(page.getByText("Signaal afgewezen.")).toBeVisible();

    // het faillissement op KvK-nummer: goedkeuren als uitsluiting
    const bankrupt = page.getByTestId("pending-signal").filter({ hasText: "E2E Registertest Stucwerk" }).filter({ hasText: "Faillissement" });
    await expect(bankrupt.getByText(/Beleid staat uitsluiting toe/)).toBeVisible();
    await bankrupt.getByRole("button", { name: "Besluit vastleggen" }).click();
    await expect(page.getByText(/Goedgekeurd als uitsluiting/)).toBeVisible();

    // openbaar profiel toont het signaal met bron en gevolg
    await page.goto("/beheer/aannemers");
    await page.getByRole("link", { name: "E2E Registertest Stucwerk" }).first().click();
    await page.getByRole("link", { name: "Profiel bekijken" }).click();
    const section = page.getByTestId("register-section");
    await expect(section.getByText(/is door het register bevestigd/)).toBeVisible();
    await expect(section.getByTestId("register-signal")).toHaveCount(1);
    await expect(section.getByText(/niet opgenomen in teamvoorstellen/)).toBeVisible();

    // verbruik geregistreerd als registercontrole (3 zoekopdrachten)
    await page.goto("/beheer/ai-gebruik");
    await expect(page.getByRole("row").filter({ hasText: "Registercontrole" }).first()).toContainText("0 / 3");
  });
});
