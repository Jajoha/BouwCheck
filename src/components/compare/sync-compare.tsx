"use client";

import { useEffect } from "react";
import { useCompare, type CompareItem } from "./compare-provider";

/** Houdt de vergelijkingsselectie in de browser gelijk aan de getoonde vergelijking. */
export function SyncCompare({ items }: { items: CompareItem[] }) {
  const { setAll, ready } = useCompare();
  const key = items.map((i) => i.id).join(",");
  useEffect(() => {
    if (ready) setAll(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);
  return null;
}
