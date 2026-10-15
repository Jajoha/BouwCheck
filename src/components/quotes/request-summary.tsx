import { DefinitionList } from "@/components/ui/misc";
import type { QuoteRequest } from "@/lib/data/records";
import { specialtyName } from "@/lib/domain/constants";
import { formatDate, formatMoney } from "@/lib/format";

export function RequestSummary({ r, attachments }: { r: QuoteRequest; attachments: { id: string; file_name: string }[] }) {
  return (
    <DefinitionList
      items={[
        { term: "Project", value: r.project_name },
        { term: "Werkzaamheden", value: <span className="whitespace-pre-line">{r.work_description}</span> },
        { term: "Vakgebieden", value: r.specialty_ids.map(specialtyName).join(", ") || "—" },
        { term: "Budgetindicatie", value: r.budget_indication ? formatMoney(r.budget_indication, r.budget_vat_included) : "Niet gedeeld" },
        { term: "Gewenste planning", value: `${formatDate(r.desired_start_date)} t/m ${formatDate(r.desired_completion_date)}` },
        { term: "Toelichting", value: r.additional_notes ?? "—" },
        { term: "Bijlagen", value: attachments.length ? attachments.map((a) => a.file_name).join(", ") : "Geen" },
        { term: "Contact", value: `${r.contact_name} · ${r.contact_email}${r.contact_phone ? ` · ${r.contact_phone}` : ""}` },
      ]}
    />
  );
}
