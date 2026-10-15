"use client";

import Link from "next/link";
import { useState } from "react";
import { Field, Input } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { Notice } from "@/components/ui/misc";
import { requestPasswordResetAction, resetPasswordAction } from "@/actions/auth";
import { useServerForm } from "@/lib/forms/use-server-form";

export function RequestResetForm() {
  const [devLink, setDevLink] = useState<string | null>(null);
  const { pending, onSubmit, errors, result } = useServerForm(requestPasswordResetAction, { onSuccess: (r) => setDevLink(r.data?.devLink ?? null) });
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field label="E-mailadres" htmlFor="email" required error={errors("email")}>
        <Input id="email" name="email" type="email" autoComplete="email" />
      </Field>
      {result?.ok ? (
        <Notice tone="success" title="Aanvraag verwerkt">
          {result.message}
        </Notice>
      ) : null}
      {result && !result.ok && result.message ? <Notice tone="warning">{result.message}</Notice> : null}
      {devLink ? (
        <Notice tone="demo" title="Demo-modus: e-mail is niet geconfigureerd">
          Er wordt geen e-mail verstuurd. Gebruik deze herstellink (1 uur geldig): <Link href={devLink}>wachtwoord opnieuw instellen</Link>
        </Notice>
      ) : null}
      <SubmitButton pending={pending} className="w-full">
        Herstellink aanvragen
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const { pending, onSubmit, errors, result } = useServerForm(resetPasswordAction);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <Field label="Nieuw wachtwoord" htmlFor="password" required error={errors("password")} hint="Minimaal 10 tekens.">
        <Input id="password" name="password" type="password" autoComplete="new-password" />
      </Field>
      <Field label="Herhaal wachtwoord" htmlFor="password_confirm" required error={errors("password_confirm")}>
        <Input id="password_confirm" name="password_confirm" type="password" autoComplete="new-password" />
      </Field>
      {result && !result.ok && result.message ? <Notice tone="danger">{result.message}</Notice> : null}
      <SubmitButton pending={pending} className="w-full">
        Wachtwoord opslaan
      </SubmitButton>
    </form>
  );
}
