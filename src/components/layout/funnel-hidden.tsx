"use client";

import { usePathname } from "next/navigation";

/** Paden van landingspagina's met één doel: daar tonen we geen hoofdmenu. */
const FUNNEL_PATHS = ["/offertecheck"];

export function isFunnelPath(pathname: string) {
  return FUNNEL_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Verbergt de inhoud (hoofdmenu, knoppen) op funnelpagina's. */
export function FunnelHidden({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return isFunnelPath(pathname) ? null : <>{children}</>;
}
