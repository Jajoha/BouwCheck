# Klantkant opnieuw opgebouwd: oplevering (ronde 2)

Deze ronde vervangt de homepage uit ronde 1 (die draaide om de Offertecheck). De homepage draait nu om het Teamvoorstel.

## Eerst: drie punten om te beslissen

1. **"Twee verbouwingen per jaar? Dan is Pro voordeliger." klopt nog steeds niet.** Twee Projectpassen kosten € 598 per jaar. Pro kost 12 × € 199 = € 2.388 per jaar. Pro wordt pas voordeliger vanaf 8 verbouwingen per jaar (8 × € 299 = € 2.392). Er staat dus: **"Acht verbouwingen per jaar of meer? Dan is Pro voordeliger."** Een unit-test bewaakt dat die zin bij de prijzen past. Wil je "twee", dan moet de prijs veranderen, bijvoorbeeld Pro als jaarabonnement onder € 598.
2. **BOUWPLAN.md staat niet in de repo.** Ik heb gewerkt met de harde grenzen uit hoofdstuk 1 van de opdracht.
3. **"Eén vaste contactpersoon" is een belofte over jullie werkwijze, niet over het product.** Het staat er omdat jij het letterlijk zo aanleverde. In de software bestaat geen contactpersoon-veld. Zorg dat elke klant er echt één krijgt.

## Wat er gebouwd is

- **Hero-formulier** (`#start`): verbouwing, provincie en prioriteit. De prioriteit is een radiogroep zonder standaardkeuze. Het formulier gaat naar de bestaande flow `/projecten/nieuw?verbouwing=…&provincie=…&prioriteit=…`. Wie niet is ingelogd, gaat via inloggen of registreren terug met de keuzes erbij.
  - Provincie en type renovatie staan vooraf ingevuld. Badkamer en Keuken worden "Badkamer en/of keuken", Complete renovatie blijft "Complete renovatie", Anders laat het type open.
  - De prioriteit gaat mee als verborgen veld. Laagste prijs = `budget`, Snelste start = `snelheid`, Meest betrouwbaar = `kwaliteit`.
  - Na het opslaan opent de teamvoorstellen-pagina met jouw keuze voorop, met het label "Jouw keuze". De ordening binnen elke prioriteit is niet aangepast.
- **Regiomelding**: telt actieve vakmensen met `is_demo = false` per provincie, op basis van het werkgebied. Zijn het er minder dan `MIN_ECHTE_VAKMENSEN` (standaard 10, in te stellen via een omgevingsvariabele), dan verschijnt de melding. Het formulier blijft verstuurbaar. De melding verwijst naar de Offertecheck en staat daarom alleen aan met `FEATURE_OFFERTECHECK`.
- **Voorbeeldteams** in de hero: de bestaande `TeamCard` heeft een compacte variant gekregen. Het kopje (Goedkoopst, Snelst, Meest betrouwbaar) staat los van de bedrijfsnamen. Is het beste team al getoond, dan komt het volgende team uit dezelfde ordening, zodat geen team twee keer verschijnt.
- **Fictieve vakmensen**: de markering bestond al (`contractors.is_demo`), dus er is geen `isFictief` toegevoegd. De regel "Dit voorbeeld bevat nog verzonnen vakmensen." staat bij de voorbeeldteams, in echte teamvoorstellen en op profielen. Hij verschijnt alleen als er een fictieve vakman in beeld is.
- **Bewijsblok**: telt niet-fictieve vakmensen met goedgekeurde bedrijfsgegevens (verificatieniveau 1). Het verschijnt alleen per provincie met 10 of meer. In de huidige database zijn alle vakmensen fictief, dus het blok is onzichtbaar.
  - **Cases overgeslagen**: het case-model heeft titel, regio, samenvatting en resultaat, maar geen naam of citaat. Daarom staan cases niet meer op de homepage. Het beheer van cases werkt nog gewoon.
- **Funnel-events**:
  - `teamvoorstel_gestart` slaat nu ook `prioriteit` en `provincie` op. Het event wordt gelogd als het project wordt aangemaakt, net als voorheen.
  - Nieuw is `offertecheck_link_geklikt`, voor een klik op "Heb je al offertes?" (`bron` = `home-hero` of `home-slot`). Hiervoor is er een migratie: `20261025000000_funnel_offertes_link.sql`.
- **Eén homepage**: de oude tweede homepage (zonder `FEATURE_OFFERTECHECK`) en de oude prijspagina met testprijzen zijn weg. Zonder die flag verdwijnen alleen de Offertecheck-onderdelen: het blok "Heb je al offertes?", de links, de Offertecheck-kaart en de regiomelding.

## Planning en extra werk (hoofdstuk 7)

Geen van beide zit in het product. Er zijn alleen gewenste start- en opleverdata bij een project, en een formulier om achteraf het eindresultaat vast te leggen. Er is geen planningstool en geen registratie van extra werk. Daarom:
- De Projectpas-tekst is nu: **"Eén verbouwing: al je aanvragen en vakmensen op één plek, met een vaste contactpersoon."**
- "Offertes, planning en extra werk op één plek" is overal weg.
- Op de pagina "Offerteaanvraag voorbereiden" staat nu "het werk, de gewenste data en het budget" in plaats van "scope, planning en budget".

## Weggelaten of aangepaste beloftes

| Belofte | Wat er nu staat | Waarom |
| --- | --- | --- |
| "Twee verbouwingen per jaar? Dan is Pro voordeliger." | "Acht verbouwingen per jaar of meer? …" | Rekenkundig onjuist (zie boven). |
| Projectpas: planning en extra werk op één plek | Tekst uit hoofdstuk 7 | Niet gebouwd. |
| Cases met naam en citaat | Niet getoond | Het datamodel heeft geen naam en geen citaat. |
| Regiomelding zonder Offertecheck | Niet getoond | De melding verwijst naar de Offertecheck. |
| Footerzin "Bedragen zijn excl. btw, tenzij…" | Weg | Niet elk bedrag op de site staat met "(zonder btw)". Projectbudgetten kunnen bijvoorbeeld met btw zijn. |
| "Vervanger binnen 72 uur", garanties, bonussen | Blijven weg (ronde 1) | Niet gebouwd. |

## Zinnen langer dan 12 woorden die ik niet heb ingekort

Allemaal letterlijk door jou aangeleverd. Mijn teller telt "€ 149" als twee woorden.

| Pagina | Zin | Woorden |
| --- | --- | --- |
| Homepage, "Heb je al offertes?" | Binnen 48 uur weet je wat er mist en waar je te veel betaalt. | 13 |
| Homepage + /prijzen, Projectpas-kaart | Eén verbouwing: al je aanvragen en vakmensen op één plek, met een vaste contactpersoon. | 14 |
| Homepage, Eerste klanten | Pro kost dan € 149 in plaats van € 199 per maand (zonder btw). | 12 (13 met losse €) |
| /offertecheck, intro | Binnen 48 uur weet je wat er mist, wat er niet in zit en waar je te veel betaalt. | 17 |
| Homepage, regiomelding | Dan nemen we contact op zodra er een team voor je is. | 11 (ok) |

Op /registreren?rol=aannemer, /founding-members en alle bedankpagina's staat geen zin boven de 12 woorden. /transparantie valt buiten hoofdstuk 3 en heeft nog 7 langere zinnen; die zijn in ronde 1 al vereenvoudigd.

## Bewijs: geen verboden woorden

**Gerenderde pagina's** (Playwright, met de productiebuild). Geen treffers voor `bèta|testfase|pilot|demo-database|scope|offreer|offreren|stelpost|meerwerk|excl. btw|uitvoerder` op:
`/`, `/prijzen`, `/offertecheck`, `/founding-members`, `/registreren?rol=aannemer`, `/bedankt?type=pro`, `/bedankt?type=contact`, `/offertecheck/bedankt`, `/founding-members/bedankt`, `/transparantie`, `/contact`. In de E2E-test komen daar `/registreren`, `/voorwaarden`, `/disclaimer` en `/aannemers/lindewaard` bij.

**Broncode** (`src/app`, `src/components`, `src/content`, `src/config`, `src/lib`; beheer en interne API's uitgezonderd). Na het wegfilteren van code-identifiers blijven alleen variabele- en componentnamen over, zoals `ScopeEditor`, `ScopeForm`, `const scope = …` en `prefill.scope.length`. Er staat geen zichtbare klanttekst meer tussen. Het HTML-attribuut `scope="col"` in de voorbeeldtabel is een toegankelijkheidsattribuut en geen tekst.

## Oud → nieuw

### Homepage (bron: `src/content/homepage.ts`)

| Blok | Oud (ronde 1) | Nieuw |
| --- | --- | --- |
| Hero label | Voor vastgoedondernemers en projectontwikkelaars die verbouwen | Voor vastgoedondernemers en projectontwikkelaars |
| H1 | Laat je offertes gratis checken voordat je tekent | Kies de beste vakmensen voor je verbouwing. |
| Hero tekst | Je stuurt ons je offertes. Binnen 48 uur hoor je: … (3 punten) … Zo kom je achteraf niet voor dure verrassingen te staan. | Kies op prijs, snelheid of betrouwbaarheid. Binnen 72 uur zie je wie het werk kan doen. |
| Hero actie | Knop "Check mijn offertes – gratis" | Formulier + knop "Vind mijn vakmensen – gratis" + link "Heb je al offertes? Laat ze gratis checken →" |
| Hero rechts | — | Drie voorbeeldteams: Goedkoopst / Snelst / Meest betrouwbaar |
| Voordelenstrip | — | Binnen 72 uur een team · Eén vaste contactpersoon · Niemand betaalt voor een betere plek |
| Herken je dit? | 4 problemen | Vervallen; nu "Klaar met gokken op een aannemer?" met 4 kaarten |
| Waar kies jij op? | — | Prijs / Tijd / Betrouwbaarheid + "Niemand kan betalen om hoger te staan." + "Zo controleren wij →" |
| Waarom je ons kunt vertrouwen | 4 punten | Vervallen |
| Zo werkt het | — | 3 stappen + "Vind mijn vakmensen – gratis" |
| Zo ziet een check eruit | Los blok bovenaan | "Heb je al offertes?" lager op de pagina; tekst onder het voorbeeld: "Offerte A lijkt het goedkoopst. Tel wat er mist erbij op. Dan is hij dat niet meer." |
| Voor wie | — | Vastgoedondernemer / Projectontwikkelaar / Vakman |
| Prijzen | "Wat je bij ons kunt krijgen", Offertecheck eerst, Pro "Meest gekozen voor meerdere panden", "excl. btw" | "Wat het kost", Teamvoorstel eerst, Pro "Voordeligst bij meerdere panden", "(zonder btw)" |
| Teamvoorstel-kaart | Wij zoeken vakmensen die allemaal voor precies hetzelfde werk een prijs geven. Binnen 72 uur. | Teams die een prijs geven voor hetzelfde werk. Binnen 72 uur. |
| Offertecheck-kaart | Wij vergelijken je offertes en laten zien wat er mist. | Wij vergelijken je offertes. Je ziet wat er mist. |
| Projectpas-kaart | Je regelt één verbouwing via ons: offertes, planning en extra werk op één plek. | Eén verbouwing: al je aanvragen en vakmensen op één plek, met een vaste contactpersoon. |
| Pro-kaart | Hetzelfde, maar voor al je verbouwingen. | Al je verbouwingen, met een vaste contactpersoon. |
| Eerste klanten | … Wie nu meedoet, houdt de lage prijs voor altijd: Pro voor € 149 in plaats van € 199 per maand, excl. btw. | Er zijn 25 plekken per regio. Pro kost dan € 149 in plaats van € 199 per maand (zonder btw). Die prijs houd je. |
| Vakmensen | Los blok "Ben je aannemer, zzp'er of klusser?" | Kaart "Vakman" in "Voor wie" |
| Vragen | 5 vragen (offertes eerst) | 6 vragen (Hoe kiezen jullie…, Kunnen aannemers betalen…, Kiest de computer voor mij?, Wie is mijn contactpersoon?, Wat doen jullie met mijn offertes?, Wat kost het?) |
| Slot | Teken pas als je weet wat je koopt + Check mijn offertes – gratis | Vind de beste vakmensen voor je verbouwing. + Vind mijn vakmensen – gratis + Heb je al offertes? … |

### Navigatie en footer
| Oud | Nieuw |
| --- | --- |
| Hoe het werkt (/#hoe-het-werkt) · Prijzen (/prijzen) · Voor vakmensen | Hoe het werkt (/#zo-werkt-het) · Prijzen (/#prijzen) · Voor vakmensen (/#voor-vakmensen) · Inloggen |
| Knop rechtsboven "Check mijn offertes" | "Vind mijn vakmensen" → /#start |
| Footer: Offertecheck, Teamvoorstel aanvragen, … | Vind mijn vakmensen, Offertecheck, Eerste klanten, Hoe het werkt, Prijzen, Zo controleren wij |
| "© 2026 BouwCheck. Bedragen zijn excl. btw, tenzij er iets anders staat." | "© 2026 BouwCheck" |

### /prijzen
| Oud | Nieuw |
| --- | --- |
| Begin gratis met een Offertecheck of een Teamvoorstel. … | Het Teamvoorstel is gratis. Vakmensen betalen niets voor aanvragen. |
| Kaarten uit ronde 1 | Dezelfde vier kaarten als de homepage, met ankers #teamvoorstel, #offertecheck, #projectpas, #pro |
| Onderwerpen: Offertecheck, Teamvoorstel, Projectpas, Pro, Contact | Teamvoorstel, Offertecheck, Projectpas, Pro, Contact |
| Bedankt: "Bedankt. We nemen binnen 1 werkdag contact met je op om te starten." | "Bedankt. We bellen of mailen je binnen 1 werkdag." |
| Zonder flag: oude testprijzen (Aannemersselectie € 199 enz.) | Weg: altijd dezelfde kaarten |

### /offertecheck
| Oud | Nieuw |
| --- | --- |
| Label: … die verbouwen | Voor vastgoedondernemers en projectontwikkelaars |
| H1: Laat je offertes gratis checken voordat je tekent | Laat je offertes gratis checken. |
| Intro: Je stuurt ons je offertes. Binnen 48 uur hoor je wat er mist, … | Binnen 48 uur weet je wat er mist, wat er niet in zit en waar je te veel betaalt. |
| 5 voordelen | 6 korte voordelen (los "Wat er niet in zit. Dat betaal je later alsnog.") |
| Bonus: … die allemaal voor hetzelfde werk een prijs geven? … | Wil je vakmensen die een prijs geven voor hetzelfde werk? Vraag dan een gratis Teamvoorstel aan. |
| Ik geef BouwCheck toestemming om contact met mij op te nemen over deze check. | BouwCheck mag contact met mij opnemen over deze check. |
| Mijn prijzen mogen zonder namen worden gebruikt om prijzen te vergelijken (optioneel). | Jullie mogen mijn prijzen zonder namen gebruiken om te vergelijken (optioneel). |

### Rapport van de Offertecheck
| Oud | Nieuw |
| --- | --- |
| Badge "Stelpost" | "Kan nog veranderen" |
| Uitleg "Stelpost: een bedrag dat nog kan veranderen, vaak omhoog." | "Kan nog veranderen: dit bedrag ligt nog niet vast. Vaak wordt het hoger." |
| "excl. btw" | "(zonder btw)" |
| "€ X – € Y excl. btw" | "van € X tot € Y (zonder btw)" |

### Teamvoorstellen en de rest van de app
| Oud | Nieuw |
| --- | --- |
| Kwaliteit / Kwalitatieve optie | Betrouwbaarheid / Meest betrouwbare optie (intern blijft het `kwaliteit`) |
| "op budget, kwaliteit en snelheid" | "op prijs, snelheid en betrouwbaarheid" |
| "excl. btw" / "incl. btw" bij elk bedrag (`formatMoney`) | "(zonder btw)" / "(met btw)" |
| Uitvoerder (rol, profielen, registers, portaal, privacy) | Vakman / vakmensen |
| Scope uit je Offertecheck / Verder met de scope uit je check | Het werk uit je Offertecheck / Verder met het werk uit je check |
| scope, stelpost, meerwerk in hints en voorbeelden | hetzelfde werk, "prijs per onderdeel", extra werk |
| Ik geef BouwCheck toestemming om contact met mij op te nemen over … | BouwCheck mag contact met mij opnemen over … |

## Gewijzigde bestanden

Nieuw:
- `src/components/marketing/start-form.tsx`
- `src/lib/data/regio.ts`
- `supabase/migrations/20261025000000_funnel_offertes_link.sql`

Herschreven:
- `src/content/homepage.ts`
- `src/app/page.tsx`
- `src/components/marketing/aanbod-kaarten.tsx`
- `src/components/marketing/ladder-pricing.tsx`
- `src/app/prijzen/page.tsx`
- `tests/unit/content.test.ts`
- `tests/e2e/01-public.spec.ts`

Gewijzigd:
- `.env.example`, `README.md`
- `src/config/site.ts`, `src/lib/events.ts`, `src/lib/format.ts`, `src/lib/domain/constants.ts`, `src/lib/domain/offertecheck.ts`, `src/lib/validation/index.ts`
- `src/actions/intake.ts`
- `src/components/intake/intake-wizard.tsx`, `src/components/teams/team-card.tsx`, `src/components/marketing/check-example.tsx`, `src/components/marketing/lead-form.tsx`
- `src/components/layout/site-header.tsx`, `src/components/layout/site-footer.tsx`
- `src/components/offertecheck/offer.tsx`, `src/components/offertecheck/offertecheck-form.tsx`, `src/components/offertecheck/report-view.tsx`
- `src/components/founding/founding-form.tsx`, `src/components/domain/register-section.tsx`, `src/components/domain/source-tag.tsx`, `src/components/portal/contractor-profile-form.tsx`, `src/components/projects/outcome-form.tsx`, `src/components/quotes/quote-request-form.tsx`
- `src/app/projecten/nieuw/page.tsx`, `src/app/projecten/[id]/voorstellen/page.tsx`, `src/app/projecten/[id]/page.tsx`, `src/app/projecten/page.tsx`
- `src/app/offertecheck/page.tsx`, `src/app/bedankt/page.tsx`, `src/app/founding-members/page.tsx`, `src/app/rapport/[token]/page.tsx`
- `src/app/aannemers/[slug]/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/offerteaanvragen/nieuw/page.tsx`, `src/app/portaal/page.tsx`, `src/app/privacy/page.tsx`, `src/app/transparantie/page.tsx`
- `tests/e2e/helpers.ts`, `tests/e2e/02-contractors.spec.ts`, `tests/e2e/03-intake.spec.ts`, `tests/e2e/04-auth-projects.spec.ts`, `tests/e2e/06-registers.spec.ts`, `tests/e2e/08-offertecheck.spec.ts`, `tests/e2e/09-founding.spec.ts`

Screenshots in `docs/screenshots/`:
- `homepage-desktop.png`, `homepage-desktop-boven.png`, `homepage-mobiel.png`, `homepage-mobiel-boven.png`, `homepage-mobiel-regiomelding.png`
- `prijzen-desktop.png`, `prijzen-mobiel.png`
- `offertecheck-desktop.png`, `offertecheck-desktop-boven.png`, `offertecheck-mobiel.png`, `offertecheck-mobiel-boven.png`

## Tests

- typecheck en lint: schoon.
- vitest: 101 geslaagd. `content.test.ts` controleert prijzen, "(zonder btw)", het omslagpunt, de hero-keuzes tegen de ordening en de verboden woorden.
- Playwright: 39 geslaagd. Nieuw zijn:
  - de exacte volgorde van de homepageblokken;
  - drie verschillende voorbeeldteams;
  - de hero-radiogroep, de regiomelding en de flow tot een vooraf ingevulde intake;
  - het funnel-event voor de offertes-link;
  - op 375 px het formulier direct onder de kop;
  - geen verboden woorden op 15 klantpagina's.
- Testteksten die door de opdracht veranderden zijn aangepast. Eén test is van betekenis veranderd: "cases op de homepage" controleert nu dat cases zonder naam en citaat er niet staan.
