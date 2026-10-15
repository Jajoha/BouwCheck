"use client";

import * as React from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { Flag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { submitFlagAction } from "@/actions/engagement";
import { useServerForm } from "@/lib/forms/use-server-form";
import { FLAG_REASONS } from "@/lib/domain/constants";

export function FlagDialog({
  entityType,
  entityId,
  loggedIn,
  label = "Meld onjuiste informatie",
  defaultReason = "onjuiste_gegevens",
}: {
  entityType: "aannemer" | "review" | "projectresultaat";
  entityId: string;
  loggedIn: boolean;
  label?: string;
  defaultReason?: keyof typeof FLAG_REASONS;
}) {
  const [open, setOpen] = React.useState(false);
  const { pending, onSubmit, errors } = useServerForm(submitFlagAction, { onSuccess: () => setOpen(false) });
  if (!loggedIn) {
    return (
      <Button asChild variant="ghost" size="sm">
        <Link href="/inloggen">
          <Flag aria-hidden /> {label}
        </Link>
      </Button>
    );
  }
  const id = `flag-${entityId.slice(0, 8)}`;
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="sm">
          <Flag aria-hidden /> {label}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink-950/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-ink-200 bg-white p-6 shadow-[var(--shadow-raised)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-base font-semibold text-ink-950">{label}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-ink-600">
                Beheer beoordeelt iedere melding. Betwiste projectresultaten tellen niet mee in statistieken totdat de melding is afgehandeld.
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded p-1 text-ink-500 hover:bg-ink-100" aria-label="Sluiten">
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4" noValidate>
            <input type="hidden" name="entity_type" value={entityType} />
            <input type="hidden" name="entity_id" value={entityId} />
            <Field label="Reden" htmlFor={`${id}-reason`} required error={errors("reason")}>
              <Select id={`${id}-reason`} name="reason" defaultValue={defaultReason}>
                {Object.entries(FLAG_REASONS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Toelichting" htmlFor={`${id}-details`} required error={errors("details")} hint="Wat klopt er niet? Verwijs indien mogelijk naar documentatie.">
              <Textarea id={`${id}-details`} name="details" rows={4} aria-invalid={Boolean(errors("details"))} />
            </Field>
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="outline" type="button">
                  Annuleren
                </Button>
              </Dialog.Close>
              <SubmitButton pending={pending} pendingText="Versturen…">
                Melding versturen
              </SubmitButton>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
