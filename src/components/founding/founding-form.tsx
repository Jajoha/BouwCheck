"use client";

import { Checkbox, Field, Input, Select } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { reserveFoundingMemberAction } from "@/actions/founding";
import { useServerForm } from "@/lib/forms/use-server-form";

export function FoundingForm({ regions, name = "", email = "" }: { regions: { regio: string; vrij: number }[]; name?: string; email?: string }) {
  const { pending, onSubmit, errors } = useServerForm(reserveFoundingMemberAction);
  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Naam" htmlFor="fm-naam" required error={errors("naam")}>
        <Input id="fm-naam" name="naam" defaultValue={name} autoComplete="name" />
      </Field>
      <Field label="E-mailadres" htmlFor="fm-email" required error={errors("email")}>
        <Input id="fm-email" name="email" type="email" defaultValue={email} autoComplete="email" />
      </Field>
      <Field label="Regio" htmlFor="fm-regio" required error={errors("regio")}>
        <Select id="fm-regio" name="regio" defaultValue="">
          <option value="">Kies je regio</option>
          {regions.map((r) => (
            <option key={r.regio} value={r.regio}>
              {r.regio} {r.vrij === 0 ? "(vol — wachtlijst)" : `(${r.vrij} vrij)`}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Projecten per jaar" htmlFor="fm-projecten" required error={errors("projecten_per_jaar")}>
        <Input id="fm-projecten" name="projecten_per_jaar" inputMode="numeric" placeholder="Bijv. 3" />
      </Field>
      <div className="sm:col-span-2">
        <Checkbox name="consent" label="Ik geef BouwCheck toestemming om contact met mij op te nemen over het founding-member-aanbod." />
        {errors("consent") ? <p role="alert" className="mt-1 text-xs font-medium text-danger-700">{errors("consent")![0]}</p> : null}
      </div>
      <div className="sm:col-span-2">
        <SubmitButton pending={pending} pendingText="Versturen…" size="lg">
          Plek aanvragen
        </SubmitButton>
        <p className="mt-2 text-xs text-ink-500">Vrijblijvend: er wordt geen betaling gestart. We nemen contact op vóór de volgende instroom.</p>
      </div>
    </form>
  );
}
