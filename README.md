# BouwCheck

**De juiste aannemer. Zonder verrassingen.**

BouwCheck is een bèta van een onafhankelijk platform voor Nederlandse vastgoedflippers en -investeerders. De flipper beschrijft het project (en voegt eventueel foto's toe); AI zet dat om in een lijst werkzaamheden met hoeveelheden; BouwCheck stelt daarna **teams van aannemers en vakspecialisten** samen, geordend per prioriteit: **Budget**, **Kwaliteit** en **Snelheid**. Handmatig aannemers vergelijken is bewust geen onderdeel van het product: BouwCheck levert wie wat kan doen, met uitleg waarom.

> **Demo-data.** Alle aannemers, KvK-nummers, contactgegevens, tarieven, projectresultaten, beoordelingen en verificatiestatussen in de seed zijn fictief. Ze zijn gemarkeerd met `is_demo = true` en worden in de interface getoond als **“Demo-data — niet geverifieerd”**.

---

## Inhoud

- [Snel starten](#snel-starten)
- [Wat zit erin](#wat-zit-erin)
- [AI-intake en teamvoorstellen](#ai-intake-en-teamvoorstellen)
- [Technologie en architectuur](#technologie-en-architectuur)
- [Configuratie](#configuratie)
- [Database, migraties en seed](#database-migraties-en-seed)
- [Deployen op Vercel (Neon + Blob)](#deployen-op-vercel-neon--blob)
- [Andere PostgreSQL-host (bijv. Supabase)](#andere-postgresql-host-bijv-supabase)
- [Demo-modus](#demo-modus)
- [Tests](#tests)
- [Hoe statistieken worden berekend](#hoe-statistieken-worden-berekend)
- [Beveiliging en privacy](#beveiliging-en-privacy)
- [Bekende beperkingen en wat nog configuratie nodig heeft](#bekende-beperkingen-en-wat-nog-configuratie-nodig-heeft)

---

## Snel starten

Vereisten: **Node.js 20.9+** (getest met Node 22) en npm. Geen database of externe accounts nodig. Zonder `ANTHROPIC_API_KEY` werkt alles behalve de AI-analyse; de werkzaamheden vul je dan zelf in.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Bij de eerste request wordt automatisch een lokale PostgreSQL-database (PGlite, in `./.data/pglite`) aangemaakt, gemigreerd en gevuld met demo-data.

Inloggen kan via **/inloggen → “Demo als …”** of met:

| Rol | E-mailadres | Wachtwoord |
| --- | --- | --- |
| Vastgoedflipper | `flipper@demo.bouwcheck.test` | `demo-bouwcheck` |
| Aannemer (Schildersbedrijf Kwastenburg) | `aannemer@demo.bouwcheck.test` | `demo-bouwcheck` |
| Beheerder | `beheer@demo.bouwcheck.test` | `demo-bouwcheck` |

Productiebuild lokaal:

```bash
npm run build
npm run start
```

Demo terugzetten naar de beginsituatie: **Beheer → Demo-data → Demo-data terugzetten**, of (met de server gestopt) `npm run db:reset`.

### Suggestie voor een demonstratie (± 10 minuten)

1. **Home** → voorbeeld van teamvoorstellen, berekend op een demoproject met echte demo-data.
2. Log in als **vastgoedflipper** → **Projecten → Tussenwoning Amersfoort → Teamvoorstellen**:
   - *Budget*: laagste kostenindicatie (tarieven × hoeveelheden), met budgetcheck;
   - *Kwaliteit*: hoogste beoordeling van de zwakste schakel in het team (min. 3 beoordelingen per aannemer);
   - *Snelheid*: vroegste datum waarop het hele team beschikbaar is;
   - teams die op een prioriteit niet te rangschikken zijn, staan apart met de reden (bijv. geen elektricien in de provincie).
3. **Nieuw project** → beschrijving + foto's → *Analyseer met AI* (vereist `ANTHROPIC_API_KEY`) of *Werkzaamheden zelf invullen* → werkzaamheden controleren → teamvoorstellen → **Kies dit team** → offerteaanvraag met het team voorgeselecteerd → controleren → verzenden (duidelijk als *demo-verzending* gemarkeerd).
4. **Aannemersprofiel** (link vanuit een teamvoorstel) → bronlabels per sectie, statistieken met *n*, demo-verificatie gemarkeerd als *fictief*.
5. **Beheer → AI-gebruik** → verbruik en kosten per account; ook zichtbaar op het eigen profiel.
6. **Projectresultaat registreren** → staat “in behandeling”. Log in als **beheerder** → *Resultaten & reviews* → goedkeuren; beheerlog.
7. Log in als **aannemer** → portaal: ontvangen aanvraag (echt via het platform verzonden) beantwoorden, verificatie aanvragen.

---

## Wat zit erin

| Onderdeel | Route(s) | Status |
| --- | --- | --- |
| Landingspagina (hero met voorbeeld-teamvoorstellen, hoe het werkt, voordelen, transparantie, aannemers-CTA, FAQ, footer) | `/` | Werkt |
| Aannemersprofiel met bronscheiding (zelf opgegeven / administratief gecontroleerd / projectdata / ervaringen) | `/aannemers/[slug]` | Werkt |
| AI-intake: beschrijving + foto's → werkzaamheden met hoeveelheden, risico's, open vragen; altijd te corrigeren | `/projecten/nieuw`, `/projecten/[id]/werkzaamheden` | Werkt (vereist `ANTHROPIC_API_KEY`; zonder sleutel handmatig invullen) |
| Teamvoorstellen per prioriteit (Budget / Kwaliteit / Snelheid), team kiezen → offerteaanvraag | `/projecten/[id]/voorstellen` | Werkt |
| AI-verbruik per account (tokens, kosten in USD, limieten per maand en per uur) | `/beheer/ai-gebruik`, `/profiel` | Werkt |
| Registratie, inloggen, uitloggen, wachtwoordherstel, onboarding | `/registreren`, `/inloggen`, `/wachtwoord-vergeten`, `/onboarding` | Werkt (herstelmail: zie beperkingen) |
| Dashboard (projecten, aanvragen, favorieten, activiteit, aandachtspunten) | `/dashboard` | Werkt |
| Renovatieprojecten: bewerken, status, gekozen aannemers, offertes vastleggen, bijlagen, notities, tijdlijn | `/projecten/...` | Werkt |
| Offerteaanvragen: voorbereiden → controleren → verzenden, statusbeheer | `/offerteaanvragen/...` | Werkt (zie verzending) |
| Projectresultaten + reviews (één per aannemer per project, moderatie) | `/projecten/[id]/resultaat` | Werkt |
| Favorieten / opgeslagen aannemers | `/favorieten` | Werkt |
| Aannemersportaal: profiel, tarieven, referenties, verificatie aanvragen, aanvragen beantwoorden, reageren op reviews | `/portaal` | Werkt |
| Beheer: aannemers (toevoegen/corrigeren/(de)activeren), aanmeldingen & leads, verificaties, moderatie, meldingen, projecten, aanvragen, gebruikers, demo-data, beheerlog | `/beheer/...` | Werkt |
| Prijspagina met testprijzen + interesseformulier | `/prijzen` | Werkt (geen betalingen) |
| Contact, privacy, voorwaarden, disclaimer (concept), “Hoe wij gegevens beoordelen” | `/contact`, `/privacy`, `/voorwaarden`, `/disclaimer`, `/transparantie` | Concepttekst |

De oude aannemerszoekpagina `/aannemers` stuurt door naar `/projecten/nieuw`; `/vergelijken` en `/vergelijkingen` bestaan niet meer.

Merknaam, tagline, hero-teksten, drempelwaarden en testprijzen staan centraal in [`src/config/site.ts`](src/config/site.ts).

---

## AI-intake en teamvoorstellen

**1. Intake.** De flipper beschrijft het project, de locatie en optioneel tot 8 foto's. Foto's worden in de browser verkleind (max. 1568 px, JPEG) zodat het verzoek onder de ~4,5 MB-limiet van Vercel blijft. De server stuurt beschrijving en foto's naar Claude (`src/lib/ai/intake.ts`) met een vast JSON-schema als output. De AI levert werkzaamheden per vakgebied met hoeveelheid en eenheid (alleen als die af te leiden is), plus risico's, open vragen en aannames. **De AI noemt geen prijzen en kiest geen aannemers.** De gebruiker controleert en corrigeert de lijst; aangepaste regels krijgen de bron *gebruiker*.

**2. Teamvoorstellen.** `src/lib/domain/teams.ts` is volledig deterministisch (geen AI, geen samengestelde score):

| Prioriteit | Rangschikking | Niet gerangschikt als |
| --- | --- | --- |
| Budget | laagste middenwaarde van de kostenindicatie (opgegeven tarieven × hoeveelheden) | een onderdeel niet te begroten is |
| Kwaliteit | beoordeling van de zwakste schakel; dan minder herstelwerk; dan meer gecontroleerde projecten | een teamlid < 3 beoordelingen heeft |
| Snelheid | laatste startdatum binnen het team (uit opgegeven beschikbaarheid) | beschikbaarheid onbekend is |

Kandidaten zijn actieve aannemers die in de provincie werken. Er worden twee soorten teams gemaakt: één hoofdaannemer (bij brede renovaties) of een combinatie van vakspecialisten (beste en op-één-na-beste per vakgebied voor die prioriteit). Teams met ontbrekende vakgebieden of te weinig data komen apart te staan, met de reden.

**3. Verbruik per account.** Elke AI-aanroep (ook mislukte) wordt vastgelegd in `ai_usage`: account, project, model, status, input-/output-/cache-tokens, aantal foto's en kosten in USD. De kosten worden berekend uit de werkelijke `usage` van de API-respons (`src/lib/ai/pricing.ts`). Een analyse wordt geweigerd als het account de maandlimiet (`AI_MONTHLY_LIMIT_USD`) of uurlimiet (`AI_HOURLY_LIMIT`) heeft bereikt. Overzicht: **Beheer → AI-gebruik** (per account en laatste aanroepen) en op het eigen **profiel**.

**API-sleutel.** Alleen via de omgevingsvariabele `ANTHROPIC_API_KEY` (server-side; nooit in de browser). Op Vercel: *Settings → Environment Variables* → `ANTHROPIC_API_KEY` → opnieuw deployen. De intakepagina heeft `maxDuration = 300`; een analyse duurt doorgaans tientallen seconden.

---

## Technologie en architectuur

- **Next.js 16** (App Router, server components, server actions) + **TypeScript** + **React 19**
- **Tailwind CSS 4** met eigen design tokens (`src/app/globals.css`) en shadcn-achtige componenten (`src/components/ui`), Radix (dialogen), lucide-iconen, sonner (meldingen)
- **PostgreSQL** via een dunne SQL-laag (`src/lib/db`):
  - zonder `DATABASE_URL`: **PGlite** (Postgres in WebAssembly, in-process) — geen installatie nodig;
  - met `DATABASE_URL`: **postgres.js** naar elke PostgreSQL-server, bijv. **Neon via Vercel**.
  Beide gebruiken exact dezelfde migraties en queries.
- **Anthropic SDK** (`@anthropic-ai/sdk`) voor de AI-intake, met gestructureerde JSON-output
- **Zod** voor validatie van alle invoer (server-side; formulieren tonen dezelfde meldingen)
- **Vitest** (unit) en **Playwright** (end-to-end)

```
src/
  app/                 routes (pagina's, layouts, API-route voor bijlagen)
  actions/             server actions (auth, projecten, offertes, resultaten, portaal, beheer) — autorisatie per actie
  components/          ui/ (basiscomponenten), domain/, intake/, teams/, projects/, quotes/, portal/, admin/, layout/
  config/site.ts       merk, teksten, drempels, testprijzen
  lib/
    ai/                Claude-aanroep (intake), modelconfiguratie, prijstabel
    auth/              wachtwoord-hashing (scrypt), sessies, rolcontroles
    data/              data-access (queries)
    db/                driver, migratierunner, demo-seed
    domain/            pure bedrijfslogica: metrics, teamsamenstelling, verificatieniveaus, constanten
    validation/        Zod-schema's
supabase/migrations/   SQL-migraties (schema, constraints, indexen, RLS, referentiedata)
scripts/               db-beheer (migrate/seed/reset/create-admin), smoke-crawl
tests/unit, tests/e2e
```

### Datamodel (kern)

`users`, `sessions`, `password_reset_tokens` · `specialties` · `contractors` (openbaar) + `contractor_private` (alleen beheer) · `contractor_specialties`, `contractor_service_areas`, `contractor_rates`, `contractor_references` · `projects` (incl. `ai_summary`), `project_scope_items` (werkzaamheden), `project_specialties`, `project_contractors` (shortlist), `project_events` (tijdlijn), `project_attachments` · `quote_requests`, `quote_request_attachments`, `quotes` · `project_outcomes`, `reviews` · `favorites` · `ai_usage` · `verification_events` · `flags` · `admin_actions` · `interest_leads`.

- Bedragen: `numeric(12,2)` + expliciete valuta (`EUR`) + btw-status per bedrag. Datums als `date`, doorlooptijden in kalenderdagen.
- Prijs-typen gescheiden: `indicatief` / `offerte` / `overeengekomen`; indicatieve tarieven staan apart in `contractor_rates` (bron altijd *zelf opgegeven*).
- Er is **geen “geverifieerd”-boolean**: verificatieniveaus worden afgeleid uit goedgekeurde `verification_events` en gecontroleerde `project_outcomes`. Een goedgekeurde verificatie vereist (database-constraint) een beoordelaar, tijdstip en bewijsreferentie.
- Eén resultaat per aannemer per project (unieke index) en één review per resultaat.

---

## Configuratie

Kopieer `.env.example` naar `.env.local` en pas aan. Alle variabelen zijn optioneel:

| Variabele | Betekenis |
| --- | --- |
| `DATABASE_URL` | PostgreSQL-verbinding (gepoold). Leeg = lokale PGlite-demo-database. `POSTGRES_URL` wordt ook herkend. |
| `DATABASE_URL_UNPOOLED` | Directe verbinding voor migraties (Neon zet deze zelf; `POSTGRES_URL_NON_POOLING` werkt ook). Leeg = `DATABASE_URL`. |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob voor foto's en bijlagen (privé). Leeg = lokale map. |
| `MIGRATE_ON_PREVIEW` | `true` = ook preview-deploys migreren de database. |
| `DATABASE_POOL_SIZE` | Max. verbindingen per serverproces (standaard 5). |
| `DEMO_MODE` | Demo-inlogknoppen, demo-verzending en demo-banner. Standaard aan zonder en uit mét `DATABASE_URL`. |
| `BOUWCHECK_DATA_DIR` | Map voor PGlite en uploads (standaard `.data`; op Vercel/serverless automatisch `/tmp/bouwcheck`). |
| `APP_URL` | Publieke URL; bij `https://` krijgen sessiecookies de `Secure`-vlag. Op Vercel standaard `https://$VERCEL_URL`. |
| `ADMIN_PASSWORD` | Alleen voor `npm run db:create-admin`. |
| `ANTHROPIC_API_KEY` | Sleutel voor de AI-intake. Leeg = AI uit (handmatige invoer blijft werken). |
| `ANTHROPIC_MODEL` | Model, standaard `claude-opus-5-5`. |
| `AI_EFFORT` | `low` / `medium` / `high` / `xhigh` / `max`, standaard `medium`. |
| `AI_MONTHLY_LIMIT_USD` | Max. AI-kosten per account per kalendermaand, standaard 5. |
| `AI_HOURLY_LIMIT` | Max. analyses per account per uur, standaard 10. |
| `AI_MAX_PHOTOS` | Max. foto's per analyse, standaard 8. |

Er staan geen geheimen in de client-code; databaseverbinding, Blob-token en API-sleutel worden uitsluitend server-side gebruikt.

---

## Database, migraties en seed

| Commando | Wat |
| --- | --- |
| `npm run db:deploy` | Wat Vercel bij elke build draait: migreren en, in demo-modus, een lege database vullen. |
| `npm run db:migrate` | Past nieuwe migraties uit `supabase/migrations` toe (houdt `schema_migrations` bij). |
| `npm run db:seed` | Laadt demo-data, alleen als de database nog geen gebruikers heeft. |
| `npm run db:reset` | **Alleen lokaal (PGlite):** verwijdert `.data/pglite` en bouwt alles opnieuw op. Stop eerst de dev-server. |
| `ADMIN_PASSWORD='…' npm run db:create-admin -- jij@bedrijf.nl "Naam"` | Maakt (of promoveert) een beheerder. |

In de lokale demo-modus gebeuren migreren en seeden automatisch bij de eerste request. Met `DATABASE_URL` migreert de applicatie **niet** automatisch; draai dan zelf `npm run db:migrate`.

> PGlite ondersteunt één proces per datamap. Draai dus niet tegelijk `npm run dev` en een tweede server op dezelfde `.data`-map (de e2e-tests gebruiken daarom `.data-e2e`).

---

## Deployen op Vercel (Neon + Blob)

Alles wordt in Vercel zelf geregeld; je hebt geen apart Supabase-account nodig. De database is **Neon Postgres** (de opvolger van Vercel Postgres) en bestanden gaan naar **Vercel Blob**. Beide maak je aan en betaal je via Vercel.

1. **Database:** Vercel → je project → *Storage* → *Create Database* → **Neon** → koppel aan dit project (alle omgevingen). Vercel zet `DATABASE_URL` en `DATABASE_URL_UNPOOLED`. Gebruik een **eigen database** voor BouwCheck, niet die van een ander project: tabellen als `users` en `sessions` zouden botsen.
2. **Bestanden:** *Storage* → *Create* → **Blob** → kies toegang **Private** → koppel aan dit project. Vercel zet `BLOB_READ_WRITE_TOKEN`.
3. **Overige variabelen** (*Settings → Environment Variables*):

   | Variabele | Waarde |
   | --- | --- |
   | `ANTHROPIC_API_KEY` | Je Anthropic-API-sleutel (voor de AI-intake) |
   | `DEMO_MODE` | `true` voor een demo-omgeving (demo-data + demo-inlogknoppen), anders `false` |

4. **Opnieuw deployen.** Vercel draait `npm run vercel-build` = `db:deploy` + `next build`. `db:deploy`:
   - past nieuwe migraties toe (via de directe verbinding, met een lock tegen gelijktijdige deploys);
   - vult een **lege** database met demo-data als `DEMO_MODE=true`;
   - slaat preview-deploys over, tenzij `MIGRATE_ON_PREVIEW=true` (zet dat aan als Neon per preview een eigen databasebranch maakt; anders zou een preview het schema van productie wijzigen).

Een beheerder voor een niet-demo-omgeving maak je vanaf je eigen computer: `vercel env pull .env.local` en daarna `ADMIN_PASSWORD='…' npm run db:create-admin -- jij@bedrijf.nl "Naam"`.

**Let op met `DEMO_MODE=true` op een openbare URL:** iedereen kan dan met de demo-knoppen inloggen, ook als demo-*beheerder*, en ziet daarmee alle projecten van alle accounts. Gebruik demo-modus dus niet zodra echte gebruikers echte projecten invoeren. Ook delen alle bezoekers die als demo-flipper inloggen één AI-limiet.

**Zonder database** start BouwCheck op Vercel een tijdelijke demo-database in `/tmp` (banner *“Tijdelijke opslag”*). Elke serverinstantie heeft dan een eigen database: inloggen, een project aanmaken en de teamvoorstellen openen kunnen op verschillende instanties terechtkomen, waardoor je ineens uitgelogd bent of een project ‘niet gevonden’ wordt. Alleen geschikt om rond te kijken.

**Zonder Blob** staan foto's en bijlagen in `/tmp` en verdwijnen ze bij een herstart (banner *“Tijdelijke bestandsopslag”*).

---

## Andere PostgreSQL-host (bijv. Supabase)

Elke PostgreSQL 15+ werkt via `DATABASE_URL` (bij serverless hosting de gepoolde verbinding; `prepare: false` staat al ingesteld). Migreer met `npm run db:migrate` of via `vercel-build`.

- **Authenticatie** is applicatie-eigen (e-mail + wachtwoord met scrypt, sessietokens gehasht in `sessions`), niet de auth van de databasehost.
- **Row Level Security** staat op álle tabellen aan, zonder policies; op Supabase worden ook de rechten van `anon`/`authenticated` ingetrokken (die rollen bestaan op Neon niet en worden dan overgeslagen). De applicatie verbindt server-side als database-eigenaar en dwingt autorisatie af in de server actions en data-access.

---

## Demo-modus

Actief zonder `DATABASE_URL` (of met `DEMO_MODE=true`):

- paarse banner bovenaan iedere pagina;
- inlogknoppen voor drie fictieve demo-accounts (alleen in demo-modus);
- **offerteaanvragen aan aannemers zonder BouwCheck-account** worden gemarkeerd als *“Demo-verzending — niet daadwerkelijk verstuurd”*. Er wordt nooit gedaan alsof een e-mail is verzonden. Buiten demo-modus blijven zulke aanvragen op *“Klaar om te verzenden”* staan;
- wachtwoordherstel toont de herstellink op het scherm met de vermelding dat e-mail niet geconfigureerd is. Buiten demo-modus wordt geen link aangemaakt en verwijst de app naar de beheerder;
- “Demo-data terugzetten” in beheer.

Aanvragen aan een aannemer **mét** account (in de demo: Schildersbedrijf Kwastenburg) worden wél echt afgeleverd — in het aannemersportaal, zonder e-mail.

---

## Tests

```bash
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm test             # Vitest-unittests (metrics, teamsamenstelling, AI-kosten, validatie, verificatie)
npm run test:e2e     # Playwright: bouwt de app en start hem op poort 3100 met een verse .data-e2e-database
                     # en een nep-Anthropic-server op 3199 (tests/e2e/mock-anthropic.mjs) — er wordt geen echte API aangeroepen
npm run smoke        # snelle crawl tegen een draaiende server op :3000 (BASE_URL overschrijfbaar)
```

Gebruik je een andere Chromium dan Playwright meelevert, zet dan `PLAYWRIGHT_CHROMIUM_PATH`.

Unittests: 48. De e2e-suite draait standaard op PGlite; met `DATABASE_URL` in de omgeving (na `npm run db:deploy` op een lege database met `DEMO_MODE=true`) draait dezelfde suite tegen echte PostgreSQL. De e2e-suite (22 tests) dekt: homepage en navigatie, merknaam (geen oude productnaam), juridische pagina's en testprijzen, interesseformulier met validatie, mobiele layout zonder horizontale scroll en mobiel menu, doorverwijzing van de oude zoek- en vergelijkpagina's, profielen met bron- en demolabels, verborgen inactieve profielen, afgeschermde routes, registratie met validatie, onboarding, inloggen met fout wachtwoord, AI-intake met foto (validatie, AI-voorstel, risico's, corrigeren), handmatige intake met controle van de berekende kostenindicatie, teamvoorstellen per prioriteit, team kiezen → offerteaanvraag, offerte vastleggen, bewerken, AI-verbruik op profiel en in beheer, offerteaanvraag voorbereiden/controleren/demo-verzenden/status, projectresultaat met validatie en moderatiestatus, wachtwoordherstel, server-side afscherming van beheer en bijlagen, verificatie, moderatie, (de)activeren, beheerlog, aannemersportaal en nieuwe aannemersaanmelding.

---

## Hoe statistieken worden berekend

Zie ook `/transparantie` en `src/lib/domain/metrics.ts`.

- Alleen **goedgekeurde**, niet **betwiste** of **afgewezen** projectresultaten tellen mee.
- Een statistiek wordt pas getoond vanaf **3 geldige waarnemingen** (`site.minSampleSize`); daaronder staat “Nog onvoldoende gegevens (n van min. 3)”. Bij elk cijfer staat *n*.
- **Op tijd** = aandeel met werkelijke oplevering ≤ geplande oplevering.
- **Budgetafwijking (%)** = (definitieve kosten − oorspronkelijk begroot) / oorspronkelijk begroot × 100; positief = duurder.
- **Vertraging** = werkelijke − geplande opleverdatum in kalenderdagen.
- **Herstelwerk** = aandeel projecten met herstelwerk, over projecten waarvan dit bekend is.
- **Beoordelingen** = gemiddelde van gepubliceerde, aan een project gekoppelde reviews.
- Gegevens ouder dan **24 maanden** worden als verouderd gemarkeerd.
- Er is **geen samengestelde betrouwbaarheidsscore**. De sortering “meest complete projectdata” gebruikt alleen het aandeel beschikbare gegevens (gedocumenteerd in `dataCompleteness`) en zegt niets over kwaliteit.
- Teamvoorstellen gebruiken deze statistieken met dezelfde drempel; zie [AI-intake en teamvoorstellen](#ai-intake-en-teamvoorstellen). Kostenindicaties zijn opgegeven tarieven × hoeveelheden, geen offertes.

---

## Beveiliging en privacy

- Wachtwoorden: scrypt met salt; sessietokens alleen gehasht opgeslagen; `httpOnly`/`SameSite=Lax`-cookies; eenvoudige rem op inlogpogingen per e-mailadres.
- Autorisatie server-side in iedere server action en pagina (`requireUser`, `requireFlipper`, `requireRole`, `requireAdmin`); beheerpagina's controleren de rol zowel in de layout als per pagina. Server actions hebben de ingebouwde origin-controle van Next.js (CSRF).
- Projecten, notities, bijlagen en aanvragen zijn alleen zichtbaar voor de eigenaar (en beheer). Aannemers zien alleen aanvragen die via het platform naar hen zijn verzonden, en alleen de daarbij gekozen bijlagen.
- AI: de sleutel staat alleen in de serveromgeving; beschrijving en foto's worden alleen naar Anthropic gestuurd als de gebruiker op *Analyseer met AI* klikt (vermeld in de privacyverklaring). Gebruikersinvoer wordt in de prompt als data behandeld, de output wordt tegen een schema gevalideerd.
- Uploads: in Vercel Blob met privé-toegang (alleen te lezen met het servertoken, dus uitsluitend via de geautoriseerde downloadroute), anders lokaal; alleen JPG/PNG/WebP/PDF, max. 10 MB, bestandssignatuur gecontroleerd, opgeslagen onder een willekeurige naam, geserveerd met `nosniff` en `no-store`.
- Openbare profielen bevatten geen velden uit `contractor_private`; reviews worden zonder naam van de opdrachtgever getoond.
- Alle beheeracties worden gelogd in `admin_actions`.
- Privacyverklaring, voorwaarden en disclaimer zijn **concepten** die vóór commercieel gebruik juridisch beoordeeld moeten worden. De applicatie claimt geen AVG-compliance.

---

## Bekende beperkingen en wat nog configuratie nodig heeft

| Onderwerp | Huidige situatie | Nodig voor productie |
| --- | --- | --- |
| E-mail (offerteaanvragen, wachtwoordherstel, bevestigingen) | Niet geïmplementeerd; nergens gesimuleerd | E-mailprovider (bijv. Resend/Postmark) + templates |
| Betalingen | Niet geïmplementeerd; CTA's leiden naar een interesseformulier | Betaalprovider (bijv. Mollie/Stripe) |
| Bestandsopslag | Vercel Blob (privé) als gekoppeld, anders lokaal bestandssysteem | Vercel Blob koppelen |
| Auth | App-eigen e-mail/wachtwoord | Eventueel Supabase Auth/SSO, e-mailverificatie, 2FA |
| Rate limiting | In-memory, per proces | Gedeelde rate limiter (bijv. Redis) |
| Verificatie | Handmatige beoordeling door beheer, met bewijsreferentie | Werkproces + eventueel KvK-API-koppeling |
| Data | Alleen fictieve demo-data | Echte aannemers met toestemming en gecontroleerde gegevens |
| Schaal | Filters op afgeleide statistieken draaien in de applicatielaag (prima tot enkele duizenden aannemers) | Gematerialiseerde statistieken in SQL bij grotere schaal |
| Juridisch | Concepttekst | Juridische review |
| AI-intake | Hoeveelheden zijn schattingen uit tekst en foto's; altijd door de gebruiker te controleren | Evaluatieset met echte projecten om de kwaliteit te meten |
| Teamvoorstellen | Gebaseerd op zelf opgegeven tarieven en beschikbaarheid (demo-data) | Echte, actuele tarieven en beschikbaarheid van aannemers |

Afgeschermde of niet-bestaande pagina's (bijv. `/beheer` voor een niet-beheerder, een inactief aannemersprofiel of andermans project) geven in productiemodus HTTP 404 met de pagina “Pagina niet gevonden”.
