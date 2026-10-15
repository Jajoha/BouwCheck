import type { Metadata } from "next";
import Link from "next/link";
import { SearchX, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/form-controls";
import { EmptyState, Notice, PageHeader } from "@/components/ui/misc";
import { ContractorCard } from "@/components/domain/contractor-card";
import { FilterPanel } from "@/components/domain/filter-panel";
import { listContractors, type ContractorFilters } from "@/lib/data/contractors";
import { getFavoriteIds } from "@/lib/data/records";
import { getCurrentUser } from "@/lib/auth/session";
import { PRICE_LEVELS, PROVINCES, RENOVATION_TYPES, SPECIALTIES } from "@/lib/domain/constants";
import { VERIFICATION_LEVELS } from "@/lib/domain/verification";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Aannemers vergelijken" };

const SORTS = [
  { value: "relevantie", label: "Relevantie" },
  { value: "prijs", label: "Prijsniveau (laag → hoog)" },
  { value: "beoordeling", label: "Beoordeling (alleen met voldoende reviews)" },
  { value: "ervaring", label: "Projectervaring" },
  { value: "op_tijd", label: "Tijdige oplevering (alleen met voldoende data)" },
  { value: "beschikbaarheid", label: "Beschikbaarheid" },
  { value: "compleetheid", label: "Meest complete projectdata" },
] as const;

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const num = (v: string | string[] | undefined) => {
  const s = one(v);
  if (s === undefined) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

export default async function ContractorsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const sort = (SORTS.find((s) => s.value === one(sp.sort))?.value ?? "relevantie") as ContractorFilters["sort"];
  const filters: ContractorFilters = {
    q: one(sp.q)?.slice(0, 80),
    specialty: one(sp.vakgebied),
    province: one(sp.provincie),
    priceLevel: one(sp.prijs),
    availability: one(sp.beschikbaar),
    projectType: one(sp.type),
    verification: one(sp.verificatie),
    minRating: num(sp.beoordeling),
    minProjects: num(sp.projecten),
    minOnTime: num(sp.optijd),
    maxBudgetDeviation: num(sp.budget),
    sort,
    page: num(sp.pagina) ?? 1,
  };
  const [user, result] = await Promise.all([getCurrentUser(), listContractors(filters)]);
  const favorites = user ? await getFavoriteIds(user.id) : new Set<string>();
  const activeFilterCount = [filters.q, filters.specialty, filters.province, filters.priceLevel, filters.availability, filters.projectType, filters.verification, filters.minRating, filters.minProjects, filters.minOnTime, filters.maxBudgetDeviation].filter((v) => v !== undefined).length;

  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v && k !== "pagina") params.set(k, v);
    params.set("pagina", String(page));
    return `/aannemers?${params}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6">
      <PageHeader
        title="Aannemersdatabase"
        description="Zoek en filter aannemers en onderaannemers. Statistieken worden alleen getoond bij voldoende onderliggende projecten; anders staat er expliciet dat gegevens ontbreken."
      />

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside aria-label="Filters" className="min-w-0">
          <FilterPanel className="group rounded-[var(--radius-card)] border border-ink-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-ink-900 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="size-4" aria-hidden /> Filters
                {activeFilterCount ? <span className="rounded bg-ink-900 px-1.5 text-xs text-white">{activeFilterCount}</span> : null}
              </span>
              <span className="text-xs font-normal text-ink-500 lg:hidden">tonen/verbergen</span>
            </summary>
            <form method="get" action="/aannemers" className="flex flex-col gap-4 border-t border-ink-100 p-4">
              <input type="hidden" name="sort" value={sort} />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="q">Zoeken</Label>
                <Input id="q" name="q" type="search" defaultValue={filters.q} placeholder="Bedrijfsnaam of plaats" />
              </div>
              <FilterSelect id="vakgebied" label="Vakgebied" value={filters.specialty} options={SPECIALTIES.map((s) => [s.id, s.name])} />
              <FilterSelect id="provincie" label="Provincie (werkgebied)" value={filters.province} options={PROVINCES.map((p) => [p, p])} />
              <FilterSelect id="prijs" label="Indicatief prijsniveau" value={filters.priceLevel} options={(Object.keys(PRICE_LEVELS) as (keyof typeof PRICE_LEVELS)[]).filter((k) => k !== "onbekend").map((k) => [k, `${PRICE_LEVELS[k].short} ${PRICE_LEVELS[k].label}`])} />
              <FilterSelect id="beschikbaar" label="Beschikbaar" value={filters.availability} options={[["direct", "Direct"], ["binnen_1_maand", "Binnen 1 maand"], ["binnen_3_maanden", "Binnen 3 maanden"]]} anyLabel="Maakt niet uit" />
              <FilterSelect id="type" label="Type project" value={filters.projectType} options={RENOVATION_TYPES.map((t) => [t, t])} />
              <FilterSelect id="verificatie" label="Verificatieniveau (minimaal)" value={filters.verification} options={(Object.keys(VERIFICATION_LEVELS) as (keyof typeof VERIFICATION_LEVELS)[]).filter((k) => k !== "zelf_opgegeven").map((k) => [k, VERIFICATION_LEVELS[k].label])} />
              <FilterSelect id="projecten" label="Geregistreerde projecten" value={filters.minProjects?.toString()} options={[["1", "1 of meer"], ["3", "3 of meer"], ["5", "5 of meer"], ["10", "10 of meer"]]} />
              <FilterSelect id="beoordeling" label="Beoordeling" value={filters.minRating?.toString()} options={[["3.5", "3,5 of hoger"], ["4", "4,0 of hoger"], ["4.5", "4,5 of hoger"]]} hint={`Alleen aannemers met ≥ ${site.minSampleSize} beoordelingen.`} />
              <FilterSelect id="optijd" label="Op tijd opgeleverd" value={filters.minOnTime?.toString()} options={[["60", "60% of meer"], ["75", "75% of meer"], ["90", "90% of meer"]]} hint={`Alleen aannemers met ≥ ${site.minSampleSize} projecten met opleverdata.`} />
              <FilterSelect id="budget" label="Gem. budgetafwijking" value={filters.maxBudgetDeviation?.toString()} options={[["0", "Binnen begroting (≤ 0%)"], ["5", "Maximaal +5%"], ["10", "Maximaal +10%"]]} hint="Alleen bij voldoende vergelijkbare projecten." />
              <div className="flex gap-2 pt-1">
                <Button type="submit" className="flex-1">
                  Toepassen
                </Button>
                <Button asChild variant="outline">
                  <Link href="/aannemers">Wissen</Link>
                </Button>
              </div>
            </form>
          </FilterPanel>
        </aside>

        <section aria-labelledby="resultaten" className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="resultaten" className="text-sm text-ink-600" aria-live="polite">
              <span className="font-semibold text-ink-950">{result.total}</span> {result.total === 1 ? "aannemer" : "aannemers"} gevonden
            </h2>
            <form method="get" action="/aannemers" className="flex flex-wrap items-center gap-2">
              {Object.entries(sp).map(([k, v]) => (typeof v === "string" && !["sort", "pagina"].includes(k) ? <input key={k} type="hidden" name={k} value={v} /> : null))}
              <Label htmlFor="sort" className="whitespace-nowrap text-ink-600">
                Sorteer op
              </Label>
              <Select id="sort" name="sort" defaultValue={sort} className="w-auto min-w-0 max-w-full flex-1 sm:min-w-52">
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
              <Button type="submit" variant="outline" size="md">
                Sorteer
              </Button>
            </form>
          </div>

          {result.sortNote ? <Notice tone="info" className="mb-4">{result.sortNote}</Notice> : null}

          {result.items.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Geen aannemers gevonden"
              description="Pas je filters aan. Let op: filters op beoordeling, op-tijdpercentage en budgetafwijking tonen alleen aannemers met voldoende gegevens."
              action={
                <Button asChild variant="outline">
                  <Link href="/aannemers">Alle filters wissen</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {result.items.map((c) => (
                <ContractorCard key={c.id} c={c} favorite={favorites.has(c.id)} loggedIn={Boolean(user)} />
              ))}
            </div>
          )}

          {result.pageCount > 1 ? (
            <nav aria-label="Paginering" className="mt-8 flex items-center justify-between gap-2 text-sm">
              {result.page > 1 ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={pageHref(result.page - 1)}>Vorige</Link>
                </Button>
              ) : (
                <span />
              )}
              <span className="text-ink-600">
                Pagina {result.page} van {result.pageCount}
              </span>
              {result.page < result.pageCount ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={pageHref(result.page + 1)}>Volgende</Link>
                </Button>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function FilterSelect({ id, label, value, options, anyLabel = "Alle", hint }: { id: string; label: string; value?: string; options: [string, string][]; anyLabel?: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} name={id} defaultValue={value ?? ""}>
        <option value="">{anyLabel}</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </Select>
      {hint ? <p className="text-xs text-ink-500">{hint}</p> : null}
    </div>
  );
}
