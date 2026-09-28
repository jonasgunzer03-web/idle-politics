# Architektur von Idle Politics

Stand: Ende Phase 1 (Kernschleife). Diese Datei erklärt, wo was passiert, damit du gezielt
Änderungen ansagen kannst. Sie wird am Ende jeder Phase aktualisiert.

## Das große Bild

```
 ┌──────────────┐   liest Werte    ┌──────────────┐
 │  src/config  │ ───────────────▶ │  src/engine  │  reine Spiellogik, ohne Oberfläche
 │ Zahlen,      │                  │ tick, advance│
 │ Inhalte      │                  │ Kauf, Tippen │
 └──────────────┘                  └──────┬───────┘
                                          │ wird aufgerufen von
                                   ┌──────▼───────┐
 ┌──────────────┐   Texte          │  src/store   │  hält den aktuellen Spielstand,
 │  src/i18n    │ ──────┐          │ Zustand-Store│  Spielschleife, Speichern
 └──────────────┘       │          └──────┬───────┘
                        │                 │ Werte per Selektor
                        │          ┌──────▼───────┐
                        └────────▶ │   src/ui     │  Bildschirme, Tabs, Dialoge
                                   └──────────────┘
```

Die Engine weiß nichts von React. Die Oberfläche rechnet nichts selbst, sie zeigt nur an und
ruft Aktionen des Stores auf. Deshalb lässt sich die ganze Spiellogik ohne Browser testen.

## Ordner und Dateien

### `src/config/` – alles, was du nachjustieren kannst

| Datei           | Inhalt                                                                                                                                                                                                                                             |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `balancing.ts`  | `GAME_SPEED`, Offline-Deckel (8 Std.), Autosave-Intervall, Preissteigerung 1,15, Tipp-Erträge, Berufs-Multiplikatoren, Freischalt-Stufen der Ressourcen, alle Generatoren mit Preis, Ertrag und Freischalt-Stufe, Farbschwellen des Unruhe-Balkens |
| `states.ts`     | die vier Staaten: spielbar ja/nein, Tempo und Risiko, Währung, Ertrags-Multiplikatoren, Grund-Unruhe, Farben, Flagge                                                                                                                               |
| `careers.ts`    | Aufbau der Karriereleitern (welche Stufe eine Wahl braucht). Anforderungen folgen in Phase 2                                                                                                                                                       |
| `appearance.ts` | Hauttöne, Haarfarben, Parteifarben, Anzahl der Editor-Varianten, Namenslängen                                                                                                                                                                      |
| `index.ts`      | bündelt alles zu einer `GameConfig`                                                                                                                                                                                                                |

Alle Werte haben einen deutschen Kommentar. **Texte** (Namen der Staaten, Amtstitel, Namen der
Generatoren) stehen nicht hier, sondern in `src/i18n/de.ts`, damit später eine englische Fassung
ergänzt werden kann.

### `src/i18n/de.ts` – alle Spieltexte

Jeder sichtbare Text der App. Platzhalter wie `{duration}` werden per `fill()` ersetzt.

### `src/engine/` – die Spiellogik

| Datei                | Aufgabe                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| `ids.ts`             | feste Bezeichner: Ressourcen, Staaten, Berufe, Pfade, Generatoren                                        |
| `schema.ts`          | **Form des Spielstands** (zod-Schema) und `SAVE_VERSION`. Daraus werden die Typen abgeleitet             |
| `game.ts`            | neuen Spielstand anlegen, Durchlauf starten, Einführung/Hinweise als gesehen markieren                   |
| `economy.ts`         | Kostenformel (Preise auf ganze Beträge aufgerundet), „Max kaufen“, Ertragsraten, Tippen, Kaufen (atomar) |
| `unlocks.ts`         | ab welcher Stufe Ressourcen und Generatoren freigeschaltet sind                                          |
| `tick.ts`            | **Zeit**: `tick` (ein Takt), `applyOffline` (Abwesenheit), `advance` (zentrale Zeitfunktion)             |
| `sanitize.ts`        | fängt NaN, Infinity und negative Werte ab                                                                |
| `format.ts`          | deutsche Zahlen- und Zeitformatierung                                                                    |
| `rng.ts`             | seedbarer Zufallsgenerator                                                                               |
| `debug.ts`           | reine Hilfsfunktionen fürs Debug-Menü                                                                    |
| `save/storage.ts`    | abgesicherter Zugriff auf localStorage                                                                   |
| `save/saveSystem.ts` | zwei rotierende Speicherplätze, Laden mit Rückfall                                                       |
| `save/migrations.ts` | Umwandlung alter Spielstände auf die aktuelle Version                                                    |
| `save/backup.ts`     | Backup-Code erzeugen und einlesen                                                                        |
| `save/checksum.ts`   | Prüfsumme für den Backup-Code                                                                            |

### `src/store/` – Verbindung von Engine und Oberfläche

| Datei            | Aufgabe                                                                       |
| ---------------- | ----------------------------------------------------------------------------- |
| `gameStore.ts`   | der Store: Spielstand, Dialog-Warteschlange, Speicherstatus und alle Aktionen |
| `index.ts`       | die eine Store-Instanz der App und der Hook `useGame(selektor)`               |
| `useGameLoop.ts` | **Spielschleife**, Autosave, Reaktion auf Hintergrund und Rückkehr            |

### `src/ui/` – Oberfläche

| Datei/Ordner           | Aufgabe                                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `App.tsx`              | Rahmen: im Startablauf nur `SetupFlow`, sonst Kopfzeile, Tab-Inhalt, Tab-Leiste, Dialoge, Banner, hochfliegende Zahlen, Debug-Knopf                |
| `global.css`           | **Design-Tokens** (Farben, Schriften, Abstände), Hell/Dunkel, iOS-Regeln                                                                           |
| `setup/SetupFlow.tsx`  | **Startablauf**: Titelbildschirm → Figur (Name, Hautton, Frisur, Haarfarbe, Zufall) → Staatswahl → Berufswahl                                      |
| `tabs/CareerTab.tsx`   | **Hauptbildschirm**: Szene mit Amtstitel und Stufe, Tipp-Buttons, die drei günstigsten Investitionen                                               |
| `tabs/InvestTab.tsx`   | **Investieren**: Generatoren nach Geld, Einfluss, Anhänger; Kaufmenge ×1 / ×10 / Max; nächster gesperrter Generator als Ausblick                   |
| `tabs/ProfileTab.tsx`  | Backup-Code und iOS-Hinweis                                                                                                                        |
| `tabs/OtherTabs.tsx`   | Netzwerk und Welt (Platzhalter bis Phase 4 bzw. 6)                                                                                                 |
| `components/`          | Bausteine: Tab-Leiste, Ressourcenleiste, Balken, Tipp-Button, Generator-Zeile, Bottom Sheet, Buttons, Banner, Fehlerbildschirm, Querformat-Hinweis |
| `dialogs/`             | Dialoge der Warteschlange: Rückkehr (Offline), Einführung (3 Karten), Hinweise bei Freischaltung, Wiederherstellung                                |
| `effects/`             | hochfliegende Zahlen: `floatingBus.ts` (Auslöser) und `FloatingNumbers.tsx` (Pool mit 20 Elementen)                                                |
| `generatorView.ts`     | bereitet die Anzeige einer Generator-Zeile auf (Preis, Fehlbetrag, Erträge) und wählt die Vorschläge für den Hauptbildschirm                       |
| `gameText.ts`          | Amtstitel je Staat, Stufe und Pfad; Geldbeträge mit Währungszeichen                                                                                |
| `characterDefaults.ts` | Zufalls-Charakter (über den seedbaren Zufallsgenerator)                                                                                            |

### `src/art/` – Grafik (SVG, ohne Spiellogik)

| Datei                    | Aufgabe                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `figure/Figure.tsx`      | Figur aus Einzelteilen: Schatten, Beine, Rumpf mit Kleidung, Arme, Kopf (3 Gesichtsformen), Gesicht, 8 Frisuren. Atmen und Blinzeln per CSS |
| `figure/outfit.ts`       | welche Kleidung die Figur trägt (Phase 1: Blaumann bzw. Bürohemd je nach Beruf)                                                             |
| `flag/Flag.tsx`          | zeichnet die fiktiven Flaggen aus der Beschreibung in `states.ts`                                                                           |
| `scene/layers.tsx`       | die **Ebenen** der Szene, jede eine eigene Komponente: Himmel, Wolken, Stadtsilhouette, Arbeitsplatz (Werkhalle oder Bürogebäude), Passant  |
| `scene/Scene.tsx`        | setzt die Ebenen und die Figur zusammen                                                                                                     |
| `scene/Scene.module.css` | Farben der Szene für Hell und Dunkel, Bewegungen von Wolken und Passant                                                                     |

Wer eine Ebene später durch eine echte Illustration ersetzen will, tauscht nur die jeweilige
Komponente in `layers.tsx` aus. Spielcode und Engine bleiben unberührt.

### Weitere Ordner

| Ordner                         | Aufgabe                                                           |
| ------------------------------ | ----------------------------------------------------------------- |
| `src/debug/`                   | Debug-Menü und Schalter (`?debug=1`)                              |
| `src/test/`                    | Hilfen für Unit-Tests                                             |
| `tests/`                       | Playwright-Smoke-Test im iPhone-13-Profil                         |
| `scripts/export-icons.ts`      | erzeugt die PNG-Icons aus `assets/icon.svg`                       |
| `public/icons/`                | fertige Icons (werden vom Skript erzeugt)                         |
| `.github/workflows/deploy.yml` | automatische Veröffentlichung auf GitHub Pages (noch nicht aktiv) |

## Wie die Teile zusammenspielen

### Spielschleife (`store/useGameLoop.ts` → `engine/tick.ts`)

1. Die Schleife läuft über `requestAnimationFrame`, schreibt aber nur etwa **10-mal pro Sekunde**
   in den Store (`uiCommitIntervalMs`). So wird die Oberfläche nicht 60-mal pro Sekunde neu gezeichnet.
2. Jeder Takt ruft `advance(spielstand, jetzt)`. Diese Funktion schaut auf **einen einzigen
   Zeitstempel**, `lastActiveAt`, und verrechnet die Zeit bis jetzt:
   - Lücke bis 5 Sekunden → normaler Takt (`tick`)
   - größere Lücke → Abwesenheit (`applyOffline`): nur Erträge, höchstens 8 Stunden
   - negative Lücke (Uhr zurückgestellt) → nichts gutschreiben
     Danach steht `lastActiveAt` auf „jetzt“. Weil es nur diesen einen Zeitstempel gibt, kann
     dieselbe Zeit nie doppelt gutgeschrieben werden.
3. Geht die App in den Hintergrund (`visibilitychange`, `pagehide`), stoppt die Schleife und der
   Stand wird gespeichert. CSS-Animationen pausieren. Beim Zurückkehren greift automatisch die
   Offline-Berechnung aus Schritt 2.
4. Alle 10 Sekunden wird zusätzlich automatisch gespeichert.

### Speicherstand (`engine/save/`)

- Zwei Plätze im localStorage: `idle-politics.save.a` und `…b`. Geschrieben wird immer in den
  Platz, der nicht den neuesten gültigen Stand enthält. Jeder Eintrag hat eine laufende Nummer.
- Vor dem Schreiben prüft zod den Stand. Ein ungültiger Stand wird nie geschrieben.
- Beim Laden werden beide Plätze geprüft, der neueste gültige gewinnt. War der neueste beschädigt,
  erscheint der Hinweis „Spielstand wiederhergestellt“.
- Ist der Speicher voll oder gesperrt, erscheint ein gelbes Banner. Das Spiel läuft weiter.
- **Backup-Code** (Profil-Tab): `IP1.<komprimierter Spielstand>.<Prüfsumme>`. Beim Einlesen:
  Prüfsumme stimmt? → entpacken → Migration → zod-Prüfung → erst dann übernehmen.
- **Migrationen:** Ändert sich die Form des Spielstands, wird `SAVE_VERSION` in `schema.ts` erhöht
  und in `migrations.ts` eine Umwandlung ergänzt. Alte Stände werden beim Laden automatisch angehoben.

### Konfiguration

Die Engine bekommt die Konfiguration als Parameter (`cfg`). Die App nutzt `defaultConfig`,
Tests und die spätere Balancing-Simulation können eigene Werte einsetzen (z. B. anderes
`GAME_SPEED`). `GAME_SPEED` wirkt, indem alle Kosten durch diesen Wert geteilt werden.

### Oberfläche

- Komponenten holen sich Werte per `useGame(s => s.game.run?.resources.money)`. Sie werden nur neu
  gezeichnet, wenn sich genau dieser Wert ändert. **Wichtig:** Ein Selektor darf nicht bei jedem
  Aufruf ein neues Array oder Objekt liefern, sonst zeichnet React endlos neu. Für mehrere Werte
  gibt es `useShallow` mit Einzelwerten; Listen werden als Text verglichen.
- Aktionen rufen den Store auf, z. B. `gameStore.getState().buy('overtime', 1)`. Jede Aktion ist ein
  einzelner, atomarer Schritt: Kosten prüfen und abziehen passiert gemeinsam.
- **Preise** werden auf ganze Beträge aufgerundet. Angezeigter und abgezogener Preis sind dadurch
  immer identisch. Fehlbeträge werden aufgerundet angezeigt (nie „Fehlt: 0 €“).
- **Dialoge** laufen über die Warteschlange `overlays` im Store. `OverlayHost` zeigt immer nur den
  ersten Eintrag, der nächste kommt erst nach dem Schließen.
- **Hochfliegende Zahlen:** Der Tipp-Button ruft `spawnFloatingNumber`. `FloatingNumbers` hält 20
  fertige Elemente bereit und animiert sie nur über `transform` und `opacity`, ohne React neu zu zeichnen.
- Farben kommen aus CSS-Variablen in `global.css`. Die Staatsfarben setzt `App.tsx` aus `states.ts`.

### Startablauf

`game.phase` ist `'setup'`, solange kein Durchlauf läuft. Dann zeigt `App.tsx` nur `SetupFlow`.
Die Auswahl (Figur, Staat, Beruf) liegt bis zum Schluss nur im Bildschirm selbst. Erst
„Karriere beginnen“ ruft `beginRun`: Der Durchlauf startet, `phase` wird `'playing'`, die
Einführung wird eingereiht und sofort gespeichert. Nicht spielbare Staaten lehnt die Engine ab.

## Debug-Menü

Im Entwicklungsmodus immer sichtbar, sonst mit `?debug=1` hinter der Adresse (Käfer-Knopf unten
rechts, nicht im Startablauf). Funktionen bisher: Ressourcen hinzufügen, Zeitsprung +1 Std. /
+8 Std. (Offline-Simulation), Stufe wechseln (z. B. Stufe 2 für Anhänger), Spielstand zurücksetzen.
Aktionen, die einen Dialog auslösen können, schließen das Menü, damit nie zwei Fenster übereinander liegen. Im Debug-Modus ist der Store außerdem in der Browser-Konsole
als `window.__idlePolitics` erreichbar.

## Tests

- **Unit-Tests** (`*.test.ts(x)` neben dem Code): Formeln, Zeit und Offline-Fortschritt inklusive
  Grenzfällen, Speichern, Laden, Rückfall, Migration, Backup-Code, Zahlenformatierung, Store,
  Startablauf, Karriere- und Investieren-Tab (inklusive Mehrfachtippen auf Kaufen), Anzeige-Helfer.
- **Smoke-Test** (`tests/smoke.spec.ts`, WebKit im iPhone-13-Profil): kompletter Ablauf (anlegen,
  Staat und Beruf wählen, tippen, kaufen, neu laden), kein horizontales Scrollen, Tap-Flächen,
  Anhänger-Freischaltung mit Hinweis, Offline-Dialog, Backup-Code, Manifest und Offline-Cache.
