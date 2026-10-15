import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Notice, PageHeader, TableWrap, td, th } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth/session";
import { aiConfig } from "@/lib/ai/config";
import { listRecentUsage, listUsagePerAccount } from "@/lib/data/ai-usage";
import { formatDateTime, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Beheer — AI-gebruik" };

const usd = (n: number, d = 2) => `$ ${Number(n).toFixed(d)}`;

export default async function AdminAiUsage() {
  await requireAdmin("/beheer/ai-gebruik");
  const [perAccount, recent] = await Promise.all([listUsagePerAccount(), listRecentUsage(50)]);
  const monthTotal = perAccount.reduce((s, r) => s + Number(r.month_cost), 0);
  return (
    <>
      <PageHeader
        title="AI-gebruik per account"
        description={`Kosten per aanroep berekend uit de daadwerkelijke tokens per model (prijstabel in src/lib/ai/pricing.ts). Limiet: ${usd(aiConfig.monthlyLimitUsd)} per account per maand, max. ${aiConfig.hourlyLimit} analyses per uur.`}
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[var(--radius-card)] border border-ink-200 bg-white p-4">
          <p className="text-xs text-ink-500">Status</p>
          <p className="mt-1 font-semibold">{aiConfig.configured ? `Actief · ${aiConfig.model} · effort ${aiConfig.effort}` : "Niet geconfigureerd"}</p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-ink-200 bg-white p-4">
          <p className="text-xs text-ink-500">Kosten deze maand (alle accounts)</p>
          <p className="tabular mt-1 text-2xl font-semibold">{usd(monthTotal)}</p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-ink-200 bg-white p-4">
          <p className="text-xs text-ink-500">Accounts met AI-gebruik</p>
          <p className="tabular mt-1 text-2xl font-semibold">{perAccount.length}</p>
        </div>
      </div>
      {!aiConfig.configured ? (
        <Notice tone="warning" className="mt-4">
          Zet <code>ANTHROPIC_API_KEY</code> in de serveromgeving (bijv. Vercel → Settings → Environment Variables) en deploy opnieuw om AI-analyse te activeren.
        </Notice>
      ) : null}
      <h2 className="mt-10 text-base font-semibold">Per account</h2>
      {perAccount.length === 0 ? (
        <EmptyState className="mt-3" title="Nog geen AI-gebruik" />
      ) : (
        <TableWrap className="mt-3">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr>
                <th className={th}>Account</th>
                <th className={`${th} text-right`}>Analyses (maand)</th>
                <th className={`${th} text-right`}>Tokens (maand)</th>
                <th className={`${th} text-right`}>Kosten (maand)</th>
                <th className={`${th} text-right`}>Tegoed gebruikt</th>
                <th className={`${th} text-right`}>Totaal</th>
                <th className={th}>Laatst</th>
              </tr>
            </thead>
            <tbody>
              {perAccount.map((r) => {
                const share = (Number(r.month_cost) / aiConfig.monthlyLimitUsd) * 100;
                return (
                  <tr key={r.user_id}>
                    <td className={td}>
                      {r.name}
                      <span className="block text-xs text-ink-500">{r.email}</span>
                    </td>
                    <td className={`${td} tabular text-right`}>{r.month_calls}</td>
                    <td className={`${td} tabular text-right`}>{formatNumber(r.month_tokens)}</td>
                    <td className={`${td} tabular text-right`}>{usd(r.month_cost, 3)}</td>
                    <td className={`${td} text-right`}>
                      <Badge tone={share >= 100 ? "danger" : share >= 75 ? "warning" : "neutral"}>{Math.min(999, Math.round(share))}%</Badge>
                    </td>
                    <td className={`${td} tabular text-right`}>
                      {usd(r.total_cost, 3)} <span className="text-xs text-ink-500">({r.total_calls})</span>
                    </td>
                    <td className={`${td} text-xs`}>{formatDateTime(r.last_used)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      )}
      <h2 className="mt-10 text-base font-semibold">Laatste aanroepen</h2>
      {recent.length ? (
        <TableWrap className="mt-3">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr>
                <th className={th}>Tijdstip</th>
                <th className={th}>Account</th>
                <th className={th}>Model</th>
                <th className={th}>Status</th>
                <th className={`${th} text-right`}>Input / cache / output</th>
                <th className={`${th} text-right`}>Foto&apos;s</th>
                <th className={`${th} text-right`}>Kosten</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id}>
                  <td className={`${td} whitespace-nowrap text-xs`}>{formatDateTime(r.created_at)}</td>
                  <td className={td}>{r.name}</td>
                  <td className={`${td} text-xs`}>{r.model}</td>
                  <td className={td}>
                    <Badge tone={r.status === "ok" ? "positive" : "warning"} title={r.error_message ?? undefined}>
                      {r.status}
                    </Badge>
                  </td>
                  <td className={`${td} tabular text-right text-xs`}>
                    {formatNumber(r.input_tokens)} / {formatNumber(r.cache_read_tokens)} / {formatNumber(r.output_tokens)}
                  </td>
                  <td className={`${td} tabular text-right`}>{r.image_count}</td>
                  <td className={`${td} tabular text-right`}>{usd(r.cost_usd, 4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      ) : (
        <EmptyState className="mt-3" title="Nog geen aanroepen" />
      )}
    </>
  );
}
