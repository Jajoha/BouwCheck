"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { FlaskConical } from "lucide-react";
import { Field, Input } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { demoLoginAction, loginAction } from "@/actions/auth";
import { useServerForm } from "@/lib/forms/use-server-form";

export function LoginForm({ next, demoMode }: { next?: string; demoMode: boolean }) {
  const { pending, onSubmit, errors, result } = useServerForm(loginAction);
  const [demoPending, startDemo] = useTransition();
  const demo = (role: "flipper" | "admin" | "contractor") =>
    startDemo(async () => {
      const res = await demoLoginAction(role);
      if (res && !res.ok) toast.error(res.message);
    });
  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <Field label="E-mailadres" htmlFor="email" required error={errors("email")}>
          <Input id="email" name="email" type="email" autoComplete="email" aria-invalid={Boolean(errors("email"))} />
        </Field>
        <Field label="Wachtwoord" htmlFor="password" required error={errors("password")}>
          <Input id="password" name="password" type="password" autoComplete="current-password" aria-invalid={Boolean(errors("password"))} />
        </Field>
        {result && !result.ok && result.message && !result.fieldErrors ? (
          <p role="alert" className="text-sm text-danger-700">
            {result.message}
          </p>
        ) : null}
        <div className="flex items-center justify-between">
          <Link href="/wachtwoord-vergeten" className="text-sm text-brand-700 hover:underline">
            Wachtwoord vergeten?
          </Link>
        </div>
        <SubmitButton pending={pending} pendingText="Inloggen…" className="w-full">
          Inloggen
        </SubmitButton>
      </form>
      {demoMode ? (
        <div className="rounded-lg border border-dashed border-demo-700/40 bg-demo-100 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-demo-700">
            <FlaskConical className="size-4" aria-hidden /> Demo-modus
          </p>
          <p className="mt-1 text-xs text-demo-700">Log in met een vooraf aangemaakt, fictief demo-account. Dit is geen echte gebruikerssessie van een klant.</p>
          <div className="mt-3 grid gap-2">
            <Button type="button" variant="outline" disabled={demoPending} onClick={() => demo("flipper")}>
              Demo als vastgoedflipper
            </Button>
            <Button type="button" variant="outline" disabled={demoPending} onClick={() => demo("contractor")}>
              Demo als aannemer
            </Button>
            <Button type="button" variant="outline" disabled={demoPending} onClick={() => demo("admin")}>
              Demo als beheerder
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
