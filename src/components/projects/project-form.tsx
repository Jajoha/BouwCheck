"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Fieldset, Input, Select, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { Notice } from "@/components/ui/misc";
import { useServerForm } from "@/lib/forms/use-server-form";
import { PROJECT_STATUS, PROPERTY_TYPES, PROVINCES, RENOVATION_TYPES, SPECIALTIES } from "@/lib/domain/constants";
import type { ActionResult } from "@/lib/forms/types";
import { cn } from "@/lib/utils";

export type ProjectFormValues = {
  name: string;
  location: string;
  province: string;
  property_type: string;
  renovation_type: string;
  area_m2: string;
  budget_amount: string;
  budget_vat_included: boolean;
  desired_start_date: string;
  desired_completion_date: string;
  specialty_ids: string[];
  description: string;
  material_preferences: string;
  extra_requirements: string;
  status?: string;
};

const STEPS = [
  { title: "Project", fields: ["name", "location", "province", "property_type", "renovation_type", "area_m2"] },
  { title: "Planning & budget", fields: ["desired_start_date", "desired_completion_date", "budget_amount", "budget_vat_included"] },
  { title: "Werkzaamheden", fields: ["specialty_ids", "description"] },
  { title: "Aanvullend", fields: ["material_preferences", "extra_requirements", "status"] },
];

export function ProjectForm({
  action,
  initial,
  mode,
  cancelHref,
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  initial: ProjectFormValues;
  mode: "create" | "edit";
  cancelHref: string;
}) {
  const [step, setStep] = React.useState(0);
  const [clientErrors, setClientErrors] = React.useState<Record<string, string[]>>({});
  const formRef = React.useRef<HTMLFormElement>(null);
  const { pending, onSubmit, result } = useServerForm(action);
  const errors = (name: string) => clientErrors[name] ?? result?.fieldErrors?.[name];

  // Bij serverfouten naar de eerste stap met een fout springen
  React.useEffect(() => {
    const fe = result?.fieldErrors;
    if (!fe) return;
    const idx = STEPS.findIndex((s) => s.fields.some((f) => fe[f]));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (idx >= 0) setStep(idx);
  }, [result]);

  function validateStep(i: number): boolean {
    const form = formRef.current!;
    const fd = new FormData(form);
    const e: Record<string, string[]> = {};
    const req = (name: string, label: string) => {
      if (!String(fd.get(name) ?? "").trim()) e[name] = [`${label} is verplicht.`];
    };
    if (i === 0) {
      req("name", "Projectnaam");
      req("location", "Locatie");
      req("property_type", "Type vastgoed");
      req("renovation_type", "Type renovatie");
      if (String(fd.get("name") ?? "").trim().length > 0 && String(fd.get("name")).trim().length < 3) e.name = ["Projectnaam moet minimaal 3 tekens bevatten."];
    }
    if (i === 1) {
      const s = String(fd.get("desired_start_date") ?? "");
      const c = String(fd.get("desired_completion_date") ?? "");
      if (s && c && c < s) e.desired_completion_date = ["De opleverdatum moet na de startdatum liggen."];
    }
    if (i === 2) {
      if (fd.getAll("specialty_ids[]").length === 0) e.specialty_ids = ["Kies minimaal één vakgebied."];
      if (String(fd.get("description") ?? "").trim().length < 10) e.description = ["Omschrijving moet minimaal 10 tekens bevatten."];
    }
    setClientErrors(e);
    return Object.keys(e).length === 0;
  }

  const next = () => validateStep(step) && setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const isLast = step === STEPS.length - 1;

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        if (!isLast && mode === "create") {
          e.preventDefault();
          next();
          return;
        }
        if (!validateStep(step)) {
          e.preventDefault();
          return;
        }
        onSubmit(e);
      }}
      noValidate
      className="flex flex-col gap-6"
    >
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Stappen">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <button
              type="button"
              onClick={() => (i < step || mode === "edit" ? setStep(i) : i === step + 1 ? next() : undefined)}
              aria-current={i === step ? "step" : undefined}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                i === step ? "border-ink-900 bg-ink-900 text-white" : i < step ? "border-brand-200 bg-brand-50 text-brand-800" : "border-ink-200 text-ink-500",
              )}
            >
              <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full text-xs", i === step ? "bg-white text-ink-900" : i < step ? "bg-brand-600 text-white" : "bg-ink-100")}>
                {i < step ? <Check className="size-3" /> : i + 1}
              </span>
              {s.title}
            </button>
          </li>
        ))}
      </ol>

      {result && !result.ok && result.message ? <Notice tone="danger">{result.message}</Notice> : null}

      {/* Stap 1 */}
      <section className={cn("grid gap-4 sm:grid-cols-2", step !== 0 && "hidden")} aria-labelledby="stap-1">
        <h2 id="stap-1" className="sr-only">
          Project
        </h2>
        <Field label="Projectnaam" htmlFor="name" required error={errors("name")} className="sm:col-span-2" hint="Bijv. ‘Tussenwoning Amersfoort — complete renovatie’.">
          <Input id="name" name="name" defaultValue={initial.name} maxLength={120} aria-invalid={Boolean(errors("name"))} />
        </Field>
        <Field label="Locatie (plaats of postcode)" htmlFor="location" required error={errors("location")}>
          <Input id="location" name="location" defaultValue={initial.location} maxLength={120} aria-invalid={Boolean(errors("location"))} />
        </Field>
        <Field label="Provincie" htmlFor="province" error={errors("province")} hint="Gebruikt om aannemers in je regio te vinden.">
          <Select id="province" name="province" defaultValue={initial.province}>
            <option value="">Kies provincie</option>
            {PROVINCES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </Field>
        <Field label="Type vastgoed" htmlFor="property_type" required error={errors("property_type")}>
          <Select id="property_type" name="property_type" defaultValue={initial.property_type} aria-invalid={Boolean(errors("property_type"))}>
            <option value="">Kies type</option>
            {PROPERTY_TYPES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </Field>
        <Field label="Type renovatie" htmlFor="renovation_type" required error={errors("renovation_type")}>
          <Select id="renovation_type" name="renovation_type" defaultValue={initial.renovation_type} aria-invalid={Boolean(errors("renovation_type"))}>
            <option value="">Kies type</option>
            {RENOVATION_TYPES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </Field>
        <Field label="Geschat oppervlak (m²)" htmlFor="area_m2" error={errors("area_m2")}>
          <Input id="area_m2" name="area_m2" inputMode="decimal" defaultValue={initial.area_m2} placeholder="Bijv. 112" />
        </Field>
      </section>

      {/* Stap 2 */}
      <section className={cn("grid gap-4 sm:grid-cols-2", step !== 1 && "hidden")} aria-label="Planning en budget">
        <Field label="Gewenste startdatum" htmlFor="desired_start_date" error={errors("desired_start_date")}>
          <Input id="desired_start_date" name="desired_start_date" type="date" defaultValue={initial.desired_start_date} />
        </Field>
        <Field label="Gewenste opleverdatum" htmlFor="desired_completion_date" error={errors("desired_completion_date")}>
          <Input id="desired_completion_date" name="desired_completion_date" type="date" defaultValue={initial.desired_completion_date} aria-invalid={Boolean(errors("desired_completion_date"))} />
        </Field>
        <Field label="Beschikbaar renovatiebudget (€)" htmlFor="budget_amount" error={errors("budget_amount")} hint="Hele euro's, zonder punten. Bijv. 85000.">
          <Input id="budget_amount" name="budget_amount" inputMode="numeric" defaultValue={initial.budget_amount} placeholder="85000" />
        </Field>
        <div className="flex items-end pb-2">
          <Checkbox name="budget_vat_included" label="Budget is inclusief btw" description="Standaard rekenen we met bedragen exclusief btw." defaultChecked={initial.budget_vat_included} />
        </div>
      </section>

      {/* Stap 3 */}
      <section className={cn("flex flex-col gap-4", step !== 2 && "hidden")} aria-label="Werkzaamheden">
        <Fieldset legend="Benodigde vakgebieden" description="Meerdere werkzaamheden per project zijn mogelijk." error={errors("specialty_ids")}>
          <div className="grid gap-2 sm:grid-cols-3">
            {SPECIALTIES.map((s) => (
              <Checkbox key={s.id} name="specialty_ids[]" value={s.id} label={s.name} defaultChecked={initial.specialty_ids.includes(s.id)} />
            ))}
          </div>
        </Fieldset>
        <Field label="Omschrijving van de werkzaamheden" htmlFor="description" required error={errors("description")} hint="Wat moet er gebeuren? Hoe specifieker, hoe beter offertes vergelijkbaar worden.">
          <Textarea id="description" name="description" rows={6} defaultValue={initial.description} aria-invalid={Boolean(errors("description"))} />
        </Field>
      </section>

      {/* Stap 4 */}
      <section className={cn("flex flex-col gap-4", step !== 3 && "hidden")} aria-label="Aanvullend">
        <Field label="Materiaalvoorkeuren" htmlFor="material_preferences" error={errors("material_preferences")}>
          <Textarea id="material_preferences" name="material_preferences" rows={3} defaultValue={initial.material_preferences} placeholder="Bijv. middensegment, neutrale afwerking" />
        </Field>
        <Field label="Aanvullende eisen of bijzonderheden" htmlFor="extra_requirements" error={errors("extra_requirements")}>
          <Textarea id="extra_requirements" name="extra_requirements" rows={3} defaultValue={initial.extra_requirements} placeholder="Bijv. VvE-regels, bereikbaarheid, asbestinventarisatie" />
        </Field>
        {mode === "edit" ? (
          <Field label="Projectstatus" htmlFor="status" required error={errors("status")}>
            <Select id="status" name="status" defaultValue={initial.status}>
              {Object.entries(PROJECT_STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Notice tone="info">Foto&apos;s, plattegronden en bestaande offertes kun je na het opslaan als bijlage toevoegen op de projectpagina.</Notice>
      </section>

      <div className="flex flex-col-reverse gap-2 border-t border-ink-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost">
          <Link href={cancelHref}>Annuleren</Link>
        </Button>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          {step > 0 ? (
            <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft aria-hidden /> Vorige
            </Button>
          ) : null}
          {mode === "create" && !isLast ? (
            <Button type="button" onClick={next}>
              Volgende <ArrowRight aria-hidden />
            </Button>
          ) : null}
          {mode === "edit" && !isLast ? (
            <Button type="button" variant="outline" onClick={next}>
              Volgende <ArrowRight aria-hidden />
            </Button>
          ) : null}
          {isLast || mode === "edit" ? (
            <SubmitButton pending={pending}>{mode === "create" ? "Project opslaan" : "Wijzigingen opslaan"}</SubmitButton>
          ) : null}
        </div>
      </div>
    </form>
  );
}
