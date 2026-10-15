"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold text-ink-950">Er ging iets mis</h1>
      <p className="mt-2 text-ink-600">Probeer het opnieuw. Blijft het probleem bestaan, neem dan contact op.</p>
      {error.digest ? <p className="mt-1 text-xs text-ink-400">Referentie: {error.digest}</p> : null}
      <Button className="mt-6" onClick={reset}>
        Opnieuw proberen
      </Button>
    </div>
  );
}
