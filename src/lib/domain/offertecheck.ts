/**
 * Offertecheck: pure logica (geen I/O, geen AI), veilig voor client én server.
 * - schema's voor de AI-output (extractie per offerte en koppeling op één scope);
 * - privacyfilter voor tekst die naar het model gaat;
 * - het rapport, deterministisch berekend uit de gestructureerde regels.
 */
import { z } from "zod";
import { SPECIALTY_IDS } from "@/lib/domain/constants";

export const OFFERTECHECK_MAX_FILES = 5;
export const OFFERTECHECK_MAX_BYTES = 15 * 1024 * 1024;
export const OFFERTECHECK_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export const OFFERTECHECK_DEADLINE_HOURS = 48;

export const SCOPE_UNITS = ["m2", "uur", "stuk", "meter", "project"] as const;
export const LINE_TYPES = ["post", "stelpost", "uitsluiting", "voorwaarde"] as const;
export type LineType = (typeof LINE_TYPES)[number];

// ── AI-output ───────────────────────────────────────────────
export const extractedLineSchema = z.object({
  omschrijving: z.string().min(1),
  vakgebied: z.enum(SPECIALTY_IDS),
  hoeveelheid: z.number().positive().nullable(),
  eenheid: z.enum(SCOPE_UNITS).nullable(),
  bedrag_excl_btw: z.number().nullable(),
  type: z.enum(LINE_TYPES),
  zekerheid: z.enum(["hoog", "middel", "laag"]),
  toelichting: z.string().nullable(),
});
export type ExtractedLine = z.infer<typeof extractedLineSchema>;

export const extractedOfferSchema = z.object({
  is_offerte: z.boolean(),
  aannemer_naam: z.string().nullable(),
  offerte_datum: z.string().nullable(),
  totaal_excl_btw: z.number().nullable(),
  regels: z.array(extractedLineSchema),
  opmerkingen: z.array(z.string()),
});
export type ExtractedOffer = z.infer<typeof extractedOfferSchema>;

export const alignmentSchema = z.object({
  scope_posten: z.array(
    z.object({
      omschrijving: z.string().min(1),
      vakgebied: z.enum(SPECIALTY_IDS),
      regels: z.array(z.object({ offerte: z.number().int(), regel: z.number().int() })),
    }),
  ),
  open_vragen: z.array(z.object({ offerte: z.number().int().nullable(), vraag: z.string().min(1) })),
  samenvatting: z.string(),
});
export type Alignment = z.infer<typeof alignmentSchema>;

// ── Privacy ─────────────────────────────────────────────────
const STREET_SUFFIX = "straat|laan|weg|plein|gracht|kade|singel|dijk|steeg|hof|park|dreef|pad|baan|markt|wal";
const REDACTIONS: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[e-mail]"],
  [/\b[A-Z]{2}\d{2}\s?[A-Z]{4}(?:\s?\d){10}\b/gi, "[iban]"],
  [/(?:\+31|0031|\b0)(?:[\s-]?\d){9}\b/g, "[telefoon]"],
  [/\b[1-9]\d{3}\s?[A-Z]{2}\b/g, "[postcode]"],
  [new RegExp(`\\b[A-Z][a-zà-ÿ'-]*(?:${STREET_SUFFIX})\\s+\\d+(?:\\s?[a-zA-Z]\\b|-\\d+)?`, "g"), "[adres]"],
];

/**
 * Verwijdert e-mailadressen, IBAN's, telefoonnummers, postcodes en straat + huisnummer uit tekst
 * voordat die naar het model gaat. Namen zijn niet betrouwbaar te herkennen en blijven staan.
 */
export function redactPersonalData(text: string): string {
  return REDACTIONS.reduce((t, [re, label]) => t.replace(re, label), text);
}

// ── Rapport ─────────────────────────────────────────────────
export type PostStatus = "geprijsd" | "inbegrepen" | "stelpost" | "uitgesloten" | "ontbreekt";

export type PriceRange = { min: number; max: number };

export type Report = {
  versie: 1;
  samenvatting: string;
  bevindingen: string[];
  offertes: { label: string; bestandsnaam: string; aannemer: string | null; totaal_excl_btw: number | null }[];
  posten: {
    key: string;
    omschrijving: string;
    vakgebied: string;
    per_offerte: { status: PostStatus; bedrag: number | null }[];
  }[];
  /** `indicaties` (gelijk aan `posten`): wat andere offertes voor die post rekenen; null als geen enkele een bedrag noemt. */
  ontbrekend: { offerte: string; posten: string[]; indicaties?: (PriceRange | null)[] }[];
  stelposten: { offerte: string; omschrijving: string; bedrag: number | null; toelichting: string | null }[];
  uitsluitingen: { offerte: string; omschrijving: string; toelichting: string | null }[];
  voorwaarden: { offerte: string; omschrijving: string }[];
  prijsverschillen: { post: string; laagste: { offerte: string; bedrag: number }; hoogste: { offerte: string; bedrag: number }; factor: number }[];
  open_vragen: { offerte: string | null; vraag: string }[];
};

export const reportSchema: z.ZodType<Report> = z.object({
  versie: z.literal(1),
  samenvatting: z.string(),
  bevindingen: z.array(z.string()),
  offertes: z.array(z.object({ label: z.string(), bestandsnaam: z.string(), aannemer: z.string().nullable(), totaal_excl_btw: z.number().nullable() })),
  posten: z.array(
    z.object({
      key: z.string(),
      omschrijving: z.string(),
      vakgebied: z.string(),
      per_offerte: z.array(z.object({ status: z.enum(["geprijsd", "inbegrepen", "stelpost", "uitgesloten", "ontbreekt"]), bedrag: z.number().nullable() })),
    }),
  ),
  ontbrekend: z.array(
    z.object({
      offerte: z.string(),
      posten: z.array(z.string()),
      indicaties: z.array(z.object({ min: z.number(), max: z.number() }).nullable()).optional(),
    }),
  ),
  stelposten: z.array(z.object({ offerte: z.string(), omschrijving: z.string(), bedrag: z.number().nullable(), toelichting: z.string().nullable() })),
  uitsluitingen: z.array(z.object({ offerte: z.string(), omschrijving: z.string(), toelichting: z.string().nullable() })),
  voorwaarden: z.array(z.object({ offerte: z.string(), omschrijving: z.string() })),
  prijsverschillen: z.array(
    z.object({
      post: z.string(),
      laagste: z.object({ offerte: z.string(), bedrag: z.number() }),
      hoogste: z.object({ offerte: z.string(), bedrag: z.number() }),
      factor: z.number(),
    }),
  ),
  open_vragen: z.array(z.object({ offerte: z.string().nullable(), vraag: z.string() })),
});

export const offerLabel = (index: number) => String.fromCharCode(65 + index);

/** Een prijsverschil telt als het hoogste bedrag minstens zoveel keer het laagste is én het verschil minstens dit bedrag. */
export const PRICE_GAP_FACTOR = 1.5;
export const PRICE_GAP_MIN_EUR = 250;

export type ScopePost = { key: string; omschrijving: string; vakgebied: string; regels: { offerte: number; regel: number }[] };

/**
 * Maakt de koppeling van de AI robuust: verwijzingen buiten bereik en naar voorwaarden vervallen,
 * een regel hoort bij hooguit één post, en regels die nergens aan gekoppeld zijn krijgen een eigen post.
 */
export function normalizeAlignment(offers: Pick<ExtractedOffer, "regels">[], alignment: Pick<Alignment, "scope_posten">): ScopePost[] {
  const used = new Set<string>();
  const valid = (o: number, r: number) => offers[o]?.regels[r] !== undefined && offers[o].regels[r].type !== "voorwaarde";
  const posts: ScopePost[] = [];
  for (const p of alignment.scope_posten) {
    const regels = p.regels.filter(({ offerte, regel }) => {
      const id = `${offerte}:${regel}`;
      if (!valid(offerte, regel) || used.has(id)) return false;
      used.add(id);
      return true;
    });
    if (regels.length) posts.push({ key: "", omschrijving: p.omschrijving, vakgebied: p.vakgebied, regels });
  }
  offers.forEach((offer, o) =>
    offer.regels.forEach((line, r) => {
      if (!valid(o, r) || used.has(`${o}:${r}`)) return;
      used.add(`${o}:${r}`);
      posts.push({ key: "", omschrijving: line.omschrijving, vakgebied: line.vakgebied, regels: [{ offerte: o, regel: r }] });
    }),
  );
  return posts.map((p, i) => ({ ...p, key: `p${i + 1}` }));
}

const STATUS_RANK: Record<PostStatus, number> = { ontbreekt: 0, uitgesloten: 1, inbegrepen: 2, stelpost: 3, geprijsd: 4 };

function statusFor(lines: ExtractedLine[]): { status: PostStatus; bedrag: number | null } {
  if (!lines.length) return { status: "ontbreekt", bedrag: null };
  const priced = lines.filter((l) => l.type === "post" && l.bedrag_excl_btw !== null);
  if (priced.length) return { status: "geprijsd", bedrag: round(priced.reduce((s, l) => s + l.bedrag_excl_btw!, 0)) };
  const stel = lines.filter((l) => l.type === "stelpost");
  if (stel.length) {
    const amounts = stel.filter((l) => l.bedrag_excl_btw !== null);
    return { status: "stelpost", bedrag: amounts.length ? round(amounts.reduce((s, l) => s + l.bedrag_excl_btw!, 0)) : null };
  }
  if (lines.some((l) => l.type === "post")) return { status: "inbegrepen", bedrag: null };
  return { status: "uitgesloten", bedrag: null };
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Wat de andere offertes voor een post rekenen (geprijsd of als stelpost), als indicatie voor de offerte waarin hij ontbreekt. */
function priceRange(perOffer: { status: PostStatus; bedrag: number | null }[], except: number): PriceRange | null {
  const amounts = perOffer.filter((x, i) => i !== except && x.bedrag !== null && x.bedrag > 0 && (x.status === "geprijsd" || x.status === "stelpost")).map((x) => x.bedrag!);
  return amounts.length ? { min: Math.min(...amounts), max: Math.max(...amounts) } : null;
}
const eur = (n: number) => `€ ${Math.round(n).toLocaleString("nl-NL")}`;

export type ReportInput = {
  offers: (ExtractedOffer & { bestandsnaam: string })[];
  posts: ScopePost[];
  openQuestions: Alignment["open_vragen"];
  summary: string;
};

export function buildReport({ offers, posts, openQuestions, summary }: ReportInput): Report {
  const labels = offers.map((_, i) => offerLabel(i));
  const reportPosts = posts.map((p) => ({
    key: p.key,
    omschrijving: p.omschrijving,
    vakgebied: p.vakgebied,
    per_offerte: offers.map((offer, o) => statusFor(p.regels.filter((r) => r.offerte === o).map((r) => offer.regels[r.regel]))),
  }));

  const ontbrekend =
    offers.length < 2
      ? []
      : labels
          .map((label, o) => {
            const missing = reportPosts.filter(
              (p) => STATUS_RANK[p.per_offerte[o].status] <= STATUS_RANK.uitgesloten && p.per_offerte.some((x) => STATUS_RANK[x.status] >= STATUS_RANK.inbegrepen),
            );
            return { offerte: label, posten: missing.map((p) => p.omschrijving), indicaties: missing.map((p) => priceRange(p.per_offerte, o)) };
          })
          .filter((x) => x.posten.length);

  const linesOfType = (type: LineType) =>
    offers.flatMap((offer, o) => offer.regels.filter((l) => l.type === type).map((l) => ({ offerte: labels[o], line: l })));

  const prijsverschillen = reportPosts
    .flatMap((p) => {
      const priced = p.per_offerte
        .map((x, o) => ({ offerte: labels[o], bedrag: x.status === "geprijsd" ? x.bedrag : null }))
        .filter((x): x is { offerte: string; bedrag: number } => x.bedrag !== null && x.bedrag > 0);
      if (priced.length < 2) return [];
      const low = priced.reduce((a, b) => (b.bedrag < a.bedrag ? b : a));
      const high = priced.reduce((a, b) => (b.bedrag > a.bedrag ? b : a));
      const factor = high.bedrag / low.bedrag;
      if (factor < PRICE_GAP_FACTOR || high.bedrag - low.bedrag < PRICE_GAP_MIN_EUR) return [];
      return [{ post: p.omschrijving, laagste: low, hoogste: high, factor: Math.round(factor * 10) / 10 }];
    })
    .sort((a, b) => b.hoogste.bedrag - b.laagste.bedrag - (a.hoogste.bedrag - a.laagste.bedrag));

  const stelposten = linesOfType("stelpost").map(({ offerte, line }) => ({ offerte, omschrijving: line.omschrijving, bedrag: line.bedrag_excl_btw, toelichting: line.toelichting }));
  const uitsluitingen = linesOfType("uitsluiting").map(({ offerte, line }) => ({ offerte, omschrijving: line.omschrijving, toelichting: line.toelichting }));

  const report: Report = {
    versie: 1,
    samenvatting: summary,
    bevindingen: [],
    offertes: offers.map((offer, o) => ({
      label: labels[o],
      bestandsnaam: offer.bestandsnaam,
      aannemer: offer.aannemer_naam,
      totaal_excl_btw:
        offer.totaal_excl_btw ??
        (offer.regels.some((l) => l.bedrag_excl_btw !== null && l.type !== "uitsluiting" && l.type !== "voorwaarde")
          ? round(offer.regels.filter((l) => l.type === "post" || l.type === "stelpost").reduce((s, l) => s + (l.bedrag_excl_btw ?? 0), 0))
          : null),
    })),
    posten: reportPosts,
    ontbrekend,
    stelposten,
    uitsluitingen,
    voorwaarden: linesOfType("voorwaarde").map(({ offerte, line }) => ({ offerte, omschrijving: line.omschrijving })),
    prijsverschillen,
    open_vragen: openQuestions
      .filter((q) => q.offerte === null || labels[q.offerte] !== undefined)
      .map((q) => ({ offerte: q.offerte === null ? null : labels[q.offerte], vraag: q.vraag })),
  };
  report.bevindingen = topFindings(report);
  return report;
}

/** Drie belangrijkste bevindingen (voor de mail en de kop van het rapport); de beheerder kan ze aanpassen. */
export function topFindings(r: Report): string[] {
  const out: string[] = [];
  const mostMissing = [...r.ontbrekend].sort((a, b) => b.posten.length - a.posten.length)[0];
  if (mostMissing) {
    out.push(
      `Offerte ${mostMissing.offerte} mist ${mostMissing.posten.length} ${mostMissing.posten.length === 1 ? "post" : "posten"} die andere offertes wel noemen, waaronder ${mostMissing.posten[0].toLowerCase()}.`,
    );
  }
  if (r.stelposten.length) {
    const total = r.stelposten.reduce((s, x) => s + (x.bedrag ?? 0), 0);
    out.push(
      `${r.stelposten.length} ${r.stelposten.length === 1 ? "stelpost" : "stelposten"}${total > 0 ? ` (samen ${eur(total)})` : ""}: het werkelijke bedrag kan daar hoger uitvallen.`,
    );
  }
  const gap = r.prijsverschillen[0];
  if (gap) out.push(`Grootste prijsverschil: ${gap.post.toLowerCase()} — ${eur(gap.laagste.bedrag)} (${gap.laagste.offerte}) tegenover ${eur(gap.hoogste.bedrag)} (${gap.hoogste.offerte}).`);
  if (out.length < 3 && r.uitsluitingen.length) {
    out.push(`${r.uitsluitingen.length} ${r.uitsluitingen.length === 1 ? "uitsluiting" : "uitsluitingen"}, zoals ${r.uitsluitingen[0].omschrijving.toLowerCase()}: dit werk moet je apart regelen.`);
  }
  return out.slice(0, 3);
}

/** Scope voor een teamvoorstel uit het rapport: één regel per post die minstens één offerte noemt. */
export function scopeFromReport(r: Report, lines: { scope_post: string | null; hoeveelheid: number | null; eenheid: string | null }[]) {
  return r.posten
    .filter((p) => p.per_offerte.some((x) => x.status !== "ontbreekt" && x.status !== "uitgesloten"))
    .map((p) => {
      const withQty = lines.find((l) => l.scope_post === p.key && l.hoeveelheid !== null && l.eenheid !== null);
      return {
        specialty_id: p.vakgebied,
        description: p.omschrijving,
        quantity: withQty?.hoeveelheid ?? null,
        unit: withQty?.eenheid ?? null,
      };
    });
}

/** Geanonimiseerde benchmarkregels: alleen met toestemming en alleen geprijsde posten met hoeveelheid en eenheid. */
export function benchmarkRows(
  lines: Pick<ExtractedLine, "vakgebied" | "eenheid" | "hoeveelheid" | "bedrag_excl_btw" | "type">[],
  opts: { consent: boolean; regio: string | null; maand: string },
) {
  if (!opts.consent) return [];
  return lines
    .filter((l) => l.type === "post" && l.eenheid && l.hoeveelheid && l.hoeveelheid > 0 && l.bedrag_excl_btw && l.bedrag_excl_btw > 0)
    .map((l) => ({
      vakgebied: l.vakgebied,
      eenheid: l.eenheid!,
      prijs_per_eenheid: round(l.bedrag_excl_btw! / l.hoeveelheid!),
      regio: opts.regio,
      maand: opts.maand,
    }));
}

export function deadlineFor(submittedAt: string | Date): Date {
  return new Date(new Date(submittedAt).getTime() + OFFERTECHECK_DEADLINE_HOURS * 3600_000);
}

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  geprijsd: "Geprijsd",
  inbegrepen: "Inbegrepen",
  stelpost: "Kan nog veranderen",
  uitgesloten: "Zit er niet in",
  ontbreekt: "Ontbreekt",
};


// ── Capaciteit per week ─────────────────────────────────────

/** Leest OFFERTECHECK_MAX_PER_WEEK: een positief geheel getal, anders null (dan tonen we geen limiet). */
export function parseWeeklyMax(raw: string | undefined): number | null {
  const v = raw?.trim();
  if (!v || !/^\d+$/.test(v)) return null;
  const n = Number(v);
  return n > 0 ? n : null;
}

export type WeeklyCapacity = { max: number; remaining: number };

/** Null = geen limiet ingesteld (de "Beperkt"-regel blijft verborgen). */
export function weeklyCapacity(max: number | null, submittedThisWeek: number): WeeklyCapacity | null {
  if (max === null) return null;
  return { max, remaining: Math.max(0, max - submittedThisWeek) };
}
