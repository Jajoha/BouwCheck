"use client";

import Link from "next/link";
import { Checkbox, Field, Input } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { registerAction } from "@/actions/auth";
import { useServerForm } from "@/lib/forms/use-server-form";

export function RegisterForm({ role }: { role?: string }) {
  const { pending, onSubmit, errors } = useServerForm(registerAction);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {role === "aannemer" ? <input type="hidden" name="rol" value="aannemer" /> : null}
      <Field label="Naam" htmlFor="name" required error={errors("name")}>
        <Input id="name" name="name" autoComplete="name" aria-invalid={Boolean(errors("name"))} />
      </Field>
      <Field label="E-mailadres" htmlFor="email" required error={errors("email")}>
        <Input id="email" name="email" type="email" autoComplete="email" aria-invalid={Boolean(errors("email"))} />
      </Field>
      <Field label="Wachtwoord" htmlFor="password" required error={errors("password")} hint="Minimaal 10 tekens.">
        <Input id="password" name="password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors("password"))} />
      </Field>
      <Field label="Herhaal wachtwoord" htmlFor="password_confirm" required error={errors("password_confirm")}>
        <Input id="password_confirm" name="password_confirm" type="password" autoComplete="new-password" aria-invalid={Boolean(errors("password_confirm"))} />
      </Field>
      <div>
        <Checkbox
          name="terms"
          label={
            <>
              Ik ga akkoord met de{" "}
              <Link href="/voorwaarden" className="text-brand-700 underline" target="_blank">
                gebruiksvoorwaarden
              </Link>{" "}
              en{" "}
              <Link href="/privacy" className="text-brand-700 underline" target="_blank">
                privacyverklaring
              </Link>{" "}
              (concept).
            </>
          }
        />
        {errors("terms") ? <p role="alert" className="mt-1 text-xs font-medium text-danger-700">{errors("terms")![0]}</p> : null}
      </div>
      <SubmitButton pending={pending} pendingText="Account aanmaken…" className="w-full">
        Account aanmaken
      </SubmitButton>
    </form>
  );
}
