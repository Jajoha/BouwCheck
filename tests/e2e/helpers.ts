import { expect, type Page } from "@playwright/test";

export async function loginAs(page: Page, role: "vastgoedflipper" | "aannemer" | "beheerder") {
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
