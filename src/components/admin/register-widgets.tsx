"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { useServerForm } from "@/lib/forms/use-server-form";
import { respondToSignalAction, reviewSignalAction, runRegisterCheckAction } from "@/actions/registers";
import type { SignalEffect } from "@/lib/domain/registers";

/** Start een registercontrole. Duurt doorgaans 30–120 seconden (de agent zoekt in meerdere registers). */
export function RunRegisterCheckButton({ contractorId, name, disabledReason }: { contractorId: string; name: string; disabledReason?: string | null }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  if (disabledReason) return <span className="text-xs text-ink-500">{disabledReason}</span>;
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      aria-label={`Registercontrole ${name}`}
      onClick={() =>
        start(async () => {
          const res = await runRegisterCheckAction(contractorId);
          if (res.ok) {
            toast.success(res.message ?? "Controle voltooid.");
            router.refresh();
          } else toast.error(res.message ?? "Controle mislukt.");
        })
      }
    >
      <Landmark aria-hidden /> {pending ? "Bezig met controleren…" : "Registers controleren"}
    </Button>
  );
}

/**
 * Beoordeling van een voorgesteld (of eerder goedgekeurd) signaal. Het effect "uitsluiting" kan alleen
 * worden gekozen als het beleid dat toestaat (juridisch feit, gekoppeld op KvK-nummer).
 */
export function SignalReviewForm({ signalId, policyEffect, current }: { signalId: string; policyEffect: SignalEffect; current: "voorgesteld" | "goedgekeurd" }) {
  const router = useRouter();
  const action = React.useCallback((fd: FormData) => reviewSignalAction(signalId, fd), [signalId]);
  const { pending, onSubmit, errors } = useServerForm(action, { onSuccess: () => router.refresh() });
  const idp = `sig-${signalId.slice(0, 8)}`;
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2" noValidate>
      <Field label="Besluit" htmlFor={`${idp}-decision`} required error={errors("decision")}>
        <Select id={`${idp}-decision`} name="decision" defaultValue={current === "voorgesteld" ? "goedgekeurd" : "ingetrokken"}>
          {current === "voorgesteld" ? (
            <>
              <option value="goedgekeurd">Goedkeuren</option>
              <option value="afgewezen">Afwijzen</option>
            </>
          ) : (
            <option value="ingetrokken">Intrekken</option>
          )}
        </Select>
      </Field>
      <Field
        label="Gevolg"
        htmlFor={`${idp}-effect`}
        required
        error={errors("effect")}
        hint={policyEffect === "uitsluiting" ? "Beleid staat uitsluiting toe (juridisch feit op KvK-nummer)." : "Beleid staat alleen een waarschuwing toe."}
      >
        <Select id={`${idp}-effect`} name="effect" defaultValue={policyEffect}>
          {policyEffect === "uitsluiting" ? <option value="uitsluiting">Uitsluiten van teamvoorstellen</option> : null}
          <option value="waarschuwing">Alleen waarschuwen</option>
        </Select>
      </Field>
      <Field label="Notitie (verplicht bij afwijzen)" htmlFor={`${idp}-note`} error={errors("note")} className="sm:col-span-2">
        <Textarea id={`${idp}-note`} name="note" rows={2} placeholder="Bijv. ‘Bron gecontroleerd: zelfde KvK-nummer’ of ‘Andere onderneming met dezelfde naam’." />
      </Field>
      <div className="sm:col-span-2">
        <SubmitButton pending={pending} size="sm">
          Besluit vastleggen
        </SubmitButton>
      </div>
    </form>
  );
}

/** Reactie van de uitvoerder op een goedgekeurd signaal (portaal). */
export function SignalResponseForm({ signalId, existing }: { signalId: string; existing: string | null }) {
  const router = useRouter();
  const action = React.useCallback((fd: FormData) => respondToSignalAction(signalId, fd), [signalId]);
  const { pending, onSubmit, errors } = useServerForm(action, { onSuccess: () => router.refresh() });
  const id = `sr-${signalId.slice(0, 8)}`;
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2" noValidate>
      <Field label="Je reactie (openbaar, bij het signaal)" htmlFor={id} required error={errors("response")}>
        <Textarea id={id} name="response" rows={3} defaultValue={existing ?? ""} placeholder="Bijv. ‘Het faillissement betrof een eerdere bv; deze onderneming staat los daarvan.’" />
      </Field>
      <div>
        <SubmitButton pending={pending} size="sm" variant="outline">
          {existing ? "Reactie bijwerken" : "Reactie plaatsen"}
        </SubmitButton>
      </div>
    </form>
  );
}
