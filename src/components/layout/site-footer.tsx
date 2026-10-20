import Link from "next/link";
import { site } from "@/config/site";
import { Logo } from "./logo";
import { env } from "@/lib/env";

const PRODUCT_LINKS = env.features.offertecheck
  ? [
      { href: "/offertecheck", label: "Gratis Offertecheck" },
      { href: "/projecten/nieuw", label: "Teamvoorstel aanvragen" },
      ...(env.features.foundingMembers ? [{ href: "/founding-members", label: "Founding members" }] : []),
      { href: "/#hoe-het-werkt", label: "Hoe het werkt" },
      { href: "/prijzen", label: "Prijzen" },
    ]
  : [
      { href: "/projecten/nieuw", label: "Start je project" },
      { href: "/#hoe-het-werkt", label: "Hoe het werkt" },
      { href: "/prijzen", label: "Prijzen (testfase)" },
    ];

const COLUMNS = [
  {
    title: "Product",
    links: [
      ...PRODUCT_LINKS,
      { href: "/transparantie", label: "Hoe wij selecteren en beoordelen" },
    ],
  },
  {
    title: "Voor aannemers",
    links: [
      { href: "/registreren?rol=aannemer", label: "Aanmelden als uitvoerder" },
      { href: "/inloggen", label: "Inloggen aannemersportaal" },
    ],
  },
  {
    title: "BouwCheck",
    links: [
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacyverklaring (concept)" },
      { href: "/voorwaarden", label: "Gebruiksvoorwaarden (concept)" },
      { href: "/disclaimer", label: "Disclaimer (concept)" },
      { href: "/inloggen", label: "Inloggen" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-200 bg-ink-50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-ink-600">{site.tagline}</p>
          <p className="mt-4 text-xs leading-relaxed text-ink-500">
            Bèta. Aannemersprofielen, cijfers en beoordelingen in deze omgeving zijn fictieve demo-data en zeggen niets over bestaande bedrijven.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="text-sm font-semibold text-ink-900">{col.title}</h2>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.href + l.label}>
                  <Link href={l.href} className="text-sm text-ink-600 hover:text-ink-950 hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-ink-200">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-ink-500 sm:flex-row sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} {site.name} — bèta. Prijzen in euro; btw-status staat bij ieder bedrag vermeld.</p>
          <p>BouwCheck rangschikt aannemers nooit op basis van betaling.</p>
        </div>
      </div>
    </footer>
  );
}
