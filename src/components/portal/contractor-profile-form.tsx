"use client";

import { Checkbox, Field, Fieldset, Input, Select, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { Notice } from "@/components/ui/misc";
import { useServerForm } from "@/lib/forms/use-server-form";
import { AVAILABILITY, PRICE_LEVELS, PROVIDER_TYPES, PROVINCES, RENOVATION_TYPES, SPECIALTIES } from "@/lib/domain/constants";
import type { ActionResult } from "@/lib/forms/types";

export type { ContractorProfileValues } from "./profile-defaults";
import type { ContractorProfileValues } from "./profile-defaults";

export function ContractorProfileForm({ action, initial, submitLabel, showStatus }: { action: (fd: FormData) => Promise<ActionResult>; initial: ContractorProfileValues; submitLabel: string; showStatus?: boolean }) {
  const { pending, onSubmit, errors, result } = useServerForm(action);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      {result && !result.ok && result.message ? <Notice tone="danger">{result.message}</Notice> : null}
      <Fieldset legend="Wat voor vakman ben je?" error={errors("provider_type")}>
        <div className="grid gap-2 sm:grid-cols-3">
          {Object.entries(PROVIDER_TYPES).map(([id, t]) => (
            <label key={id} className="flex cursor-pointer gap-2 rounded-lg border border-ink-200 p-3 text-sm has-[:checked]:border-ink-900 has-[:checked]:bg-ink-50">
              <input type="radio" name="provider_type" value={id} defaultChecked={(initial.provider_type || "bedrijf") === id} className="mt-0.5" />
              <span>
                <span className="font-medium text-ink-950">{t.label}</span>
                <span className="mt-0.5 block text-xs text-ink-600">{t.description}</span>
              </span>
            </label>
          ))}
        </div>
      </Fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Bedrijfs- of handelsnaam" htmlFor="company_name" required error={errors("company_name")}>
          <Input id="company_name" name="company_name" defaultValue={initial.company_name} />
        </Field>
        <Field label="KvK-nummer" htmlFor="kvk_number" error={errors("kvk_number")} hint="8 cijfers. Ook zzp'ers en klussers hebben er een. Nodig voor verificatie en voor de controle in openbare registers.">
          <Input id="kvk_number" name="kvk_number" defaultValue={initial.kvk_number} inputMode="numeric" />
        </Field>
        <Field label="Omschrijving" htmlFor="description" required error={errors("description")} className="sm:col-span-2">
          <Textarea id="description" name="description" rows={4} defaultValue={initial.description} />
        </Field>
        <Field label="Vestigingsplaats" htmlFor="city" required error={errors("city")}>
          <Input id="city" name="city" defaultValue={initial.city} />
        </Field>
        <Field label="Provincie vestiging" htmlFor="hq_province" required error={errors("hq_province")}>
          <Select id="hq_province" name="hq_province" defaultValue={initial.hq_province}>
            <option value="">Kies provincie</option>
            {PROVINCES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </Field>
        <Field label="Zakelijk e-mailadres" htmlFor="email" error={errors("email")}>
          <Input id="email" name="email" type="email" defaultValue={initial.email} />
        </Field>
        <Field label="Telefoon" htmlFor="phone" error={errors("phone")}>
          <Input id="phone" name="phone" type="tel" defaultValue={initial.phone} />
        </Field>
        <Field label="Website" htmlFor="website" error={errors("website")}>
          <Input id="website" name="website" type="url" defaultValue={initial.website} placeholder="https://" />
        </Field>
        <Field label="Teamgrootte" htmlFor="team_size" error={errors("team_size")}>
          <Input id="team_size" name="team_size" inputMode="numeric" defaultValue={initial.team_size} />
        </Field>
        <Field label="Oprichtingsjaar" htmlFor="founded_year" error={errors("founded_year")}>
          <Input id="founded_year" name="founded_year" inputMode="numeric" defaultValue={initial.founded_year} />
        </Field>
      </div>
      <Fieldset legend="Specialisaties" error={errors("specialty_ids")}>
        <div className="grid gap-2 sm:grid-cols-3">
          {SPECIALTIES.map((s) => (
            <Checkbox key={s.id} name="specialty_ids[]" value={s.id} label={s.name} defaultChecked={initial.specialty_ids.includes(s.id)} />
          ))}
        </div>
      </Fieldset>
      <Field label="Hoofdspecialisatie" htmlFor="primary_specialty" error={errors("primary_specialty")}>
        <Select id="primary_specialty" name="primary_specialty" defaultValue={initial.primary_specialty}>
          <option value="">Eerste aangevinkte specialisatie</option>
          {SPECIALTIES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>
      <Fieldset legend="Werkgebied (provincies)" error={errors("areas")}>
        <div className="grid gap-2 sm:grid-cols-4">
          {PROVINCES.map((p) => (
            <Checkbox key={p} name="areas[]" value={p} label={p} defaultChecked={initial.areas.includes(p)} />
          ))}
        </div>
      </Fieldset>
      <Fieldset legend="Type projecten" error={errors("project_types")}>
        <div className="grid gap-2 sm:grid-cols-3">
          {RENOVATION_TYPES.map((t) => (
            <Checkbox key={t} name="project_types[]" value={t} label={t} defaultChecked={initial.project_types.includes(t)} />
          ))}
        </div>
      </Fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Indicatief prijsniveau" htmlFor="price_level" required error={errors("price_level")}>
          <Select id="price_level" name="price_level" defaultValue={initial.price_level}>
            {Object.entries(PRICE_LEVELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Beschikbaarheid" htmlFor="availability_status" required error={errors("availability_status")}>
          <Select id="availability_status" name="availability_status" defaultValue={initial.availability_status}>
            {Object.entries(AVAILABILITY).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Beschikbaar vanaf" htmlFor="available_from" error={errors("available_from")}>
          <Input id="available_from" name="available_from" type="date" defaultValue={initial.available_from} />
        </Field>
      </div>
      {showStatus ? (
        <Field label="Profielstatus" htmlFor="status" required>
          <Select id="status" name="status" defaultValue={initial.status ?? "in_beoordeling"}>
            <option value="in_beoordeling">In beoordeling (niet openbaar)</option>
            <option value="actief">Actief (openbaar)</option>
            <option value="gedeactiveerd">Gedeactiveerd</option>
          </Select>
        </Field>
      ) : null}
      <div>
        <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
