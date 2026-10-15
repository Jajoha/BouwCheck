import { Logo } from "@/components/layout/logo";

export function AuthCard({ title, description, children, footer }: { title: string; description?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-start justify-center bg-ink-50 px-4 py-12 sm:items-center">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-xl border border-ink-200 bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight text-ink-950">{title}</h1>
          {description ? <p className="mt-1.5 text-sm text-ink-600">{description}</p> : null}
          <div className="mt-6">{children}</div>
        </div>
        {footer ? <div className="mt-4 text-center text-sm text-ink-600">{footer}</div> : null}
      </div>
    </div>
  );
}
