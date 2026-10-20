import { describe, expect, it } from "vitest";
import { escapeHtml, mayQueueEmail, normalizeEmail, renderEmail } from "@/lib/email/render";
import { parseFeatureFlags } from "@/lib/env";

describe("mayQueueEmail (toestemming)", () => {
  it("staat transactionele mails altijd toe", () => {
    expect(mayQueueEmail("transactioneel", { consent: false, unsubscribed: true })).toBe(true);
  });
  it("vereist toestemming voor opvolgmails", () => {
    expect(mayQueueEmail("opvolging", { consent: false, unsubscribed: false })).toBe(false);
    expect(mayQueueEmail("opvolging", { consent: true, unsubscribed: false })).toBe(true);
  });
  it("respecteert een afmelding, ook met toestemming", () => {
    expect(mayQueueEmail("opvolging", { consent: true, unsubscribed: true })).toBe(false);
  });
});

describe("renderEmail", () => {
  const content = { heading: "Je rapport <klaar>", paragraphs: ["Regel & meer"], cta: { label: "Bekijk", url: "https://x.test/r?a=1&b=2" } };

  it("escapet invoer in de html", () => {
    const { html } = renderEmail(content, { brand: "BouwCheck" });
    expect(html).toContain("Je rapport &lt;klaar&gt;");
    expect(html).toContain("Regel &amp; meer");
    expect(html).toContain('href="https://x.test/r?a=1&amp;b=2"');
    expect(html).not.toContain("<klaar>");
  });

  it("zet de afmeldlink alleen erin als die is opgegeven", () => {
    expect(renderEmail(content, { brand: "B" }).html).not.toContain("Afmelden");
    const withLink = renderEmail(content, { brand: "B", unsubscribeUrl: "https://x.test/afmelden/abc" });
    expect(withLink.html).toContain("https://x.test/afmelden/abc");
    expect(withLink.text).toContain("Afmelden: https://x.test/afmelden/abc");
  });

  it("maakt een leesbare tekstversie", () => {
    const { text } = renderEmail(content, { brand: "BouwCheck" });
    expect(text).toContain("Je rapport <klaar>");
    expect(text).toContain("Bekijk: https://x.test/r?a=1&b=2");
  });
});

describe("hulpfuncties", () => {
  it("escapeHtml en normalizeEmail", () => {
    expect(escapeHtml(`"a'`)).toBe("&quot;a&#39;");
    expect(normalizeEmail("  Jan@Voorbeeld.NL ")).toBe("jan@voorbeeld.nl");
  });
});

describe("parseFeatureFlags", () => {
  it("staat standaard alles uit", () => {
    expect(parseFeatureFlags({})).toEqual({ offertecheck: false, foundingMembers: false, depositPayments: false });
  });
  it("leest true/1/ja", () => {
    expect(parseFeatureFlags({ FEATURE_OFFERTECHECK: "true", FEATURE_FOUNDING_MEMBERS: "1", FEATURE_DEPOSIT_PAYMENTS: "nee" })).toEqual({
      offertecheck: true,
      foundingMembers: true,
      depositPayments: false,
    });
  });
});
