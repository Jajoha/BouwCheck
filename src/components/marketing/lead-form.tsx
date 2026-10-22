"use client";

import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { submitLeadAction } from "@/actions/engagement";
import { useServerForm } from "@/lib/forms/use-server-form";
import { LEAD_TYPES, PRICING_LEAD_TYPES, type LeadType } from "@/lib/domain/constants";

export function LeadForm({
  type,
  types = PRICING_LEAD_TYPES,
  name = "",
  email = "",
  submitLabel = "Versturen",
  messagePlaceholder,
}: {
  type: string;
  types?: LeadType[];
  name?: string;
  email?: string;
  submitLabel?: string;
  messagePlaceholder?: string;
}) {
  const { pending, onSubmit, errors } = useServerForm(submitLeadAction);
  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Onderwerp" htmlFor="lead_type" required error={errors("lead_type")} className="sm:col-span-2">
        <Select id="lead_type" name="lead_type" defaultValue={type}>
          {types.map((k) => (
            <option key={k} value={k}>
              {LEAD_TYPES[k]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Naam" htmlFor="lead-name" required error={errors("name")}>
        <Input id="lead-name" name="name" defaultValue={name} autoComplete="name" />
      </Field>
      <Field label="E-mailadres" htmlFor="lead-email" required error={errors("email")}>
        <Input id="lead-email" name="email" type="email" defaultValue={email} autoComplete="email" />
      </Field>
      <Field label="Bedrijf" htmlFor="lead-company" error={errors("company")}>
        <Input id="lead-company" name="company" autoComplete="organization" />
      </Field>
      <Field label="Telefoon" htmlFor="lead-phone" error={errors("phone")}>
        <Input id="lead-phone" name="phone" type="tel" autoComplete="tel" />
      </Field>
      <Field label="Bericht" htmlFor="lead-message" error={errors("message")} className="sm:col-span-2">
        <Textarea id="lead-message" name="message" rows={4} placeholder={messagePlaceholder ?? "Bijvoorbeeld: hoeveel verbouwingen per jaar, en in welke regio"} />
      </Field>
      <div className="sm:col-span-2">
        <Checkbox name="consent" label="BouwCheck mag contact met mij opnemen over deze aanvraag." />
        {errors("consent") ? <p role="alert" className="mt-1 text-xs font-medium text-danger-700">{errors("consent")![0]}</p> : null}
      </div>
      <div className="sm:col-span-2">
        <SubmitButton pending={pending} pendingText="Versturen…">
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
