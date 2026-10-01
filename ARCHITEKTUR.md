# Architektur von Idle Politics

Stand: XXL-Erweiterung (Produktionsketten, Ausbau, Maschinen, Parteibüro mit Beratern und
Gesetzen, Rivale, Stadtchronik, neue Grafik mit Tag und Nacht). Diese Datei erklärt, wo was
passiert, damit du gezielt Änderungen ansagen kannst. Der Bauplan steht in `docs/XXL-PLAN.md`.

## Das große Bild

```
 ┌──────────────┐   liest Werte    ┌──────────────┐
 │  src/config  │ ───────────────▶ │  src/engine  │  reine Spiellogik, ohne Oberfläche
 │ Zahlen,      │                  │ Zeit, Welt,  │
 │ Inhalte      │                  │ Karriere …   │
 └──────────────┘                  └──────┬───────┘
                                          │ wird aufgerufen von
                                   ┌──────▼───────┐
 ┌──────────────┐   Texte          │  src/store   │  hält den Spielstand, Dialoge,
 │  src/i18n    │ ──────┐          │ Zustand-Store│  Fenster, Spielschleife, Speichern
 └──────────────┘       │          └──────┬───────┘
                        │                 │ Werte per Selektor
                        │          ┌──────▼───────┐      ┌──────────────┐
                        └────────▶ │   src/ui     │ ───▶ │   src/art    │  SVG-Grafik
                                   └──────────────┘      └──────────────┘
```

Die Engine weiß nichts von React. Die Oberfläche rechnet nichts selbst, sie zeigt nur an und
ruft Aktionen des Stores auf. Deshalb lässt sich die ganze Spiellogik ohne Browser testen, und
ein Bot kann das Spiel für die Balancing-Simulation durchspielen.

## Das Spiel in einem Absatz

Du läufst mit deiner Figur durch eine Straße mit vier Vierteln (Arbeiterviertel, Altstadt,
Regierungsviertel, Prachtmeile). Jedes Gebäude ist ein **Betrieb** mit Produktionslinien: Das Werk
stellt Waren her, der Markt verkauft sie, die Kneipe liefert Kontakte, das Parteibüro druckt
Flugblätter und macht aus Kontakten Einfluss, Rathaus und Ministerium liefern Akten für Parlament
und Regierungssitz. Fehlt Nachschub, **stockt** eine Linie. Du stellst Mitarbeiter ein (mit Namen,
Gesicht und Eigenschaft), baust Gebäude in fünf Stufen aus (mehr Plätze, sichtbar größer) und
kaufst Maschinen. Die **Arbeiterstimmung** bestimmt das Tempo, unter 20 % wird gestreikt. Im
**Parteibüro** sitzen Berater verschiedener Flügel; du berätst Vorlagen, fasst Beschlüsse mit
dauerhaften Wirkungen und Spätfolgen, und untreue Berater laufen zum **Rivalen** über, der deine
Wahlchancen drückt. Die **Stadtchronik** hält alles als Schlagzeilen fest. Dazu kommen wie bisher
Karriere, Zustimmung, Unruhe, Ereigniskarten, Allianzen und ab Stufe 8 die Welt-Karte.

## Ordner und Dateien

### `src/config/` – alles, was du nachjustieren kannst

| Datei           | Inhalt                                                                                                                                                                                                                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `balancing.ts`  | `GAME_SPEED`, Zeiten (Offline-Deckel, Autosave), Preissteigerung, Tipp-Wachstum je Stufe, Berufe, Freischaltungen, Politik (Drift von Zustimmung, Unruhe, Loyalität, Frist vor dem Sturz, Putsch/Säuberung), Wahlen, autokratische Aktionen, Ereignis-Takt, Auswandern, Amtsjahre, Generatoren |
| `careers.ts`    | Wahl-Stufen je Staat, **Aufstiegsanforderungen** (mit `scripts/calibrate.ts` eingestellt), Zielzeiten, Karriere-Orte je Stufe                                                                                                                                                                  |
| `states.ts`     | die vier Staaten: Multiplikatoren, Tempo/Risiko, Währung, Grund-Unruhe, Startbeziehungen, Baustil, Farben, Flaggen; kleine Nachbarstaaten                                                                                                                                                      |
| `world.ts`      | Viertel, Orte (Position in der Straße), **Produktionslinien** (Zutaten, Erzeugnisse, Mitarbeiter), Fahrzeuge, Tagesrhythmus und Wetter (optisch)                                                                                                                                               |
| `industry.ts`   | **Aufbau**: Waren und Lager, Ausbaustufen (Plätze, Preise, nötige Karrierestufe), Maschinen, Eigenschaften der Mitarbeiter, Arbeiterstimmung und Streik                                                                                                                                        |
| `party.ts`      | **Parteibüro**: Sitze und Gesetzesplätze je Stufe, Berater (Loyalität, Abspringen), alle 26 Beschlüsse mit Wirkungen und Spätfolgen, Fähigkeiten, Rivale (Stärke, Aktionen, Gegenmaßnahmen), Chronik                                                                                           |
| `events.ts`     | 38 Ereigniskarten mit Bedingungen und Wirkungen                                                                                                                                                                                                                                                |
| `alliances.ts`  | Gruppen, Boni ab 50 % und 80 %, Gegenspieler, Verfall                                                                                                                                                                                                                                          |
| `foreign.ts`    | Regionalprojekte, außenpolitische Aktionen, Regeln (Handelsbonus, Krisen)                                                                                                                                                                                                                      |
| `legacy.ts`     | Vermächtnis-Baum, Punkteformel, Erfolge mit Accessoires                                                                                                                                                                                                                                        |
| `appearance.ts` | Farben und Varianten des Charakter-Editors                                                                                                                                                                                                                                                     |
| `index.ts`      | bündelt alles zu einer `GameConfig`                                                                                                                                                                                                                                                            |

Alle Texte (Namen, Titel, Karten, Hinweise) stehen in `src/i18n/`.

### `src/i18n/` – alle Spieltexte

| Datei            | Inhalt                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| `de.ts`          | Grundtexte (Startablauf, Staaten, Berufe, Amtstitel, Generatoren, Profil, Speicher …) und Zusammenführung |
| `de-world.ts`    | Viertel, Orte, Tätigkeiten, Fahrzeuge, Netzwerk-Gruppen, Welt-Karte                                       |
| `de-politics.ts` | Karriere, Wahlen, Zeremonien, Macht, Ticker, Sturz, Sieg, Auswandern, Vermächtnis, Erfolge, Hinweise      |
| `de-events.ts`   | Texte der 38 Ereigniskarten                                                                               |
| `de-industry.ts` | Waren, Ausbaustufen, Maschinen, Eigenschaften, Berufe, Sprüche der Belegschaft, Wirtschafts-Tab           |
| `de-party.ts`    | Flügel, Reden der Berater, Fähigkeiten, Beschlüsse mit Stimmen der Bürger, Rivale, Chronik-Schlagzeilen   |

### `src/engine/` – die Spiellogik (alles mit Unit-Tests)

| Datei           | Aufgabe                                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `schema.ts`     | **Form des Spielstands** (zod) und `SAVE_VERSION` (aktuell 3)                                                                     |
| `rules.ts`      | zentrale Regeln: Freischaltungen, Anforderungen, alle Multiplikatoren (Beruf, Staat, Vermächtnis, Allianzen, Abkommen), Zielwerte |
| `tick.ts`       | **Zeit**: `advance` (zentrale Zeitfunktion), `tick`, Offline-Berechnung                                                           |
| `world.ts`      | Bewegung der Figur, Betreten/Verlassen, Wegzeiten                                                                                 |
| `economy.ts`    | Kosten, Erträge, Tippen, Mitarbeiter, Ausbau, Maschinen, Generatoren (Beteiligungen), Fahrzeuge, Regionalprojekte                 |
| `production.ts` | **Produktionskette**: Rechenschritt der Linien mit Engpässen, Lager, Tempo- und Ertragsfaktoren, Stimmung und Streik, Warenwege   |
| `party.ts`      | **Parteibüro**: Berater, Tagesordnung, Beschlüsse, Spätfolgen, Aufheben, Rivale mit Aktionen und Gegenmaßnahmen                   |
| `modifiers.ts`  | fasst alle Wirkungen von Gesetzen, Spätfolgen und Beratern zusammen (Regeln, Produktion und Politik fragen hier)                  |
| `people.ts`     | Namen, Gesichter und Eigenschaften aus Seeds (nichts davon wird gespeichert)                                                      |
| `chronicle.ts`  | Einträge der Stadtchronik                                                                                                         |
| `career.ts`     | Wahlen (Chance, Wahlkampf, Sieg/Niederlage), Ernennung, Macht ausbauen, Zeremonie, autoritärer Kurs                               |
| `politics.ts`   | Drift von Zustimmung, Unruhe, Loyalität, Allianzen, Beziehungen; Rücktritt, Revolution, Putsch, Säuberung                         |
| `events.ts`     | Karten ziehen (nur online), beantworten, Wirkungen                                                                                |
| `alliances.ts`  | Gruppen umwerben                                                                                                                  |
| `foreign.ts`    | Außenpolitik                                                                                                                      |
| `autocracy.ts`  | autokratische Aktionen                                                                                                            |
| `game.ts`       | Lebenszyklus: neuer Durchlauf, Sturz/Ruhestand, Sieg, Weiterregieren, Auswandern, Vermächtnis, Erfolge, Hinweise                  |
| `sanitize.ts`   | fängt NaN, Infinity und Werte außerhalb des Bereichs ab                                                                           |
| `format.ts`     | deutsche Zahlen- und Zeitformatierung                                                                                             |
| `rng.ts`        | seedbarer Zufallsgenerator (Zustand im Spielstand)                                                                                |
| `unlocks.ts`    | Nachschlagen von Orten, Tätigkeiten, Generatoren                                                                                  |
| `debug.ts`      | Hilfen fürs Debug-Menü                                                                                                            |
| `save/`         | zwei rotierende Speicherplätze, Migrationen v1 → v2 → v3, Backup-Code                                                             |

### `src/store/` – Verbindung von Engine und Oberfläche

| Datei            | Aufgabe                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `gameStore.ts`   | Spielstand, **Dialog-Warteschlange** (`overlays`), vom Spieler geöffnetes **Fenster** (`sheet`), Erfolgs-Einblendungen (`toasts`), alle Aktionen |
| `index.ts`       | die eine Store-Instanz und der Hook `useGame(selektor)`                                                                                          |
| `useGameLoop.ts` | Spielschleife, Autosave, Hintergrund/Rückkehr                                                                                                    |

### `src/ui/` – Oberfläche

| Ordner/Datei                                       | Aufgabe                                                                                                                                                                                                               |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `App.tsx`                                          | wählt nach `phase` den Bildschirm: Startablauf, Spiel, Zeremonie, Sieg, Abschluss, Auswandern                                                                                                                         |
| `world/`                                           | **Karriere-Tab**: `WorldView` (Straße/Innenraum, Kamera, Wischen, Tag und Nacht, Wetter, Lieferwagen, Passanten mit Sprechblasen, Rivale), `Destinations`, `CareerCard`, `LocationPanel` (Gebäudefenster mit Reitern) |
| `industry/`                                        | Reiter **Produktion** (Linien, Tippen, Einstellen), **Ausbau** (Stufen, Maschinen, Lager), **Team** (Belegschaft, Stimmung), **Produktionsnetz**, Symbole                                                             |
| `party/`                                           | Reiter **Politik** im Parteibüro: Tagesordnung, Beratertisch, Bewerber, geltende Beschlüsse, Rivale                                                                                                                   |
| `tabs/`                                            | Netzwerk (Beziehungsnetz), **Wirtschaft** (Produktionsnetz, Stimmung, Lager, Fahrzeuge, Beteiligungen), Welt (Karte), Profil (Figur, Chronik, Vermächtnis, Erfolge, Statistik, Backup)                                |
| `sheets/`                                          | Fenster von unten: Karriere/Wahl, Macht sichern, Entscheidungskarten (Wischen), Gruppe, Staat, Region, Editor, Auswandern, **Beratung einer Vorlage**, **Chronik** (Zeitungsseite)                                    |
| `screens/`                                         | Vollbild: Vereidigung (5 Größen), Sieg, Abschluss nach Sturz/Ruhestand, Auswanderungs-Flug                                                                                                                            |
| `dialogs/`                                         | Dialoge der Warteschlange: Einführung, Hinweise, Rückkehr, Wahlniederlage, Rücktritt                                                                                                                                  |
| `components/`                                      | Kopfzeile (`ResourceBar`, `Meters` mit Unruhe-Warnung und rotem Rand), `Ticker`, `CharacterEditor`, `Toasts`, Bausteine                                                                                               |
| `setup/`                                           | Startablauf (erster Start und Neustart nach einem Durchlauf)                                                                                                                                                          |
| `careerView.ts`, `generatorView.ts`, `gameText.ts` | Anzeige-Aufbereitung (getestet)                                                                                                                                                                                       |

### `src/art/` – Grafik (SVG)

| Datei                                                 | Aufgabe                                                                                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `figure/`                                             | Figur aus Einzelteilen; Kleidung je Stufe/Pfad, Bart, Brille, Accessoires; Atmen, Blinzeln, Laufen                                               |
| `world/paint.tsx`, `world/PaintDefs.tsx`              | **Zeichen-Baukasten**: Wände, Fenster (leuchten nachts), Dächer, Kuppeln, Schilder, Leuchtschrift, Schornsteine mit Rauch, Fahnen, Lichterketten |
| `world/buildings.tsx`                                 | alle 11 Gebäude in **fünf Ausbaustufen** und vier Baustilen, Füllhäuser                                                                          |
| `world/Street.tsx`                                    | die ganze Straße: Tag-Ebene, Nachtfärbung, Licht-Ebene, Ausstattung, geparkte Autos, zwei Silhouetten-Ebenen                                     |
| `world/Sky.tsx`, `world/dayCycle.ts`                  | Himmel mit Tagesverlauf, Sonne, Mond, Sterne, Wolken, Regen und Schnee                                                                           |
| `world/Traffic.tsx`                                   | Lieferwagen (Farbe je Ware) und Bus                                                                                                              |
| `world/decor.tsx`, `world/People.tsx`                 | Laternen, Bäume, Fahnen, Statuen …; Passanten, Demonstranten, Soldaten, Rivale                                                                   |
| `world/palette.ts`, `world/geometry.ts`               | Farben, Maße                                                                                                                                     |
| `interior/InteriorScene.tsx`, `interior/machines.tsx` | **Innenräume**: Raum mit Tiefe und Fenstern, Einrichtung je Ausbaustufe, 22 animierte Maschinen, Belegschaft bei der Arbeit, Beratertisch        |
| `people/Bust.tsx`, `people/Worker.tsx`                | Porträts (Mitarbeiter, Berater, Rivale, Bürger) und Ganzkörper-Figuren mit Bewegungen                                                            |
| `flag/`                                               | Flaggen aus der Beschreibung in `states.ts`                                                                                                      |
| `map/`                                                | **Weltkarte**: erfundener Kontinent (`geography.ts`, per Skript erzeugt), Provinzen des eigenen Landes (`provinces.ts`), Karte (`WorldMap.tsx`)  |

### `src/minigame/` – 3D-Minispiele „Selbst anpacken“ (three.js, nachgeladen)

| Datei                    | Aufgabe                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `sim.ts`                 | Ablauf ohne Grafik (getestet): Laufen, Quelle, Tragen, Theke, Kunden, Geld, Helfer, Ausbau-Felder, Hinweis-Pfeil      |
| `layout.ts`, `themes.ts` | gemeinsamer Grundriss; Aussehen je Ort (Boden, Wände, Ware, Maschine, Theke, Deko, Kleidung)                          |
| `three/`                 | 3D-Baukasten (`kit.ts`), Figuren, Stapel-Ware, Räume/Maschinen/Theken, Beschriftungen, die Szene mit Kamera und Licht |
| `MinigameScreen.tsx`     | Vollbild mit Daumen-Joystick, Anzeigen, schwebenden Gewinnen; meldet Verkäufe und Ausbau-Käufe an den Store           |

### Weitere

| Ordner                                           | Aufgabe                                                                    |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| `scripts/simulate.ts`                            | **Balancing-Simulation** (Bericht, schlägt bei Problemen fehl)             |
| `scripts/calibrate.ts`                           | stellt die Aufstiegsanforderungen automatisch auf die Zielzeiten ein       |
| `scripts/sim-core.ts`                            | der Bot, den beide nutzen                                                  |
| `scripts/shots.mjs`, `scripts/shot-minigame.mjs` | Screenshots im iPhone-Profil (braucht `npm run dev`), zum Prüfen der Optik |
| `tests/smoke.spec.ts`                            | Playwright-Smoke-Test im iPhone-13-Profil                                  |

## Wie die Teile zusammenspielen

### Zeit und Spielschleife

Ein einziger Zeitstempel (`lastActiveAt`) und eine Funktion (`advance`) verrechnen alle Zeit.
Kleine Lücken laufen als Takt (Erträge, Bewegung, Politik, Ereignisse), große als Abwesenheit
(nur Erträge, höchstens 8 Stunden, Wege gelten als erledigt). Dieselbe Zeit kann nie doppelt
zählen. Große Takte werden in Schritte von höchstens einer Sekunde zerlegt.

### Zustandsmaschine (`game.phase`)

`setup` → `playing` ⇄ `ceremony` → (`victory` → `playing` beim Weiterregieren) oder
`runEnded` → `setup`. Auswandern: `playing` → `emigrating` → `playing`. Nur in `playing` läuft
die Zeit.

### Dialoge und Fenster

Dialoge (Hinweise, Rückkehr, Wahlniederlage …) stehen in einer Warteschlange, immer nur einer
ist sichtbar. Fenster (Karriere, Karten, Gruppen …) öffnet der Spieler selbst; sie öffnen sich
nur, wenn kein Dialog wartet. So liegen nie zwei Overlays übereinander.

### Produktionskette

Jede Sekunde rechnet `runChain` alle Linien in fester Reihenfolge: erst die ohne Waren-Zutaten
(Hersteller), dann die Verbraucher. Eine Linie schafft höchstens so viele Durchgänge, wie ihre
Zutaten reichen; sonst meldet sie den Engpass (`blockedBy`). Lager haben eine Obergrenze, der
Überschuss verfällt. Bei Abwesenheit läuft die Kette in 10-Sekunden-Schritten weiter.

### Gesetze und Spätfolgen

Ein Beschluss speichert nur, **seit wann** er gilt und **wie viele** Spätfolgen schon eingetreten
sind. Alle Wirkungen werden daraus jedes Mal neu berechnet (`modifiers.ts`). Wird ein Gesetz
aufgehoben, enden deshalb auch seine eingetretenen Spätfolgen. Spätfolgen, Berater und Rivale
laufen nur im aktiven Spiel, nie offline.

### Minispiele

Die Bewegung läuft komplett in `src/minigame/sim.ts` (reine Funktionen), die 3D-Szene zeichnet
nur nach. Was ein Verkauf bringt, rechnet die Engine (`engine/minigame.ts`): ein Vielfaches eines
Durchgangs der Linien des Gebäudes plus ein paar Sekunden laufender Ertrag. Ausbau-Felder kaufen
über die üblichen Engine-Funktionen (Mitarbeiter, Ausbaustufe, Maschine). three.js steckt in einem
eigenen Bündel, das erst beim ersten Öffnen geladen wird (offline trotzdem im Cache).

### Abstimmen per Wisch-Karte

Gesetzesvorlagen (Parteibüro, Rathaus, Parlament) und Ereignis-Fragen sind Kartenstapel mit
gemeinsamer Geste (`ui/components/useSwipe.ts`): rechts = ja, links = nein, Karte fliegt raus.

### Tipp-Kombo

Schnelle Tipps erhöhen einen Faktor bis ×3 (`engine/combo.ts`, Werte in `balancing.ts`). Die
Oberfläche merkt sich die Kombo nur im Speicher und gibt den Faktor an `performAction` mit.

### Tag und Nacht

Rein optisch. Die Weltansicht rechnet alle zwei Sekunden aus der Uhrzeit, wie hell es ist, und
setzt CSS-Variablen; alle Ebenen (Himmel, Nachtfärbung, Fensterlicht, Innenräume) blenden daran
weich über.

### Unruhe und Sturz

Unruhe wandert zu einem Zielwert (Grund-Unruhe des Staates, bei Autokraten plus Druck durch
niedrige Zustimmung). Ab 90 % läuft eine Frist von 60 Sekunden, erst danach führen 100 % zum
Rücktritt (Demokratie: zwei Stufen zurück) bzw. zur Revolution (Durchlauf endet).

### Balancing

`npm run simulate` spielt jeden Staat und Pfad bei `GAME_SPEED` 1 und 0,05 durch. Zielzeiten
richten sich nach dem angezeigten Tempo des Staates (Tempo 3 = Grundwert). Neue Werte:
`npx tsx scripts/calibrate.ts` ausführen und die ausgegebene Tabelle in `careers.ts` einsetzen.

## Debug-Menü

Im Entwicklungsmodus immer, sonst mit `?debug=1` (Käfer-Knopf). Ressourcen, alle Gebäude eine
Stufe höher (mit Maschinen und Personal), Zeitsprung (+1/+8 Std.), Stufe,
Zustimmung/Unruhe/Loyalität, Ereignis, Sturz, Staat wechseln, Zurücksetzen. Der Store ist dann in der Konsole als `window.__idlePolitics` erreichbar.

## Tests

- **Unit-Tests** (263, u. a. Minispiel-Ablauf, Verkäufe, Kombo, Provinzen der Weltkarte): Formeln, Welt, Zeit/Offline, Produktionskette mit Engpässen und Lager,
  Ausbau, Maschinen, Stimmung und Streik, Beschlüsse, Spätfolgen, Berater, Rivale, Karriere,
  Wahlen, Politik mit Frist und Putsch, Ereignisse, Allianzen, Außenpolitik, Lebenszyklus,
  Speichern, Migrationen, Backup, Zahlenformat, Store, Startablauf, Anzeige-Helfer.
- **Simulation** (in `npm run check` als schneller Lauf): Der Bot stellt ein, baut aus, kauft
  Maschinen, holt Berater und fasst Beschlüsse.
- **Smoke-Test** (11 Fälle, WebKit iPhone 13), darunter ein kompletter Durchgang durch
  Produktionskette, Ausbau, Team, Beschluss und Chronik, das 3D-Minispiel mit Joystick und
  eine Abstimmung per Wisch-Karte im Rathaus. Läuft mit `reducedMotion: 'reduce'`.
