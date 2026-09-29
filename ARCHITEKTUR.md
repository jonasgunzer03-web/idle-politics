# Architektur von Idle Politics

Stand: Vollausbau (alle Phasen der Spezifikation plus begehbare Welt). Diese Datei erklärt, wo
was passiert, damit du gezielt Änderungen ansagen kannst.

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
Regierungsviertel, Prachtmeile), die mit deiner Karriere freigeschaltet werden und immer
prächtiger aussehen. In den Gebäuden führst du Tätigkeiten aus (Tippen), stellst Mitarbeiter
ein (automatisch) und schulst sie (mehr Ertrag). Fahrzeuge verkürzen die Wege. Im Tab
„Investieren“ kaufst du Generatoren für passive Erträge. Am jeweiligen Karriere-Ort (Parteibüro,
Rathaus, Parlament, Regierungssitz) kandidierst du, übernimmst Ämter oder baust als Autokrat
deine Macht aus. Zustimmung, Unruhe, Loyalität, Ereigniskarten, Allianzen und ab Stufe 8 die
Welt-Karte mit Regionen und Außenpolitik entscheiden über Tempo und Risiko.

## Ordner und Dateien

### `src/config/` – alles, was du nachjustieren kannst

| Datei           | Inhalt                                                                                                                                                                                                                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `balancing.ts`  | `GAME_SPEED`, Zeiten (Offline-Deckel, Autosave), Preissteigerung, Tipp-Wachstum je Stufe, Berufe, Freischaltungen, Politik (Drift von Zustimmung, Unruhe, Loyalität, Frist vor dem Sturz, Putsch/Säuberung), Wahlen, autokratische Aktionen, Ereignis-Takt, Auswandern, Amtsjahre, Generatoren |
| `careers.ts`    | Wahl-Stufen je Staat, **Aufstiegsanforderungen** (mit `scripts/calibrate.ts` eingestellt), Zielzeiten, Karriere-Orte je Stufe                                                                                                                                                                  |
| `states.ts`     | die vier Staaten: Multiplikatoren, Tempo/Risiko, Währung, Grund-Unruhe, Startbeziehungen, Baustil, Farben, Flaggen; kleine Nachbarstaaten                                                                                                                                                      |
| `world.ts`      | Viertel, Orte (Position in der Straße), Tätigkeiten mit Mitarbeitern und Schulungen, Fahrzeuge                                                                                                                                                                                                 |
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

### `src/engine/` – die Spiellogik (alles mit Unit-Tests)

| Datei          | Aufgabe                                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `schema.ts`    | **Form des Spielstands** (zod) und `SAVE_VERSION` (aktuell 2)                                                                     |
| `rules.ts`     | zentrale Regeln: Freischaltungen, Anforderungen, alle Multiplikatoren (Beruf, Staat, Vermächtnis, Allianzen, Abkommen), Zielwerte |
| `tick.ts`      | **Zeit**: `advance` (zentrale Zeitfunktion), `tick`, Offline-Berechnung                                                           |
| `world.ts`     | Bewegung der Figur, Betreten/Verlassen, Wegzeiten                                                                                 |
| `economy.ts`   | Kosten, Erträge, Tätigkeiten, Mitarbeiter, Schulungen, Generatoren, Fahrzeuge, Regionalprojekte                                   |
| `career.ts`    | Wahlen (Chance, Wahlkampf, Sieg/Niederlage), Ernennung, Macht ausbauen, Zeremonie, autoritärer Kurs                               |
| `politics.ts`  | Drift von Zustimmung, Unruhe, Loyalität, Allianzen, Beziehungen; Rücktritt, Revolution, Putsch, Säuberung                         |
| `events.ts`    | Karten ziehen (nur online), beantworten, Wirkungen                                                                                |
| `alliances.ts` | Gruppen umwerben                                                                                                                  |
| `foreign.ts`   | Außenpolitik                                                                                                                      |
| `autocracy.ts` | autokratische Aktionen                                                                                                            |
| `game.ts`      | Lebenszyklus: neuer Durchlauf, Sturz/Ruhestand, Sieg, Weiterregieren, Auswandern, Vermächtnis, Erfolge, Hinweise                  |
| `sanitize.ts`  | fängt NaN, Infinity und Werte außerhalb des Bereichs ab                                                                           |
| `format.ts`    | deutsche Zahlen- und Zeitformatierung                                                                                             |
| `rng.ts`       | seedbarer Zufallsgenerator (Zustand im Spielstand)                                                                                |
| `unlocks.ts`   | Nachschlagen von Orten, Tätigkeiten, Generatoren                                                                                  |
| `debug.ts`     | Hilfen fürs Debug-Menü                                                                                                            |
| `save/`        | zwei rotierende Speicherplätze, Migration v1 → v2, Backup-Code                                                                    |

### `src/store/` – Verbindung von Engine und Oberfläche

| Datei            | Aufgabe                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `gameStore.ts`   | Spielstand, **Dialog-Warteschlange** (`overlays`), vom Spieler geöffnetes **Fenster** (`sheet`), Erfolgs-Einblendungen (`toasts`), alle Aktionen |
| `index.ts`       | die eine Store-Instanz und der Hook `useGame(selektor)`                                                                                          |
| `useGameLoop.ts` | Spielschleife, Autosave, Hintergrund/Rückkehr                                                                                                    |

### `src/ui/` – Oberfläche

| Ordner/Datei                                       | Aufgabe                                                                                                                                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `App.tsx`                                          | wählt nach `phase` den Bildschirm: Startablauf, Spiel, Zeremonie, Sieg, Abschluss, Auswandern                                                                                  |
| `world/`                                           | **Karriere-Tab**: `WorldView` (Straße/Innenraum, Kamera, Wischen, Tippen aufs Gebäude), `Destinations` (Ziel-Leiste), `CareerCard`, `LocationPanel` (Tätigkeiten, Mitarbeiter) |
| `tabs/`                                            | Netzwerk (Beziehungsnetz), Investieren (Fahrzeuge, Generatoren, Mitarbeiter), Welt (Karte), Profil (Figur, Vermächtnis, Erfolge, Statistik, Backup)                            |
| `sheets/`                                          | Fenster von unten: Karriere/Wahl, Macht sichern, Entscheidungskarten (Wischen), Gruppe, Staat, Region, Editor, Auswandern                                                      |
| `screens/`                                         | Vollbild: Vereidigung (5 Größen), Sieg, Abschluss nach Sturz/Ruhestand, Auswanderungs-Flug                                                                                     |
| `dialogs/`                                         | Dialoge der Warteschlange: Einführung, Hinweise, Rückkehr, Wahlniederlage, Rücktritt                                                                                           |
| `components/`                                      | Kopfzeile (`ResourceBar`, `Meters` mit Unruhe-Warnung und rotem Rand), `Ticker`, `CharacterEditor`, `Toasts`, Bausteine                                                        |
| `setup/`                                           | Startablauf (erster Start und Neustart nach einem Durchlauf)                                                                                                                   |
| `careerView.ts`, `generatorView.ts`, `gameText.ts` | Anzeige-Aufbereitung (getestet)                                                                                                                                                |

### `src/art/` – Grafik (SVG)

| Datei                                                    | Aufgabe                                                                                            |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `figure/`                                                | Figur aus Einzelteilen; Kleidung je Stufe/Pfad, Bart, Brille, Accessoires; Atmen, Blinzeln, Laufen |
| `world/Street.tsx`                                       | die ganze Straße: Füllhäuser, Gebäude, Ausstattung je Viertel, gesperrte Viertel                   |
| `world/buildings.tsx`                                    | Gebäude je Ort in vier Baustilen                                                                   |
| `world/decor.tsx`                                        | Laternen, Bäume, Blumen, Hecken, Fahnen, Statuen, Springbrunnen, Kameras                           |
| `world/Interior.tsx`                                     | Innenräume der Gebäude                                                                             |
| `world/People.tsx`                                       | Passanten, Demonstranten, Soldaten, Mitarbeiter                                                    |
| `world/Sky.tsx`, `world/palette.ts`, `world/geometry.ts` | Himmel, Farben, Maße                                                                               |
| `flag/`                                                  | Flaggen aus der Beschreibung in `states.ts`                                                        |

### Weitere

| Ordner                 | Aufgabe                                                              |
| ---------------------- | -------------------------------------------------------------------- |
| `scripts/simulate.ts`  | **Balancing-Simulation** (Bericht, schlägt bei Problemen fehl)       |
| `scripts/calibrate.ts` | stellt die Aufstiegsanforderungen automatisch auf die Zielzeiten ein |
| `scripts/sim-core.ts`  | der Bot, den beide nutzen                                            |
| `tests/smoke.spec.ts`  | Playwright-Smoke-Test im iPhone-13-Profil                            |

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

### Unruhe und Sturz

Unruhe wandert zu einem Zielwert (Grund-Unruhe des Staates, bei Autokraten plus Druck durch
niedrige Zustimmung). Ab 90 % läuft eine Frist von 60 Sekunden, erst danach führen 100 % zum
Rücktritt (Demokratie: zwei Stufen zurück) bzw. zur Revolution (Durchlauf endet).

### Balancing

`npm run simulate` spielt jeden Staat und Pfad bei `GAME_SPEED` 1 und 0,05 durch. Zielzeiten
richten sich nach dem angezeigten Tempo des Staates (Tempo 3 = Grundwert). Neue Werte:
`npx tsx scripts/calibrate.ts` ausführen und die ausgegebene Tabelle in `careers.ts` einsetzen.

## Debug-Menü

Im Entwicklungsmodus immer, sonst mit `?debug=1` (Käfer-Knopf). Ressourcen, Zeitsprung
(+1/+8 Std.), Stufe, Zustimmung/Unruhe/Loyalität, Ereignis, Sturz, Staat wechseln,
Zurücksetzen. Der Store ist dann in der Konsole als `window.__idlePolitics` erreichbar.

## Tests

- **Unit-Tests** (198): Formeln, Welt, Zeit/Offline, Karriere, Wahlen, Politik mit Frist und
  Putsch, Ereignisse, Allianzen, Außenpolitik, Lebenszyklus (keine Sackgassen), Speichern,
  Migration, Backup, Zahlenformat, Store, Startablauf, Anzeige-Helfer.
- **Simulation** (in `npm run check` als schneller Lauf).
- **Smoke-Test** (8 Fälle, WebKit iPhone 13).
