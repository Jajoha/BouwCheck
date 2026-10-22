"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Fieldset, Input, Radio, Select, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { Notice } from "@/components/ui/misc";
import { submitOutcomeAction } from "@/actions/outcomes";
import { useServerForm } from "@/lib/forms/use-server-form";
import { SPECIALTIES } from "@/lib/domain/constants";

function RatingField({ name, label, required, error }: { name: string; label: string; required?: boolean; error?: string[] }) {
  return (
    <Fieldset legend={`${label}${required ? " *" : ""}`} error={error}>
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {[1, 2, 3, 4, 5].map((n) => (
          <Radio key={n} name={name} value={String(n)} label={String(n)} className="rounded-md border border-ink-200 px-3 py-1.5 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50" />
        ))}
      </div>
    </Fieldset>
  );
}

export function OutcomeForm({
  projectId,
  contractors,
  defaultContractor,
  defaults,
}: {
  projectId: string;
  contractors: { id: string; name: string }[];
  defaultContractor?: string;
  defaults: { initial_budget: string; planned: string; start: string; specialties: string[] };
}) {
  const { pending, onSubmit, errors, result } = useServerForm(submitOutcomeAction);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-8" noValidate>
      <input type="hidden" name="project_id" value={projectId} />
      {result && !result.ok && result.message ? <Notice tone="danger">{result.message}</Notice> : null}

      <section className="grid gap-4 sm:grid-cols-2">
        <h2 className="text-base font-semibold text-ink-950 sm:col-span-2">Aannemer en werkzaamheden</h2>
        <Field label="Aannemer" htmlFor="contractor_id" required error={errors("contractor_id")} className="sm:col-span-2">
          <Select id="contractor_id" name="contractor_id" defaultValue={defaultContractor ?? ""}>
            <option value="" disabled>
              Kies aannemer
            </option>
            {contractors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Fieldset legend="Uitgevoerde werkzaamheden" error={errors("work_specialty_ids")} className="sm:col-span-2">
          <div className="grid gap-2 sm:grid-cols-3">
            {SPECIALTIES.map((s) => (
              <Checkbox key={s.id} name="work_specialty_ids[]" value={s.id} label={s.name} defaultChecked={defaults.specialties.includes(s.id)} />
            ))}
          </div>
        </Fieldset>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <h2 className="text-base font-semibold text-ink-950 sm:col-span-2">Kosten</h2>
        <Field label="Oorspronkelijk begroot / offertebedrag (€)" htmlFor="initial_budget" error={errors("initial_budget")}>
          <Input id="initial_budget" name="initial_budget" inputMode="decimal" defaultValue={defaults.initial_budget} />
        </Field>
        <Field label="Definitief betaald bedrag (€)" htmlFor="final_cost" error={errors("final_cost")} hint="Inclusief extra werk.">
          <Input id="final_cost" name="final_cost" inputMode="decimal" />
        </Field>
        <Checkbox name="amounts_vat_included" label="Bedragen zijn inclusief btw" />
        <Field label="Toelichting op meerkosten" htmlFor="extra_costs_reason" error={errors("extra_costs_reason")} className="sm:col-span-2">
          <Textarea id="extra_costs_reason" name="extra_costs_reason" rows={2} placeholder="Bijv. extra werk door houtrot" />
        </Field>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <h2 className="text-base font-semibold text-ink-950 sm:col-span-3">Planning</h2>
        <Field label="Werkelijke startdatum" htmlFor="start_date" error={errors("start_date")}>
          <Input id="start_date" name="start_date" type="date" defaultValue={defaults.start} />
        </Field>
        <Field label="Oorspronkelijk geplande oplevering" htmlFor="planned_completion_date" error={errors("planned_completion_date")}>
          <Input id="planned_completion_date" name="planned_completion_date" type="date" defaultValue={defaults.planned} />
        </Field>
        <Field label="Werkelijke oplevering" htmlFor="actual_completion_date" error={errors("actual_completion_date")}>
          <Input id="actual_completion_date" name="actual_completion_date" type="date" />
        </Field>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <h2 className="text-base font-semibold text-ink-950 sm:col-span-2">Herstelwerk</h2>
        <Field label="Was er herstelwerk nodig na oplevering?" htmlFor="rework_required" error={errors("rework_required")}>
          <Select id="rework_required" name="rework_required" defaultValue="onbekend">
            <option value="nee">Nee</option>
            <option value="ja">Ja</option>
            <option value="onbekend">Weet ik (nog) niet</option>
          </Select>
        </Field>
        <Field label="Omschrijving herstelwerk" htmlFor="rework_description" error={errors("rework_description")}>
          <Input id="rework_description" name="rework_description" />
        </Field>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-ink-950">Beoordeling</h2>
        <RatingField name="rating" label="Algemene beoordeling" required error={errors("rating")} />
        <div className="grid gap-4 sm:grid-cols-3">
          <RatingField name="quality_rating" label="Kwaliteit van het werk" error={errors("quality_rating")} />
          <RatingField name="communication_rating" label="Communicatie" error={errors("communication_rating")} />
          <RatingField name="reliability_rating" label="Nakomen van afspraken" error={errors("reliability_rating")} />
        </div>
        <Field label="Toelichting" htmlFor="review_text" required error={errors("review_text")} hint="Beschrijf feitelijk wat goed ging en wat niet. Minimaal 20 tekens.">
          <Textarea id="review_text" name="review_text" rows={5} />
        </Field>
        <Field label="Bewijsreferentie" htmlFor="evidence_reference" error={errors("evidence_reference")} hint="Optioneel: bijv. factuurnummer of opleverrapport. Beheer kan hiermee je projectgegevens controleren.">
          <Input id="evidence_reference" name="evidence_reference" />
        </Field>
      </section>

      <Notice tone="info" title="Wat gebeurt er hierna?">
        Je resultaat krijgt de status ‘in behandeling’ en ‘niet gecontroleerd’. Pas na beoordeling door beheer telt het mee in de statistieken. De aannemer kan reageren
        en onjuiste gegevens betwisten. Per aannemer kun je per project één resultaat registreren.
      </Notice>
      <div>
        <Checkbox name="truthful" label="Ik verklaar dat deze gegevens naar waarheid zijn ingevuld en betrekking hebben op een echt uitgevoerd project." />
        {errors("truthful") ? <p role="alert" className="mt-1 text-xs font-medium text-danger-700">{errors("truthful")![0]}</p> : null}
      </div>
      <div className="flex justify-between gap-2 border-t border-ink-100 pt-5">
        <Button asChild variant="ghost">
          <Link href={`/projecten/${projectId}`}>Annuleren</Link>
        </Button>
        <SubmitButton pending={pending}>Resultaat registreren</SubmitButton>
      </div>
    </form>
  );
}
