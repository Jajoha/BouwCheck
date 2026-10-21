// Minimale mock van de Anthropic Messages API voor e2e-tests.
// Controleert de vorm van het verzoek (model, fallbacks, structured output, afbeeldingen)
// en geeft een vaste, geldige intake terug. Draait alleen tijdens tests.
import http from "node:http";

const PORT = Number(process.env.MOCK_ANTHROPIC_PORT ?? 3199);

const RESULT = {
  summary: "Tussenwoning van ca. 110 m² met een complete renovatie: stucwerk, schilderwerk en nieuwe elektra.",
  property_condition: "Op de foto is verouderd stucwerk zichtbaar.",
  scope_items: [
    { specialty_id: "hoofdaannemer", description: "Regie en uitvoering complete renovatie", quantity: 110, unit: "m2", confidence: "middel", basis: "beschrijving" },
    { specialty_id: "stukadoor", description: "Wanden sausklaar stucen", quantity: 250, unit: "m2", confidence: "middel", basis: "afleiding uit woonoppervlak" },
    { specialty_id: "schilder", description: "Binnenschilderwerk wanden en plafonds", quantity: 250, unit: "m2", confidence: "laag", basis: "afleiding uit woonoppervlak" },
    { specialty_id: "elektricien", description: "Nieuwe groepenkast", quantity: 1, unit: "stuk", confidence: "hoog", basis: "beschrijving" },
  ],
  risks: ["Mogelijk asbest bij bouwjaar vóór 1994"],
  open_questions: ["Is er een asbestinventarisatie?"],
  assumptions: ["Wandoppervlak geschat op 250 m²"],
};

// Rapport van de registeragent (tool "rapporteer_registercontrole")
const REGISTER_REPORT = {
  kvk_confirmed: true,
  summary: "Testcontrole: KvK-inschrijving bevestigd; één faillissement en één uitspraak op naam gevonden.",
  sources_checked: [
    { name: "Centraal Insolventieregister", url: "https://insolventies.rechtspraak.nl/" },
    { name: "KvK Handelsregister", url: "https://www.kvk.nl/" },
  ],
  findings: [
    {
      kind: "faillissement",
      title: "Faillissement uitgesproken (testdata)",
      summary: "Testdata: de rechtbank heeft het faillissement uitgesproken; KvK-nummer staat in de publicatie.",
      source_name: "Centraal Insolventieregister",
      source_url: "https://insolventies.rechtspraak.nl/#!/details/test-e2e",
      event_date: "2026-09-01",
      match_basis: "kvk_nummer",
    },
    {
      kind: "rechterlijke_uitspraak",
      title: "Uitspraak over een onderneming met dezelfde naam (testdata)",
      summary: "Testdata: alleen op naam gevonden.",
      source_name: "Rechtspraak.nl",
      source_url: "https://uitspraken.rechtspraak.nl/details?id=TEST-E2E",
      event_date: null,
      match_basis: "naam",
    },
  ],
};

function json(res, body) {
  res.writeHead(200, { "content-type": "application/json", "request-id": "req_mock" });
  res.end(JSON.stringify(body));
}

/** Registeragent: eerste beurt pauzeert (server-side zoeklus), tweede beurt levert het rapport. */
function handleRegister(body, res) {
  const tools = body.tools ?? [];
  const search = tools.find((t) => t.type === "web_search_20260209");
  const fetchTool = tools.find((t) => t.type === "web_fetch_20260209");
  const report = tools.find((t) => t.name === "rapporteer_registercontrole");
  if (!search?.allowed_domains?.includes("insolventies.rechtspraak.nl") || !fetchTool?.allowed_domains?.length) return fail(res, "zoektools zonder domeinbeperking");
  if (!report?.strict || report.input_schema?.additionalProperties !== false) return fail(res, "rapporttool moet strict zijn");
  if (body.output_config?.format) return fail(res, "geen structured output naast tools");
  const msg = (content, stop_reason, searches) => ({
    id: `msg_reg_${body.messages.length}`,
    type: "message",
    role: "assistant",
    model: "claude-opus-5-5",
    content,
    stop_reason,
    stop_sequence: null,
    stop_details: null,
    usage: { input_tokens: 3000, output_tokens: 400, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, server_tool_use: { web_search_requests: searches, web_fetch_requests: 0 }, iterations: null },
  });
  if (body.messages.length === 1) {
    console.log("[mock-anthropic] registeragent: pause_turn");
    return json(res, msg([{ type: "text", text: "Ik zoek in het Centraal Insolventieregister." }], "pause_turn", 2));
  }
  if (body.messages.at(-1)?.role !== "assistant") return fail(res, "na pause_turn moet de assistentbeurt ongewijzigd terugkomen");
  console.log("[mock-anthropic] registeragent: rapport");
  return json(res, msg([{ type: "tool_use", id: "toolu_mock", name: "rapporteer_registercontrole", input: REGISTER_REPORT }], "tool_use", 1));
}

/** Offertecheck stap 1: regels uit één offerte. Herkent de testoffertes aan "OFFERTE ALFA" / "OFFERTE BETA". */
function handleExtract(body, res) {
  const text = (body.messages?.[0]?.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  if (/@voorbeeld\.nl|Kerkstraat 12|06-12345678/.test(text)) return fail(res, "persoonsgegevens zijn niet verwijderd");
  const line = (omschrijving, vakgebied, bedrag, type = "post", extra = {}) => ({
    omschrijving, vakgebied, hoeveelheid: null, eenheid: null, bedrag_excl_btw: bedrag, type, zekerheid: "hoog", toelichting: null, ...extra,
  });
  let result;
  if (text.includes("OFFERTE ALFA")) {
    result = {
      is_offerte: true, aannemer_naam: "Bouwbedrijf Alfa", offerte_datum: "1 oktober 2026", totaal_excl_btw: 6500,
      regels: [
        line("Schilderwerk wanden en plafonds", "schilder", 2000, "post", { hoeveelheid: 100, eenheid: "m2" }),
        line("Tegelwerk badkamer", "tegelzetter", 3000),
        line("Sanitair", "badkamerinstallateur", 1500, "stelpost", { toelichting: "Keuze sanitair ligt nog niet vast; het bedrag kan hoger uitvallen." }),
        line("Betaling in drie termijnen", "hoofdaannemer", null, "voorwaarde"),
      ],
      opmerkingen: [],
    };
  } else if (text.includes("OFFERTE BETA")) {
    result = {
      is_offerte: true, aannemer_naam: "Klusbedrijf Beta", offerte_datum: null, totaal_excl_btw: 3600,
      regels: [
        line("Schilderen wanden en plafonds", "schilder", 3600),
        line("Tegelwerk", "tegelzetter", null, "uitsluiting", { toelichting: "Tegelwerk zit niet in de prijs; je moet dit apart regelen." }),
      ],
      opmerkingen: [],
    };
  } else {
    result = { is_offerte: false, aannemer_naam: null, offerte_datum: null, totaal_excl_btw: null, regels: [], opmerkingen: ["Geen offerte"] };
  }
  console.log(`[mock-anthropic] offertecheck extractie ok: ${result.aannemer_naam ?? "geen offerte"}`);
  return message(res, result, 1800);
}

/** Offertecheck stap 2: koppel regels op vakgebied (genoeg voor de test). */
function handleAlign(body, res) {
  const input = JSON.parse(body.messages[0].content[0].text);
  const posts = new Map();
  for (const o of input.offertes) {
    for (const r of o.regels) {
      if (r.type === "voorwaarde") continue;
      if (!posts.has(r.vakgebied)) posts.set(r.vakgebied, { omschrijving: r.omschrijving, vakgebied: r.vakgebied, regels: [] });
      posts.get(r.vakgebied).regels.push({ offerte: o.offerte, regel: r.regel });
    }
  }
  console.log(`[mock-anthropic] offertecheck koppeling ok: ${posts.size} posten`);
  return message(res, {
    scope_posten: [...posts.values()],
    open_vragen: [{ offerte: 1, vraag: "Is het tegelwerk elders begroot, of moet je dit apart laten offreren?" }],
    samenvatting: "Twee offertes voor schilder- en tegelwerk; ze verschillen vooral in wat er wel en niet in de prijs zit.",
  }, 600);
}

function message(res, result, inputTokens) {
  res.writeHead(200, { "content-type": "application/json", "request-id": "req_mock" });
  res.end(
    JSON.stringify({
      id: "msg_mock", type: "message", role: "assistant", model: "claude-opus-5-5",
      content: [{ type: "text", text: JSON.stringify(result) }],
      stop_reason: "end_turn", stop_sequence: null, stop_details: null,
      usage: { input_tokens: inputTokens, output_tokens: 700, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, iterations: null },
    }),
  );
}

function fail(res, message) {
  res.writeHead(400, { "content-type": "application/json" });
  res.end(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message } }));
}

http
  .createServer((req, res) => {
    if (req.method === "GET") {
      res.writeHead(200).end("ok");
      return;
    }
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        const body = JSON.parse(raw);
        const beta = String(req.headers["anthropic-beta"] ?? "");
        // Nep-Resend (RESEND_BASE_URL wijst ook naar deze server)
        if (req.url === "/resend/emails") {
          if (req.headers.authorization !== "Bearer test-resend") return fail(res, "Resend-sleutel ontbreekt");
          if (!body.from || !body.to?.length || !body.subject || !body.html || !body.text) return fail(res, "onvolledige mail");
          if (body.to[0].includes("weiger")) {
            res.writeHead(422, { "content-type": "application/json" }).end(JSON.stringify({ message: "ongeldig adres" }));
            return;
          }
          console.log(`[mock-resend] ok: ${body.to[0]} – ${body.subject}`);
          return json(res, { id: `re_${Date.now()}` });
        }
        if (!req.url.startsWith("/v1/messages")) return fail(res, `onverwacht pad ${req.url}`);
        if (!req.headers["x-api-key"]) return fail(res, "x-api-key ontbreekt");
        if (body.model !== "claude-opus-5-5") return fail(res, `onverwacht model ${body.model}`);
        if (body.fallbacks !== "default" || !beta.includes("server-side-fallback-2026-07-01")) return fail(res, "fallbacks/beta ontbreekt");
        if ((body.tools ?? []).length) return handleRegister(body, res);
        if (body.output_config?.format?.type !== "json_schema") return fail(res, "structured output ontbreekt");
        const props = body.output_config.format.schema?.properties ?? {};
        if (props.regels) return handleExtract(body, res);
        if (props.scope_posten) return handleAlign(body, res);
        if ("budget_tokens" in (body.thinking ?? {})) return fail(res, "budget_tokens is niet toegestaan");
        const content = body.messages?.[0]?.content ?? [];
        const images = content.filter((b) => b.type === "image");
        if (images.some((b) => b.source?.type !== "base64" || !b.source.data)) return fail(res, "ongeldige afbeelding");
        if (content.at(-1)?.type !== "text") return fail(res, "tekst moet na de afbeeldingen komen");
        console.log(`[mock-anthropic] ok: ${images.length} afbeelding(en)`);
        res.writeHead(200, { "content-type": "application/json", "request-id": "req_mock" });
        res.end(
          JSON.stringify({
            id: "msg_mock",
            type: "message",
            role: "assistant",
            model: "claude-opus-5-5",
            content: [{ type: "text", text: JSON.stringify(RESULT) }],
            stop_reason: "end_turn",
            stop_sequence: null,
            stop_details: null,
            usage: { input_tokens: 2400 + images.length * 1500, output_tokens: 900, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, iterations: null },
          }),
        );
      } catch (err) {
        fail(res, String(err));
      }
    });
  })
  .listen(PORT, "127.0.0.1", () => console.log(`[mock-anthropic] luistert op ${PORT}`));
