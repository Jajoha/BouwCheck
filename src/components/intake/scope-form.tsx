"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/misc";
import { ScopeEditor, newScopeRow, serializeScope, validateScopeRows, type ScopeDraft } from "./scope-editor";
import { saveScopeAction } from "@/actions/intake";

export function ScopeForm({ projectId, initial }: { projectId: string; initial: Omit<ScopeDraft, "key">[] }) {
  const [rows, setRows] = React.useState<ScopeDraft[]>(() => (initial.length ? initial.map((r) => newScopeRow(r)) : [newScopeRow()]));
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  return (
    <div className="flex flex-col gap-5">
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <ScopeEditor rows={rows} onChange={setRows} />
      <div className="flex flex-col-reverse justify-between gap-2 border-t border-ink-100 pt-5 sm:flex-row">
        <Button asChild variant="ghost">
          <Link href={`/projecten/${projectId}`}>Annuleren</Link>
        </Button>
        <Button
          type="button"
          disabled={pending}
          onClick={() => {
            const problem = validateScopeRows(rows);
            if (problem) {
              setError(problem);
              return;
            }
            setError(null);
            start(async () => {
              const fd = new FormData();
              fd.set("scope", serializeScope(rows));
              try {
                const res = await saveScopeAction(projectId, fd);
                if (res && !res.ok) {
                  setError(res.message ?? "Opslaan mislukt.");
                  toast.error(res.message ?? "Opslaan mislukt.");
                }
              } catch (err) {
                if (err && typeof err === "object" && "digest" in err) throw err;
                setError("Opslaan mislukt.");
              }
            });
          }}
        >
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Opslaan en teamvoorstellen bekijken
        </Button>
      </div>
    </div>
  );
}
