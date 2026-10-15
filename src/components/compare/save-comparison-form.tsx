"use client";

import Link from "next/link";
import { useState } from "react";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveComparisonAction } from "@/actions/engagement";
import { useServerForm } from "@/lib/forms/use-server-form";

export function SaveComparisonForm({ contractorIds, projectId, defaultName }: { contractorIds: string[]; projectId: string | null; defaultName: string }) {
  const [savedId, setSavedId] = useState<string | null>(null);
  const { pending, onSubmit, errors } = useServerForm(saveComparisonAction, { onSuccess: (r) => setSavedId(r.data?.id ?? null) });
  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-3" noValidate>
      {contractorIds.map((id) => (
        <input key={id} type="hidden" name="contractor_ids[]" value={id} />
      ))}
      {projectId ? <input type="hidden" name="project_id" value={projectId} /> : null}
      <Field label="Naam" htmlFor="cmp-name" required error={errors("name") ?? errors("contractor_ids")}>
        <Input id="cmp-name" name="name" defaultValue={defaultName} maxLength={120} />
      </Field>
      <Field label="Notitie" htmlFor="cmp-notes" error={errors("notes")}>
        <Textarea id="cmp-notes" name="notes" rows={2} placeholder="Bijv. waarom je voor een bepaalde aannemer neigt" />
      </Field>
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending}>Vergelijking opslaan</SubmitButton>
        {savedId ? (
          <Link href="/vergelijkingen" className="text-sm text-brand-700 underline">
            Bekijk opgeslagen vergelijkingen
          </Link>
        ) : null}
      </div>
    </form>
  );
}
