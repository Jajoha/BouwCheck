import Link from "next/link";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <rect width="32" height="32" rx="7" fill="#1b1f23" />
      <path d="M8 16.5 16 9l8 7.5V24a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
      <path d="m12.5 18.5 2.6 2.6 4.9-5.2" fill="none" stroke="#3fbf86" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-semibold tracking-tight text-ink-950", className)} aria-label={`${site.name} — naar de startpagina`}>
      <LogoMark />
      <span className="text-[17px]">{site.name}</span>
    </Link>
  );
}
