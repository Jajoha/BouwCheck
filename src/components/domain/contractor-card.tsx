import Link from "next/link";
import { MapPin, FileText, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/misc";
import { AvailabilityBadge, DemoBadge, PriceLevelLabel, VerificationBadge } from "./badges";
import { MetricValue } from "./metric";
import { CompareToggle } from "@/components/compare/compare-toggle";
import { FavoriteButton } from "./favorite-button";
import type { ContractorSummary } from "@/lib/data/contractors";

export function ContractorCard({ c, favorite, loggedIn }: { c: ContractorSummary; favorite: boolean; loggedIn: boolean }) {
  const m = c.metrics;
  return (
    <Card className="flex h-full flex-col" data-testid="contractor-card">
      <div className="flex items-start gap-3 p-5 pb-4">
        <Avatar name={c.company_name} />
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-snug text-ink-950">
            <Link href={`/aannemers/${c.slug}`} className="hover:underline">
              {c.company_name}
            </Link>
          </h3>
          <p className="mt-0.5 text-sm text-ink-600">{c.specialties.map((s) => s.name).join(" · ")}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-ink-500">
            <MapPin className="size-3.5" aria-hidden />
            {c.areas.join(", ")}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 px-5">
        {c.is_demo ? <DemoBadge compact /> : null}
        <VerificationBadge level={c.verification.highest} isDemo={c.is_demo} />
        <AvailabilityBadge status={c.availability_status} from={c.available_from} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-ink-100 px-5 py-4 text-sm">
        <div>
          <dt className="text-xs text-ink-500">Prijsniveau</dt>
          <dd className="mt-0.5">
            <PriceLevelLabel level={c.price_level} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-500">Geregistreerde projecten</dt>
          <dd className="tabular mt-0.5 font-semibold text-ink-950">
            {m.registeredProjects}
            <span className="ml-1 text-xs font-normal text-ink-500">({m.verifiedProjects} gecontroleerd)</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-500">Op tijd opgeleverd</dt>
          <dd className="mt-0.5">
            <MetricValue metric={m.onTime} kind="percent" compact />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-500">Budgetafwijking</dt>
          <dd className="mt-0.5">
            <MetricValue metric={m.budgetDeviation} kind="signedPercent" compact />
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-ink-500">Beoordeling opdrachtgevers</dt>
          <dd className="mt-0.5">
            <MetricValue metric={m.rating} kind="rating" compact />
          </dd>
        </div>
      </dl>
      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-ink-100 px-5 py-3">
        <Button asChild size="sm" variant="dark">
          <Link href={`/aannemers/${c.slug}`}>
            Profiel <ArrowRight aria-hidden />
          </Link>
        </Button>
        <CompareToggle id={c.id} name={c.company_name} />
        <FavoriteButton contractorId={c.id} name={c.company_name} initial={favorite} loggedIn={loggedIn} />
        <Button asChild size="sm" variant="ghost" className="ml-auto">
          <Link href={loggedIn ? `/offerteaanvragen/nieuw?aannemer=${c.id}` : `/inloggen?next=${encodeURIComponent(`/offerteaanvragen/nieuw?aannemer=${c.id}`)}`}>
            <FileText aria-hidden /> Offerte
          </Link>
        </Button>
      </div>
    </Card>
  );
}
