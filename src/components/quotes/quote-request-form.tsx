"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Fieldset, Input, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { Notice } from "@/components/ui/misc";
import { prepareQuoteRequestsAction } from "@/actions/quotes";
import { useServerForm } from "@/lib/forms/use-server-form";
import { SPECIALTIES } from "@/lib/domain/constants";

export type QuoteRequestDefaults = {
  projectId: string;
  contractors: { id: string; name: string; checked: boolean; note?: string }[];
  attachments: { id: string; name: string }[];
  work_description: string;
  specialty_ids: string[];
  budget: string;
  budget_vat_included: boolean;
  start: string;
  end: string;
  contact_name: string;
  contact_email: string;
};

export function QuoteRequestForm({ d }: { d: QuoteRequestDefaults }) {
  const { pending, onSubmit, errors, result } = useServerForm(prepareQuoteRequestsAction);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="project_id" value={d.projectId} />
      {result && !result.ok && result.message ? <Notice tone="danger">{result.message}</Notice> : null}
      <Fieldset legend="Aan welke aannemers?" description="Er wordt per aannemer een aparte aanvraag aangemaakt met dezelfde scope." error={errors("contractor_ids")}>
        {d.contractors.length === 0 ? (
          <p className="text-sm text-ink-500">
            Er is nog geen team gekozen voor dit project. <Link href={`/projecten/${d.projectId}/voorstellen`} className="text-brand-700 underline">Bekijk de teamvoorstellen</Link>.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {d.contractors.map((c) => (
              <Checkbox key={c.id} name="contractor_ids[]" value={c.id} label={c.name} description={c.note} defaultChecked={c.checked} />
            ))}
          </div>
        )}
      </Fieldset>
      <Field label="Gewenste werkzaamheden" htmlFor="work_description" required error={errors("work_description")} hint="Omschrijf de scope zo concreet mogelijk; zo worden offertes vergelijkbaar.">
        <Textarea id="work_description" name="work_description" rows={5} defaultValue={d.work_description} />
      </Field>
      <Fieldset legend="Vakgebieden in deze aanvraag" error={errors("specialty_ids")}>
        <div className="grid gap-2 sm:grid-cols-3">
          {SPECIALTIES.map((s) => (
            <Checkbox key={s.id} name="specialty_ids[]" value={s.id} label={s.name} defaultChecked={d.specialty_ids.includes(s.id)} />
          ))}
        </div>
      </Fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Budgetindicatie (€)" htmlFor="budget_indication" error={errors("budget_indication")} hint="Optioneel delen met de aannemer.">
          <Input id="budget_indication" name="budget_indication" inputMode="decimal" defaultValue={d.budget} />
        </Field>
        <Field label="Gewenste start" htmlFor="desired_start_date" error={errors("desired_start_date")}>
          <Input id="desired_start_date" name="desired_start_date" type="date" defaultValue={d.start} />
        </Field>
        <Field label="Gewenste oplevering" htmlFor="desired_completion_date" error={errors("desired_completion_date")}>
          <Input id="desired_completion_date" name="desired_completion_date" type="date" defaultValue={d.end} />
        </Field>
        <Checkbox name="budget_vat_included" label="Budget is inclusief btw" defaultChecked={d.budget_vat_included} className="sm:col-span-3" />
      </div>
      <Field label="Aanvullende toelichting" htmlFor="additional_notes" error={errors("additional_notes")}>
        <Textarea id="additional_notes" name="additional_notes" rows={3} placeholder="Bijv. bezichtiging mogelijk op werkdagen; graag uitsplitsing per onderdeel en stelposten." />
      </Field>
      {d.attachments.length ? (
        <Fieldset legend="Bijlagen meesturen" description="Alleen zichtbaar voor aannemers die de aanvraag via het BouwCheck-portaal ontvangen.">
          <div className="grid gap-2 sm:grid-cols-2">
            {d.attachments.map((a) => (
              <Checkbox key={a.id} name="attachment_ids[]" value={a.id} label={a.name} />
            ))}
          </div>
        </Fieldset>
      ) : (
        <p className="text-xs text-ink-500">Bijlagen (foto&apos;s, plattegronden) voeg je toe op de projectpagina; daarna kun je ze hier meesturen.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Contactpersoon" htmlFor="contact_name" required error={errors("contact_name")}>
          <Input id="contact_name" name="contact_name" defaultValue={d.contact_name} autoComplete="name" />
        </Field>
        <Field label="E-mailadres" htmlFor="contact_email" required error={errors("contact_email")}>
          <Input id="contact_email" name="contact_email" type="email" defaultValue={d.contact_email} autoComplete="email" />
        </Field>
        <Field label="Telefoon" htmlFor="contact_phone" error={errors("contact_phone")}>
          <Input id="contact_phone" name="contact_phone" type="tel" autoComplete="tel" />
        </Field>
      </div>
      <div className="flex flex-col-reverse justify-between gap-2 border-t border-ink-100 pt-5 sm:flex-row">
        <Button asChild variant="ghost">
          <Link href={`/projecten/${d.projectId}`}>Annuleren</Link>
        </Button>
        <SubmitButton pending={pending} pendingText="Opslaan…">
          Opslaan en controleren
        </SubmitButton>
      </div>
    </form>
  );
}
