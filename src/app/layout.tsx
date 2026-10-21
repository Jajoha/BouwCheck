import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { site } from "@/config/site";
import { FlashToast } from "@/components/layout/flash-toast";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: `${site.name} — ${site.tagline}`, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  openGraph: { title: site.name, description: site.description, locale: "nl_NL", type: "website", siteName: site.name },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#1b1f23" };

// Vrijwel alle pagina's zijn gebruikers- en databaseafhankelijk.
export const dynamic = "force-dynamic";
// Eén limiet voor alle routes (nodig voor de AI-analyse). Een afwijkende waarde op één pagina laat
// Vercel die pagina in een aparte serverfunctie bundelen; zonder database heeft die dan een eigen
// tijdelijke database en is de gebruiker daar niet ingelogd.
export const maxDuration = 300;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a href="#inhoud" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink-900 focus:px-3 focus:py-2 focus:text-white">
          Naar de inhoud
        </a>
        <SiteHeader />
        <main id="inhoud" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <Suspense>
          <FlashToast />
        </Suspense>
        <Toaster position="top-right" richColors closeButton toastOptions={{ duration: 5000 }} />
      </body>
    </html>
  );
}
