"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { useServerForm } from "@/lib/forms/use-server-form";
import { deleteCaseAction, saveCaseAction, setCasePublishedAction, setRegionSeatsAction, setReservationStatusAction } from "@/actions/founding";
import type { ActionResult } from "@/lib/forms/types";

function useRun() {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const res = await fn();
      if (res.ok) toast.success(res.message ?? "Gelukt.");
      else toast.error(res.message ?? "Mislukt.");
      router.refresh();
    });
  return { pending, run };
}

export function ReservationStatusSelect({ id, status }: { id: string; status: string }) {
  const { pending, run } = useRun();
  return (
    <Select aria-label="Status" defaultValue={status} disabled={pending} onChange={(e) => run(() => setReservationStatusAction(id, e.target.value))} className="h-8 w-40 text-xs">
      <option value="interesse">Interesse</option>
      <option value="gereserveerd">Gereserveerd</option>
      <option value="terugbetaald">Terugbetaald</option>
      <option value="geannuleerd">Geannuleerd</option>
    </Select>
  );
}

export function RegionSeatsInput({ regio, plekken }: { regio: string; plekken: number }) {
  const { pending, run } = useRun();
  const [value, setValue] = React.useState(String(plekken));
  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => setRegionSeatsAction(regio, Number(value)));
      }}
    >
      <Input aria-label={`Plekken ${regio}`} value={value} onChange={(e) => setValue(e.target.value)} inputMode="numeric" className="h-8 w-16 text-xs" />
      <Button type="submit" size="sm" variant="outline" disabled={pending || value === String(plekken)}>
        Opslaan
      </Button>
    </form>
  );
}

export function CaseForm() {
  const router = useRouter();
  const { pending, onSubmit, errors } = useServerForm(saveCaseAction, { onSuccess: () => router.refresh(), resetOnSuccess: true });
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2" noValidate>
      <Field label="Titel" htmlFor="case-titel" required error={errors("titel")}>
        <Input id="case-titel" name="titel" />
      </Field>
      <Field label="Regio" htmlFor="case-regio" error={errors("regio")}>
        <Input id="case-regio" name="regio" />
      </Field>
      <Field label="Samenvatting" htmlFor="case-samenvatting" required error={errors("samenvatting")} className="sm:col-span-2">
        <Textarea id="case-samenvatting" name="samenvatting" rows={3} />
      </Field>
      <Field label="Resultaat (kort)" htmlFor="case-resultaat" error={errors("resultaat")} hint="Bijv. € 4.800 meerwerk voorkomen" className="sm:col-span-2">
        <Input id="case-resultaat" name="resultaat" />
      </Field>
      <div>
        <SubmitButton pending={pending}>Case toevoegen</SubmitButton>
      </div>
    </form>
  );
}

export function CaseControls({ id, published }: { id: string; published: boolean }) {
  const { pending, run } = useRun();
  return (
    <div className="flex gap-1.5">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setCasePublishedAction(id, !published))}>
        {published ? "Verbergen" : "Publiceren"}
      </Button>
      <ConfirmDialog
        trigger={
          <Button size="sm" variant="danger-outline" disabled={pending}>
            Verwijderen
          </Button>
        }
        title="Case verwijderen?"
        description="De case verdwijnt definitief."
        confirmLabel="Verwijderen"
        onConfirm={() => run(() => deleteCaseAction(id))}
      />
    </div>
  );
}
