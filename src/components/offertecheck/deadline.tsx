import { Badge } from "@/components/ui/badge";
import { deadlineFor } from "@/lib/domain/offertecheck";
import { nowMs } from "@/lib/today";

export const CHECK_STATUS = {
  concept: { label: "Concept", tone: "muted" },
  ingediend: { label: "Ingediend", tone: "info" },
  in_analyse: { label: "In analyse", tone: "info" },
  review: { label: "Te beoordelen", tone: "warning" },
  verstuurd: { label: "Verstuurd", tone: "positive" },
  verwijderd: { label: "Verwijderd", tone: "muted" },
} as const;

/** Tijd tot (of over) de 48-uursdeadline, gerekend vanaf indienen. Server component. */
export function DeadlineBadge({ submittedAt, sentAt }: { submittedAt: string | null; sentAt: string | null }) {
  if (!submittedAt) return null;
  const deadline = deadlineFor(submittedAt).getTime();
  if (sentAt) {
    const onTime = new Date(sentAt).getTime() <= deadline;
    return <Badge tone={onTime ? "positive" : "danger"}>{onTime ? "Binnen 48 uur" : "Te laat verstuurd"}</Badge>;
  }
  const hours = Math.round((deadline - nowMs()) / 3600_000);
  if (hours < 0) return <Badge tone="danger">{-hours} uur over tijd</Badge>;
  return <Badge tone={hours <= 12 ? "warning" : "neutral"}>nog {hours} uur</Badge>;
}
