"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({ href, children, className, exclude = [] }: { href: string; children: React.ReactNode; className?: string; exclude?: string[] }) {
  const pathname = usePathname();
  const active =
    !href.includes("#") && !exclude.some((e) => pathname === e || pathname.startsWith(`${e}/`)) && (pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)));
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-md px-3 py-2 text-sm text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-950",
        active && "bg-ink-100 font-medium text-ink-950",
        className,
      )}
    >
      {children}
    </Link>
  );
}
