# Idle Politics – Hinweise für Claude Code

Idle-Spiel als PWA fürs iPhone (React + TypeScript + Vite + Zustand). Die vollständige
Spezifikation steht in `docs/SPEC.md`, der Aufbau des Codes in `ARCHITEKTUR.md`.
Der Auftraggeber programmiert nicht selbst: Erklärungen auf Deutsch, ohne Fachjargon.

## Befehle

| Befehl                                | Zweck                                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                         | Entwicklungsserver (Debug-Menü automatisch an)                                                                |
| `npm run dev:host`                    | Entwicklungsserver im WLAN, zum Testen auf dem iPhone über die IP                                             |
| `npm run check`                       | Typprüfung, Lint, Formatierung, Unit-Tests, schnelle Simulation, Build, Playwright (muss grün sein)           |
| `npm test`                            | nur Unit-Tests (Vitest)                                                                                       |
| `npm run e2e`                         | nur Playwright-Smoke-Test (WebKit, iPhone 13), braucht vorher `npm run build`                                 |
| `npm run simulate`                    | Balancing-Simulation (alle Staaten/Pfade, GAME_SPEED 1 und 0,05); `-- --quick`, `--verbose`, `--only=Novaria` |
| `npx tsx scripts/calibrate.ts`        | Aufstiegsanforderungen auf Zielzeiten einstellen (Tabelle in careers.ts einsetzen)                            |
| `npm run icons`                       | PNG-Icons aus `assets/icon.svg` erzeugen                                                                      |
| `npm run format`                      | Prettier auf alle Dateien                                                                                     |
| `BASE_PATH=/repo-name/ npm run build` | Build für GitHub Pages mit Unterpfad                                                                          |

## Arbeitsweise

- Alle Phasen aus `docs/SPEC.md` sind umgesetzt, dazu die begehbare Welt (Wunsch des Auftraggebers vom 28.09.2026: Figur läuft durch eine seitliche Straße, Orte bringen Tätigkeiten, Mitarbeiter automatisieren, Viertel werden mit dem Aufstieg prächtiger, ab Stufe 8 Karte mit Regionen und Außenpolitik).
- Neue Arbeit weiterhin in überschaubaren Schritten. Nach jeder Phase stoppen und liefern: was fertig
  ist, Testanleitung fürs iPhone, bekannte Einschränkungen, 2–3 Sätze zu Architekturentscheidungen.
  Dann auf OK warten.
- Bei Widersprüchen oder Unklarheiten in der Spezifikation nachfragen statt raten.
- `ARCHITEKTUR.md` am Ende jeder Phase aktualisieren. Nach jeder Phase ein Git-Commit.
- Code und Bezeichner auf Englisch, Kommentare an nicht offensichtlichen Stellen kurz auf Deutsch.
- Alle Spieltexte in `src/i18n/de.ts`. Alle Zahlen und Inhalte in `src/config/`, jeder Wert mit
  deutschem Kommentar. Nichts in Komponenten oder Engine hartkodieren.

## Qualitätsregeln (höchste Priorität)

- Bugs vermeiden geht vor Funktionsumfang. Keine Platzhalter-TODOs in abgeschlossenen Phasen.
- TypeScript strict. Kein `any`, kein `@ts-ignore`, keine unbehandelten Promises.
- Spiellogik nur als reine Funktionen in `src/engine/`, ohne React. Kern: `tick(state, deltaMs, cfg)`
  und `advance(state, now, cfg)`. Konfiguration wird als Parameter übergeben.
- Zufall nur über den seedbaren Generator `src/engine/rng.ts` (Zustand liegt im Spielstand).
- Für jeden gefundenen Bug zuerst einen Test schreiben, der ihn reproduziert, dann fixen.
- `npm run check` ohne Fehler und ohne Warnungen; Browser-Konsole im normalen Betrieb leer.
- Error-Boundary darf nie den Spielstand löschen.
- Spielstand: vor jedem Speichern und beim Laden mit zod prüfen; zwei rotierende Plätze; nie einen
  gültigen durch einen ungültigen Stand überschreiben. Schema-Änderung ⇒ `SAVE_VERSION` erhöhen und
  Migration in `src/engine/save/migrations.ts` ergänzen (mit Test).
- Zeit: nur echte Zeitstempel; negative Differenzen = 0; Offline-Deckel aus der Config; Offline
  laufen nur Erträge; keine doppelte Gutschrift (einziger Zeitstempel `lastActiveAt`).
- Zahlen: nach jedem Takt auf NaN/Infinity prüfen (`sanitizeGame`), nie unter 0, nie „-0“,
  deutsche Formatierung über `formatNumber`, `tabular-nums` (Klasse `num`).
- Käufe atomar in einem `set`, Kosten im selben Schritt geprüft. Buttons deaktiviert ohne Mittel.
- Zustandsübergänge über `phase`; Dialoge über die Warteschlange `overlays`, nie zwei gleichzeitig.
- Komponenten abonnieren nur benötigte Werte per Selektor (`useGame(s => …)`), möglichst primitive.
- Animationen nur über `transform`/`opacity`, pausieren im Hintergrund, `prefers-reduced-motion`.
- iOS: Safe Areas, `100dvh`, Tap-Flächen ≥ 44 px, Eingabefelder ≥ 16 px, nichts hängt an Hover.
- Keine Netzwerkanfragen zur Laufzeit, keine CDN-Ressourcen, Schriften lokal über @fontsource.

## Hinweise zur Umgebung

- TypeScript bleibt vorerst auf 6.0.x, weil typescript-eslint Version 7 noch nicht unterstützt.
- Die Vorschau im Claude-Browser startet über `.claude/launch.json` des Arbeitsordners
  (Einträge `idle-politics` = Dev-Server auf Port 5188, `idle-politics-preview` = Build auf 4188).

## Stolperfallen (gelernt)

- Selektoren dürfen nie bei jedem Aufruf ein neues Array/Objekt liefern (Endlosschleife). Listen als Text vergleichen oder `useShallow` mit Einzelwerten.
- In WebKit ignorieren verschachtelte `<svg>` die Verschiebung einer umgebenden `<g>`. In SVGs `FlagGraphic` statt `Flag` nutzen.
- Dateinamen, die sich nur in Groß-/Kleinschreibung unterscheiden, kollidieren auf macOS.
- Kosten, die mit der Zeit anfallen (Verfall), müssen mit `GAME_SPEED` skalieren.
- Playwright: Nach dem Öffnen eines Bottom Sheets ~400 ms warten, bevor Positionen gemessen werden.
