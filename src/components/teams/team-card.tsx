import Link from "next/link";
import { CalendarClock, Coins, Award, Users, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DemoBadge, VerificationBadge } from "@/components/domain/badges";
import { ChooseTeamButton } from "./choose-team-button";
import { summarizeVerification } from "@/lib/domain/verification";
import type { Priority, TeamOption } from "@/lib/domain/teams";
import { specialtyName, PROVIDER_TYPES } from "@/lib/domain/constants";
import { checkAgeDays, REGISTER_MAX_AGE_DAYS } from "@/lib/domain/registers";
import { formatDate, formatEuro, formatNumber, formatPercent } from "@/lib/format";
import { daysBetween } from "@/lib/domain/metrics";
import { cn } from "@/lib/utils";

export const PRIORITY_META: Record<Priority, { label: string; title: string; criterion: string; icon: typeof Coins }> = {
  budget: {
    label: "Budget",
    title: "Budgetoptie",
    criterion: "Laagste kostenindicatie (middenwaarde van de bandbreedte), berekend met de opgegeven tarieven van de aannemers × de hoeveelheden uit je werkzaamheden.",
    icon: Coins,
  },
  kwaliteit: {
    label: "Kwaliteit",
    title: "Kwalitatieve optie",
    criterion:
      "Hoogste beoordeling van de zwakste schakel in het team (gepubliceerde, aan projecten gekoppelde beoordelingen, min. 3 per aannemer). Bij gelijke stand: minder herstelwerk, daarna meer gecontroleerde projecten.",
    icon: Award,
  },
  snelheid: {
    label: "Snelheid",
    title: "Snelste optie",
    criterion: "Vroegste datum waarop het hele team beschikbaar is, op basis van de door aannemers opgegeven beschikbaarheid.",
    icon: CalendarClock,
  },
};

const unitLabel = (u: string | null) => (u === "m2" ? "m²" : u ?? "");

export function costLabel(o: TeamOption) {
  if (o.cost.min === 0 && o.cost.max === 0) return "Niet te begroten";
  return `${formatEuro(o.cost.min)} – ${formatEuro(o.cost.max)}`;
}

function registerStatus(c: TeamOption["members"][number]["contractor"], today: string): { text: string; warn: boolean } {
  if (c.is_demo) return { text: "registers: demo, niet gecontroleerd", warn: false };
  const last = c.register?.lastCheckedAt ?? null;
  const age = checkAgeDays(last, today);
  if (age === null) return { text: "registers: nog niet gecontroleerd", warn: true };
  if (age > REGISTER_MAX_AGE_DAYS) return { text: `registers: laatst gecontroleerd ${formatDate(last)} (verouderd)`, warn: true };
  return { text: `registers gecontroleerd op ${formatDate(last)}`, warn: false };
}

function explain(priority: Priority, o: TeamOption, ctx: { budget: number | null; desiredStart: string | null }) {
  const parts: string[] = [];
  if (priority === "budget") {
    parts.push(`Kostenindicatie ${costLabel(o)} excl. btw${o.cost.complete ? "" : " (niet alle onderdelen begroot)"}.`);
    if (ctx.budget && o.cost.complete) {
      if (o.cost.max <= ctx.budget) parts.push("Valt binnen je budget, ook aan de bovenkant van de bandbreedte.");
      else if (o.cost.min <= ctx.budget) parts.push("Kan boven je budget uitkomen (bovenkant van de bandbreedte).");
      else parts.push("Ligt boven je budget.");
    }
  }
  if (priority === "kwaliteit" && o.weakest) {
    const q = o.weakest.quality;
    parts.push(
      `Zwakste schakel: ${o.weakest.contractor.company_name} met ${formatNumber(q.rating, 1)}/5 (n=${q.ratingN})${q.rework !== null ? `, herstelwerk bij ${formatPercent(q.rework)} van de projecten` : ""}.`,
    );
  }
  if (priority === "snelheid" && o.start) {
    parts.push(`Hele team beschikbaar vanaf ${formatDate(o.start)}.`);
    if (ctx.desiredStart) {
      const diff = daysBetween(ctx.desiredStart, o.start);
      parts.push(diff <= 0 ? "Dat past bij je gewenste startdatum." : `Dat is ${diff} dagen na je gewenste start.`);
    }
  }
  return parts.join(" ");
}

export function TeamCard({
  option,
  priority,
  projectId,
  recommended,
  ctx,
  compareTo,
}: {
  option: TeamOption;
  priority: Priority;
  projectId: string;
  recommended?: boolean;
  ctx: { budget: number | null; desiredStart: string | null };
  compareTo?: { label: string; option: TeamOption }[];
}) {
  const meta = PRIORITY_META[priority];
  const today = new Date().toISOString().slice(0, 10);
  return (
    <article className={cn("rounded-[var(--radius-card)] border bg-white", recommended ? "border-ink-900 shadow-[var(--shadow-raised)]" : "border-ink-200")} data-testid="team-option">
      <header className="flex flex-col gap-2 border-b border-ink-100 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {recommended ? <Badge tone="dark">Aanbevolen voor {meta.label.toLowerCase()}</Badge> : <Badge tone="neutral">Alternatief</Badge>}
            <Badge tone="muted">
              <Users aria-hidden />
              {option.structure === "hoofdaannemer" ? "Hoofdaannemer" : `${option.members.length} vakspecialist${option.members.length === 1 ? "" : "en"}`}
            </Badge>
            {option.members.some((m) => m.contractor.is_demo) ? <DemoBadge compact /> : null}
          </div>
          <p className="mt-2 text-sm text-ink-700">{explain(priority, option, ctx)}</p>
        </div>
        <ChooseTeamButton projectId={projectId} label={`${meta.label}${recommended ? "" : " (alternatief)"}`} contractorIds={option.members.map((m) => m.contractor.id)} />
      </header>

      <dl className="grid grid-cols-3 gap-3 border-b border-ink-100 p-4 text-sm">
        <div>
          <dt className="text-xs text-ink-500">Kostenindicatie</dt>
          <dd className="tabular mt-0.5 font-semibold text-ink-950">{costLabel(option)}</dd>
          <dd className="text-xs text-ink-500">{option.cost.complete ? "excl. btw" : "deels begroot, excl. btw"}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-500">Team beschikbaar</dt>
          <dd className="mt-0.5 font-semibold text-ink-950">{option.start ? formatDate(option.start) : "Onbekend"}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-500">Zwakste schakel</dt>
          <dd className="mt-0.5 font-semibold text-ink-950">
            {option.qualitySufficient && option.weakest ? `${formatNumber(option.weakest.quality.rating, 1)}/5` : "Onvoldoende data"}
          </dd>
          {option.qualitySufficient && option.weakest ? <dd className="text-xs text-ink-500">n={option.weakest.quality.ratingN}</dd> : null}
        </div>
      </dl>

      <ul className="divide-y divide-ink-100">
        {option.members.map((m) => {
          const verification = summarizeVerification({
            approvedEventTypes: m.contractor.businessVerified ? ["bedrijfsgegevens"] : [],
            clientConfirmedProjects: m.contractor.metrics.clientConfirmedProjects,
            verifiedProjects: m.contractor.metrics.verifiedProjects,
          });
          return (
            <li key={m.contractor.id} className="p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Link href={`/aannemers/${m.contractor.slug}`} className="font-medium text-ink-950 hover:underline">
                    {m.contractor.company_name}
                  </Link>
                  <p className="text-xs text-ink-600">{m.roles.map(specialtyName).join(", ")}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="muted">{PROVIDER_TYPES[m.contractor.provider_type ?? "bedrijf"].short}</Badge>
                  <VerificationBadge level={verification.highest} isDemo={m.contractor.is_demo} />
                </div>
              </div>
              <p className="mt-1.5 text-xs text-ink-600">
                Beschikbaar: {m.start ? formatDate(m.start) : "onbekend"} · Beoordeling:{" "}
                {m.quality.sufficient ? `${formatNumber(m.quality.rating, 1)}/5 (n=${m.quality.ratingN})` : `onvoldoende (${m.quality.ratingN} van min. 3)`} · Projecten:{" "}
                {m.quality.registeredProjects} ({m.quality.verifiedProjects} gecontroleerd) ·{" "}
                {(() => {
                  const r = registerStatus(m.contractor, today);
                  return <span className={r.warn ? "text-warn-700" : undefined}>{r.text}</span>;
                })()}
              </p>
              <table className="mt-2 w-full text-xs">
                <tbody>
                  {m.lines.map((l, i) => (
                    <tr key={i} className="border-t border-ink-100 first:border-0">
                      <td className="py-1 pr-2 text-ink-700">
                        {l.description}
                        {l.quantity !== null ? <span className="text-ink-500"> · {formatNumber(l.quantity, 1)} {unitLabel(l.unit)}</span> : null}
                      </td>
                      <td className="tabular whitespace-nowrap py-1 text-right text-ink-800">
                        {l.min !== null ? `${formatEuro(l.min)} – ${formatEuro(l.max)}` : <span className="text-warn-700">{l.quantity === null ? "hoeveelheid onbekend" : "geen passend tarief"}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </li>
          );
        })}
      </ul>

      {option.notes.length || compareTo?.length ? (
        <footer className="space-y-1.5 border-t border-ink-100 bg-ink-50/60 p-4 text-xs text-ink-600">
          {option.notes.map((n) => (
            <p key={n} className="flex gap-1.5">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warn-700" aria-hidden /> {n}
            </p>
          ))}
          {compareTo?.map((c) => {
            if (c.option.key === option.key) {
              return (
                <p key={c.label}>
                  <span className="font-medium text-ink-800">{c.label}:</span> hetzelfde team.
                </p>
              );
            }
            const costDiff = option.cost.complete && c.option.cost.complete ? (option.cost.min + option.cost.max) / 2 - (c.option.cost.min + c.option.cost.max) / 2 : null;
            const dayDiff = option.start && c.option.start ? daysBetween(c.option.start, option.start) : null;
            if (costDiff === null && dayDiff === null) return null;
            return (
              <p key={c.label}>
                <span className="font-medium text-ink-800">T.o.v. {c.label.toLowerCase()}:</span>{" "}
                {costDiff !== null ? `${costDiff >= 0 ? "+" : "−"}${formatEuro(Math.abs(costDiff))} (middenwaarde)` : "kosten niet vergelijkbaar"}
                {dayDiff !== null ? `, ${dayDiff === 0 ? "zelfde startdatum" : dayDiff > 0 ? `${dayDiff} dagen later beschikbaar` : `${-dayDiff} dagen eerder beschikbaar`}` : ""}.
              </p>
            );
          })}
        </footer>
      ) : null}
    </article>
  );
}
