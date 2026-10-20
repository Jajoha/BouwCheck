"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { useServerForm } from "@/lib/forms/use-server-form";
import { retryEmailAction, sendTestEmailAction, unsubscribeAction } from "@/actions/email";

export function TestEmailForm({ defaultTo }: { defaultTo: string }) {
  const router = useRouter();
  const { pending, onSubmit, errors } = useServerForm(sendTestEmailAction, { onSuccess: () => router.refresh() });
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
      <Field label="Testmail naar" htmlFor="test-to" error={errors("to")} className="sm:w-80">
        <Input id="test-to" name="to" type="email" defaultValue={defaultTo} />
      </Field>
      <SubmitButton pending={pending} pendingText="Versturen…" variant="outline">
        Testmail versturen
      </SubmitButton>
    </form>
  );
}

export function RetryEmailButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await retryEmailAction(id);
          if (res.ok) toast.success(res.message ?? "Verzonden.");
          else toast.error(res.message ?? "Mislukt.");
          router.refresh();
        })
      }
    >
      Opnieuw
    </Button>
  );
}

export function UnsubscribeForm({ token }: { token: string }) {
  const [done, setDone] = React.useState(false);
  const { pending, onSubmit, result } = useServerForm(unsubscribeAction, { onSuccess: () => setDone(true) });
  if (done) return <p className="font-medium text-brand-800">{result?.message}</p>;
  return (
    <form onSubmit={onSubmit}>
      <input type="hidden" name="token" value={token} />
      <SubmitButton pending={pending} pendingText="Afmelden…">
        Afmelden
      </SubmitButton>
      {result && !result.ok ? <p role="alert" className="mt-2 text-sm text-danger-700">{result.message}</p> : null}
    </form>
  );
}
