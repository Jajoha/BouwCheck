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
        if (!req.url.startsWith("/v1/messages")) return fail(res, `onverwacht pad ${req.url}`);
        if (!req.headers["x-api-key"]) return fail(res, "x-api-key ontbreekt");
        if (body.model !== "claude-opus-5-5") return fail(res, `onverwacht model ${body.model}`);
        if (body.fallbacks !== "default" || !beta.includes("server-side-fallback-2026-07-01")) return fail(res, "fallbacks/beta ontbreekt");
        if (body.output_config?.format?.type !== "json_schema") return fail(res, "structured output ontbreekt");
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
