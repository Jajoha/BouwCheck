"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { Notice } from "@/components/ui/misc";
import { deleteQuoteRequestAction, sendQuoteRequestsAction, setQuoteRequestStatusAction, updateQuoteRequestDraftAction } from "@/actions/quotes";
import { useServerForm } from "@/lib/forms/use-server-form";

export function SendRequestsButton({ ids, label = "Verzenden", demoMode, anyWithoutAccount }: { ids: string[]; label?: string; demoMode: boolean; anyWithoutAccount: boolean }) {
  const router = useRouter();
  const [summary, setSummary] = React.useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <ConfirmDialog
        destructive={false}
        trigger={
          <Button>
            <Send aria-hidden /> {label}
          </Button>
        }
        title="Aanvraag verzenden?"
        description={
          <div className="space-y-2">
            <p>Aannemers met een BouwCheck-account zien de aanvraag direct in hun portaal.</p>
            {anyWithoutAccount ? (
              demoMode ? (
                <p className="text-demo-700">
                  Een of meer aannemers hebben geen account. In de demo-modus wordt hun aanvraag gemarkeerd als <strong>demo-verzending</strong>: er wordt níets extern
                  verstuurd.
                </p>
              ) : (
                <p className="text-warn-700">Een of meer aannemers hebben geen account en e-mail is niet geconfigureerd. Die aanvragen blijven ‘klaar om te verzenden’.</p>
              )
            ) : null}
          </div>
        }
        confirmLabel="Ja, verzenden"
        onConfirm={async () => {
          const res = await sendQuoteRequestsAction(ids);
          if (res.ok) {
            setSummary(res.message ?? null);
            toast.success(res.message ?? "Aanvragen verwerkt.", { duration: 10000 });
            router.refresh();
          } else toast.error(res.message);
        }}
      />
      {summary ? (
        <Notice tone="success" title="Resultaat">
          {summary} <Link href="/offerteaanvragen">Naar alle aanvragen</Link>
        </Notice>
      ) : null}
    </div>
  );
}

export function StatusButtons({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const set = (s: string) =>
    start(async () => {
      const res = await setQuoteRequestStatusAction(id, s);
      if (res.ok) {
        toast.success(res.message);
        router.refresh();
      } else toast.error(res.message);
    });
  const options: [string, string][] =
    status === "concept"
      ? [["klaar", "Markeer als klaar om te verzenden"]]
      : status === "klaar"
        ? [["concept", "Terug naar concept"]]
        : status === "verzonden"
          ? [["reactie", "Reactie ontvangen"], ["afgerond", "Afronden"]]
          : status === "reactie"
            ? [["afgerond", "Afronden"]]
            : [];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([s, l]) => (
        <Button key={s} variant="outline" size="sm" disabled={pending} onClick={() => set(s)}>
          {l}
        </Button>
      ))}
      {!["afgerond", "geannuleerd"].includes(status) ? (
        <ConfirmDialog
          trigger={
            <Button variant="danger-outline" size="sm" disabled={pending}>
              Annuleren
            </Button>
          }
          title="Aanvraag annuleren?"
          description="De aanvraag krijgt de status ‘Geannuleerd’. Een eventuele aannemer met portaaltoegang ziet deze status."
          confirmLabel="Aanvraag annuleren"
          onConfirm={async () => set("geannuleerd")}
        />
      ) : null}
    </div>
  );
}

export function DeleteRequestButton({ id }: { id: string }) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm">
          <Trash2 aria-hidden /> Verwijderen
        </Button>
      }
      title="Aanvraag verwijderen?"
      description="Deze aanvraag is nog niet verzonden en wordt permanent verwijderd."
      confirmLabel="Verwijderen"
      onConfirm={async () => {
        const res = await deleteQuoteRequestAction(id);
        if (res && !res.ok) toast.error(res.message);
      }}
    />
  );
}

export function DraftEditForm({ id, work, notes }: { id: string; work: string; notes: string }) {
  const router = useRouter();
  const action = React.useCallback((fd: FormData) => updateQuoteRequestDraftAction(id, fd), [id]);
  const { pending, onSubmit, errors } = useServerForm(action, { onSuccess: () => router.refresh() });
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <Field label="Gewenste werkzaamheden" htmlFor={`w-${id}`} required error={errors("work_description")}>
        <Textarea id={`w-${id}`} name="work_description" rows={5} defaultValue={work} />
      </Field>
      <Field label="Aanvullende toelichting" htmlFor={`n-${id}`} error={errors("additional_notes")}>
        <Textarea id={`n-${id}`} name="additional_notes" rows={3} defaultValue={notes} />
      </Field>
      <div>
        <SubmitButton pending={pending} variant="outline" size="sm">
          Concept opslaan
        </SubmitButton>
      </div>
    </form>
  );
}
