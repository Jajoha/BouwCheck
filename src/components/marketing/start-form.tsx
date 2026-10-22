"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Coins, Info, ShieldCheck, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/form-controls";
import { homepage, OFFERTES_LINK, PRIORITEITEN, START_ANCHOR, VERBOUWINGEN } from "@/content/homepage";
import { PROVINCES } from "@/lib/domain/constants";
import { cn } from "@/lib/utils";

const t = homepage.hero.formulier;
const PRIORITEIT_ICON = { budget: Coins, snelheid: Timer, kwaliteit: ShieldCheck } as const;

/**
 * Hero-formulier: start de bestaande teamvoorstel-flow (/projecten/nieuw) met de keuzes vooraf ingevuld.
 * Heeft een provincie minder echte vakmensen dan `minEchteVakmensen`, dan verschijnt de regiomelding;
 * het formulier blijft verstuurbaar.
 */
export function StartForm({
  echtePerProvincie,
  minEchteVakmensen,
  offertecheck,
}: {
  echtePerProvincie: Record<string, number>;
  minEchteVakmensen: number;
  /** FEATURE_OFFERTECHECK: zonder de Offertecheck geen link en geen regiomelding (die verwijst ernaar). */
  offertecheck: boolean;
}) {
  const [provincie, setProvincie] = React.useState("");
  const dun = offertecheck && provincie !== "" && (echtePerProvincie[provincie] ?? 0) < minEchteVakmensen;
  return (
    <div>
      <form
        id={START_ANCHOR}
        action="/projecten/nieuw"
        method="get"
        className="relative scroll-mt-24 overflow-hidden rounded-2xl bg-white p-5 shadow-[var(--shadow-float)] ring-1 ring-ink-950/5 sm:p-6"
      >
        <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent-400 via-accent-300 to-brand-500" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="start-verbouwing">{t.verbouwing}</Label>
            <Select id="start-verbouwing" name="verbouwing" required defaultValue="">
              <option value="" disabled>
                {t.verbouwingKies}
              </option>
              {VERBOUWINGEN.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="start-provincie">{t.provincie}</Label>
            <Select id="start-provincie" name="provincie" required value={provincie} onChange={(e) => setProvincie(e.target.value)}>
              <option value="" disabled>
                {t.provincieKies}
              </option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <fieldset className="mt-4">
          <legend className="text-sm font-medium text-ink-800">{t.prioriteit}</legend>
          <div role="radiogroup" aria-label={t.prioriteit} className="mt-1.5 grid grid-cols-3 gap-2">
            {PRIORITEITEN.map((p) => {
              const Icon = PRIORITEIT_ICON[p.value];
              return (
                <label
                  key={p.value}
                  className={cn(
                    "group flex min-h-[4.5rem] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-ink-200 bg-ink-50 px-1.5 py-2.5 text-center text-[13px] font-semibold leading-tight text-ink-800 transition-colors sm:text-sm",
                    "hover:border-ink-300 hover:bg-white",
                    "has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-900 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 has-[:focus-visible]:ring-offset-2",
                  )}
                >
                  <input type="radio" name="prioriteit" value={p.value} required className="sr-only" />
                  <Icon className="size-5 text-ink-500 group-has-[:checked]:text-brand-700" aria-hidden />
                  {p.label}
                </label>
              );
            })}
          </div>
        </fieldset>
        <Button type="submit" size="lg" variant="accent" className="mt-5 h-13 w-full text-base">
          {t.knop} <ArrowRight aria-hidden />
        </Button>
        {offertecheck ? (
          <p className="mt-3 text-center text-sm">
            <Link href={OFFERTES_LINK.href("home-hero")} className="font-medium text-brand-800 underline underline-offset-2 hover:text-brand-900">
              {t.link}
            </Link>
          </p>
        ) : null}
      </form>
      {dun ? (
        <div role="status" className="mt-4 flex gap-3 rounded-2xl border border-accent-300/60 bg-accent-100 p-4 text-sm text-ink-900 shadow-[var(--shadow-raised)]">
          <Info className="mt-0.5 size-5 shrink-0 text-ink-900" aria-hidden />
          <div>
          <p>{homepage.hero.regiomelding.tekst}</p>
          <Button asChild variant="dark" className="mt-3 w-full sm:w-auto">
            <Link href={homepage.hero.regiomelding.knop.href}>{homepage.hero.regiomelding.knop.label}</Link>
          </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
