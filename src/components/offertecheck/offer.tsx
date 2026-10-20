import Link from "next/link";
import { ArrowRight, Check, EyeOff, Gift, Users, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WeeklyCapacity } from "@/lib/domain/offertecheck";
import { cn } from "@/lib/utils";

/**
 * Het Offertecheck-aanbod. Teksten letterlijk zoals aangeleverd door de opdrachtgever;
 * wijzig ze hier en nergens anders.
 */
export const OFFER = {
  title: "Gratis Offertecheck: zie het meerwerk vóórdat je tekent",
  intro:
    "Een offerte die goedkoop lijkt, kan je duizenden euro's aan meerwerk kosten. Upload je offertes en weet binnen 48 uur wat erin ontbreekt, wat er is uitgesloten en waar je te veel betaalt. Dan teken je pas als je weet wat je koopt.",
  benefitsTitle: "Wat je krijgt",
  benefits: [
    "Alle offertes op één scope. Elke post naast elkaar, zodat je appels met appels vergelijkt.",
    "Ontbrekende posten in euro's. Wat in de ene offerte zit en in de andere niet, met een indicatie van wat het je later kost.",
    "Stelposten en uitsluitingen uitgelicht. De plekken waar meerwerk vandaan komt, met uitleg waarom.",
    "Prijsverschillen per post. Waar je mogelijk te veel betaalt, en waar een lage prijs verdacht laag is.",
    "Je onderhandelingslijst. De vragen die je aan elke aannemer stelt voordat je tekent.",
  ],
  bonus:
    "Wil je teams die op deze ene scope offreren? Je krijgt binnen 72 uur een gratis teamvoorstel van aannemers, zzp-vakmensen en klussers, geordend op budget, kwaliteit of snelheid.",
  promise: "Je rapport binnen 48 uur, anders krijg je je teamvoorstel met voorrang. Vinden we niets? Dan zeggen we dat eerlijk, en teken je met een gerust hart.",
  privacy: "Je offertes worden niet gedeeld met aannemers. Je kunt ze op elk moment laten verwijderen.",
  limited: (max: number) => `Elke check wordt door een mens nagekeken. Daarom nemen we er maximaal ${max} per week aan.`,
  cta: "Upload je offertes – gratis",
  ctaHref: "/offertecheck#upload",
} as const;

/** Splitst "Kop. Uitleg." zodat de eerste zin vet kan; de tekst zelf blijft ongewijzigd. */
function splitFirstSentence(text: string): [string, string] {
  const i = text.indexOf(". ");
  return i === -1 ? [text, ""] : [text.slice(0, i + 1), text.slice(i + 2)];
}

export function OfferCta({ className }: { className?: string }) {
  return (
    <Button asChild size="lg" className={cn("w-full sm:w-auto", className)}>
      <Link href={OFFER.ctaHref}>
        {OFFER.cta} <ArrowRight aria-hidden />
      </Link>
    </Button>
  );
}

export function OfferBenefits({ className }: { className?: string }) {
  return (
    <div className={className}>
      <h2 className="text-lg font-semibold text-ink-950">{OFFER.benefitsTitle}</h2>
      <ul className="mt-3 flex flex-col gap-3">
        {OFFER.benefits.map((b) => {
          const [head, rest] = splitFirstSentence(b);
          return (
            <li key={b} className="flex gap-3 text-[15px] leading-relaxed text-ink-700">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white" aria-hidden>
                <Check className="size-3.5" strokeWidth={3} />
              </span>
              <span>
                <strong className="font-semibold text-ink-950">{head}</strong>
                {rest ? ` ${rest}` : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function OfferIntro({ as: Heading = "h1" }: { as?: "h1" | "h2" }) {
  return (
    <>
      <Heading className="text-3xl font-semibold leading-[1.15] tracking-tight text-ink-950 sm:text-5xl sm:leading-[1.1]">{OFFER.title}</Heading>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-600">{OFFER.intro}</p>
    </>
  );
}

function OfferBlock({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-ink-200 bg-ink-50 p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-950">
        <Icon className="size-4 text-brand-700" aria-hidden /> {title}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{children}</p>
    </section>
  );
}

/** Regel over de wekelijkse capaciteit. Zonder ingestelde limiet: niets. */
export function OfferLimited({ capacity }: { capacity: WeeklyCapacity | null }) {
  if (!capacity) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-700">
      <Timer className="size-4 shrink-0 text-ink-500" aria-hidden />
      <span>
        <strong className="font-semibold text-ink-950">Beperkt:</strong> <span>{OFFER.limited(capacity.max)}</span>
      </span>
      <span className={cn("font-semibold", capacity.remaining === 0 ? "text-danger-700" : "text-brand-800")}>
        {capacity.remaining === 0 ? "Deze week zijn alle plekken bezet." : `Nog ${capacity.remaining} ${capacity.remaining === 1 ? "plek" : "plekken"} deze week.`}
      </span>
    </p>
  );
}

/** Volledige bovenkant van /offertecheck: kop, intro, knop, wat je krijgt, bonus, belofte, privé en (optioneel) de capaciteit. */
export function OfferFull({ capacity }: { capacity: WeeklyCapacity | null }) {
  return (
    <div>
      <OfferIntro />
      <OfferCta className="mt-6" />
      <OfferBenefits className="mt-10" />
      <div className="mt-8 grid gap-3 md:grid-cols-3">
        <OfferBlock icon={Users} title="Bonus">
          {OFFER.bonus}
        </OfferBlock>
        <OfferBlock icon={Gift} title="Onze belofte">
          {OFFER.promise}
        </OfferBlock>
        <OfferBlock icon={EyeOff} title="Privé">
          {OFFER.privacy}
        </OfferBlock>
      </div>
      {capacity ? (
        <div className="mt-6">
          <OfferLimited capacity={capacity} />
        </div>
      ) : null}
    </div>
  );
}
