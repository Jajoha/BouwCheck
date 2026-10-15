import type { Metadata } from "next";
import { PageHeader, TableWrap, td, th } from "@/components/ui/misc";
import { site } from "@/config/site";
import { VERIFICATION_LEVELS } from "@/lib/domain/verification";

export const metadata: Metadata = { title: "Hoe wij gegevens beoordelen" };

const METRICS = [
  ["Op tijd opgeleverd", "Aandeel projecten met werkelijke opleverdatum ≤ geplande opleverdatum.", "Projecten met beide data"],
  ["Gemiddelde vertraging", "Gemiddelde van (werkelijke − geplande opleverdatum) in kalenderdagen.", "Projecten met beide data"],
  ["Budgetafwijking", "Gemiddelde van (definitieve kosten − begroot) / begroot × 100. Positief = duurder.", "Projecten met begroting én eindbedrag"],
  ["Herstelwerk", "Aandeel projecten waarbij na oplevering herstelwerk nodig was.", "Projecten waarvan dit bekend is"],
  ["Doorlooptijd", "Gemiddeld aantal kalenderdagen tussen start en werkelijke oplevering.", "Projecten met start- en opleverdatum"],
  ["Beoordelingen", "Gemiddelde (1–5) van gepubliceerde beoordelingen die aan een project gekoppeld zijn.", "Gepubliceerde beoordelingen"],
];

export default function TransparencyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 pb-28 sm:px-6">
      <PageHeader title="Hoe wij selecteren en beoordelen" description="Betrouwbaarheid gaat boven een mooie score. Zo komen teamvoorstellen en cijfers op BouwCheck tot stand." />
      <div className="mt-8 space-y-10 text-[15px] leading-relaxed text-ink-800">
        <section>
          <h2 className="text-lg font-semibold text-ink-950">Van projectomschrijving naar teamvoorstel</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>
              <strong>Intake.</strong> Je beschrijft het project en voegt eventueel foto&apos;s toe. Een AI-model (Claude van Anthropic) stelt daaruit een lijst
              werkzaamheden voor met vakgebied, hoeveelheid en zekerheid, plus risico&apos;s en open vragen. De AI noemt geen prijzen en kiest geen aannemers. Jij bevestigt
              of corrigeert de werkzaamheden; zonder AI vul je ze zelf in.
            </li>
            <li>
              <strong>Kandidaten.</strong> Alleen actieve uitvoerders — aannemersbedrijven, zelfstandige vakmensen (zzp) en klussers — die in de provincie van je project
              werken en het betreffende vakgebied uitvoeren. Kleine klussen kunnen naar een klusser gaan.
            </li>
            <li>
              <strong>Teams.</strong> Een hoofdaannemer die alles aanneemt, of een team van losse vakspecialisten (per vakgebied één). Bij een team van specialisten ligt
              de coördinatie bij jou; dat staat bij het voorstel.
            </li>
            <li>
              <strong>Ordening per prioriteit</strong> — telkens één criterium, geen samengestelde score:
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>
                  <em>Budget:</em> laagste middenwaarde van de kostenbandbreedte = som van (hoeveelheid × minimum- en maximumtarief) uit de door aannemers opgegeven
                  tarieven, of het all-in m²-tarief van een hoofdaannemer.
                </li>
                <li>
                  <em>Kwaliteit:</em> de beoordeling van de zwakste schakel in het team (alleen aannemers met minimaal {site.minSampleSize} gepubliceerde beoordelingen);
                  bij gelijke stand minder herstelwerk, daarna meer gecontroleerde projecten.
                </li>
                <li>
                  <em>Snelheid:</em> de vroegste datum waarop het hele team beschikbaar is, volgens de opgegeven beschikbaarheid.
                </li>
              </ul>
            </li>
            <li>
              <strong>Onvoldoende gegevens</strong> (geen passend tarief, te weinig beoordelingen, onbekende beschikbaarheid of een vakgebied zonder aanbieder in de regio)?
              Dan wordt een team niet tussen de anderen gerangschikt maar apart getoond, met de reden.
            </li>
          </ol>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-ink-950">Openbare registers</h2>
          <p className="mt-3">
            Een AI-agent zoekt per uitvoerder op KvK-nummer in officiële registers: het Centraal Insolventieregister, het KvK Handelsregister, Rechtspraak.nl en officiële
            bekendmakingen. Alles wat de agent vindt is een voorstel; een medewerker controleert de bron en beslist. Er is geen score: een signaal is een feit met een bron.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>
              <strong>Uitsluiten</strong> van teamvoorstellen gebeurt alleen bij een juridisch feit — faillissement, surseance van betaling of een opgeheven
              KvK-inschrijving — dat in de bron op het <em>KvK-nummer</em> van de uitvoerder staat. De uitvoerder verschijnt dan apart, met reden en bron. De database
              dwingt deze regel af.
            </li>
            <li>
              <strong>Waarschuwen</strong> bij al het andere (een recente inschrijving, een mogelijke doorstart op hetzelfde adres, een rechterlijke uitspraak, of een
              juridisch feit dat alleen op naam is gevonden). De uitvoerder blijft gerangschikt; de waarschuwing staat bij het team.
            </li>
            <li>
              <strong>Niets gevonden</strong> tonen we ook, met de controledatum en de geraadpleegde registers. Dat is geen garantie: niet alles staat online. Controles
              ouder dan 90 dagen gelden als verouderd en worden opnieuw ingepland.
            </li>
            <li>
              <strong>Reageren:</strong> de uitvoerder ziet elk zichtbaar signaal in het portaal en kan er openbaar op reageren; een onjuist signaal trekken we in.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-ink-950">Vier soorten informatie</h2>
          <ul className="mt-3 space-y-2">
            {Object.values(VERIFICATION_LEVELS).map((l) => (
              <li key={l.label}>
                <strong>{l.label}:</strong> {l.description}
              </li>
            ))}
            <li>
              <strong>Ervaringen van opdrachtgevers:</strong> beoordelingen gekoppeld aan een geregistreerd project. Zonder projectkoppeling geen beoordeling.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-ink-950">Wanneer tonen we een cijfer?</h2>
          <p className="mt-2">
            Pas vanaf <strong>{site.minSampleSize} geldige waarnemingen</strong>. Daaronder staat er &lsquo;Nog onvoldoende gegevens&rsquo; met het aantal waarnemingen. Bij
            elk cijfer staat het aantal projecten (n). Gegevens ouder dan {site.staleAfterMonths} maanden worden als verouderd gemarkeerd.
          </p>
          <p className="mt-2">Alleen projectresultaten die door beheer zijn goedgekeurd en niet betwist of afgewezen zijn, tellen mee.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-ink-950">Berekeningen</h2>
          <TableWrap className="mt-3">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr>
                  <th className={th}>Metriek</th>
                  <th className={th}>Berekening</th>
                  <th className={th}>Waarnemingen</th>
                </tr>
              </thead>
              <tbody>
                {METRICS.map(([a, b, c]) => (
                  <tr key={a}>
                    <td className={`${td} font-medium`}>{a}</td>
                    <td className={td}>{b}</td>
                    <td className={td}>{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-ink-950">Wat we bewust niet doen</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Geen samengestelde betrouwbaarheidsscore met willekeurige gewichten.</li>
            <li>Geen betaalde rankings: sortering gebeurt uitsluitend op het criterium dat je kiest.</li>
            <li>Geen &lsquo;beste aannemer&rsquo;-label wanneer gegevens niet vergelijkbaar zijn.</li>
            <li>Geen automatische &lsquo;onbetrouwbaar&rsquo;-markering op basis van een paar negatieve ervaringen.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-ink-950">Correctie en bezwaar</h2>
          <p className="mt-2">
            Iedere ingelogde gebruiker kan onjuiste informatie melden. Aannemers kunnen reageren op beoordelingen en resultaten betwisten. Een betwist resultaat telt niet
            mee totdat beheer de melding heeft afgehandeld. Alle beheeracties worden gelogd.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-ink-950">Manipulatie voorkomen</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Eén projectresultaat en één beoordeling per aannemer per project.</li>
            <li>Alleen voor eigen projecten, met een aannemer die aan het project gekoppeld is.</li>
            <li>Nieuwe resultaten zijn &lsquo;in behandeling&rsquo; tot beheer ze beoordeelt.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
