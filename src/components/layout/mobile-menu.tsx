"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/actions/auth";

export function MobileMenu({ items, loggedIn }: { items: { href: string; label: string }[]; loggedIn: boolean }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const [last, setLast] = React.useState(pathname);
  if (pathname !== last) {
    setLast(pathname);
    setOpen(false);
  }
  return (
    <div className="ml-auto lg:hidden">
      <Button variant="ghost" size="icon" aria-expanded={open} aria-controls="mobiel-menu" aria-label={open ? "Menu sluiten" : "Menu openen"} onClick={() => setOpen((o) => !o)}>
        {open ? <X /> : <Menu />}
      </Button>
      {open ? (
        <div id="mobiel-menu" className="absolute inset-x-0 top-16 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-ink-200 bg-white px-4 pb-4 shadow-[var(--shadow-raised)]">
          <nav aria-label="Mobiele navigatie" className="flex flex-col py-2">
            {items.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-md px-2 py-2.5 text-sm text-ink-800 hover:bg-ink-50" onClick={() => setOpen(false)}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-2 border-t border-ink-100 pt-3">
            {loggedIn ? (
              <form action={logoutAction}>
                <Button type="submit" variant="outline" className="w-full">
                  <LogOut aria-hidden /> Uitloggen
                </Button>
              </form>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link href="/inloggen">Inloggen</Link>
                </Button>
                <Button asChild>
                  <Link href="/aannemers">Start met vergelijken</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
