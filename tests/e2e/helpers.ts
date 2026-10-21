import { expect, type Page } from "@playwright/test";

export async function loginAs(page: Page, role: "vastgoedondernemer" | "aannemer" | "beheerder") {
  await page.goto("/inloggen");
  await page.getByRole("button", { name: new RegExp(`Demo als ${role}`, "i") }).click();
  await expect(page).not.toHaveURL(/inloggen/);
}

export async function logout(page: Page) {
  await page.context().clearCookies();
}

/** Controleert dat de pagina niet horizontaal scrolt (responsive). */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) {
    // Noem de elementen die buiten beeld steken, zodat een fout direct te herleiden is
    const culprits = await page.evaluate(() =>
      [...document.querySelectorAll("body *")]
        .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1 && !el.closest(".overflow-x-auto"))
        .slice(0, 5)
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 80)}`),
    );
    console.log("Breder dan het scherm:", culprits);
  }
  expect(overflow).toBeLessThanOrEqual(1);
}

/** Teksten van het Offertecheck-aanbod, letterlijk zoals aangeleverd. */
export const OFFER_INTRO =
  "Je hebt het pand, nu moet de renovatie gegund worden. Upload je offertes en weet binnen 48 uur wat erin ontbreekt, wat er is uitgesloten en waar je te veel betaalt. Zo blijft je rendement op de bouwplaats overeind.";
export const OFFER_EYEBROW = "Voor vastgoedondernemers en projectontwikkelaars die renoveren";
export const OFFER_BENEFITS = [
  "Alle offertes op één scope. Elke post naast elkaar, zodat je appels met appels vergelijkt.",
  "Ontbrekende posten in euro's. Wat in de ene offerte zit en in de andere niet, met een indicatie van wat het je later kost.",
  "Stelposten en uitsluitingen uitgelicht. De plekken waar meerwerk vandaan komt, met uitleg waarom.",
  "Prijsverschillen per post. Waar je mogelijk te veel betaalt, en waar een lage prijs verdacht laag is.",
  "Je onderhandelingslijst. De vragen die je aan elke aannemer stelt voordat je tekent.",
];
