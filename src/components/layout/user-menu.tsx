"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth";

export function UserMenu({ name, email, items }: { name: string; email: string; items: { href: string; label: string }[] }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-ink-200 py-1.5 pl-2 pr-2.5 text-sm text-ink-800 hover:bg-ink-50"
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-ink-900 text-[11px] font-semibold text-white">{name.slice(0, 1).toUpperCase()}</span>
        <span className="max-w-40 truncate">{name}</span>
        <ChevronDown className="size-4 text-ink-500" aria-hidden />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 mt-2 w-64 rounded-lg border border-ink-200 bg-white p-1 shadow-[var(--shadow-raised)]">
          <div className="border-b border-ink-100 px-3 py-2">
            <p className="truncate text-sm font-medium text-ink-900">{name}</p>
            <p className="truncate text-xs text-ink-500">{email}</p>
          </div>
          {items.map((i) => (
            <Link key={i.href} role="menuitem" href={i.href} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm text-ink-700 hover:bg-ink-50">
              {i.label}
            </Link>
          ))}
          <form action={logoutAction}>
            <button role="menuitem" type="submit" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50">
              <LogOut className="size-4" aria-hidden /> Uitloggen
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
