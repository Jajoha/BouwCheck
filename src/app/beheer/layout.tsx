import { requireAdmin } from "@/lib/auth/session";
import { NavLink } from "@/components/layout/nav-link";

const NAV = [
  { href: "/beheer", label: "Overzicht" },
  { href: "/beheer/aannemers", label: "Aannemers" },
  { href: "/beheer/aanmeldingen", label: "Aanmeldingen" },
  { href: "/beheer/verificaties", label: "Verificaties" },
  { href: "/beheer/moderatie", label: "Resultaten & reviews" },
  { href: "/beheer/meldingen", label: "Meldingen" },
  { href: "/beheer/projecten", label: "Projecten" },
  { href: "/beheer/offerteaanvragen", label: "Offerteaanvragen" },
  { href: "/beheer/gebruikers", label: "Gebruikers" },
  { href: "/beheer/demo-data", label: "Demo-data" },
];

/** Alle /beheer-routes zijn server-side afgeschermd op de rol 'beheerder'. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin("/beheer");
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6">
      <div className="mb-6 overflow-x-auto border-b border-ink-100 pb-3">
        <nav aria-label="Beheernavigatie" className="flex min-w-max gap-0.5">
          {NAV.map((n) => (
            <NavLink key={n.href} href={n.href} className="text-[13px]">
              {n.label}
            </NavLink>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
