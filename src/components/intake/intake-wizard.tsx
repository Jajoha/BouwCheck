"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Sparkles, PencilLine, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { Notice } from "@/components/ui/misc";
import { PhotoPicker, type PickedPhoto } from "./photo-picker";
import { ScopeEditor, newScopeRow, serializeScope, validateScopeRows, type ScopeDraft } from "./scope-editor";
import { AiFindings, type Findings } from "./ai-findings";
import { analyzeIntakeAction, createProjectFromIntakeAction, type AnalyzeData } from "@/actions/intake";
import { PROPERTY_TYPES, PROVINCES, RENOVATION_TYPES } from "@/lib/domain/constants";
import { cn } from "@/lib/utils";

type Errors = Record<string, string[] | undefined>;
const STEP1_FIELDS = ["name", "location", "province", "property_type", "renovation_type", "area_m2", "budget_amount", "desired_start_date", "desired_completion_date", "description", "photos"];

function isRedirect(err: unknown) {
  return Boolean(err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_"));
}

export type IntakePrefill = {
  /** Token van de Offertecheck waaruit de scope komt; wordt aan het project gekoppeld. */
  offertecheckToken: string;
  description: string;
  province: string | null;
  scope: { specialty_id: string; description: string; quantity: number | null; unit: string | null }[];
};

export function IntakeWizard({
  aiEnabled,
  maxPhotos,
  defaultProvince,
  usage,
  prefill,
}: {
  aiEnabled: boolean;
  maxPhotos: number;
  defaultProvince: string;
  usage: { costUsd: number; limitUsd: number };
  prefill?: IntakePrefill;
}) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [step, setStep] = React.useState<1 | 2>(1);
  const [photos, setPhotos] = React.useState<PickedPhoto[]>([]);
  const [errors, setErrors] = React.useState<Errors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<ScopeDraft[]>(() =>
    (prefill?.scope ?? []).map((i) =>
      newScopeRow({
        specialty_id: i.specialty_id,
        description: i.description,
        quantity: i.quantity === null ? "" : String(i.quantity).replace(".", ","),
        unit: i.unit ?? "",
        confidence: "middel",
        source: "ai",
        basis: "Uit je Offertecheck",
      }),
    ),
  );
  const [findings, setFindings] = React.useState<Findings | null>(null);
  const [analysis, setAnalysis] = React.useState<Pick<AnalyzeData, "model" | "costUsd" | "monthCostUsd" | "monthLimitUsd"> | null>(null);
  const [pending, setPending] = React.useState<"analyse" | "opslaan" | null>(null);
  const limitReached = usage.costUsd >= usage.limitUsd;

  function buildFormData() {
    const fd = new FormData(formRef.current!);
    fd.delete("photos");
    for (const p of photos) fd.append("photos", p.file, p.file.name);
    return fd;
  }

  function clientCheckStep1(): boolean {
    const fd = new FormData(formRef.current!);
    const e: Errors = {};
    if (!String(fd.get("location") ?? "").trim()) e.location = ["Locatie is verplicht."];
    if (!fd.get("province")) e.province = ["Kies de provincie; die bepaalt welke aannemers in aanmerking komen."];
    if (!fd.get("property_type")) e.property_type = ["Kies het type woning."];
    if (!fd.get("renovation_type")) e.renovation_type = ["Kies het type renovatie."];
    if (String(fd.get("description") ?? "").trim().length < 20) e.description = ["Beschrijf het project in minimaal 20 tekens."];
    const s = String(fd.get("desired_start_date") ?? "");
    const c = String(fd.get("desired_completion_date") ?? "");
    if (s && c && c < s) e.desired_completion_date = ["De opleverdatum moet na de startdatum liggen."];
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    return !first;
  }

  async function analyse() {
    if (!clientCheckStep1()) return;
    setPending("analyse");
    setFormError(null);
    try {
      const res = await analyzeIntakeAction(buildFormData());
      if (!res.ok || !res.data) {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.message ?? "Analyse mislukt.");
        toast.error(res.message ?? "Analyse mislukt.");
        return;
      }
      const r = res.data.result;
      setRows(
        r.scope_items.map((i) =>
          newScopeRow({
            specialty_id: i.specialty_id,
            description: i.description,
            quantity: i.quantity === null ? "" : String(i.quantity).replace(".", ","),
            unit: i.unit ?? "",
            confidence: i.confidence,
            source: "ai",
            basis: i.basis,
          }),
        ),
      );
      setFindings({
        summary: r.summary,
        property_condition: r.property_condition,
        risks: r.risks,
        open_questions: r.open_questions,
        assumptions: r.assumptions,
        model: res.data.model,
        analyzed_at: res.data.analyzedAt,
      });
      setAnalysis(res.data);
      setStep(2);
      window.scrollTo({ top: 0 });
    } catch (err) {
      if (isRedirect(err)) throw err;
      setFormError("Er ging iets mis bij de analyse. Probeer het opnieuw of vul de werkzaamheden zelf in.");
    } finally {
      setPending(null);
    }
  }

  function manual() {
    if (!clientCheckStep1()) return;
    if (rows.length === 0) setRows([newScopeRow()]);
    setFindings(null);
    setStep(2);
    window.scrollTo({ top: 0 });
  }

  async function save() {
    const problem = validateScopeRows(rows);
    if (problem) {
      setFormError(problem);
      toast.error(problem);
      return;
    }
    setPending("opslaan");
    setFormError(null);
    try {
      const fd = buildFormData();
      fd.set("scope", serializeScope(rows));
      if (findings) fd.set("ai_summary", JSON.stringify(findings));
      const res = await createProjectFromIntakeAction(fd);
      if (res && !res.ok) {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.message ?? "Opslaan mislukt.");
        toast.error(res.message ?? "Opslaan mislukt.");
        if (res.fieldErrors && Object.keys(res.fieldErrors).some((k) => STEP1_FIELDS.includes(k))) setStep(1);
      }
    } catch (err) {
      if (isRedirect(err)) throw err;
      setFormError("Opslaan mislukt. Probeer het opnieuw.");
    } finally {
      setPending(null);
    }
  }

  const err = (n: string) => errors[n];

  return (
    <form ref={formRef} onSubmit={(e) => e.preventDefault()} noValidate className="flex flex-col gap-6">
      <ol className="grid grid-cols-2 gap-2" aria-label="Stappen">
        {[
          [1, "Beschrijf je project"],
          [2, "Controleer de werkzaamheden"],
        ].map(([n, label]) => (
          <li
            key={n}
            aria-current={step === n ? "step" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
              step === n ? "border-ink-900 bg-ink-900 text-white" : step > (n as number) ? "border-brand-200 bg-brand-50 text-brand-800" : "border-ink-200 text-ink-500",
            )}
          >
            <span className={cn("flex size-5 items-center justify-center rounded-full text-xs", step === n ? "bg-white text-ink-900" : step > (n as number) ? "bg-brand-600 text-white" : "bg-ink-100")}>
              {step > (n as number) ? <Check className="size-3" /> : n}
            </span>
            {label}
          </li>
        ))}
      </ol>

      {formError ? <Notice tone="danger">{formError}</Notice> : null}
      {prefill ? (
        <>
          <input type="hidden" name="offertecheck_token" value={prefill.offertecheckToken} />
          <Notice tone="info" title="Scope uit je Offertecheck">
            De {prefill.scope.length} werkzaamheden uit je Offertecheck staan klaar. Vul hieronder de locatie en het type woning en renovatie in en controleer in de volgende stap de
            werkzaamheden. Teams offreren dan op deze ene scope.
          </Notice>
        </>
      ) : null}

      {/* Stap 1 — blijft in de DOM zodat de waarden behouden blijven */}
      <section className={cn("flex flex-col gap-5", step !== 1 && "hidden")} aria-label="Beschrijf je project">
        <Field
          label="Wat wil je laten doen?"
          htmlFor="description"
          required
          error={err("description")}
          hint="Schrijf het zoals je het tegen een aannemer zou zeggen: welke ruimtes, wat eruit moet, wat er nieuw moet, de staat van de woning en wat je weet over bouwjaar of gebreken."
        >
          <Textarea
            id="description"
            name="description"
            rows={7}
            defaultValue={prefill?.description}
            placeholder="Bijv.: Jaren-30 tussenwoning van ca. 110 m². Badkamer en keuken volledig vervangen, nieuwe groepenkast, alle wanden opnieuw stucen en schilderen, nieuwe PVC-vloer beneden. Dak lekt bij de dakkapel."
            aria-invalid={Boolean(err("description"))}
          />
        </Field>
        <div>
          <p className="mb-2 text-sm font-medium text-ink-800">
            Foto&apos;s <span className="ml-1.5 text-xs font-normal text-ink-400">optioneel</span>
          </p>
          <PhotoPicker photos={photos} onChange={setPhotos} max={maxPhotos} error={err("photos")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Locatie (plaats of postcode)" htmlFor="location" required error={err("location")}>
            <Input id="location" name="location" autoComplete="address-level2" aria-invalid={Boolean(err("location"))} />
          </Field>
          <Field label="Provincie" htmlFor="province" required error={err("province")} hint="Alleen aannemers die in deze provincie werken komen in aanmerking.">
            <Select id="province" name="province" defaultValue={prefill?.province ?? defaultProvince} aria-invalid={Boolean(err("province"))}>
              <option value="">Kies provincie</option>
              {PROVINCES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="Type woning" htmlFor="property_type" required error={err("property_type")}>
            <Select id="property_type" name="property_type" defaultValue="" aria-invalid={Boolean(err("property_type"))}>
              <option value="">Kies type</option>
              {PROPERTY_TYPES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="Type renovatie" htmlFor="renovation_type" required error={err("renovation_type")}>
            <Select id="renovation_type" name="renovation_type" defaultValue="" aria-invalid={Boolean(err("renovation_type"))}>
              <option value="">Kies type</option>
              {RENOVATION_TYPES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="Woonoppervlak (m²)" htmlFor="area_m2" error={err("area_m2")}>
            <Input id="area_m2" name="area_m2" inputMode="decimal" placeholder="Bijv. 110" />
          </Field>
          <Field label="Renovatiebudget (€)" htmlFor="budget_amount" error={err("budget_amount")} hint="Gebruikt om teams te toetsen aan je budget.">
            <Input id="budget_amount" name="budget_amount" inputMode="numeric" placeholder="Bijv. 85.000" />
          </Field>
          <Field label="Gewenste start" htmlFor="desired_start_date" error={err("desired_start_date")}>
            <Input id="desired_start_date" name="desired_start_date" type="date" />
          </Field>
          <Field label="Gewenste oplevering" htmlFor="desired_completion_date" error={err("desired_completion_date")}>
            <Input id="desired_completion_date" name="desired_completion_date" type="date" aria-invalid={Boolean(err("desired_completion_date"))} />
          </Field>
          <Checkbox name="budget_vat_included" label="Budget is inclusief btw" description="Standaard rekenen we exclusief btw." />
          <Field label="Projectnaam" htmlFor="name" error={err("name")} hint="Leeg laten = automatisch uit woningtype en locatie.">
            <Input id="name" name="name" maxLength={120} />
          </Field>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-ink-200 bg-ink-50 p-4">
          {aiEnabled ? (
            <>
              <p className="text-sm text-ink-700">
                De AI leest je beschrijving en foto&apos;s en stelt een lijst werkzaamheden voor, met hoeveelheden, risico&apos;s en open vragen. Jij controleert die
                daarna. De AI noemt geen prijzen en kiest geen aannemers.
              </p>
              <p className="text-xs text-ink-500">
                AI-verbruik deze maand: $ {usage.costUsd.toFixed(2)} van $ {usage.limitUsd.toFixed(2)} (limiet per account).
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-700">AI-analyse is in deze omgeving niet geconfigureerd. Je vult de werkzaamheden in de volgende stap zelf in.</p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            {aiEnabled && !prefill ? (
              <Button type="button" onClick={analyse} disabled={pending !== null || limitReached} aria-busy={pending === "analyse"}>
                {pending === "analyse" ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
                {pending === "analyse" ? "Analyseren… (kan tot een minuut duren)" : "Analyseer met AI"}
              </Button>
            ) : null}
            <Button type="button" variant={aiEnabled && !prefill ? "outline" : "primary"} onClick={manual} disabled={pending !== null}>
              <PencilLine aria-hidden /> {prefill ? "Verder met de scope uit je check" : "Werkzaamheden zelf invullen"}
            </Button>
          </div>
          {limitReached ? <p className="text-xs text-warn-700">Je AI-tegoed voor deze maand is op. Vul de werkzaamheden zelf in.</p> : null}
        </div>
      </section>

      {/* Stap 2 */}
      {step === 2 ? (
        <section className="flex flex-col gap-5" aria-label="Controleer de werkzaamheden">
          {findings ? (
            <>
              <Notice tone="info" title="Voorstel van de AI — controleer en corrigeer">
                Dit is een eerste inschatting op basis van je beschrijving{photos.length ? ` en ${photos.length} foto('s)` : ""}. Hoeveelheden zijn schattingen. Pas aan
                wat niet klopt; alleen wat jij bevestigt wordt gebruikt om teams samen te stellen.
                {analysis ? (
                  <span className="mt-1 block text-xs">
                    Model: {analysis.model} · kosten deze analyse: $ {analysis.costUsd.toFixed(3)} · deze maand: $ {analysis.monthCostUsd.toFixed(2)} van $ {analysis.monthLimitUsd.toFixed(2)}
                  </span>
                ) : null}
              </Notice>
              <AiFindings findings={findings} />
            </>
          ) : null}
          <ScopeEditor rows={rows} onChange={setRows} />
          <div className="flex flex-col-reverse justify-between gap-2 border-t border-ink-100 pt-5 sm:flex-row">
            <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={pending !== null}>
              <ArrowLeft aria-hidden /> Terug naar beschrijving
            </Button>
            <Button type="button" onClick={save} disabled={pending !== null} aria-busy={pending === "opslaan"}>
              {pending === "opslaan" ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {pending === "opslaan" ? "Opslaan…" : "Opslaan en teamvoorstellen bekijken"}
            </Button>
          </div>
        </section>
      ) : null}
      <p className="text-xs text-ink-500">
        Liever annuleren? <Link href="/projecten" className="underline">Terug naar projecten</Link>
      </p>
    </form>
  );
}
