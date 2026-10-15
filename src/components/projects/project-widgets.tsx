"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Fieldset, Input, Select, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useServerForm } from "@/lib/forms/use-server-form";
import {
  deleteAttachmentAction,
  deleteProjectAction,
  removeFromShortlistAction,
  saveProjectNotesAction,
  setProjectStatusAction,
  updateShortlistStatusAction,
  uploadAttachmentAction,
} from "@/actions/projects";
import { addQuoteAction, deleteQuoteAction } from "@/actions/quotes";
import { ATTACHMENT_KINDS, PRICE_TYPES, PROJECT_CONTRACTOR_STATUS, PROJECT_STATUS, SPECIALTIES } from "@/lib/domain/constants";
import type { ActionResult } from "@/lib/forms/types";

function useRun() {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const res = await fn();
      if (!res) return;
      if (res.ok) {
        if (res.message) toast.success(res.message);
        router.refresh();
      } else toast.error(res.message ?? "Er ging iets mis.");
    });
  return { pending, run };
}

export function ProjectStatusSelect({ projectId, status }: { projectId: string; status: string }) {
  const { pending, run } = useRun();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="project-status" className="text-sm text-ink-600">
        Status
      </label>
      <Select id="project-status" className="h-9 w-auto" defaultValue={status} disabled={pending} onChange={(e) => run(() => setProjectStatusAction(projectId, e.target.value))}>
        {Object.entries(PROJECT_STATUS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </Select>
    </div>
  );
}

export function DeleteProjectButton({ projectId, name }: { projectId: string; name: string }) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="danger-outline">
          <Trash2 aria-hidden /> Verwijderen
        </Button>
      }
      title="Project verwijderen?"
      description={
        <>
          <p>
            Je verwijdert <strong>{name}</strong> inclusief shortlist, offertes, offerteaanvragen, bijlagen en notities. Dit kan niet ongedaan worden gemaakt.
          </p>
          <p className="mt-2">Geregistreerde projectresultaten blijven bewaard (zonder koppeling aan dit project).</p>
        </>
      }
      confirmLabel="Definitief verwijderen"
      onConfirm={async () => {
        const res = await deleteProjectAction(projectId);
        if (res && !res.ok) toast.error(res.message);
      }}
    />
  );
}

export function ShortlistStatusSelect({ projectId, contractorId, status, name }: { projectId: string; contractorId: string; status: string; name: string }) {
  const { pending, run } = useRun();
  return (
    <Select aria-label={`Status ${name}`} className="h-8 w-auto text-xs" defaultValue={status} disabled={pending} onChange={(e) => run(() => updateShortlistStatusAction(projectId, contractorId, e.target.value))}>
      {Object.entries(PROJECT_CONTRACTOR_STATUS).map(([k, v]) => (
        <option key={k} value={k}>
          {v}
        </option>
      ))}
    </Select>
  );
}

export function RemoveFromShortlistButton({ projectId, contractorId, name }: { projectId: string; contractorId: string; name: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon" aria-label={`${name} verwijderen van shortlist`}>
          <Trash2 />
        </Button>
      }
      title="Van shortlist verwijderen?"
      description={`${name} wordt van de shortlist van dit project gehaald. Offertes en aanvragen blijven bewaard.`}
      confirmLabel="Verwijderen"
      onConfirm={async () => {
        const res = await removeFromShortlistAction(projectId, contractorId);
        if (res.ok) {
          toast.success(res.message);
          router.refresh();
        } else toast.error(res.message);
      }}
    />
  );
}

export function AddQuoteForm({ projectId, contractors, projectSpecialties }: { projectId: string; contractors: { id: string; name: string }[]; projectSpecialties: string[] }) {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  const { pending, onSubmit, errors } = useServerForm(addQuoteAction, {
    resetOnSuccess: true,
    onSuccess: () => router.refresh(),
  });
  if (contractors.length === 0) return <p className="text-sm text-ink-500">Zet eerst een aannemer op de shortlist.</p>;
  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <input type="hidden" name="project_id" value={projectId} />
      <Field label="Aannemer" htmlFor="q-contractor" required error={errors("contractor_id")}>
        <Select id="q-contractor" name="contractor_id" defaultValue="">
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
      <Field label="Soort bedrag" htmlFor="q-type" required error={errors("price_type")}>
        <Select id="q-type" name="price_type" defaultValue="offerte">
          {Object.entries(PRICE_TYPES).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Bedrag (€)" htmlFor="q-amount" required error={errors("amount")}>
        <Input id="q-amount" name="amount" inputMode="decimal" placeholder="Bijv. 71200" />
      </Field>
      <div className="flex flex-col justify-end gap-2 pb-1">
        <Checkbox name="vat_included" label="Bedrag is inclusief btw" />
      </div>
      <Field label="Materiaal inbegrepen" htmlFor="q-materials" error={errors("materials_included")}>
        <Select id="q-materials" name="materials_included" defaultValue="onbekend">
          <option value="ja">Ja</option>
          <option value="nee">Nee</option>
          <option value="onbekend">Onbekend</option>
        </Select>
      </Field>
      <Field label="Verwachte doorlooptijd (kalenderdagen)" htmlFor="q-days" error={errors("estimated_duration_days")}>
        <Input id="q-days" name="estimated_duration_days" inputMode="numeric" />
      </Field>
      <Field label="Vroegste startdatum" htmlFor="q-start" error={errors("earliest_start_date")}>
        <Input id="q-start" name="earliest_start_date" type="date" />
      </Field>
      <Field label="Geldig tot" htmlFor="q-valid" error={errors("validity_date")}>
        <Input id="q-valid" name="validity_date" type="date" />
      </Field>
      <Fieldset legend="Inbegrepen vakgebieden (scope)" error={errors("scope_specialty_ids")} className="sm:col-span-2">
        <div className="grid gap-2 sm:grid-cols-3">
          {SPECIALTIES.map((s) => (
            <Checkbox key={s.id} name="scope_specialty_ids[]" value={s.id} label={s.name} defaultChecked={projectSpecialties.includes(s.id)} />
          ))}
        </div>
      </Fieldset>
      <Field label="Omschrijving scope" htmlFor="q-scope" required error={errors("scope_description")} className="sm:col-span-2">
        <Input id="q-scope" name="scope_description" placeholder="Bijv. complete renovatie volgens projectomschrijving" />
      </Field>
      <Field label="Inbegrepen werkzaamheden" htmlFor="q-incl" error={errors("inclusions")}>
        <Textarea id="q-incl" name="inclusions" rows={2} />
      </Field>
      <Field label="Uitgesloten werkzaamheden" htmlFor="q-excl" error={errors("exclusions")}>
        <Textarea id="q-excl" name="exclusions" rows={2} placeholder="Bijv. afvoer op nacalculatie" />
      </Field>
      <div className="sm:col-span-2">
        <SubmitButton pending={pending}>Bedrag vastleggen</SubmitButton>
      </div>
    </form>
  );
}

export function DeleteQuoteButton({ quoteId, name }: { quoteId: string; name: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon" aria-label={`Offerte van ${name} verwijderen`}>
          <Trash2 />
        </Button>
      }
      title="Offerte verwijderen?"
      description={`Het vastgelegde bedrag van ${name} wordt verwijderd.`}
      confirmLabel="Verwijderen"
      onConfirm={async () => {
        const res = await deleteQuoteAction(quoteId);
        if (res.ok) {
          toast.success(res.message);
          router.refresh();
        } else toast.error(res.message);
      }}
    />
  );
}

export function AttachmentUpload({ projectId }: { projectId: string }) {
  const router = useRouter();
  const action = React.useCallback((fd: FormData) => uploadAttachmentAction(projectId, fd), [projectId]);
  const { pending, onSubmit, errors } = useServerForm(action, { resetOnSuccess: true, onSuccess: () => router.refresh() });
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-end" noValidate>
      <Field label="Type" htmlFor="att-kind" required error={errors("kind")}>
        <Select id="att-kind" name="kind" defaultValue="foto">
          {Object.entries(ATTACHMENT_KINDS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Bestand" htmlFor="att-file" required error={errors("file")} hint="JPG, PNG, WebP of PDF, max. 10 MB.">
        <Input id="att-file" name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="py-1.5" />
      </Field>
      <SubmitButton pending={pending} pendingText="Uploaden…" variant="outline" className="sm:mb-[22px]">
        <Upload aria-hidden /> Uploaden
      </SubmitButton>
    </form>
  );
}

export function DeleteAttachmentButton({ projectId, attachmentId, name }: { projectId: string; attachmentId: string; name: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon" aria-label={`${name} verwijderen`}>
          <Trash2 />
        </Button>
      }
      title="Bijlage verwijderen?"
      description={`${name} wordt permanent verwijderd.`}
      confirmLabel="Verwijderen"
      onConfirm={async () => {
        const res = await deleteAttachmentAction(projectId, attachmentId);
        if (res.ok) {
          toast.success(res.message);
          router.refresh();
        } else toast.error(res.message);
      }}
    />
  );
}

export function NotesForm({ projectId, notes }: { projectId: string; notes: string }) {
  const action = React.useCallback((fd: FormData) => saveProjectNotesAction(projectId, fd), [projectId]);
  const { pending, onSubmit, errors } = useServerForm(action);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <label htmlFor="notes" className="sr-only">
        Notities
      </label>
      <Textarea id="notes" name="notes" rows={5} defaultValue={notes} placeholder="Afwegingen, afspraken, aandachtspunten…" />
      {errors("notes") ? <p className="text-xs text-danger-700">{errors("notes")![0]}</p> : null}
      <div>
        <SubmitButton pending={pending} variant="outline" size="sm">
          Notities opslaan
        </SubmitButton>
      </div>
    </form>
  );
}
