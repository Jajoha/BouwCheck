import * as React from "react";
import { cn } from "@/lib/utils";

const control =
  "block w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 shadow-sm transition-colors hover:border-ink-300 focus:border-brand-600 focus:outline-2 focus:outline-offset-0 focus:outline-brand-600/30 disabled:bg-ink-50 disabled:text-ink-500 aria-[invalid=true]:border-danger-600";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "min-h-24 py-2 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(control, "h-10 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%236b747d%22><path d=%22M5.5 7.5l4.5 4.5 4.5-4.5%22 stroke=%22%236b747d%22 stroke-width=%221.5%22 fill=%22none%22/></svg>')] bg-[length:18px] bg-[right_0.6rem_center] bg-no-repeat pr-9", className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-medium text-ink-800", className)} {...props} />;
}

export function Checkbox({ className, label, description, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode; description?: React.ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5 text-sm text-ink-800", className)}>
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 rounded border-ink-300 accent-brand-600" {...props} />
      <span>
        {label}
        {description ? <span className="block text-xs text-ink-500">{description}</span> : null}
      </span>
    </label>
  );
}

export function Radio({ className, label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2 text-sm text-ink-800", className)}>
      <input type="radio" className="size-4 accent-brand-600" {...props} />
      <span>{label}</span>
    </label>
  );
}

/** Formulierveld met label, hulptekst en foutmelding (aria-gekoppeld). */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string[] | string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const errors = typeof error === "string" ? [error] : error;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-0.5 text-danger-600" aria-hidden>*</span> : null}
        {!required ? <span className="ml-1.5 text-xs font-normal text-ink-400">optioneel</span> : null}
      </Label>
      {children}
      {hint && !errors?.length ? <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="text-xs text-ink-500">{hint}</p> : null}
      {errors?.length ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="text-xs font-medium text-danger-700">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}

export function Fieldset({ legend, description, children, error, className }: { legend: string; description?: string; children: React.ReactNode; error?: string[]; className?: string }) {
  return (
    <fieldset className={cn("flex flex-col gap-2", className)}>
      <legend className="text-sm font-medium text-ink-800">{legend}</legend>
      {description ? <p className="-mt-1 text-xs text-ink-500">{description}</p> : null}
      {children}
      {error?.length ? (
        <p role="alert" className="text-xs font-medium text-danger-700">
          {error[0]}
        </p>
      ) : null}
    </fieldset>
  );
}
