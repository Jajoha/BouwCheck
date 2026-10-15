import * as React from "react";
import { AlertTriangle, Info, CheckCircle2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 border-b border-ink-100 pb-6 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <div className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">{eyebrow}</div> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-ink-950 sm:text-[28px]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-ink-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

const noticeStyles = {
  info: { box: "border-info-100 bg-info-100/40 text-info-700", Icon: Info },
  warning: { box: "border-warn-100 bg-warn-50 text-warn-700", Icon: AlertTriangle },
  success: { box: "border-brand-200 bg-brand-50 text-brand-800", Icon: CheckCircle2 },
  danger: { box: "border-danger-100 bg-danger-50 text-danger-700", Icon: ShieldAlert },
  demo: { box: "border-dashed border-demo-700/40 bg-demo-100 text-demo-700", Icon: Info },
};

export function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: keyof typeof noticeStyles;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const { box, Icon } = noticeStyles[tone];
  return (
    <div role={tone === "danger" ? "alert" : "note"} className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm", box, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="leading-relaxed [&_a]:underline">{children}</div> : null}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-ink-200 bg-ink-50/60 px-6 py-10 text-center", className)}>
      {Icon ? (
        <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-white text-ink-500 shadow-sm ring-1 ring-ink-200">
          <Icon className="size-5" />
        </div>
      ) : null}
      <p className="text-sm font-semibold text-ink-900">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-ink-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function SectionTitle({ children, description, action }: { children: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-ink-950">{children}</h2>
        {description ? <p className="mt-0.5 text-sm text-ink-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function DefinitionList({ items, className }: { items: { term: React.ReactNode; value: React.ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("divide-y divide-ink-100", className)}>
      {items.map((item, i) => (
        <div key={i} className="grid grid-cols-1 gap-1 py-2.5 text-sm sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-4">
          <dt className="text-ink-500">{item.term}</dt>
          <dd className="text-ink-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const letters = name
    .replace(/\(.*?\)/g, "")
    .split(/[\s-]+/)
    .filter((w) => /^[A-Za-zÀ-ÿ]/.test(w) && w.length > 2)
    .slice(-2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <div aria-hidden className={cn("flex size-11 shrink-0 items-center justify-center rounded-lg bg-ink-900 text-sm font-semibold tracking-wide text-white", className)}>
      {letters || "?"}
    </div>
  );
}

export function TableWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("overflow-x-auto rounded-[var(--radius-card)] border border-ink-200 bg-white", className)}>{children}</div>;
}

export const th = "px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-500 bg-ink-50 border-b border-ink-200 whitespace-nowrap";
export const td = "px-4 py-3 text-sm text-ink-800 border-b border-ink-100 align-top";
