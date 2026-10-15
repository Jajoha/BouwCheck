import { describe, expect, it } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { costUsd } from "@/lib/ai/pricing";
import { usageFromResponse, intakeResultSchema } from "@/lib/ai/intake";

describe("kostenberekening", () => {
  it("rekent input, output en cache volgens het modeltarief", () => {
    // claude-opus-5-5: $4 input / $20 output per miljoen tokens; cache-write 1,25×, cache-read 0,1×
    const r = costUsd({ model: "claude-opus-5-5", input_tokens: 1_000_000, output_tokens: 100_000, cache_read_input_tokens: 1_000_000, cache_creation_input_tokens: 1_000_000 });
    expect(r.priced).toBe(true);
    expect(r.usd).toBeCloseTo(4 + 2 + 0.4 + 5, 6);
  });
  it("gebruikt bij een onbekend model conservatief het hoogste tarief", () => {
    const r = costUsd({ model: "onbekend-model", input_tokens: 1_000_000, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 });
    expect(r.priced).toBe(false);
    expect(r.usd).toBe(10);
  });
  it("telt bij een fallback elke iteratie tegen het tarief van het model dat hem uitvoerde", () => {
    const response = {
      model: "claude-opus-4-8",
      usage: {
        input_tokens: 0,
        output_tokens: 0,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
        iterations: [
          { type: "message", model: "claude-opus-5-5", input_tokens: 1000, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
          { type: "fallback_message", model: "claude-opus-4-8", input_tokens: 1000, output_tokens: 1000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
        ],
      },
    } as unknown as Anthropic.Beta.BetaMessage;
    const u = usageFromResponse(response, "ok");
    expect(u.input_tokens).toBe(2000);
    expect(u.output_tokens).toBe(1000);
    expect(u.cost_usd).toBeCloseTo((1000 * 4 + 1000 * 5 + 1000 * 25) / 1_000_000, 9);
  });
  it("valt zonder iteraties terug op de totale usage", () => {
    const response = { model: "claude-opus-5-5", usage: { input_tokens: 500, output_tokens: 200, cache_read_input_tokens: 100, cache_creation_input_tokens: null, iterations: null } } as unknown as Anthropic.Beta.BetaMessage;
    const u = usageFromResponse(response, "ok");
    expect(u.cost_usd).toBeCloseTo((500 * 4 + 100 * 0.4 + 200 * 20) / 1_000_000, 9);
  });
});

describe("intake-uitvoer", () => {
  it("accepteert geldige uitvoer en weigert onbekende vakgebieden", () => {
    const valid = {
      summary: "x",
      property_condition: "y",
      scope_items: [{ specialty_id: "schilder", description: "Binnenschilderwerk", quantity: 100, unit: "m2", confidence: "middel", basis: "beschrijving" }],
      risks: [],
      open_questions: [],
      assumptions: [],
    };
    expect(intakeResultSchema.safeParse(valid).success).toBe(true);
    expect(intakeResultSchema.safeParse({ ...valid, scope_items: [{ ...valid.scope_items[0], specialty_id: "astronaut" }] }).success).toBe(false);
  });
});
