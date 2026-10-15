"use client";

import * as React from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { toggleFavoriteAction } from "@/actions/engagement";

export function FavoriteButton({
  contractorId,
  name,
  initial,
  loggedIn,
  size = "sm",
}: {
  contractorId: string;
  name: string;
  initial: boolean;
  loggedIn: boolean;
  size?: ButtonProps["size"];
}) {
  const [favorite, setFavorite] = React.useState(initial);
  const [pending, startTransition] = React.useTransition();
  if (!loggedIn) {
    return (
      <Button asChild variant="ghost" size={size}>
        <Link href="/inloggen?next=/aannemers" title="Log in om aannemers op te slaan">
          <Bookmark aria-hidden /> Opslaan
        </Link>
      </Button>
    );
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      aria-pressed={favorite}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await toggleFavoriteAction(contractorId);
          if (res.ok && res.data) {
            setFavorite(res.data.favorite);
            toast.success(res.message);
          } else toast.error(res.message ?? "Opslaan mislukt.");
        })
      }
    >
      {favorite ? <BookmarkCheck aria-hidden className="text-brand-600" /> : <Bookmark aria-hidden />}
      {favorite ? "Opgeslagen" : "Opslaan"}
      <span className="sr-only"> {name}</span>
    </Button>
  );
}
