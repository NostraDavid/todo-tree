# Uitvoering van het verbeterplan

De afgesproken correctheidsfixes zijn geïmplementeerd en als 23 kleine patchreleases op GitHub gepubliceerd na toestemming van de gebruiker. TypeScript-migratie blijft op verzoek uitgesteld. Marketplace-publicatie blijft handmatig.

De eigen issuetrackers voor DotENV en Better Comments zijn met afzonderlijke toestemming ingeschakeld en teruggelezen. Marketplace-installatie blijft handmatig. Nixcfg en de bestaande editorprofielen zijn bij deze fixes niet aangepast.

## Todo Tree

Iedere rij heeft een gedateerde changelog, een eigen commit en groene projectcontroles met een VSIX-pakket.

| Versie | Commit    | Wijziging                                                                                                    | Tests |
| ------ | --------- | ------------------------------------------------------------------------------------------------------------ | ----: |
| 1.0.1  | `c3ae6db` | Actuele ripgrep-universal-paden voor zes platforms en twee pakketindelingen.                                 |    61 |
| 1.0.2  | `9a7c91f` | Globale regexshim verwijderd, native capture-indices behouden.                                               |    63 |
| 1.0.3  | `24ae063` | Gegroepeerde refresh en verwijdering behouden andere bestanden in alle weergaven.                            |    76 |
| 1.0.4  | `be6ab9a` | Alle vier gedeclareerde uitsluitingsopties werken.                                                           |    77 |
| 1.0.5  | `06dd681` | Shellvrije argumenten, procesannulering en tijdelijke bestanden per zoekopdracht.                            |   119 |
| 1.0.6  | `738586c` | HTML en Markdown blijven op de juiste regel, met preciezere lijstmarkeringen.                                |   124 |
| 1.0.7  | `74820b4` | Ongeldige of geannuleerde filterinvoer behoudt de boom. Ongeldige opgeslagen filters herstellen bij starten. |   132 |
| 1.0.8  | `95be518` | Statuslabels tonen taggroepen zonder dubbele namen, met behoud van sortering en nulresultaten.               |   144 |
| 1.0.9  | `fb91329` | Contextactie blijft binnen de eigen boomweergave.                                                            |   152 |
| 1.0.10 | `747a9f0` | Eén Git-proces per werkmap, tijdslimiet en opruiming bij stoppen of herconfigureren.                         |   156 |
| 1.0.11 | `5c37f17` | Documenttimers zijn onafhankelijk. Deduplicatie doorzoekt niet telkens eerdere resultaten.                   |   159 |
| 1.0.12 | `ad2852d` | Geldige disposables voor boom, highlighting en optionele debuguitvoer.                                       |   163 |

De meeste nieuwe correctheidsregressies faalden eerst op de oude code. De performancewijziging heeft daarnaast tests voor dichte bestanden, herhaalde scans en dubbele genormaliseerde posities.

## Better Comments

| Versie | Commit    | Wijziging                                                                           | Tests |
| ------ | --------- | ----------------------------------------------------------------------------------- | ----: |
| 1.0.1  | `cce8333` | Alle Python-routes sluiten strings uit. Taalflags lekken niet naar een andere taal. |    14 |
| 1.0.2  | `4080f7b` | Tagvalidatie en instellingen-schema behouden geldige en lege tags.                  |    17 |
| 1.0.3  | `07946a6` | Alleen een echte shebang aan het bestandsbegin wordt overgeslagen.                  |    25 |
| 1.0.4  | `154904e` | Live-instellingen, eigen parser per zichtbare editor en opruiming.                  |    27 |
| 1.0.5  | `06f104c` | Eerste langste tag bepaalt consistent de stijl.                                     |    28 |
| 1.0.6  | `5d70cd1` | Compacte blokken, openingsregels, JSDoc, CRLF en sluitgrenzen.                      |    34 |
| 1.0.7  | `83bac9c` | Echte JS-, TS-, JSX- en TSX-comments met Lezer, één parse per update.               |    47 |
| 1.0.8  | `3879721` | Native taaloverrides, taalwissels en herstel van de taalconfiguratiecache.          |    52 |

De laatste versie bouwt voor Node en web. De toegevoegde JavaScript-grammar deelt de bestaande Lezer-runtime. Beide bundels bevatten de licentieteksten.

## DotENV

| Versie | Commit    | Wijziging                                                                     | Tests |
| ------ | --------- | ----------------------------------------------------------------------------- | ----: |
| 1.0.1  | `0d40edc` | Alleen de eerste `=` hoort bij de declaratie. Syntaxcontract vastgelegd.      |     8 |
| 1.0.2  | `89c9d89` | Onvolledige interpolatie herstelt, geldige multilinewaarden blijven behouden. |    11 |
| 1.0.3  | `97f5dc7` | Constantekleuren gelden alleen voor volledige waarden.                        |    12 |

De fork heeft een eigen versiereeks. De geërfde upstreamtag `v1.0.1` is geen NostraDavid-release. De tag in de eigen fork is daarom op uitdrukkelijke gebruikersinstructie gecorrigeerd met een lease op het geërfde tagobject. Upstream is niet aangepast en geen gepubliceerde eigen release is herschreven.

## Verpakte controle in VS Code

De controles gebruiken VS Code 1.143.1 op Linux, met geïsoleerde gebruikers- en extensiemappen onder `/tmp`. Ze installeren de gebouwde VSIX, niet een broncheckout.

- DotENV: ingebouwd alleen kiest `source.dotenv`; ingebouwd plus de fork kiest `source.env`. De eerste assignmentoperator, herstel van de volgende declaratie en constantegrenzen kloppen. Expliciete bestandsassociaties blijven behouden.
- DotENV: de native tokencontrole slaagt met tien ingebouwde thema's, waaronder Dark+, Light+ en beide hoogcontrastthema's. Dit controleert scopes en toegepaste tokenkleuren, geen volledige visuele toegankelijkheidsaudit.
- Better Comments: de VSIX activeert. Een Python-taaloverride schakelt highlighting uit. Na dezelfde documentwissel naar JavaScript geldt de ingeschakelde instelling. Twee taalwissels en een tekstwijziging slagen zonder extensiefout. De aparte integratietests controleren exacte ranges en twee zichtbare editors.
- Todo Tree: de huidige ingebouwde ripgrep wordt gevonden. Een werkmap met spaties, haakjes en `$` wordt doorzocht. Twee tegelijk gewijzigde documenten verschijnen beide met nieuwe tekst, ook gegroepeerd en in tags-only. De uiteindelijke versie sluit met en zonder debugkanaal af zonder subscriptionfouten.
- Ripgrep: vijf aanvullende controles gebruiken het echte Linux-programma met quotes en shellachtige bestandsnamen, beide patroonroutes, foutcodes, bufferfouten, annulering en opruiming.

## Metingen

`node scripts/benchmark-search.mts` meet de echte `refreshFile` en resultatenopslag met vaste editorcoördinaten en een gestubde boomupdate. Dit is een synthetische functiebenchmark, geen meting van de volledige editorinterface.

| 50.000 regels |    Voor 1.0.11 |   Na 1.0.11 |
| ------------- | -------------: | ----------: |
| 500 TODO's    |    circa 30 ms |  circa 6 ms |
| 50.000 TODO's | circa 2.884 ms | circa 37 ms |

De oorzaak was een volledige zoekactie door eerdere resultaten voor iedere nieuwe match. De lokale verzameling met posities behoudt de deduplicatie zonder die herhaalde zoekactie.

Better Comments is afzonderlijk gemeten met de echte parser en rangeberekening, met een gestubde editorgrens. Bij 50.000 regels met 500 comments kost Python circa 245 ms, JavaScript 209 ms en TSX 333 ms. Bij 50.000 commentrijke regels kost Python circa 1,0 seconde, JavaScript 0,9 seconde en TSX 2,4 seconden. Iedere update parseert nog het hele document. Deze metingen zijn geen gegarandeerde responstijden.

## Controles herhalen

Voer in iedere repository uit:

```sh
nix develop --command just format check package
```

De bestaande hooks draaien de relevante controles ook bij commits. De laatste suites bevatten samen 227 tests. Alle drie pakketten hebben de juiste publisher, naam en versie; runtime-licentievermeldingen zijn aanwezig. Dependency-audits rapporteren nul gevonden kwetsbaarheden op deze lockfiles.

De Todo Tree-releaseworkflow slaat Marketplace-publicatie met een melding over wanneer `VSCE_PAT` ontbreekt. De GitHub-VSIX blijft beschikbaar voor handmatig uploaden.

## Publicatie op GitHub

Op 25 oktober 2026 zijn alle 23 voorbereide patchversies gepubliceerd, ieder met een eigen changelog en VSIX. De nieuwste versies zijn:

- [Todo Tree v1.0.12](https://github.com/NostraDavid/vscode-todo-tree/releases/tag/v1.0.12), met het [VSIX-bestand](https://github.com/NostraDavid/vscode-todo-tree/releases/download/v1.0.12/nostradavid-todo-tree-1.0.12.vsix). De [platformcontrole](https://github.com/NostraDavid/vscode-todo-tree/actions/runs/40219428721) slaagt op alle drie systemen.
- [Better Comments v1.0.8](https://github.com/NostraDavid/vscode-better-comments/releases/tag/v1.0.8), met het [VSIX-bestand](https://github.com/NostraDavid/vscode-better-comments/releases/download/v1.0.8/nostradavid-better-comments-1.0.8.vsix). De [platformcontrole](https://github.com/NostraDavid/vscode-better-comments/actions/runs/40219435868) slaagt op alle drie systemen.
- [DotENV v1.0.3](https://github.com/NostraDavid/vscode-dotenv/releases/tag/v1.0.3), met het [VSIX-bestand](https://github.com/NostraDavid/vscode-dotenv/releases/download/v1.0.3/nostradavid-dotenv-1.0.3.vsix). De [platformcontrole](https://github.com/NostraDavid/vscode-dotenv/actions/runs/40219441080) slaagt op alle drie systemen.

Alle 23 release-assets zijn teruggedownload en op publisher, extensienaam, versie, changelog en bestandsinhoud gecontroleerd. Twintig archieven zijn byte-identiek aan de lokale pakketten. De drie door CI gebouwde DotENV-archieven hebben identieke bestandsinhoud. De bestaande releases en hun assets zijn afzonderlijk gecontroleerd op behoud.

Er is geen `VSCE_PAT` ingesteld in deze repositories. De GitHub-publicatie vereist geen Marketplace-token of nieuwe Azure-organisatie. Upload de nieuwste GitHub-VSIX via [publisherbeheer](https://marketplace.visualstudio.com/manage/publishers/nostradavid) om ook Marketplace bij te werken.

## Uitgesteld en beperkingen

- De TypeScript-migratie begint pas na deze fixronde en een volgende opdracht.
- Embedded HTML-, Vue- en Svelte-ondersteuning in Better Comments, DotENV-backticks en een nieuwe formatter blijven afzonderlijke features.
- De CI-tests, builds en verpakking slagen op Linux, macOS en Windows. De echte editorcontroles zijn op Linux uitgevoerd. Native editorcontroles op macOS, Windows, remote extension hosts, de minimale VS Code-versie en een browser extension host zijn niet uitgevoerd.
- De contextmenuvoorwaarde is getest op de echte manifestexpressie. Een afzonderlijke visuele muiscontrole in een andere extensie is niet uitgevoerd.
- Eerder gepubliceerde eigen releases en hun assets zijn behouden. De geërfde DotENV-tag is in de eigen fork vervangen door onze gelijknamige versie. De Marketplace-versies zijn in deze ronde niet bijgewerkt.
