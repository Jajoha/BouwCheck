import { describe, expect, it } from "vitest";
import { prepareDocument } from "@/lib/ai/offertecheck";
import { makePdf } from "../e2e/pdf";

describe("prepareDocument", () => {
  it("leest de tekstlaag van een pdf en verwijdert persoonsgegevens", async () => {
    const buffer = makePdf([
      "OFFERTE ALFA - Bouwbedrijf Alfa B.V.",
      "Opdrachtgever: J. Jansen, Kerkstraat 12, 3811 AB Amersfoort, jansen@voorbeeld.nl, 06-12345678",
      "Schilderwerk wanden en plafonds 100 m2 EUR 2.000,00",
      "Tegelwerk badkamer EUR 3.000,00",
      "Stelpost sanitair EUR 1.500,00",
    ]);
    const doc = await prepareDocument({ bestandsnaam: "a.pdf", mimeType: "application/pdf", buffer });
    expect(doc.kind).toBe("text");
    if (doc.kind !== "text") return;
    expect(doc.text).toContain("Schilderwerk wanden en plafonds");
    expect(doc.text).toContain("EUR 2.000,00");
    expect(doc.text).not.toContain("jansen@voorbeeld.nl");
    expect(doc.text).not.toContain("Kerkstraat 12");
    expect(doc.text).not.toContain("3811 AB");
    expect(doc.text).not.toContain("06-12345678");
  });

  it("stuurt een pdf zonder (bruikbare) tekstlaag als document", async () => {
    const doc = await prepareDocument({ bestandsnaam: "scan.pdf", mimeType: "application/pdf", buffer: makePdf(["x"]) });
    expect(doc.kind).toBe("pdf");
  });

  it("stuurt afbeeldingen als afbeelding en weigert te grote", async () => {
    const small = await prepareDocument({ bestandsnaam: "f.jpg", mimeType: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]) });
    expect(small.kind).toBe("image");
    await expect(prepareDocument({ bestandsnaam: "groot.png", mimeType: "image/png", buffer: Buffer.alloc(6 * 1024 * 1024) })).rejects.toThrow(/5 MB/);
  });
});
