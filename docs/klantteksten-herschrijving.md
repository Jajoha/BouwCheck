# Klantteksten herschreven: oplevering

Screenshots van de productiebuild (`FEATURE_OFFERTECHECK=true`, `FEATURE_FOUNDING_MEMBERS=true`), in `docs/screenshots/`:

| | Desktop (1440 px) | Mobiel (375 px) |
| --- | --- | --- |
| Homepage, hele pagina | `homepage-desktop.png` | `homepage-mobiel.png` |
| Homepage, eerste scherm | `homepage-desktop-boven.png` | `homepage-mobiel-boven.png` (knop zichtbaar, onderkant op 577 px van 667 px) |
| /prijzen | `prijzen-desktop.png` | `prijzen-mobiel.png` |

Gemeten: geen horizontale scroll, één h1 per pagina, h1 op 16 px van de rand.

## Afwijkingen van de opdracht: graag een besluit

1. **"Twee verbouwingen per jaar? Dan is Pro voordeliger." klopt niet.** 2 × € 299 = € 598, en Pro kost 12 × € 199 = € 2.388 per jaar. Pro is pas voordeliger vanaf 8 verbouwingen per jaar (8 × € 299 = € 2.392). Er staat nu: **"Acht verbouwingen per jaar of meer? Dan is Pro voordeliger."** Een unit-test bewaakt dat deze zin klopt met de prijzen. Wil je dat er "twee" staat, dan moet de prijs veranderen (bijv. Pro per jaar, of een lagere maandprijs).
2. **BOUWPLAN.md staat niet in de repository** (ook niet in de git-geschiedenis). Ik heb hoofdstuk 0 dus niet kunnen lezen. Ik heb gewerkt met de grenzen uit de opdracht: alleen tekst, volgorde en knoppen, plus wat de opdracht zelf noemde.
3. **De nieuwe homepage en /prijzen zitten achter `FEATURE_OFFERTECHECK`**, net als de huidige versie. Zonder die flag bestaat /offertecheck niet (404). Dan blijft de oude homepage en de oude prijspagina staan. Daar heb ik alleen de fasetaal uit gehaald. Zet de flag aan in productie.
4. **Geen nieuw veld `isFictief`.** De markering bestond al: `contractors.is_demo` (en `projects.is_demo`). Alle demoprofielen in de seed staan daarop op `true`. Die gebruik ik.
5. **Kleine datamodelwijziging die de opdracht vroeg:** het formulier op /prijzen heeft nu de onderwerpen Offertecheck, Teamvoorstel, Projectpas, Pro en Contact. Offertecheck en Teamvoorstel waren geen toegestane waarden. Daarvoor is er één migratie: `supabase/migrations/20261024000000_lead_onderwerpen.sql`. Die verruimt alleen de check-constraint. Oude waarden blijven geldig.

## Weggelaten beloftes (niet gebouwd)

| Belofte | Waar | Waarom weg |
| --- | --- | --- |
| Vervanger binnen 72 uur | Pro-kaart, homepage, /prijzen | Volgens de opdracht. Er is ook geen functie voor. |
| "Geen passend teamvoorstel binnen 72 uur? Dan is die maand of projectpas gratis." | /prijzen, /founding-members | Er wordt niets afgerekend, dus "gratis" of terugbetalen kan niet. |
| "Is de projectpas zijn geld niet waard? Geld terug." | /prijzen, /founding-members | Geen betaalflow, dus ook geen terugbetaling. |
| Bonussen: standaardcontracten, meerwerkprotocol, opleverchecklist, prijsbenchmarks per regio | /prijzen, /founding-members | Geen van deze bestaat in de app. Prijzen worden wel verzameld (met toestemming), maar klanten zien ze nergens. |
| "Anders krijg je je teamvoorstel met voorrang" | /offertecheck | Er is geen voorrangsregeling. |
| Portfolio (€ 595 per maand) | /prijzen | Niet in het nieuwe aanbod van vier kaarten. |
| Oprichtersverhaal | Homepage | `founderStory` is leeg. Het blok verschijnt vanzelf als je het invult in `src/config/site.ts`. |

**Gebleven, maar check of ze kloppen** (het zijn jouw letterlijke teksten):
- Projectpas: "offertes, planning en extra werk op één plek". Offertes en offerteaanvragen per project bestaan. Een echte planning en registratie van extra werk (meerwerk) heb ik niet gevonden.
- "Binnen 1 werkdag contact" op het bedankscherm. Dat is een belofte voor jullie werkwijze; het systeem regelt dit niet.
- Teamvoorstel "binnen 72 uur": klopt, het voorstel wordt direct berekend.

## Verwijderde teksten

| Waar | Oud |
| --- | --- |
| Elke pagina, bovenaan | "Demo-modus: alle aannemers, cijfers en beoordelingen zijn fictief. Offerteaanvragen worden niet extern verzonden." + "Tijdelijke opslag: …" / "Tijdelijke bestandsopslag: …" (component verwijderd) |
| Footer | "Bèta. Aannemersprofielen, cijfers en beoordelingen in deze omgeving zijn fictieve demo-data …" |
| Homepage | Blok "Niet alle informatie is even hard" met de vier verificatieniveaus (staat nog op /transparantie) |
| Homepage | Placeholder "Placeholder — oprichtersverhaal." |
| Homepage | Blokken "Hoe het werkt" (ladder), "Daarna: teams op diezelfde scope" met live teamvoorbeeld, "Gebouwd voor vastgoedondernemers…", oude FAQ |
| Homepage (teamvoorbeeld) | "Live berekend uit de demo-database." |
| /prijzen | "Bèta: nu gratis, alleen werkelijke kosten" + "De bedragen hieronder zijn de prijzen na de validatiefase …" |
| /prijzen | Badge "Nu gratis, alleen werkelijke kosten" per kaart, "Aanbevolen", rekentabel Projectpas of Pro, garantievoetnoot |
| /prijzen (zonder flag) | "Voorlopige testprijzen", badge "Testprijs", "Interesse of pilot aanvragen", "gratis tijdens de testfase" |
| /bedankt | "Let op: in deze bèta worden geen automatische bevestigingsmails verstuurd." |
| /contact | "feedback op de bèta of interesse in een pilot", "(voorbeeldadres in de bèta)" |
| Rapport | "Gratis tijdens de bèta." |
| /founding-members | Bonussen en garanties (zie hierboven) |

## Gewijzigde teksten (oud → nieuw)

### Navigatie en footer
| Oud | Nieuw |
| --- | --- |
| Nav: Hoe het werkt · Offertecheck · Prijzen · Voor vakmensen | Hoe het werkt · Prijzen · Voor vakmensen · Inloggen |
| Knop rechtsboven: "Gratis Offertecheck" | "Check mijn offertes" → /offertecheck#upload |
| Footer-kolom "Voor aannemers" | "Voor vakmensen" |
| "Aanmelden als uitvoerder" | "Aanmelden als vakman" |
| "Inloggen aannemersportaal" + "Inloggen" (zelfde scherm) | één link "Inloggen" |
| "Gratis Offertecheck" / "Founding members" / "Prijzen (testfase)" / "Hoe wij selecteren en beoordelen" | "Offertecheck" / "Eerste klanten" / "Prijzen" / "Zo controleren wij" |
| "© … BouwCheck — bèta. Prijzen in euro; btw-status staat bij ieder bedrag vermeld." | "© … BouwCheck. Bedragen zijn excl. btw, tenzij er iets anders staat." |
| "BouwCheck rangschikt aannemers nooit op basis van betaling." | "Aannemers kunnen niet betalen om bovenaan te staan." |

### Homepage
Helemaal nieuw, letterlijk volgens de opdracht (met uitzondering van punt 1 hierboven). Alle teksten staan in **`src/content/homepage.ts`**. De oude hero "Zie het meerwerk vóórdat het je marge opeet." is vervangen door "Laat je offertes gratis checken voordat je tekent". De voorbeeldtabel toont nu drie offertes. Bij A ontbreken afvoer van puin (± € 1.200), meterkast (± € 1.900) en vloer egaliseren (± € 1.500). A kost in de offerte € 14.000 (goedkoopst), met wat er mist € 18.600 (duurst). B: € 17.600, C: € 18.100.

### /prijzen
| Oud | Nieuw |
| --- | --- |
| Vijf treden (Offertecheck, Teamvoorstel, Projectpas, BouwCheck Pro, Portfolio) met eigen teksten | Dezelfde vier kaarten als de homepage, uit hetzelfde bestand |
| "Interesse tonen" | "Aanvragen" — "Kies waar je mee wilt starten. Laat je gegevens achter. Wij nemen contact met je op." "Er wordt nu niets afgerekend." |
| Onderwerpen: Projectpas, BouwCheck Pro, Portfolio, Contactformulier | Offertecheck, Teamvoorstel, Projectpas, Pro, Contact (vooraf gekozen via `?plan=`) |
| /bedankt: "Bedankt, je aanvraag is ontvangen … Er is geen betaling gestart" | Projectpas/Pro: "Bedankt. We nemen binnen 1 werkdag contact met je op om te starten." + "Er wordt nu niets afgerekend." |

### /offertecheck
| Oud | Nieuw |
| --- | --- |
| Label: "… die renoveren" | "… die verbouwen" |
| h1: "Zie het meerwerk vóórdat het je marge opeet." | "Laat je offertes gratis checken voordat je tekent" |
| Intro (3 lange zinnen, "gegund", "uitgesloten", "rendement op de bouwplaats") | "Je stuurt ons je offertes. Binnen 48 uur hoor je wat er mist, wat er niet in zit en waar je te veel betaalt." |
| "Alle offertes op één scope. …" | "Alle offertes naast elkaar. Elke post staat op één regel, dus je vergelijkt hetzelfde werk." |
| "Ontbrekende posten in euro's. …" | "Wat er mist, in euro's. Je ziet wat een andere offerte er wel voor rekent." |
| "Stelposten en uitsluitingen uitgelicht. …" | "Bedragen die nog kunnen veranderen. En wat er niet in de prijs zit. Daar komen extra kosten vaak vandaan." |
| "Prijsverschillen per post. …" | "Grote prijsverschillen per post. Zo zie je waar je te veel betaalt. Of waar een prijs verdacht laag is." |
| "Je onderhandelingslijst. …" | "Je lijst met vragen. Die stel je aan elke aannemer voordat je tekent." |
| Bonus: "Wil je teams die op deze ene scope offreren? …" | "Wil je vakmensen die allemaal voor hetzelfde werk een prijs geven? Vraag dan een gratis Teamvoorstel aan." |
| "Onze belofte": "… anders krijg je je teamvoorstel met voorrang …" | "Binnen 48 uur": "Je rapport komt binnen 48 uur. Vinden we niets? Dan zeggen we dat eerlijk." |
| "Elke check wordt door een mens nagekeken. Daarom nemen we er maximaal 40 per week aan." | "Een medewerker kijkt elke check na. Daarom doen we er maximaal 40 per week." |
| Knop "Gratis Offertecheck" | "Check mijn offertes – gratis" |
| "…geanonimiseerd worden gebruikt voor prijsbenchmarks" | "Mijn prijzen mogen zonder namen worden gebruikt om prijzen te vergelijken (optioneel)." |
| Bedankpagina: "We zetten je offertes op één scope …" | "We zetten je offertes naast elkaar. Een medewerker kijkt het rapport na. …" |

### Rapport
| Oud | Nieuw |
| --- | --- |
| "Je 2 offertes op één scope" | "Je 2 offertes naast elkaar" |
| "Alle posten op één scope" | "Alle posten naast elkaar" |
| "Stelpost = voorlopig bedrag, kan hoger uitvallen. Uitgesloten = …" | "Stelpost: een bedrag dat nog kan veranderen, vaak omhoog. Zit er niet in: de offerte zegt dat dit niet in de prijs zit." |
| Badge "Uitgesloten" | "Zit er niet in" |
| "Stelposten en uitsluitingen" | "Bedragen die nog kunnen veranderen, en wat er niet in zit" |
| "Je onderhandelingslijst" | "Je lijst met vragen" |
| "Wil je teams die op deze ene scope offreren?" + knop "Start een teamvoorstel met deze scope" | "Wil je vakmensen die allemaal voor hetzelfde werk een prijs geven?" + knop "Vraag een Teamvoorstel aan met dit werk" |
| Mail: "…op één scope gezet. De belangrijkste bevindingen:" | "…naast elkaar gezet. Dit valt het meest op:" |

### Overige pagina's
| Waar | Oud | Nieuw |
| --- | --- | --- |
| /transparantie | "Hoe wij selecteren en beoordelen", lange zinnen, "scope", "uitvoerders" | "Zo controleren wij"; korte zinnen; "vakmensen", "verificatieniveaus", "niet gerangschikt" |
| /founding-members | h1 "BouwCheck Flip Control: je team binnen 72 uur, je renovatie onder controle." | "Doe als een van de eersten mee en betaal minder"; prijzen met "excl. btw"; "instroom" → "start op de eerste dag van een kwartaal" |
| /registreren?rol=aannemer | "Aanmelden als uitvoerder" | "Aanmelden als vakman" |
| /contact | zie verwijderd | "Heb je een vraag? Stuur ons een bericht. We nemen contact met je op." |
| Juridisch (concept) | "concept voor de bètafase"; Voorwaarden "1. Bèta … Gebruik is tijdens de bèta kosteloos." | "Deze tekst is een concept. Een jurist moet hem nog nakijken."; "1. De dienst … Bij elke dienst staat wat die kost." De "(concept)"-labels en noindex staan er nog. |
| Profiel van een verzonnen vakman | Blok "Demo-data — niet geverifieerd. Dit is een fictief profiel voor demonstratiedoeleinden …" | "Dit voorbeeld bevat nog verzonnen vakmensen." Badge: "Voorbeeld — verzonnen gegevens" |
| Teamvoorstellen | Badge "Demo-data" per team | Eén regel bovenaan, alleen als er verzonnen vakmensen in zitten: "Dit voorbeeld bevat nog verzonnen vakmensen." |
| Teamvoorbeeld (homepage zonder flag) | "BUDGET" vast tegen de bedrijfsnaam; "zwakste 4/5" | Label als losse badge boven de naam; "zwakste schakel: 4/5"; bedragen met "excl. btw" |
| /profiel (voorbeeldaccount) | "…opgeslagen in de lokale demo-database." | "Je bent ingelogd met een voorbeeldaccount. Dit account is verzonnen." |

## Niet aangepast (buiten de genoemde pagina's)
- Pagina's na inloggen (dashboard, projecten, offerteaanvragen) gebruiken nog woorden als "scope" en "Demo-verzending". Die laatste is eerlijke informatie: zo'n aanvraag is niet echt verstuurd.
- De demo-inlogknoppen op /inloggen (alleen in demo-modus).
- De rode sterretjes bij verplichte velden in formulieren. Dat is een formulierconventie (verborgen voor schermlezers), geen tekst.

## Gewijzigde bestanden
Nieuw: `src/content/homepage.ts`, `src/components/marketing/aanbod-kaarten.tsx`, `supabase/migrations/20261024000000_lead_onderwerpen.sql`, `tests/unit/content.test.ts`, `docs/` (dit document en de screenshots).
Verwijderd: `src/components/layout/demo-banner.tsx`.
Gewijzigd: zie de PR-diff (layout, header, footer, homepage, /prijzen, /bedankt, /offertecheck(+bedankt), rapport(+teamvoorstel), /transparantie, /founding-members(+bedankt), /registreren, /contact, juridische pagina's, /profiel, aannemersprofiel, teamvoorstellen, badges, teamkaart, Offertecheck-aanbod, -formulier en -rapport, `src/config/site.ts`, `src/lib/domain/constants.ts`, `src/lib/domain/offertecheck.ts`, `src/lib/data/offertecheck.ts`, README en de tests).

## Tests
- `npm run typecheck`, `npm run lint`: schoon.
- `npm test`: 13 bestanden, 100 tests geslaagd (nieuw: `content.test.ts` bewaakt prijzen, "excl. btw", het omslagpunt en verboden woorden).
- `npm run test:e2e`: 37 geslaagd. Tests met oude teksten zijn bijgewerkt naar de nieuwe teksten. Nieuw: volgorde van de homepageblokken, de vier kaarten op homepage en /prijzen, onderwerpen in het formulier, geen fasetaal op alle klantpagina's, hero-knop zichtbaar op 375 × 667.
