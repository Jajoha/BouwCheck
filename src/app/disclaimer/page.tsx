import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Disclaimer (concept)" };

export default function DisclaimerPage() {
  return (
    <LegalPage title="Disclaimer">
      <p>
        <strong>Demo-data.</strong> In deze bèta zijn alle aannemersprofielen, KvK-nummers, contactgegevens, tarieven, projectresultaten, beoordelingen en
        verificatiestatussen fictief. Ze zijn gemarkeerd als &lsquo;{site.demoLabel}&rsquo; en zeggen niets over bestaande ondernemingen. Overeenkomsten met bestaande
        bedrijfsnamen berusten op toeval.
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
