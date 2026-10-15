import { expect, test, type Page } from "@playwright/test";

const email = `e2e-${Date.now()}@voorbeeld.test`;
const password = "e2e-wachtwoord-123";

async function login(page: Page, pw = password) {
  await page.goto("/inloggen");
  await page.getByLabel("E-mailadres").fill(email);
  await page.getByLabel(/^Wachtwoord/).fill(pw);
  await page.getByRole("button", { name: "Inloggen", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe.serial("Registratie, onboarding, projecten en offerteaanvragen", () => {
  test("afgeschermde routes sturen naar inloggen", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/inloggen\?next=%2Fdashboard/);
    await page.goto("/projecten/nieuw");
    await expect(page).toHaveURL(/\/inloggen/);
  });

  test("registreren met validatie, onboarding en lege staten", async ({ page }) => {
    await page.goto("/registreren");
    await page.getByRole("button", { name: "Account aanmaken" }).click();
    await expect(page.getByText("Naam is verplicht.")).toBeVisible();
    await page.getByLabel("Naam").fill("E2E Flipper");
    await page.getByLabel("E-mailadres").fill(email);
    await page.getByLabel(/^Wachtwoord/).fill(password);
    await page.getByLabel("Herhaal wachtwoord").fill("iets-anders-123");
    await page.getByLabel(/gebruiksvoorwaarden/).check();
    await page.getByRole("button", { name: "Account aanmaken" }).click();
    await expect(page.getByText("De wachtwoorden komen niet overeen.")).toBeVisible();
    // ingevulde gegevens blijven behouden
    await expect(page.getByLabel("Naam")).toHaveValue("E2E Flipper");
    await page.getByLabel("Herhaal wachtwoord").fill(password);
    await page.getByRole("button", { name: "Account aanmaken" }).click();

    await expect(page).toHaveURL(/\/onboarding/);
    await page.getByLabel("Bedrijfsnaam").fill("E2E Vastgoed");
    await page.getByLabel("Vastgoedflipper").check();
    await page.getByLabel("Werkgebied of voorkeursregio").selectOption("Utrecht");
    await page.getByLabel("Complete renovatie").check();
    await page.getByRole("button", { name: "Opslaan en doorgaan" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("Nog geen actieve projecten")).toBeVisible();
    await expect(page.getByText("Geen openstaande aanvragen")).toBeVisible();
  });

  test("onjuist wachtwoord geeft foutmelding; daarna inloggen", async ({ page }) => {
    await page.goto("/inloggen");
    await page.getByLabel("E-mailadres").fill(email);
    await page.getByLabel(/^Wachtwoord/).fill("fout-wachtwoord");
    await page.getByRole("button", { name: "Inloggen", exact: true }).click();
    await expect(page.getByText("E-mailadres of wachtwoord is onjuist.").first()).toBeVisible();
    await page.getByLabel(/^Wachtwoord/).fill(password);
    await page.getByRole("button", { name: "Inloggen", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("AI-intake met foto, werkzaamheden controleren, teamvoorstellen en team kiezen", async ({ page }) => {
    await login(page);
    await page.goto("/projecten/nieuw");

    // validatie in stap 1
    await page.getByRole("button", { name: "Analyseer met AI" }).click();
    await expect(page.getByText("Locatie is verplicht.")).toBeVisible();
    await expect(page.getByText("Beschrijf het project in minimaal 20 tekens.")).toBeVisible();

    await page.getByLabel("Wat wil je laten doen?").fill("Jaren-60 hoekwoning, alles opnieuw stucen en schilderen, nieuwe groepenkast. Verder complete opknapbeurt.");
    await page.getByLabel("Locatie (plaats of postcode)").fill("Utrecht");
    await page.getByLabel("Provincie").selectOption("Utrecht");
    await page.getByLabel("Type woning").selectOption("Hoekwoning");
    await page.getByLabel("Type renovatie").selectOption("Complete renovatie");
    await page.getByLabel("Woonoppervlak (m²)").fill("110");
    await page.getByLabel("Renovatiebudget (€)").fill("90.000");
    await page.getByLabel("Gewenste start").fill("2027-03-01");
    await page.getByLabel("Gewenste oplevering").fill("2027-02-01");
    await page.getByLabel(/^Projectnaam/).fill("E2E Hoekwoning Utrecht");
    await page.getByRole("button", { name: "Analyseer met AI" }).click();
    await expect(page.getByText("De opleverdatum moet na de startdatum liggen.")).toBeVisible();
    await page.getByLabel("Gewenste oplevering").fill("2027-05-01");

    // foto toevoegen (wordt in de browser verkleind naar JPEG)
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAYklEQVR4nGNgENGwCUip6Fmw5cSdDywSOg4hGTUTluw4wyBn5BaV1zRt1b5Lz37xKZl5xRW1zVp36NorBqzKH3zhYMCq/J+QGgNW5TIGLgxYlVv5JTFgVR6R08CAVXlZ1zwAORNgQXwkZZMAAAAASUVORK5CYII=", "base64");
    await page.getByLabel("Foto's toevoegen").setInputFiles({ name: "badkamer.png", mimeType: "image/png", buffer: png });
    await expect(page.getByRole("img", { name: /badkamer/ })).toBeVisible();

    await page.getByRole("button", { name: "Analyseer met AI" }).click();
    await expect(page.getByText("Voorstel van de AI — controleer en corrigeer")).toBeVisible();
    await expect(page.getByText(/kosten deze analyse: \$ 0,|kosten deze analyse: \$ 0\./)).toBeVisible();
    await expect(page.getByText("Mogelijk asbest bij bouwjaar vóór 1994")).toBeVisible();
    await expect(page.getByLabel("Omschrijving onderdeel 4")).toHaveValue("Nieuwe groepenkast");
    // corrigeren: een AI-regel aanpassen wordt eigen invoer
    await page.getByLabel("Hoeveelheid onderdeel 3").fill("200");
    await page.getByRole("button", { name: "Opslaan en teamvoorstellen bekijken" }).click();

    await expect(page).toHaveURL(/\/projecten\/[0-9a-f-]{36}\/voorstellen/);
    await expect(page.getByRole("heading", { name: "Teamvoorstellen" })).toBeVisible();
    for (const t of ["Budgetoptie", "Kwalitatieve optie", "Snelste optie"]) await expect(page.getByRole("heading", { name: t })).toBeVisible();
    await expect(page.getByText("Aanbevolen voor budget")).toBeVisible();

    // team kiezen → offerteaanvraag met voorgeselecteerde aannemers
    await page.locator("#kwaliteit").getByRole("button", { name: /Kies dit team/ }).first().click();
    await expect(page).toHaveURL(/\/offerteaanvragen\/nieuw\?project=.*aannemers=/);
    await expect(page.getByRole("checkbox").first()).toBeChecked();

    // projectpagina: werkzaamheden, AI-bevindingen, foto en tijdlijn
    await page.goto("/projecten");
    await page.getByRole("link", { name: /E2E Hoekwoning Utrecht/ }).click();
    await expect(page.getByRole("cell", { name: "Nieuwe groepenkast" })).toBeVisible();
    await expect(page.getByText("Mogelijk asbest bij bouwjaar vóór 1994")).toBeVisible();
    await expect(page.getByRole("link", { name: /badkamer/ })).toBeVisible();
    await expect(page.getByText(/Teamvoorstel gekozen/)).toBeVisible();

    // offerte vastleggen voor een teamlid
    await page.getByText("Offerte of prijsopgave vastleggen").click();
    await page.locator("#q-contractor").selectOption({ index: 1 });
    await page.getByLabel("Bedrag (€)").fill("82.500");
    await page.getByLabel("Omschrijving scope").fill("Complete renovatie volgens werkzaamheden");
    await page.getByRole("button", { name: "Bedrag vastleggen" }).click();
    await expect(page.getByText("€ 82.500 excl. btw")).toBeVisible();

    // bewerken
    await page.getByRole("link", { name: "Bewerken" }).click();
    await page.getByLabel("Projectnaam").fill("E2E Hoekwoning Utrecht (bewerkt)");
    await page.getByRole("button", { name: "Wijzigingen opslaan" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("E2E Hoekwoning Utrecht (bewerkt)");

    // AI-verbruik zichtbaar op profiel
    await page.goto("/profiel");
    await expect(page.getByText(/1 analyse · \$ 0\.\d\d van \$ 5\.00/)).toBeVisible();
  });

  test("offerteaanvraag voorbereiden, controleren en (demo-)verzenden", async ({ page }) => {
    await login(page);
    await page.goto("/projecten");
    await page.getByRole("link", { name: /E2E Hoekwoning Utrecht/ }).click();
    await page.getByRole("link", { name: "Offerteaanvraag", exact: true }).click();

    await expect(page.getByText("BouwCheck verstuurt (nog) geen e-mail")).toBeVisible();
    await expect(page.getByLabel("Gewenste werkzaamheden")).toHaveValue(/groepenkast/);
    await page.getByRole("button", { name: "Opslaan en controleren" }).click();

    await expect(page).toHaveURL(/\/offerteaanvragen\/controleren/);
    await expect(page.getByRole("heading", { name: "Controleer je offerteaanvraag" })).toBeVisible();
    await expect(page.getByText(/wordt dit een demo-verzending/).first()).toBeVisible();
    await page.getByRole("button", { name: /aanvra(ag|gen) verzenden/ }).click();
    await page.getByRole("button", { name: "Ja, verzenden" }).click();
    await expect(page.getByText(/als demo-verzending opgeslagen \(niet echt verstuurd\)/).first()).toBeVisible();
    await expect(page.getByText("Deze aanvragen zijn afgehandeld")).toBeVisible();
    await expect(page.getByText("Demo-verzending — niet daadwerkelijk verstuurd").first()).toBeVisible();

    await page.goto("/offerteaanvragen");
    await expect(page.getByText("Demo — niet echt verzonden").first()).toBeVisible();
    await page.locator("table").getByRole("link").first().click();
    await expect(page.getByText("Demo-verzending — niet daadwerkelijk verstuurd")).toBeVisible();
    await page.getByRole("button", { name: "Reactie ontvangen" }).click();
    await expect(page.getByText("Status bijgewerkt.")).toBeVisible();
    await expect(page.getByText("Reactie ontvangen").first()).toBeVisible();
  });

  test("projectresultaat registreren (in behandeling, één per aannemer)", async ({ page }) => {
    await login(page);
    await page.goto("/projecten");
    await page.getByRole("link", { name: /E2E Hoekwoning Utrecht/ }).click();
    await page.getByRole("link", { name: "Resultaat" }).first().click();
    await expect(page.getByRole("heading", { name: "Projectresultaat registreren" })).toBeVisible();
    await page.getByRole("button", { name: "Resultaat registreren" }).click();
    await expect(page.getByText("Algemene beoordeling is verplicht.")).toBeVisible();
    await expect(page.getByText("Bevestig dat de gegevens naar waarheid zijn ingevuld.")).toBeVisible();

    await page.getByLabel("Definitief betaald bedrag (€)").fill("86.000");
    await page.getByLabel("Werkelijke oplevering").fill("2027-05-10");
    await page.getByRole("radiogroup").first().getByLabel("4").check();
    await page.locator("#review_text").fill("Goed werk, oplevering liep negen dagen uit door levering kozijnen.");
    await page.getByLabel(/naar waarheid/).check();
    await page.getByRole("button", { name: "Resultaat registreren" }).click();

    await expect(page).toHaveURL(/\/projecten\/[0-9a-f-]{36}$/);
    await expect(page.getByText("In behandeling").first()).toBeVisible();
    await expect(page.getByText(/Afwijking \+4,2%/)).toBeVisible();
  });

  test("wachtwoordherstel in demo-modus toont expliciete devlink", async ({ page }) => {
    await page.goto("/wachtwoord-vergeten");
    await page.getByLabel("E-mailadres").fill(email);
    await page.getByRole("button", { name: "Herstellink aanvragen" }).click();
    await expect(page.getByText("Demo-modus: e-mail is niet geconfigureerd")).toBeVisible();
    await page.getByRole("link", { name: "wachtwoord opnieuw instellen" }).click();
    await page.getByLabel("Nieuw wachtwoord").fill("nieuw-wachtwoord-456");
    await page.getByLabel("Herhaal wachtwoord").fill("nieuw-wachtwoord-456");
    await page.getByRole("button", { name: "Wachtwoord opslaan" }).click();
    await expect(page).toHaveURL(/\/inloggen/);
    await page.getByLabel("E-mailadres").fill(email);
    await page.getByLabel(/^Wachtwoord/).fill("nieuw-wachtwoord-456");
    await page.getByRole("button", { name: "Inloggen", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
