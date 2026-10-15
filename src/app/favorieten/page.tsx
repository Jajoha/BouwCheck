import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ContractorCard } from "@/components/domain/contractor-card";
import { requireFlipper } from "@/lib/auth/session";
import { listFavoriteContractorIds } from "@/lib/data/records";
import { getContractorsByIds } from "@/lib/data/contractors";

export const metadata: Metadata = { title: "Opgeslagen aannemers" };

export default async function FavoritesPage() {
  const user = await requireFlipper("/favorieten");
  const contractors = await getContractorsByIds(await listFavoriteContractorIds(user.id));
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6">
      <PageHeader title="Opgeslagen aannemers" description="Je favoriete vakmensen. Alleen voor jou zichtbaar." />
      {contractors.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={Bookmark}
          title="Nog geen aannemers opgeslagen"
          description="Gebruik ‘Opslaan’ op een aannemerskaart of profiel."
          action={
            <Button asChild variant="outline">
              <Link href="/aannemers">Naar aannemers</Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {contractors.map((c) => (
            <ContractorCard key={c.id} c={c} favorite loggedIn />
          ))}
        </div>
      )}
    </div>
  );
}
