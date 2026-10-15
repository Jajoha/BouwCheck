import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <p className="text-sm font-semibold text-brand-700">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink-950">Pagina niet gevonden</h1>
      <p className="mt-2 text-ink-600">Deze pagina bestaat niet, is verplaatst of je hebt er geen toegang toe.</p>
      <div className="mt-6 flex gap-2">
        <Button asChild variant="outline">
          <Link href="/">Naar home</Link>
        </Button>
        <Button asChild>
          <Link href="/projecten/nieuw">Start je project</Link>
        </Button>
      </div>
    </div>
  );
}
