import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Disclaimer (concept)" };

export default function DisclaimerPage() {
  return (
    <LegalPage title="Disclaimer">
      <p>
        <strong>Verzonnen voorbeeldprofielen.</strong> Op {site.name} staan nog verzonnen profielen van vakmensen. Alles in zo&apos;n profiel is verzonnen: de naam, het
        KvK-nummer, de contactgegevens, tarieven, projectresultaten, beoordelingen en verificatieniveaus. Ze zijn gemarkeerd als &lsquo;{site.demoLabel}&rsquo;. Ze zeggen
        niets over bestaande bedrijven. Lijkt een naam op een echt bedrijf? Dan is dat toeval.
      </p>
      <p>
        <strong>Geen advies.</strong> Statistieken zijn beschrijvend en gebaseerd op een beperkt aantal geregistreerde projecten. Ze voorspellen niet hoe een volgend
        project verloopt. Gebruik ze als één van de inputs voor je beslissing.
      </p>
      <p>
        <strong>Prijzen.</strong> Indicatieve tarieven zijn door bedrijven zelf opgegeven richtprijzen en geen offerte. Bedragen zijn exclusief btw tenzij anders vermeld.
      </p>
    </LegalPage>
  );
}
