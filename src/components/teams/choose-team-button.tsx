"use client";

import { useTransition } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { chooseTeamAction } from "@/actions/intake";

export function ChooseTeamButton({ projectId, label, contractorIds }: { projectId: string; label: string; contractorIds: string[] }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            const res = await chooseTeamAction(projectId, label, contractorIds);
            if (res && !res.ok) toast.error(res.message ?? "Kiezen mislukt.");
          } catch (err) {
            if (err && typeof err === "object" && "digest" in err) throw err;
            toast.error("Kiezen mislukt.");
          }
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
      Kies dit team <ArrowRight aria-hidden />
    </Button>
  );
}
