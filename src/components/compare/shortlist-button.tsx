"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addToShortlistAction } from "@/actions/projects";

export function ShortlistButton({ projectId, contractorId }: { projectId: string; contractorId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await addToShortlistAction(projectId, [contractorId]);
          if (res.ok) {
            toast.success(res.message);
            router.refresh();
          }
          else toast.error(res.message ?? "Mislukt.");
        })
      }
    >
      <ListPlus aria-hidden /> Zet op shortlist
    </Button>
  );
}
