"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Fieldset, Input, Select, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useServerForm } from "@/lib/forms/use-server-form";
import {
  addRateAction,
  addReferenceAction,
  deleteRateAction,
  deleteReferenceAction,
  requestVerificationAction,
  respondToQuoteRequestAction,
  respondToReviewAction,
} from "@/actions/portal";
import { PROPERTY_TYPES, RATE_UNITS, RENOVATION_TYPES, SPECIALTIES } from "@/lib/domain/constants";
import type { ActionResult } from "@/lib/forms/types";

function useRefreshForm(action: (fd: FormData) => Promise<ActionResult>, reset = true) {
  const router = useRouter();
  return useServerForm(action, { resetOnSuccess: reset, onSuccess: () => router.refresh() });
}

export function RateForm({ specialties }: { specialties: string[] }) {
  const { pending, onSubmit, errors } = useRefreshForm(addRateAction);
  const options = SPECIALTIES.filter((s) => specialties.includes(s.id));
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-6" noValidate>
      <Field label="Vakgebied" htmlFor="r-spec" required error={errors("specialty_id")} className="sm:col-span-2">
        <Select id="r-spec" name="specialty_id" defaultValue={options[0]?.id}>
          {options.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Werkzaamheid" htmlFor="r-desc" required error={errors("description")} className="sm:col-span-4">
        <Input id="r-desc" name="description" placeholder="Bijv. binnenschilderwerk wanden" />
      </Field>
      <Field label="Min. (€)" htmlFor="r-min" required error={errors("price_min")}>
        <Input id="r-min" name="price_min" inputMode="decimal" />
      </Field>
      <Field label="Max. (€)" htmlFor="r-max" required error={errors("price_max")}>
        <Input id="r-max" name="price_max" inputMode="decimal" />
      </Field>
      <Field label="Eenheid" htmlFor="r-unit" required error={errors("unit")} className="sm:col-span-2">
        <Select id="r-unit" name="unit" defaultValue="m2">
          {Object.entries(RATE_UNITS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Materiaal" htmlFor="r-mat" error={errors("materials_included")} className="sm:col-span-2">
        <Select id="r-mat" name="materials_included" defaultValue="onbekend">
          <option value="ja">Inbegrepen</option>
          <option value="nee">Niet inbegrepen</option>
          <option value="onbekend">Niet opgegeven</option>
        </Select>
      </Field>
      <Checkbox name="vat_included" label="Bedragen zijn inclusief btw" className="sm:col-span-4" />
      <div className="sm:col-span-2 sm:text-right">
        <SubmitButton pending={pending} variant="outline">
          Tarief toevoegen
        </SubmitButton>
      </div>
    </form>
  );
}

export function ReferenceForm() {
  const { pending, onSubmit, errors } = useRefreshForm(addReferenceAction);
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2" noValidate>
      <Field label="Titel" htmlFor="ref-title" required error={errors("title")}>
        <Input id="ref-title" name="title" />
      </Field>
      <Field label="Plaats" htmlFor="ref-city" error={errors("city")}>
        <Input id="ref-city" name="city" />
      </Field>
      <Field label="Type woning" htmlFor="ref-prop" error={errors("property_type")}>
        <Select id="ref-prop" name="property_type" defaultValue="">
          <option value="">—</option>
          {PROPERTY_TYPES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </Select>
      </Field>
      <Field label="Type renovatie" htmlFor="ref-ren" error={errors("renovation_type")}>
        <Select id="ref-ren" name="renovation_type" defaultValue="">
          <option value="">—</option>
          {RENOVATION_TYPES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </Select>
      </Field>
      <Field label="Jaar" htmlFor="ref-year" error={errors("year")}>
        <Input id="ref-year" name="year" inputMode="numeric" />
      </Field>
      <Fieldset legend="Uitgevoerde werkzaamheden" error={errors("work_items")}>
        <div className="grid grid-cols-2 gap-1.5">
          {SPECIALTIES.slice(0, 13).map((s) => (
            <Checkbox key={s.id} name="work_items[]" value={s.id} label={s.name} />
          ))}
        </div>
      </Fieldset>
      <Field label="Omschrijving" htmlFor="ref-desc" required error={errors("description")} className="sm:col-span-2">
        <Textarea id="ref-desc" name="description" rows={3} />
      </Field>
      <div>
        <SubmitButton pending={pending} variant="outline">
          Referentie toevoegen
        </SubmitButton>
      </div>
    </form>
  );
}

export function DeleteButton({ kind, id, label }: { kind: "rate" | "reference"; id: string; label: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon" aria-label={`${label} verwijderen`}>
          <Trash2 />
        </Button>
      }
      title="Verwijderen?"
      description={`‘${label}’ wordt verwijderd van je profiel.`}
      confirmLabel="Verwijderen"
      onConfirm={async () => {
        const res = kind === "rate" ? await deleteRateAction(id) : await deleteReferenceAction(id);
        if (res.ok) {
          toast.success(res.message);
          router.refresh();
        } else toast.error(res.message);
      }}
    />
  );
}

export function VerificationRequestForm({ defaultEvidence }: { defaultEvidence: string }) {
  const { pending, onSubmit, errors } = useRefreshForm(requestVerificationAction, false);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <Field label="Bewijsreferentie" htmlFor="v-evidence" required error={errors("evidence_reference")} hint="Bijv. ‘KvK-nummer 12345678, uittreksel volgt per e-mail’.">
        <Input id="v-evidence" name="evidence_reference" defaultValue={defaultEvidence} />
      </Field>
      <div>
        <SubmitButton pending={pending}>Verificatie aanvragen</SubmitButton>
      </div>
    </form>
  );
}

export function RespondToRequestForm({ requestId }: { requestId: string }) {
  const { pending, onSubmit, errors } = useRefreshForm(respondToQuoteRequestAction);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2" noValidate>
      <input type="hidden" name="request_id" value={requestId} />
      <Field label="Reactie aan opdrachtgever" htmlFor={`resp-${requestId}`} required error={errors("response")}>
        <Textarea id={`resp-${requestId}`} name="response" rows={3} placeholder="Bijv. voorstel voor bezichtiging en verwachte termijn voor offerte" />
      </Field>
      <div>
        <SubmitButton pending={pending} size="sm">
          Reactie versturen
        </SubmitButton>
      </div>
    </form>
  );
}

export function RespondToReviewForm({ reviewId }: { reviewId: string }) {
  const { pending, onSubmit, errors } = useRefreshForm(respondToReviewAction);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2" noValidate>
      <input type="hidden" name="review_id" value={reviewId} />
      <Field label="Je reactie (openbaar)" htmlFor={`rr-${reviewId}`} required error={errors("response")}>
        <Textarea id={`rr-${reviewId}`} name="response" rows={2} />
      </Field>
      <div>
        <SubmitButton pending={pending} size="sm" variant="outline">
          Reactie plaatsen
        </SubmitButton>
      </div>
    </form>
  );
}
