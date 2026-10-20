"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, RefreshCw, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { useServerForm } from "@/lib/forms/use-server-form";
import { approveCheckAction, deleteCheckAction, deleteOwnCheckAction, rerunAnalysisAction, saveReportAction } from "@/actions/offertecheck";
import type { ActionResult } from "@/lib/forms/types";
import type { Report } from "@/lib/domain/offertecheck";

function isRedirect(err: unknown) {
  return Boolean(err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_"));
}

function useRun() {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      try {
        const res = await fn();
        if (!res) return;
        if (res.ok) toast.success(res.message ?? "Gelukt.");
        else toast.error(res.message ?? "Mislukt.");
        router.refresh();
      } catch (err) {
        if (isRedirect(err)) throw err;
        toast.error("Er ging iets mis.");
      }
    });
  return { pending, run };
}

export function DeleteOwnCheckButton({ token }: { token: string }) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="danger-outline" size="sm">
          <Trash2 aria-hidden /> Verwijder mijn check en bestanden
        </Button>
      }
      title="Check verwijderen?"
      description="Je offertes, dit rapport en je contactgegevens worden definitief verwijderd. Dit kan niet ongedaan worden gemaakt."
      confirmLabel="Definitief verwijderen"
      onConfirm={async () => {
        try {
          const res = await deleteOwnCheckAction(token);
          if (res && !res.ok) toast.error(res.message ?? "Verwijderen mislukt.");
        } catch (err) {
          if (isRedirect(err)) throw err;
          toast.error("Verwijderen mislukt.");
        }
      }}
    />
  );
}

export function CheckActions({ id, status, reportUrl }: { id: string; status: string; reportUrl: string | null }) {
  const { pending, run } = useRun();
  return (
    <div className="flex flex-wrap gap-2">
      {status === "ingediend" || status === "review" || status === "in_analyse" ? (
        <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => rerunAnalysisAction(id))}>
          <RefreshCw aria-hidden className={pending ? "animate-spin" : undefined} /> {status === "ingediend" ? "Analyse starten" : "Opnieuw analyseren"}
        </Button>
      ) : null}
      {status === "review" ? (
        <ConfirmDialog
          trigger={
            <Button size="sm" disabled={pending}>
              <Send aria-hidden /> Goedkeuren en versturen
            </Button>
          }
          title="Rapport goedkeuren en versturen?"
          description="De klant krijgt een link naar het rapport (per mail, als e-mail is geconfigureerd). Daarna is het rapport niet meer te bewerken."
          confirmLabel="Goedkeuren en versturen"
          destructive={false}
          onConfirm={() => run(() => approveCheckAction(id))}
        />
      ) : null}
      {reportUrl ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            navigator.clipboard?.writeText(reportUrl);
            toast.success("Rapportlink gekopieerd.");
          }}
        >
          <Copy aria-hidden /> Rapportlink kopiëren
        </Button>
      ) : null}
      {status !== "verwijderd" ? (
        <ConfirmDialog
          trigger={
            <Button variant="danger-outline" size="sm" disabled={pending}>
              <Trash2 aria-hidden /> Verwijderen
            </Button>
          }
          title="Check verwijderen?"
          description="Bestanden, regels, rapport en contactgegevens worden definitief verwijderd. Alleen een lege registratie blijft over voor de funnelcijfers."
          confirmLabel="Definitief verwijderen"
          onConfirm={() => run(() => deleteCheckAction(id))}
        />
      ) : null}
    </div>
  );
}

export function ReportEditForm({ id, report }: { id: string; report: Report }) {
  const router = useRouter();
  const { pending, onSubmit, errors } = useServerForm((fd: FormData) => saveReportAction(id, fd), { onSuccess: () => router.refresh() });
  const [advanced, setAdvanced] = React.useState(false);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field label="Samenvatting" htmlFor="r-samenvatting" required>
        <Textarea id="r-samenvatting" name="samenvatting" rows={3} defaultValue={report.samenvatting} />
      </Field>
      <Field label="Belangrijkste bevindingen (één per regel, max. 5)" htmlFor="r-bevindingen" hint="Komen bovenaan het rapport en in de mail." required>
        <Textarea id="r-bevindingen" name="bevindingen" rows={4} defaultValue={report.bevindingen.join("\n")} />
      </Field>
      <Field label="Vragen aan de aannemers (één per regel)" htmlFor="r-vragen" required>
        <Textarea id="r-vragen" name="open_vragen" rows={6} defaultValue={report.open_vragen.map((q) => q.vraag).join("\n")} />
      </Field>
      <div>
        <button type="button" className="text-xs font-medium text-ink-600 underline" onClick={() => setAdvanced((v) => !v)}>
          {advanced ? "Verberg" : "Toon"} volledig rapport (JSON) voor posten en bedragen
        </button>
        {advanced ? (
          <Field label="Rapport (JSON)" htmlFor="r-json" error={errors("rapport_json")} hint="Wijzig je dit veld, dan worden de velden hierboven genegeerd." className="mt-2">
            <Textarea id="r-json" name="rapport_json" rows={18} className="font-mono text-xs" defaultValue={JSON.stringify(report, null, 2)} />
          </Field>
        ) : null}
      </div>
      <div>
        <SubmitButton pending={pending} variant="outline">
          Rapport opslaan
        </SubmitButton>
      </div>
    </form>
  );
}
