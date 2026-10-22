"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/form-controls";
import { homepage, OFFERTES_LINK, PRIORITEITEN, START_ANCHOR, VERBOUWINGEN } from "@/content/homepage";
import { PROVINCES } from "@/lib/domain/constants";
import { cn } from "@/lib/utils";

const t = homepage.hero.formulier;

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
      <form id={START_ANCHOR} action="/projecten/nieuw" method="get" className="scroll-mt-24 rounded-[var(--radius-card)] border border-ink-200 bg-white p-4 shadow-[var(--shadow-raised)] sm:p-5">
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
            {PRIORITEITEN.map((p) => (
              <label
                key={p.value}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-ink-300 bg-white px-2 py-2 text-center text-sm font-medium leading-tight text-ink-800",
                  "has-[:checked]:border-brand-700 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-900 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600",
                )}
              >
                <input type="radio" name="prioriteit" value={p.value} required className="sr-only" />
                {p.label}
              </label>
            ))}
          </div>
        </fieldset>
        <Button type="submit" size="lg" className="mt-5 w-full">
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
        <div role="status" className="mt-4 rounded-[var(--radius-card)] border border-warn-100 bg-warn-50 p-4 text-sm text-ink-800">
          <p>{homepage.hero.regiomelding.tekst}</p>
          <Button asChild className="mt-3 w-full sm:w-auto">
            <Link href={homepage.hero.regiomelding.knop.href}>{homepage.hero.regiomelding.knop.label}</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
