"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { useServerForm } from "@/lib/forms/use-server-form";
import {
  addVerificationAction,
  moderateOutcomeAction,
  moderateReviewAction,
  resetDemoDataAction,
  resolveFlagAction,
  revokeVerificationAction,
  reviewVerificationAction,
  saveInternalNotesAction,
  setContractorStatusAction,
  setLeadStatusAction,
  setUserActiveAction,
  setUserRoleAction,
} from "@/actions/admin";
import { FLAG_STATUS, OUTCOME_VERIFICATION, USER_ROLES } from "@/lib/domain/constants";
import type { ActionResult } from "@/lib/forms/types";

function useAction() {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const res = await fn();
      if (!res) return;
      if (res.ok) {
        if (res.message) toast.success(res.message);
        router.refresh();
      } else toast.error(res.message ?? "Mislukt.");
    });
  return { pending, run };
}

function useRefreshingForm(action: (fd: FormData) => Promise<ActionResult>) {
  const router = useRouter();
  return useServerForm(action, { onSuccess: () => router.refresh() });
}

export function ContractorStatusControl({ id, status, name }: { id: string; status: string; name: string }) {
  const { pending, run } = useAction();
  return (
    <div className="flex flex-wrap gap-1.5">
      {status !== "actief" ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setContractorStatusAction(id, "actief"))}>
          Activeren
        </Button>
      ) : null}
      {status !== "gedeactiveerd" ? (
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="danger-outline" disabled={pending}>
              Deactiveren
            </Button>
          }
          title={`${name} deactiveren?`}
          description="Het profiel verdwijnt uit de openbare profielen en uit nieuwe teamvoorstellen. Gegevens blijven bewaard en het profiel kan later opnieuw worden geactiveerd."
          confirmLabel="Deactiveren"
          onConfirm={async () => run(() => setContractorStatusAction(id, "gedeactiveerd"))}
        />
      ) : null}
    </div>
  );
}

export function VerificationDecisionForm({ id, evidence }: { id: string; evidence: string | null }) {
  const action = React.useCallback((fd: FormData) => reviewVerificationAction(id, fd), [id]);
  const { pending, onSubmit, errors } = useRefreshingForm(action);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2" noValidate>
      <Field label="Bewijsreferentie" htmlFor={`ev-${id}`} required error={errors("evidence_reference")} hint="Wat is gecontroleerd en wanneer? Bijv. ‘KvK-uittreksel 12-10-2026 gecontroleerd’.">
        <Input id={`ev-${id}`} name="evidence_reference" defaultValue={evidence ?? ""} />
      </Field>
      <Field label="Notitie" htmlFor={`no-${id}`} error={errors("notes")}>
        <Input id={`no-${id}`} name="notes" />
      </Field>
      <div className="flex gap-2">
        <SubmitButton pending={pending} size="sm" name="decision" value="goedgekeurd">
          Goedkeuren
        </SubmitButton>
        <SubmitButton pending={pending} size="sm" variant="danger-outline" name="decision" value="afgewezen">
          Afwijzen
        </SubmitButton>
      </div>
    </form>
  );
}

export function AddVerificationForm({ contractorId }: { contractorId: string }) {
  const action = React.useCallback((fd: FormData) => addVerificationAction(contractorId, fd), [contractorId]);
  const { pending, onSubmit, errors } = useRefreshingForm(action);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2" noValidate>
      <input type="hidden" name="verification_type" value="bedrijfsgegevens" />
      <Field label="Bewijsreferentie" htmlFor="add-ev" required error={errors("evidence_reference")}>
        <Input id="add-ev" name="evidence_reference" placeholder="Bijv. KvK-uittreksel d.d. …" />
      </Field>
      <Field label="Notitie" htmlFor="add-no" error={errors("notes")}>
        <Input id="add-no" name="notes" />
      </Field>
      <div>
        <SubmitButton pending={pending} size="sm">
          Bedrijfsgegevens als gecontroleerd vastleggen
        </SubmitButton>
      </div>
    </form>
  );
}

export function RevokeVerificationButton({ id }: { id: string }) {
  const { run } = useAction();
  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" variant="ghost">
          Intrekken
        </Button>
      }
      title="Verificatie intrekken?"
      description="De status ‘Bedrijfsgegevens gecontroleerd’ verdwijnt van het profiel. De actie wordt gelogd."
      confirmLabel="Intrekken"
      onConfirm={async () => run(() => revokeVerificationAction(id))}
    />
  );
}

export function OutcomeModerationForm({
  id,
  initial,
}: {
  id: string;
  initial: { moderation_status: string; verification_status: string; evidence_reference: string; initial_budget: string; final_cost: string; planned: string; actual: string };
}) {
  const action = React.useCallback((fd: FormData) => moderateOutcomeAction(id, fd), [id]);
  const { pending, onSubmit, errors } = useRefreshingForm(action);
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-4" noValidate>
      <Field label="Moderatie" htmlFor={`m-${id}`} required>
        <Select id={`m-${id}`} name="moderation_status" defaultValue={initial.moderation_status}>
          <option value="in_behandeling">In behandeling</option>
          <option value="goedgekeurd">Goedgekeurd (telt mee)</option>
          <option value="afgewezen">Afgewezen</option>
        </Select>
      </Field>
      <Field label="Verificatie" htmlFor={`v-${id}`} required>
        <Select id={`v-${id}`} name="verification_status" defaultValue={initial.verification_status}>
          {Object.entries(OUTCOME_VERIFICATION).map(([k, v]) => (
            <option key={k} value={k}>
              {v.short}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Bewijsreferentie" htmlFor={`e-${id}`} error={errors("evidence_reference")} className="sm:col-span-2">
        <Input id={`e-${id}`} name="evidence_reference" defaultValue={initial.evidence_reference} />
      </Field>
      <Field label="Begroot (€)" htmlFor={`ib-${id}`} error={errors("initial_budget")}>
        <Input id={`ib-${id}`} name="initial_budget" defaultValue={initial.initial_budget} inputMode="decimal" />
      </Field>
      <Field label="Definitief (€)" htmlFor={`fc-${id}`} error={errors("final_cost")}>
        <Input id={`fc-${id}`} name="final_cost" defaultValue={initial.final_cost} inputMode="decimal" />
      </Field>
      <Field label="Gepland opgeleverd" htmlFor={`pl-${id}`} error={errors("planned_completion_date")}>
        <Input id={`pl-${id}`} name="planned_completion_date" type="date" defaultValue={initial.planned} />
      </Field>
      <Field label="Werkelijk opgeleverd" htmlFor={`ac-${id}`} error={errors("actual_completion_date")}>
        <Input id={`ac-${id}`} name="actual_completion_date" type="date" defaultValue={initial.actual} />
      </Field>
      <Field label="Notitie (log)" htmlFor={`n-${id}`} className="sm:col-span-3">
        <Input id={`n-${id}`} name="note" placeholder="Bijv. eindfactuur gecontroleerd; bedrag gecorrigeerd" />
      </Field>
      <div className="flex items-end">
        <SubmitButton pending={pending} size="sm" className="w-full">
          Opslaan
        </SubmitButton>
      </div>
    </form>
  );
}

export function ReviewModerationButtons({ id, status, hasResponse }: { id: string; status: string; hasResponse: boolean }) {
  const { pending, run } = useAction();
  return (
    <div className="flex flex-wrap gap-1.5">
      {status !== "gepubliceerd" ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => moderateReviewAction(id, "gepubliceerd"))}>
          Review publiceren
        </Button>
      ) : null}
      {status !== "afgewezen" ? (
        <Button size="sm" variant="danger-outline" disabled={pending} onClick={() => run(() => moderateReviewAction(id, "afgewezen"))}>
          Review afwijzen
        </Button>
      ) : null}
      {hasResponse ? (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => moderateReviewAction(id, status, { removeResponse: true }))}>
          Reactie aannemer verwijderen
        </Button>
      ) : null}
    </div>
  );
}

export function FlagResolveForm({ id, status, resolution }: { id: string; status: string; resolution: string | null }) {
  const action = React.useCallback((fd: FormData) => resolveFlagAction(id, fd), [id]);
  const { pending, onSubmit, errors } = useRefreshingForm(action);
  return (
    <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-[180px_1fr_auto] sm:items-end" noValidate>
      <Field label="Status" htmlFor={`fs-${id}`} required>
        <Select id={`fs-${id}`} name="status" defaultValue={status}>
          {Object.entries(FLAG_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Afhandeling" htmlFor={`fr-${id}`} error={errors("resolution")}>
        <Input id={`fr-${id}`} name="resolution" defaultValue={resolution ?? ""} />
      </Field>
      <SubmitButton pending={pending} size="sm" className={errors("resolution") ? "sm:mb-[22px]" : ""}>
        Opslaan
      </SubmitButton>
    </form>
  );
}

export function UserRoleSelect({ id, role, disabled }: { id: string; role: string; disabled?: boolean }) {
  const { pending, run } = useAction();
  return (
    <Select aria-label="Rol" className="h-8 w-auto text-xs" defaultValue={role} disabled={pending || disabled} onChange={(e) => run(() => setUserRoleAction(id, e.target.value))}>
      {Object.entries(USER_ROLES).map(([k, v]) => (
        <option key={k} value={k}>
          {v}
        </option>
      ))}
    </Select>
  );
}

export function UserActiveToggle({ id, active, name, disabled }: { id: string; active: boolean; name: string; disabled?: boolean }) {
  const { pending, run } = useAction();
  if (active) {
    return (
      <ConfirmDialog
        trigger={
          <Button size="sm" variant="ghost" disabled={pending || disabled}>
            Blokkeren
          </Button>
        }
        title={`${name} blokkeren?`}
        description="De gebruiker wordt uitgelogd en kan niet meer inloggen. Gegevens blijven bewaard."
        confirmLabel="Blokkeren"
        onConfirm={async () => run(() => setUserActiveAction(id, false))}
      />
    );
  }
  return (
    <Button size="sm" variant="outline" disabled={pending || disabled} onClick={() => run(() => setUserActiveAction(id, true))}>
      Activeren
    </Button>
  );
}

export function LeadStatusSelect({ id, status }: { id: string; status: string }) {
  const { pending, run } = useAction();
  return (
    <Select aria-label="Status" className="h-8 w-auto text-xs" defaultValue={status} disabled={pending} onChange={(e) => run(() => setLeadStatusAction(id, e.target.value))}>
      <option value="nieuw">Nieuw</option>
      <option value="opgevolgd">Opgevolgd</option>
      <option value="gesloten">Gesloten</option>
    </Select>
  );
}

export function ResetDemoButton(props: ButtonProps) {
  return (
    <ConfirmDialog
      trigger={<Button variant="danger" {...props}>Demo-data terugzetten</Button>}
      title="Alle demo-data terugzetten?"
      description="ALLE gegevens in de lokale demo-database (ook nieuw aangemaakte accounts, projecten en uploads) worden verwijderd en vervangen door de standaard demo-data. Iedereen wordt uitgelogd."
      confirmLabel="Ja, terugzetten"
      onConfirm={async () => {
        const res = await resetDemoDataAction();
        if (res && !res.ok) toast.error(res.message);
      }}
    />
  );
}

export function InternalNotesForm({ contractorId, notes }: { contractorId: string; notes: string }) {
  const action = React.useCallback((fd: FormData) => saveInternalNotesAction(contractorId, fd), [contractorId]);
  const { pending, onSubmit } = useRefreshingForm(action);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2" noValidate>
      <label htmlFor="internal_notes" className="sr-only">
        Interne notities
      </label>
      <Textarea id="internal_notes" name="internal_notes" rows={4} defaultValue={notes} />
      <div>
        <SubmitButton pending={pending} size="sm" variant="outline">
          Notities opslaan
        </SubmitButton>
      </div>
    </form>
  );
}
