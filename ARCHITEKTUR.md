# Architektur von Idle Politics

Stand: Ende Phase 0 (Fundament). Diese Datei erklärt, wo was passiert, damit du gezielt
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

| Datei                | Aufgabe                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `ids.ts`             | feste Bezeichner: Ressourcen, Staaten, Berufe, Pfade, Generatoren                            |
| `schema.ts`          | **Form des Spielstands** (zod-Schema) und `SAVE_VERSION`. Daraus werden die Typen abgeleitet |
| `game.ts`            | neuen Spielstand anlegen, Durchlauf starten, Einführung/Hinweise als gesehen markieren       |
| `economy.ts`         | Kostenformel, „Max kaufen“, Ertragsraten, Tippen, Kaufen (atomar)                            |
| `unlocks.ts`         | ab welcher Stufe Ressourcen und Generatoren freigeschaltet sind                              |
| `tick.ts`            | **Zeit**: `tick` (ein Takt), `applyOffline` (Abwesenheit), `advance` (zentrale Zeitfunktion) |
| `sanitize.ts`        | fängt NaN, Infinity und negative Werte ab                                                    |
| `format.ts`          | deutsche Zahlen- und Zeitformatierung                                                        |
| `rng.ts`             | seedbarer Zufallsgenerator                                                                   |
| `debug.ts`           | reine Hilfsfunktionen fürs Debug-Menü                                                        |
| `save/storage.ts`    | abgesicherter Zugriff auf localStorage                                                       |
| `save/saveSystem.ts` | zwei rotierende Speicherplätze, Laden mit Rückfall                                           |
| `save/migrations.ts` | Umwandlung alter Spielstände auf die aktuelle Version                                        |
| `save/backup.ts`     | Backup-Code erzeugen und einlesen                                                            |
| `save/checksum.ts`   | Prüfsumme für den Backup-Code                                                                |

### `src/store/` – Verbindung von Engine und Oberfläche

| Datei            | Aufgabe                                                                       |
| ---------------- | ----------------------------------------------------------------------------- |
| `gameStore.ts`   | der Store: Spielstand, Dialog-Warteschlange, Speicherstatus und alle Aktionen |
| `index.ts`       | die eine Store-Instanz der App und der Hook `useGame(selektor)`               |
| `useGameLoop.ts` | **Spielschleife**, Autosave, Reaktion auf Hintergrund und Rückkehr            |

### `src/ui/` – Oberfläche

| Datei/Ordner           | Aufgabe                                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `App.tsx`              | Rahmen: Kopfzeile, Inhalt, Tab-Leiste, Dialoge, Banner, Debug-Knopf                                                   |
| `global.css`           | **Design-Tokens** (Farben, Schriften, Abstände), Hell/Dunkel, iOS-Regeln                                              |
| `components/`          | Bausteine: Tab-Leiste, Ressourcenleiste, Balken, Bottom Sheet, Buttons, Banner, Fehlerbildschirm, Querformat-Hinweis  |
| `dialogs/`             | Dialoge der Warteschlange: Rückkehr (Offline), Einführung, Hinweise, Wiederherstellung                                |
| `tabs/`                | die fünf Tabs. In Phase 0 zeigen Karriere, Netzwerk, Investieren und Welt Platzhalter; Profil enthält den Backup-Code |
| `characterDefaults.ts` | Zufalls-Charakter                                                                                                     |

### Weitere Ordner

| Ordner                         | Aufgabe                                                           |
| ------------------------------ | ----------------------------------------------------------------- |
| `src/debug/`                   | Debug-Menü und Schalter (`?debug=1`)                              |
| `src/art/`                     | (ab Phase 1) SVG-Figur und Szenen                                 |
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
  gezeichnet, wenn sich genau dieser Wert ändert.
- Aktionen rufen den Store auf, z. B. `gameStore.getState().buy('overtime', 1)`. Jede Aktion ist ein
  einzelner, atomarer Schritt: Kosten prüfen und abziehen passiert gemeinsam.
- **Dialoge** laufen über die Warteschlange `overlays` im Store. `OverlayHost` zeigt immer nur den
  ersten Eintrag, der nächste kommt erst nach dem Schließen.
- Farben kommen aus CSS-Variablen in `global.css`. Die Staatsfarben setzt `App.tsx` aus `states.ts`.

## Debug-Menü

Im Entwicklungsmodus immer sichtbar, sonst mit `?debug=1` hinter der Adresse (Käfer-Knopf unten
rechts). Phase 0: Testlauf starten, Ressourcen hinzufügen, Zeitsprung +1 Std. / +8 Std., Stufe
wechseln, Spielstand zurücksetzen. Im Debug-Modus ist der Store außerdem in der Browser-Konsole
als `window.__idlePolitics` erreichbar.

## Tests

- **Unit-Tests** (`*.test.ts` neben dem Code): Formeln, Zeit und Offline-Fortschritt inklusive
  Grenzfällen, Speichern, Laden, Rückfall, Migration, Backup-Code, Zahlenformatierung, Store.
- **Smoke-Test** (`tests/smoke.spec.ts`, WebKit im iPhone-13-Profil): Start ohne Konsolenfehler,
  Layout, Speichern über Neuladen, Backup-Code, Manifest und Offline-Cache.
