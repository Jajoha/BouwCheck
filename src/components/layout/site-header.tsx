import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { NavLink } from "./nav-link";
import { UserMenu } from "./user-menu";
import { getCurrentUser, type SessionUser } from "@/lib/auth/session";

type NavItem = { href: string; label: string };

const PUBLIC_NAV: NavItem[] = [
  { href: "/#hoe-het-werkt", label: "Hoe het werkt" },
  { href: "/#voor-vastgoedflippers", label: "Voor vastgoedflippers" },
  { href: "/transparantie", label: "Hoe wij selecteren" },
  { href: "/prijzen", label: "Prijzen" },
];

function navFor(user: SessionUser): NavItem[] {
  if (user.role === "aannemer") {
    return [
      { href: "/portaal", label: "Aannemersportaal" },
    ];
  }
  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/projecten/nieuw", label: "Nieuw project" },
    { href: "/projecten", label: "Projecten" },
    { href: "/offerteaanvragen", label: "Offerteaanvragen" },
  ];
  if (user.role === "beheerder") items.push({ href: "/beheer", label: "Beheer" });
  return items;
}

export async function SiteHeader() {
  const user = await getCurrentUser();
  const nav = user ? navFor(user) : PUBLIC_NAV;
  const secondary: NavItem[] = user
    ? user.role === "aannemer"
      ? [{ href: "/profiel", label: "Mijn account" }]
      : [
          { href: "/favorieten", label: "Opgeslagen aannemers" },
          { href: "/profiel", label: "Profiel" },
        ]
    : [];
  return (
    <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Logo href={user ? (user.role === "aannemer" ? "/portaal" : "/dashboard") : "/"} />
        <nav aria-label="Hoofdnavigatie" className="hidden flex-1 items-center gap-0.5 lg:flex">
          {nav.map((n) => (
            <NavLink key={n.href} href={n.href} exclude={n.href === "/projecten" ? ["/projecten/nieuw"] : undefined}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          {user ? (
            <UserMenu name={user.name} email={user.email} items={secondary} />
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/inloggen">Inloggen</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/projecten/nieuw">Start je project</Link>
              </Button>
            </>
          )}
        </div>
        <MobileMenu items={[...nav, ...secondary]} loggedIn={Boolean(user)} />
      </div>
    </header>
  );
}
