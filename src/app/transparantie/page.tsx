import type { Metadata } from "next";
import { PageHeader, TableWrap, td, th } from "@/components/ui/misc";
import { site } from "@/config/site";
import { VERIFICATION_LEVELS } from "@/lib/domain/verification";

export const metadata: Metadata = { title: "Zo controleren wij" };

const METRICS = [
  ["Op tijd opgeleverd", "Hoe vaak het werk klaar was op of vóór de geplande datum.", "Projecten met beide datums"],
  ["Gemiddelde vertraging", "Gemiddeld aantal dagen tussen de geplande en de echte opleverdatum.", "Projecten met beide datums"],
  ["Budgetafwijking", "Hoeveel procent de eindprijs afweek van de begroting. Een plus betekent duurder.", "Projecten met begroting én eindprijs"],
  ["Herstelwerk", "Hoe vaak er na oplevering nog iets hersteld moest worden.", "Projecten waarvan dit bekend is"],
  ["Doorlooptijd", "Gemiddeld aantal dagen tussen start en oplevering.", "Projecten met start- en opleverdatum"],
  ["Beoordelingen", "Gemiddeld cijfer van 1 tot 5. Alleen beoordelingen die bij een project horen.", "Gepubliceerde beoordelingen"],
];

export default function TransparencyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 pb-28 sm:px-6">
      <PageHeader title="Zo controleren wij" description="Eerlijke cijfers gaan voor een mooie score. Hier lees je hoe een Teamvoorstel en de cijfers tot stand komen." />
      <div className="mt-8 space-y-10 text-[15px] leading-relaxed text-ink-800">
        <section>
          <h2 className="text-lg font-semibold text-ink-950">Van werkomschrijving naar Teamvoorstel</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>
              <strong>Je beschrijft het werk.</strong> Je kunt foto&apos;s toevoegen. Een AI-model (Claude van Anthropic) maakt daar een lijst met werk van. Per
              onderdeel staat erbij welk vak het is en hoeveel. De AI noemt geen prijzen. De AI kiest ook geen vakmensen. Jij controleert de lijst en past hem aan.
            </li>
            <li>
              <strong>Wie komt in aanmerking?</strong> Alleen vakmensen die in de provincie van je project werken. En die het werk uit de lijst doen. Dat kunnen
              aannemersbedrijven, zzp&apos;ers en klussers zijn. Kleine klussen kunnen naar een klusser gaan.
            </li>
            <li>
              <strong>Teams.</strong> Een hoofdaannemer die alles doet. Of een team met per vak één vakman. Bij zo&apos;n team regel jij zelf de afstemming. Dat staat
              bij het voorstel.
            </li>
            <li>
              <strong>Volgorde.</strong> Jij kiest wat het zwaarst weegt. Per keuze sorteren we op één ding. Er is geen verborgen totaalscore.
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>
                  <em>Budget:</em> de laagste geschatte prijs. Die rekenen we uit met de tarieven die vakmensen zelf opgeven, keer de hoeveelheden uit je lijst.
                </li>
                <li>
                  <em>Betrouwbaarheid:</em> het cijfer van de zwakste schakel in het team. Alleen vakmensen met minstens {site.minSampleSize} beoordelingen tellen mee. Is het
                  gelijk? Dan gaat minder herstelwerk voor. Daarna meer gecontroleerde projecten.
                </li>
                <li>
                  <em>Snelheid:</em> de eerste datum waarop het hele team kan beginnen. Dat geven de vakmensen zelf op.
                </li>
              </ul>
            </li>
            <li>
              <strong>Te weinig gegevens?</strong> Bijvoorbeeld geen tarief, te weinig beoordelingen of geen vakman in de regio. Dan staat het team apart, als
              &lsquo;niet gerangschikt&rsquo;. De reden staat erbij.
            </li>
          </ol>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-ink-950">Openbare registers</h2>
          <p className="mt-3">
            We zoeken elk bedrijf op met zijn KvK-nummer. Dat doen we in officiële registers: het Centraal Insolventieregister, het Handelsregister van de KvK,
            Rechtspraak.nl en officiële bekendmakingen. Een AI-agent zoekt. Een medewerker controleert de bron en beslist. Er is geen score. Een signaal is een feit met een
            bron.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>
              <strong>Niet meenemen</strong> doen we alleen bij een juridisch feit op het KvK-nummer. Dat is een faillissement, uitstel van betaling of een opgeheven
              inschrijving. Het bedrijf staat dan apart, met de reden en de bron.
            </li>
            <li>
              <strong>Waarschuwen</strong> doen we bij al het andere. Bijvoorbeeld een nieuwe inschrijving, een uitspraak van een rechter, of een feit dat we alleen op
              naam vonden. Het bedrijf blijft dan in de lijst. De waarschuwing staat bij het team.
            </li>
            <li>
              <strong>Niets gevonden?</strong> Dat laten we ook zien, met de datum en de registers. Het is geen garantie: niet alles staat online. Na 90 dagen controleren we
              opnieuw.
            </li>
            <li>
              <strong>Reageren:</strong> het bedrijf ziet elk signaal en kan erop reageren. Klopt een signaal niet? Dan halen we het weg.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-ink-950">Vier verificatieniveaus</h2>
          <p className="mt-3">Bij elk gegeven zie je hoe zeker het is. Heeft een bedrijf het zelf ingevuld, of hebben wij het gecontroleerd?</p>
          <ul className="mt-3 space-y-2">
            {Object.values(VERIFICATION_LEVELS).map((l) => (
              <li key={l.label}>
                <strong>{l.label}:</strong> {l.description}
              </li>
            ))}
            <li>
              <strong>Ervaringen van opdrachtgevers:</strong> beoordelingen die bij een project horen. Zonder project geen beoordeling.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-ink-950">Wanneer tonen we een cijfer?</h2>
          <p className="mt-2">
            Pas na <strong>{site.minSampleSize} projecten</strong>. Een cijfer over één klus zegt niets. Daaronder staat er &lsquo;Nog onvoldoende gegevens&rsquo;. Bij
            elk cijfer staat op hoeveel projecten het is gebaseerd (n). Gegevens ouder dan {site.staleAfterMonths} maanden markeren we als verouderd.
          </p>
          <p className="mt-2">Alleen goedgekeurde projectresultaten tellen mee. Een betwist of afgewezen resultaat telt niet mee.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-ink-950">Zo rekenen we</h2>
          <TableWrap className="mt-3">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr>
                  <th className={th}>Cijfer</th>
                  <th className={th}>Berekening</th>
                  <th className={th}>Telt mee</th>
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
          <h2 className="text-lg font-semibold text-ink-950">Wat we niet doen</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Geen totaalscore met verzonnen gewichten.</li>
            <li>Aannemers kunnen niet betalen om bovenaan te staan. We sorteren alleen op wat jij kiest.</li>
            <li>Geen label &lsquo;beste aannemer&rsquo; als gegevens niet te vergelijken zijn.</li>
            <li>Geen label &lsquo;onbetrouwbaar&rsquo; na een paar slechte ervaringen.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-ink-950">Iets klopt niet?</h2>
          <p className="mt-2">
            Iedereen met een account kan een fout melden. Aannemers mogen reageren op wat er over hen staat. Ze kunnen een resultaat ook betwisten. Een betwist resultaat telt
            niet mee tot wij de melding hebben bekeken. We leggen elke actie van ons vast.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-ink-950">Zo voorkomen we nep-beoordelingen</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Per project één resultaat en één beoordeling per aannemer.</li>
            <li>Alleen voor je eigen project, met een aannemer die bij dat project hoort.</li>
            <li>Een nieuw resultaat telt pas mee als wij het hebben bekeken.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
