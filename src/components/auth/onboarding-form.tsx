"use client";

import { Checkbox, Field, Fieldset, Input, Radio, Select } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { onboardingAction } from "@/actions/auth";
import { useServerForm } from "@/lib/forms/use-server-form";
import { PROVINCES, RENOVATION_TYPES } from "@/lib/domain/constants";

export function OnboardingForm({ defaults }: { defaults: { name: string; company: string; role: string; region: string; types: string[]; isAdmin: boolean; next?: string } }) {
  const { pending, onSubmit, errors } = useServerForm(onboardingAction);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {defaults.next ? <input type="hidden" name="next" value={defaults.next} /> : null}
      <Field label="Naam" htmlFor="name" required error={errors("name")}>
        <Input id="name" name="name" defaultValue={defaults.name} autoComplete="name" />
      </Field>
      <Field label="Bedrijfsnaam" htmlFor="company_name" error={errors("company_name")} hint="Indien van toepassing, bijv. je holding of bv.">
        <Input id="company_name" name="company_name" defaultValue={defaults.company} autoComplete="organization" />
      </Field>
      {defaults.isAdmin ? (
        <input type="hidden" name="role" value="flipper" />
      ) : (
        <Fieldset legend="Ik ben…" error={errors("role")}>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              ["flipper", "Vastgoedflipper"],
              ["investeerder", "Vastgoedinvesteerder"],
              ["aannemer", "Aannemer, zzp'er of klusser"],
            ].map(([v, l]) => (
              <Radio key={v} name="role" value={v} label={l} defaultChecked={defaults.role === v} className="rounded-lg border border-ink-200 px-3 py-2.5 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50" />
            ))}
          </div>
        </Fieldset>
      )}
      <Field label="Werkgebied of voorkeursregio" htmlFor="region" error={errors("region")}>
        <Select id="region" name="region" defaultValue={defaults.region}>
          <option value="">Geen voorkeur</option>
          {PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </Field>
      <Fieldset legend="Type renovatieprojecten" description="Kies wat op jou van toepassing is." error={errors("project_types")}>
        <div className="grid gap-2 sm:grid-cols-2">
          {RENOVATION_TYPES.map((t) => (
            <Checkbox key={t} name="project_types[]" value={t} label={t} defaultChecked={defaults.types.includes(t)} />
          ))}
        </div>
      </Fieldset>
      <SubmitButton pending={pending} className="w-full">
        Opslaan en doorgaan
      </SubmitButton>
    </form>
  );
}
