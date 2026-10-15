import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Privacyverklaring (concept)" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacyverklaring">
      <p>{site.name} verwerkt persoonsgegevens om het platform te laten werken. Hieronder lees je welke gegevens, waarom en hoe lang.</p>
      <h2>Welke gegevens</h2>
      <ul>
        <li>Accountgegevens: naam, e-mailadres, (optioneel) bedrijfsnaam, rol en voorkeursregio.</li>
        <li>Projectgegevens: locatie, planning, budget, omschrijvingen, notities en bijlagen die je zelf toevoegt.</li>
        <li>Offerteaanvragen, vastgelegde offertes, projectresultaten en beoordelingen.</li>
        <li>Technische gegevens: een sessiecookie om je ingelogd te houden. Er worden geen tracking- of advertentiecookies gebruikt.</li>
      </ul>
      <h2>Waarvoor</h2>
      <ul>
        <li>Het leveren van de dienst: projecten beheren, aannemers vergelijken en aanvragen voorbereiden.</li>
        <li>Het berekenen van geanonimiseerde prestatiestatistieken van aannemers op basis van goedgekeurde projectresultaten.</li>
        <li>Moderatie en het afhandelen van meldingen en bezwaren.</li>
      </ul>
      <h2>Wie kan wat zien</h2>
      <ul>
        <li>Je projecten, notities en bijlagen zijn alleen voor jou zichtbaar, en voor beheer voor zover nodig voor moderatie.</li>
        <li>Een aannemer ziet een offerteaanvraag (en meegestuurde bijlagen) alleen als je die via het platform naar hem verzendt.</li>
        <li>Openbare aannemersprofielen tonen geen persoonsgegevens van opdrachtgevers. Beoordelingen worden zonder naam getoond.</li>
      </ul>
      <h2>Bewaartermijn en rechten</h2>
      <p>Je kunt je gegevens inzien, laten corrigeren of laten verwijderen via {site.contactEmail}. Bewaartermijnen worden vóór de commerciële lancering vastgesteld.</p>
    </LegalPage>
  );
}
