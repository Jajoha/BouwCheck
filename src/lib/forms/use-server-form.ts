"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import type { ActionResult } from "./types";

/**
 * Verstuurt een formulier naar een server action zonder het formulier te
 * resetten, zodat ingevulde gegevens bij validatiefouten behouden blijven.
 */
export function useServerForm<T>(
  action: (fd: FormData) => Promise<ActionResult<T>>,
  opts: { onSuccess?: (result: ActionResult<T>) => void; successToast?: boolean; resetOnSuccess?: boolean } = {},
) {
  const [result, setResult] = useState<ActionResult<T> | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    // Neem de gebruikte verzendknop mee (bijv. name="decision" value="goedgekeurd")
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const fd = submitter && submitter.getAttribute("name") ? new FormData(form, submitter) : new FormData(form);
    startTransition(async () => {
      try {
        const res = await action(fd);
        // redirect() in de action navigeert vóór we hier komen
        if (!res) return;
        setResult(res);
        if (res.ok) {
          if (opts.successToast !== false && res.message) toast.success(res.message);
          if (opts.resetOnSuccess) form.reset();
          opts.onSuccess?.(res);
        } else if (res.message) {
          toast.error(res.message);
        }
        if (!res.ok && res.fieldErrors) {
          const first = Object.keys(res.fieldErrors)[0];
          const el = first ? form.querySelector<HTMLElement>(`[name="${first}"], [name="${first}[]"]`) : null;
          el?.focus();
        }
      } catch (err) {
        // Next.js redirect-signalen opnieuw gooien
        if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_")) throw err;
        console.error(err);
        setResult({ ok: false, message: "Er ging iets mis. Probeer het opnieuw." });
        toast.error("Er ging iets mis. Probeer het opnieuw.");
      }
    });
  }

  const errors = (name: string) => result?.fieldErrors?.[name];
  return { result, pending, onSubmit, errors };
}
