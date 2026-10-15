import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Gebruiksvoorwaarden (concept)" };

export default function TermsPage() {
  return (
    <LegalPage title="Gebruiksvoorwaarden">
      <h2>1. Bèta</h2>
      <p>{site.name} is in een testfase. Functionaliteit kan wijzigen en er kunnen fouten optreden. Gebruik is tijdens de bèta kosteloos.</p>
      <h2>2. Informatie over aannemers</h2>
      <p>
        {site.name} toont informatie van verschillende bronnen en vermeldt bij elk gegeven de bron en verificatiestatus. {site.name} garandeert niet dat informatie juist,
        volledig of actueel is. Jij blijft verantwoordelijk voor je keuze van een aannemer en voor de afspraken die je met hem maakt.
      </p>
      <h2>3. Projectresultaten en beoordelingen</h2>
      <ul>
        <li>Je registreert alleen resultaten van projecten die je zelf als opdrachtgever hebt laten uitvoeren.</li>
        <li>Je vult gegevens naar waarheid in en plaatst geen beledigende of privacygevoelige inhoud.</li>
        <li>Beheer mag bijdragen modereren, corrigeren, als betwist markeren of verwijderen. Aannemers kunnen reageren en bezwaar maken.</li>
      </ul>
      <h2>4. Onafhankelijkheid</h2>
      <p>Aannemers kunnen geen hogere positie, betere beoordeling of verificatiestatus kopen.</p>
      <h2>5. Aansprakelijkheid</h2>
      <p>De aansprakelijkheid van {site.name} wordt vóór commercieel gebruik juridisch uitgewerkt.</p>
    </LegalPage>
  );
}
