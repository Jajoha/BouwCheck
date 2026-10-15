import "server-only";

/**
 * AI-configuratie. De API-sleutel staat uitsluitend in de serveromgeving
 * (bijv. Vercel → Environment Variables → ANTHROPIC_API_KEY) en wordt nooit
 * naar de browser gestuurd.
 */
const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
type Effort = (typeof EFFORTS)[number];

export const aiConfig = {
  configured: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
  model: process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-5-5",
  effort: (EFFORTS as readonly string[]).includes(process.env.AI_EFFORT ?? "") ? (process.env.AI_EFFORT as Effort) : ("medium" as Effort),
  /** Maximaal AI-verbruik per account per kalendermaand, in USD. */
  monthlyLimitUsd: num(process.env.AI_MONTHLY_LIMIT_USD, 5),
  /** Maximaal aantal analyses per account per uur (misbruikrem). */
  hourlyLimit: num(process.env.AI_HOURLY_LIMIT, 10),
  maxPhotos: num(process.env.AI_MAX_PHOTOS, 8),
};
