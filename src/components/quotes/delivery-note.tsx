import { Notice } from "@/components/ui/misc";
import type { QuoteRequest } from "@/lib/data/records";
import { formatDateTime } from "@/lib/format";

/** Maakt altijd expliciet of (en hoe) een aanvraag werkelijk bij de aannemer is aangekomen. */
export function DeliveryNote({ r, demoMode }: { r: QuoteRequest; demoMode: boolean }) {
  if (r.delivery_channel === "platform") {
    return (
      <Notice tone="success" title="Verzonden via het BouwCheck-aannemersportaal">
        {r.company_name} heeft de aanvraag op {formatDateTime(r.sent_at)} in het portaal ontvangen. Er is geen e-mail verstuurd.
      </Notice>
    );
  }
  if (r.delivery_channel === "demo") {
    return (
      <Notice tone="demo" title="Demo-verzending — niet daadwerkelijk verstuurd">
        Deze aanvraag is in de demo-modus als ‘verzonden’ gemarkeerd, maar is níet naar {r.company_name} verstuurd. Het profiel is fictief en e-mailverzending is niet geconfigureerd.
      </Notice>
    );
  }
  if (["concept", "klaar"].includes(r.status)) {
    return r.contractor_has_account ? (
      <Notice tone="info">Na verzenden ziet {r.company_name} de aanvraag in het BouwCheck-aannemersportaal.</Notice>
    ) : demoMode ? (
      <Notice tone="demo">{r.company_name} heeft geen BouwCheck-account. Bij verzenden wordt dit een demo-verzending: er wordt niets extern verstuurd.</Notice>
    ) : (
      <Notice tone="warning">{r.company_name} heeft geen BouwCheck-account en e-mailverzending is niet geconfigureerd. Deze aanvraag kan nog niet worden verzonden.</Notice>
    );
  }
  return null;
}
