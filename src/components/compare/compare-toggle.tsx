"use client";

import { Check, Plus } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useCompare } from "./compare-provider";

export function CompareToggle({ id, name, size = "sm", className }: { id: string; name: string; size?: ButtonProps["size"]; className?: string }) {
  const { has, toggle, ready } = useCompare();
  const active = ready && has(id);
  return (
    <Button
      type="button"
      size={size}
      variant={active ? "secondary" : "outline"}
      aria-pressed={active}
      className={className}
      onClick={() => toggle({ id, name })}
    >
      {active ? <Check aria-hidden /> : <Plus aria-hidden />}
      {active ? "In vergelijking" : "Vergelijken"}
      <span className="sr-only"> {name}</span>
    </Button>
  );
}
