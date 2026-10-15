"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { site } from "@/config/site";
import { useCompare } from "./compare-provider";

/** Vaste balk onderin met de huidige vergelijkingsselectie. */
export function CompareTray() {
  const { items, remove, clear, ready } = useCompare();
  const pathname = usePathname();
  if (!ready || items.length === 0 || pathname.startsWith("/vergelijken") || pathname.startsWith("/beheer") || pathname.startsWith("/portaal")) return null;
  const href = `/vergelijken?ids=${items.map((i) => i.id).join(",")}`;
  return (
    <div role="region" aria-label="Vergelijkingsselectie" className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/95 shadow-[0_-4px_16px_rgba(18,21,24,0.06)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-6">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink-700">
            Vergelijking ({items.length}/{site.maxCompare}):
          </span>
          {items.map((i) => (
            <span key={i.id} className="inline-flex max-w-56 items-center gap-1 rounded-md border border-ink-200 bg-ink-50 py-0.5 pl-2 pr-1 text-xs text-ink-800">
              <span className="truncate">{i.name}</span>
              <button type="button" onClick={() => remove(i.id)} className="rounded p-0.5 text-ink-500 hover:bg-ink-200 hover:text-ink-900" aria-label={`${i.name} verwijderen uit vergelijking`}>
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={clear}>
            Wissen
          </Button>
          {items.length >= 2 ? (
            <Button asChild size="sm">
              <Link href={href}>
                <Columns3 aria-hidden /> Vergelijk {items.length} aannemers
              </Link>
            </Button>
          ) : (
            <Button size="sm" disabled title="Kies minimaal 2 aannemers">
              <Columns3 aria-hidden /> Kies nog {2 - items.length} aannemer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
