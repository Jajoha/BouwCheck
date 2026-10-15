import "server-only";
import { sql, sqlOne } from "@/lib/db";
import { aiConfig } from "@/lib/ai/config";
import type { UsageRecord } from "@/lib/ai/intake";

export async function recordUsage(
  userId: string | null,
  projectId: string | null,
  imageCount: number,
  u: UsageRecord & { web_search_requests?: number },
  opts: { feature?: "intake" | "registercontrole"; contractorId?: string | null } = {},
) {
  await sql(
    `insert into ai_usage (user_id, project_id, feature, model, status, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, image_count, cost_usd, error_message, web_search_requests, contractor_id)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [userId, projectId, opts.feature ?? "intake", u.model, u.status, u.input_tokens, u.output_tokens, u.cache_read_tokens, u.cache_creation_tokens, imageCount,
      u.cost_usd, u.error_message, u.web_search_requests ?? 0, opts.contractorId ?? null],
  );
}

export type UsageSummary = { analyses: number; costUsd: number; inputTokens: number; outputTokens: number; lastHour: number };

export async function getUserUsageThisMonth(userId: string): Promise<UsageSummary> {
  const row = await sqlOne<{ analyses: number; cost: number; input: number; output: number; last_hour: number }>(
    `select count(*) filter (where status <> 'error')::int as analyses, coalesce(sum(cost_usd), 0) as cost,
            coalesce(sum(input_tokens + cache_read_tokens + cache_creation_tokens), 0)::int as input, coalesce(sum(output_tokens), 0)::int as output,
            count(*) filter (where created_at > now() - interval '1 hour')::int as last_hour
       from ai_usage where user_id = $1 and feature = 'intake' and created_at >= date_trunc('month', now())`,
    [userId],
  );
  return { analyses: row?.analyses ?? 0, costUsd: Number(row?.cost ?? 0), inputTokens: row?.input ?? 0, outputTokens: row?.output ?? 0, lastHour: row?.last_hour ?? 0 };
}

/** Null = toegestaan; anders de reden waarom niet. */
export async function checkUsageAllowed(userId: string): Promise<string | null> {
  const u = await getUserUsageThisMonth(userId);
  if (u.costUsd >= aiConfig.monthlyLimitUsd) {
    return `Je AI-tegoed voor deze maand is op (limiet $ ${aiConfig.monthlyLimitUsd.toFixed(2)} per account). Vul de werkzaamheden handmatig in of neem contact op.`;
  }
  if (u.lastHour >= aiConfig.hourlyLimit) return "Je hebt het afgelopen uur al veel analyses gedaan. Probeer het later opnieuw.";
  return null;
}

export async function listUsagePerAccount() {
  return sql<{ user_id: string; name: string; email: string; role: string; month_calls: number; month_cost: number; total_calls: number; total_cost: number; month_tokens: number; last_used: string | null }>(
    `select u.id as user_id, u.name, u.email, u.role,
            count(a.*) filter (where a.created_at >= date_trunc('month', now()))::int as month_calls,
            coalesce(sum(a.cost_usd) filter (where a.created_at >= date_trunc('month', now())), 0) as month_cost,
            count(a.*)::int as total_calls,
            coalesce(sum(a.cost_usd), 0) as total_cost,
            coalesce(sum(a.input_tokens + a.output_tokens + a.cache_read_tokens + a.cache_creation_tokens) filter (where a.created_at >= date_trunc('month', now())), 0)::int as month_tokens,
            max(a.created_at)::text as last_used
       from ai_usage a join users u on u.id = a.user_id
      group by u.id order by month_cost desc, total_cost desc`,
  );
}

export async function listRecentUsage(limit = 50) {
  return sql<{ id: string; name: string; feature: string; model: string; status: string; input_tokens: number; output_tokens: number; cache_read_tokens: number; image_count: number; web_search_requests: number; cost_usd: number; created_at: string; error_message: string | null }>(
    `select a.id, coalesce(u.name, 'Automatisch (gepland)') as name, a.feature, a.model, a.status, a.input_tokens, a.output_tokens, a.cache_read_tokens, a.image_count,
            a.web_search_requests, a.cost_usd, a.created_at::text as created_at, a.error_message
       from ai_usage a left join users u on u.id = a.user_id order by a.created_at desc limit $1`,
    [limit],
  );
}
