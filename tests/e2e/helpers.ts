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

/** Teksten van het Offertecheck-aanbod op /offertecheck (src/components/offertecheck/offer.tsx). */
export const OFFER_INTRO = "Je stuurt ons je offertes. Binnen 48 uur hoor je wat er mist, wat er niet in zit en waar je te veel betaalt.";
export const OFFER_EYEBROW = "Voor vastgoedondernemers en projectontwikkelaars die verbouwen";
export const OFFER_BENEFITS = [
  "Alle offertes naast elkaar. Elke post staat op één regel, dus je vergelijkt hetzelfde werk.",
  "Wat er mist, in euro's. Je ziet wat een andere offerte er wel voor rekent.",
  "Bedragen die nog kunnen veranderen. En wat er niet in de prijs zit. Daar komen extra kosten vaak vandaan.",
  "Grote prijsverschillen per post. Zo zie je waar je te veel betaalt. Of waar een prijs verdacht laag is.",
  "Je lijst met vragen. Die stel je aan elke aannemer voordat je tekent.",
];

/** Woorden die in geen enkele klanttekst mogen staan. */
export const FORBIDDEN_CUSTOMER_WORDS = /bèta|\bbeta\b|testfase|pilot|demo-database|tijdelijke opslag|werkelijke kosten|vervanger binnen 72 uur/i;
