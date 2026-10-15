"use client";

import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "./button";

export function SubmitButton({ pending, children, pendingText = "Bezig met opslaan…", ...props }: ButtonProps & { pending: boolean; pendingText?: string }) {
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {pending ? pendingText : children}
    </Button>
  );
}
