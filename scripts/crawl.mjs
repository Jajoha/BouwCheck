// Bezoekt routes per rol en rapporteert HTTP-fouten, paginafouten en consolefouten.
import { chromium } from "@playwright/test";
const base = process.env.BASE_URL ?? "http://localhost:3000";
const routes = JSON.parse(process.argv[2]);
const role = process.argv[3];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const problems = [];
page.on("console", (m) => m.type() === "error" && problems.push(`[console] ${page.url()} ${m.text().slice(0, 200)}`));
page.on("pageerror", (e) => problems.push(`[pageerror] ${page.url()} ${String(e).slice(0, 200)}`));
if (role) {
  await page.goto(`${base}/inloggen`);
  await page.getByRole("button", { name: new RegExp(role, "i") }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/inloggen"));
}
const discovered = [];
for (const r of routes) {
  const res = await page.goto(base + r, { waitUntil: "networkidle" });
  const status = res?.status();
  const title = await page.title();
  console.log(`${status} ${r} -> ${new URL(page.url()).pathname} | ${title}`);
  if (process.env.DISCOVER) {
    const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
    for (const h of hrefs) if (h && /^\/(projecten|offerteaanvragen|beheer\/aannemers)\/[0-9a-f-]{36}/.test(h) && !discovered.includes(h) && !routes.includes(h)) discovered.push(h);
  }
}
for (const r of discovered.slice(0, 25)) {
  const res = await page.goto(base + r, { waitUntil: "networkidle" });
  console.log(`${res?.status()} ${r} -> ${new URL(page.url()).pathname} | ${await page.title()}`);
}
console.log(problems.length ? problems.join("\n") : "Geen console-/paginafouten");
await browser.close();
