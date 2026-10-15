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
  expect(overflow).toBeLessThanOrEqual(1);
}
