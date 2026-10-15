"use client";

import * as React from "react";
import { toast } from "sonner";
import { site } from "@/config/site";

export type CompareItem = { id: string; name: string };

type Ctx = {
  items: CompareItem[];
  has: (id: string) => boolean;
  toggle: (item: CompareItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  setAll: (items: CompareItem[]) => void;
  ready: boolean;
};

const CompareContext = React.createContext<Ctx | null>(null);
const KEY = "bouwcheck.vergelijking";

function read(): CompareItem[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => x && typeof x.id === "string" && typeof x.name === "string").slice(0, site.maxCompare) : [];
  } catch {
    return [];
  }
}

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CompareItem[]>([]);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    // Selectie herstellen uit de browser (alleen client-side beschikbaar)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(read());
    setReady(true);
    const onStorage = (e: StorageEvent) => e.key === KEY && setItems(read());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = React.useCallback((next: CompareItem[]) => {
    setItems(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* opslag niet beschikbaar: selectie blijft alleen in deze sessie */
    }
  }, []);

  const value = React.useMemo<Ctx>(
    () => ({
      items,
      ready,
      has: (id) => items.some((i) => i.id === id),
      toggle: (item) => {
        if (items.some((i) => i.id === item.id)) {
          persist(items.filter((i) => i.id !== item.id));
          return;
        }
        if (items.length >= site.maxCompare) {
          toast.error(`Je kunt maximaal ${site.maxCompare} aannemers tegelijk vergelijken. Verwijder er eerst één.`);
          return;
        }
        persist([...items, item]);
      },
      remove: (id) => persist(items.filter((i) => i.id !== id)),
      clear: () => persist([]),
      setAll: (next) => persist(next.slice(0, site.maxCompare)),
    }),
    [items, ready, persist],
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare() {
  const ctx = React.useContext(CompareContext);
  if (!ctx) throw new Error("useCompare moet binnen CompareProvider worden gebruikt");
  return ctx;
}
