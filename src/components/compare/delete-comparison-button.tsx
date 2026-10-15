"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteComparisonAction } from "@/actions/engagement";

export function DeleteComparisonButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon" aria-label={`${name} verwijderen`}>
          <Trash2 />
        </Button>
      }
      title="Vergelijking verwijderen?"
      description={`‘${name}’ wordt verwijderd. De aannemers en projecten blijven bestaan.`}
      confirmLabel="Verwijderen"
      onConfirm={async () => {
        const res = await deleteComparisonAction(id);
        if (res.ok) {
          toast.success(res.message);
          router.refresh();
        } else toast.error(res.message);
      }}
    />
  );
}
