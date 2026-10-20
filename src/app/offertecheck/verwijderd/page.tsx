import type { Metadata } from "next";
import Link from "next/link";
import { Trash2 } from "lucide-react";

export const metadata: Metadata = { title: "Check verwijderd" };

export default function OffertecheckDeletedPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <Trash2 className="size-10 text-ink-500" aria-hidden />
      <h1 className="mt-4 text-2xl font-semibold text-ink-950">Je check is verwijderd</h1>
      <p className="mt-2 text-ink-600">Je offertes, het rapport en je contactgegevens zijn verwijderd. Geanonimiseerde prijsgegevens (als je daarvoor toestemming gaf) bevatten niets dat naar jou of de aannemer herleidbaar is.</p>
      <Link href="/" className="mt-6 text-sm font-medium text-ink-800 underline">
        Naar de startpagina
      </Link>
    </div>
  );
}
