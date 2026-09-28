# Idle Politics – Projektauftrag für Claude Code

Dieses Dokument ist die vollständige Spezifikation für das Spiel „Idle Politics“. Lies es ganz, bevor du anfängst, und speichere es im Projekt als `docs/SPEC.md`, damit spätere Sitzungen darauf zugreifen können.

---

## 0. Arbeitsweise

- Erstelle zuerst einen Umsetzungsplan für Phase 0 und Phase 1 (siehe Abschnitt 8) und warte auf meine Freigabe, bevor du Code schreibst.
- Arbeite phasenweise. Nach jeder Phase stoppst du und lieferst mir: was fertig ist, wie ich es auf dem iPhone teste, bekannte Einschränkungen. Dann wartest du auf mein OK.
- Wenn etwas in dieser Spezifikation widersprüchlich oder unklar ist, frag nach, statt zu raten.
- Lege eine `CLAUDE.md` an, die die Arbeitsregeln aus Abschnitt 0 und 3 sowie die wichtigsten Befehle enthält.
- Führe eine `ARCHITEKTUR.md` auf Deutsch: welche Ordner und Dateien es gibt, was sie tun und wie Spielschleife, Speicherstand, Konfiguration und Oberfläche zusammenhängen. Aktualisiere sie am Ende jeder Phase. Ich programmiere nicht selbst, will aber verstehen, wo was passiert, damit ich gezielt Änderungen ansagen kann.
- Code und Bezeichner auf Englisch, Kommentare an nicht offensichtlichen Stellen kurz auf Deutsch. Alle Spieltexte auf Deutsch in `src/i18n/de.ts`, damit später eine englische Version ergänzt werden kann.
- Git: nach jeder abgeschlossenen Phase ein Commit mit aussagekräftiger Nachricht.
- Erkläre mir nach jeder Phase in zwei, drei Sätzen, welche Architekturentscheidungen du getroffen hast und warum.

---

## 1. Spielidee

„Idle Politics“ ist ein Idle-Spiel im Hochformat für das Smartphone. Man beginnt als einfacher Arbeiter und steigt über zwölf Karrierestufen bis zum Präsidenten oder Diktator auf. Zu Beginn wählt man einen von vier fiktiven Staaten, die realen Vorbildern nachempfunden sind. Der demokratische Weg ist langsamer, aber sicher. Der autokratische ist schneller, aber riskant: Wer die Unruhe im Land zu hoch treibt, wird gestürzt. Allianzen mit gesellschaftlichen Gruppen, Ereigniskarten und ab einer höheren Stufe die Außenpolitik bestimmen, wie schnell und wie sicher man aufsteigt.

- Zielgerät: iPhone 13 Pro Max (Safari und Homescreen-App). Muss auch auf kleinen iPhones mit 375 px Breite sauber funktionieren.
- Bedienung: Hochformat, alles mit einem Daumen erreichbar.
- Ton: nüchtern-realistisch, keine Klamauk-Satire.
- Alle Staaten, Personen, Parteien und Orte sind fiktiv. Keine realen Politikerinnen und Politiker.

---

## 2. Technik

- Web-App als PWA: installierbar über „Zum Home-Bildschirm“, komplett offline spielbar, kein Backend.
- React + TypeScript (strict) + Vite in den jeweils aktuellen stabilen Versionen.
- State: Zustand. Eigenes Speichersystem statt der persist-Middleware, damit Versionierung und Migration kontrollierbar bleiben.
- Validierung von Spielständen mit zod.
- PWA über vite-plugin-pwa (Workbox) mit `registerType: 'prompt'`.
- Animation über CSS-Transitions. Für Wisch-Karten und Zeremonien ist Motion (Framer Motion) in Ordnung. Keine Game-Engine.
- Icons: lucide-react.
- Schriften lokal gebündelt über @fontsource: Source Serif 4 für Überschriften, Inter für Oberfläche und Zahlen.
- Tests: Vitest mit Testing Library, dazu Playwright mit WebKit im Geräteprofil „iPhone 13“.
- Qualität: ESLint + Prettier. Ein Befehl `npm run check` führt Typprüfung, Lint, Tests und Build aus.
- Deployment: GitHub Pages über GitHub Actions. Achte auf den richtigen `base`-Pfad in Vite und auf `scope` und `start_url` im Manifest, sonst bleibt die Seite weiß.
- Lokaler Test auf dem iPhone: `vite --host`, Aufruf über die IP-Adresse im selben WLAN. Dort läuft kein Service Worker (kein HTTPS), die PWA-Installation wird deshalb über die GitHub-Pages-Version getestet. Erkläre mir beides in der Testanleitung.
- Zur Laufzeit keine Netzwerkanfragen, kein Tracking, keine CDN-Ressourcen.
- Kein Sound in Version 1, aber so strukturiert, dass Sound später ergänzt werden kann.

### 2.1 Speicherstand
- Lokal in localStorage, jeder Zugriff in try/catch gekapselt.
- Automatisch speichern alle 10 Sekunden sowie bei `visibilitychange` (hidden) und `pagehide`. Nicht auf `beforeunload` verlassen, das feuert auf iOS unzuverlässig.
- Versioniert über ein Feld `saveVersion`, mit Migrationsfunktionen für ältere Stände.
- Zwei rotierende Speicherplätze: Der letzte gültige Stand bleibt immer als Rückfallebene erhalten.
- Export und Import als Backup-Code (komprimiertes JSON, z. B. mit lz-string, Base64, mit Prüfsumme) im Profil-Tab, mit Kopieren-Button.
- Hinweis im Profil: Auf iOS haben die Homescreen-App und der Safari-Tab getrennte Speicher. Zum Umziehen dient der Backup-Code.

### 2.2 Offline-Fortschritt
- Beim Öffnen wird die Zeit seit dem letzten Speichern berechnet, auf 0 bis 8 Stunden begrenzt (Wert in der Config) und in Ressourcen umgerechnet.
- Offline laufen ausschließlich Erträge. Keine Ereignisse, keine Wahlen, keine Unruhe-Folgen, kein Sturz. Zustimmung und Unruhe bleiben eingefroren.
- Rückkehr-Dialog: „Während du weg warst: +X Geld, +Y Einfluss …“

### 2.3 Konfiguration
Alle Zahlenwerte und Inhalte gehören in `src/config/`. Nichts wird in Komponenten oder in der Engine hartkodiert.

| Datei | Inhalt |
|---|---|
| `balancing.ts` | Tempo-Faktor, Kostenkurven, Erträge, Multiplikatoren, Schwellenwerte, Offline-Deckel |
| `states.ts` | die vier Staaten mit Boni, Mali, Farben, Flaggen |
| `careers.ts` | Karrierestufen, Titel, Anforderungen, Wahl-Stufen |
| `events.ts` | Ereigniskarten |
| `alliances.ts` | Gruppen, Effekte, Rivalitäten |
| `foreign.ts` | Außenpolitik |
| `legacy.ts` | Vermächtnis-Baum und Erfolge |

Jeder Wert bekommt einen kurzen deutschen Kommentar, was er bewirkt, damit ich ohne Programmierkenntnisse nachjustieren kann.

---

## 3. Qualität und Fehlerfreiheit (höchste Priorität)

Das Spiel muss stabil und fehlerfrei laufen. Bugs zu vermeiden hat Vorrang vor dem Funktionsumfang: lieber ein Feature weniger als eins, das halb funktioniert. Eine Phase gilt erst als fertig, wenn alle Punkte aus Abschnitt 9 erfüllt sind. Schreib keine Platzhalter-TODOs in abgeschlossene Phasen.

### 3.1 Grundregeln
1. TypeScript im strict-Modus. Kein `any`, kein `@ts-ignore`, keine unbehandelten Promises.
2. Die Spiellogik liegt als reine Funktionen in `src/engine/`, vollständig getrennt von React. Kernfunktion: `tick(state, deltaMs) → state`. So lässt sich alles ohne Oberfläche testen.
3. Zufall nur über einen injizierbaren, seedbaren Zufallsgenerator, damit Tests reproduzierbar sind.
4. Unit-Tests für: Kosten- und Ertragsformeln, Aufstieg und Abstieg, Wahlen, Sturz, Auswandern, Vermächtnis, Offline-Fortschritt inklusive Grenzfällen, Speichern, Laden, Migration, Backup-Code und Zahlenformatierung.
5. Für jeden gefundenen Bug wird zuerst ein Test geschrieben, der ihn reproduziert, danach kommt der Fix.
6. `npm run check` läuft nach jeder Phase ohne Fehler und ohne Warnungen durch. Die Browser-Konsole bleibt im normalen Spielbetrieb leer.
7. Playwright-Smoke-Test (WebKit, iPhone 13): Spiel startet, Charakter anlegen, Staat und Beruf wählen, tippen, Upgrade kaufen, Seite neu laden, Spielstand ist noch da.
8. Eine React-Error-Boundary fängt Abstürze ab. Ein Fehler darf niemals den Spielstand löschen. Stattdessen erscheint ein Hinweis mit Button „Neu laden“.

### 3.2 Bekannte Fehlerquellen, die aktiv vermieden werden müssen

**Spielstand**
- Beim Laden und vor jedem Speichern mit zod validieren. Ein gültiger Stand wird nie durch einen ungültigen überschrieben.
- localStorage kann voll oder gesperrt sein: abfangen, Hinweis anzeigen, weiterspielen lassen.

**Zeit**
- Die Spielschleife rechnet mit echten Zeitstempeln (Delta) und nimmt nie an, dass ein Intervall exakt läuft. Browser drosseln Timer im Hintergrund.
- Negative Zeitdifferenzen (Uhr zurückgestellt) zählen als 0, zu große werden auf den Offline-Deckel begrenzt.
- Ist die App im Hintergrund, pausiert die Schleife. Beim Zurückkehren greift die Offline-Berechnung.
- Keine doppelte Gutschrift: Offline-Berechnung und laufende Schleife dürfen sich nicht überschneiden.

**Zahlen**
- Nach jedem Tick und beim Laden auf NaN und Infinity prüfen und abfangen, im Debug-Modus zusätzlich loggen.
- Ressourcen fallen nie unter 0. Nirgends „-0“ anzeigen.
- Eigene deutsche Zahlenformatierung: 1.234 / 12,4 Tsd. / 3,2 Mio. / 1,5 Mrd. / 2,1 Bio. / 4,0 Brd., darüber wissenschaftliche Schreibweise.
- Zahlen immer mit `font-variant-numeric: tabular-nums`, damit sie beim Hochzählen nicht hin und her springen.

**Käufe und Aktionen**
- Schnelles Mehrfachtippen und Multitouch dürfen nichts doppelt kaufen und nichts ins Minus treiben. Jeder Kauf ist ein atomarer Zustandsübergang, der die Kosten im selben Schritt prüft.
- Buttons sind deaktiviert, solange die Mittel fehlen, und zeigen an, was noch fehlt.

**Zustandsübergänge**
- Aufstieg, Wahl, Zeremonie, Sturz, Auswandern und Vermächtnis-Neustart laufen über eine explizite Zustandsmaschine, etwa `phase: 'playing' | 'election' | 'ceremony' | 'overthrown' | 'emigrating' | …`.
- Nie zwei Overlays gleichzeitig. Dialoge und Karten laufen über eine Warteschlange. Während einer Zeremonie erscheint keine Ereigniskarte.
- Keine Sackgassen: Nach Wahlniederlage, Rücktritt, Sturz oder Auswandern muss der Spieler immer weiterkommen können. Das Balancing-Skript prüft das.

**Performance und Speicher**
- Die Spielschleife darf nicht bei jedem Tick die ganze App neu rendern. Komponenten abonnieren nur die Werte, die sie brauchen (Selektoren).
- Hochfliegende Zahlen über einen Objekt-Pool, höchstens etwa 20 gleichzeitig.
- Animationen nur über `transform` und `opacity`. Animationen stoppen, wenn die App im Hintergrund ist. `prefers-reduced-motion` wird respektiert.
- Intervalle, Event-Listener und Animation-Frames werden in Effects sauber aufgeräumt. Keine Speicherlecks.
- Ziel: flüssige 60 fps auf dem iPhone 13 Pro Max, auch in belebten Szenen.

**Mobile und iOS**
- `viewport-fit=cover` und Safe-Area-Abstände (Dynamic Island oben, Home-Indikator unten).
- `100dvh` statt `100vh`.
- `touch-action: manipulation` (kein Zoom bei Doppeltipp), `overscroll-behavior: none` (kein Gummiband-Effekt, kein Pull-to-Refresh), `-webkit-tap-highlight-color: transparent`, `user-select: none` auf Buttons.
- Eingabefelder mit mindestens 16 px Schriftgröße, sonst zoomt iOS beim Tippen ins Namensfeld.
- Tap-Flächen mindestens 44 × 44 pt. Nichts darf von Hover abhängen.
- iOS ignoriert die Orientierungssperre im Manifest. Bei Querformat erscheint deshalb ein Overlay „Bitte Gerät drehen“.
- Wisch-Karten: klare Schwelle, damit Wischen nicht mit Tippen oder Scrollen kollidiert. Eine Entscheidung darf nicht doppelt ausgelöst werden. Zusätzlich zwei Buttons als Alternative zum Wischen.

**PWA**
- Bei einer neuen Version erscheint „Update verfügbar – neu laden“, statt dass veraltete Caches weiterlaufen.
- Alle Assets und Schriften sind lokal gebündelt, damit das Spiel komplett offline läuft.

### 3.3 Debug-Menü
Verfügbar im Entwicklungsmodus und über `?debug=1` in der URL, damit ich auch auf dem iPhone testen kann. Funktionen: Ressourcen hinzufügen, Zeitsprung (+1 h und +8 h als Offline-Simulation), Zustimmung und Unruhe setzen, Ereignis, Wahl oder Sturz auslösen, zu einer Stufe springen, Staat wechseln, Spielstand zurücksetzen.

### 3.4 Balancing-Simulation
`npm run simulate` lässt einen Bot jeden Staat und jeden Pfad ohne Oberfläche durchspielen und gibt eine Tabelle aus: Zeit pro Stufe, Gesamtzeit, auffällige Wartezeiten. Der Lauf schlägt fehl, wenn eine Stufe unerreichbar ist oder länger als das Dreifache ihrer Zielzeit dauert.

---

## 4. Spielablauf

### 4.1 Start eines Durchlaufs
1. Titelbildschirm „Idle Politics“
2. Charakter-Editor (siehe 4.13)
3. Staatswahl: vier Karten mit Staatsform, Vor- und Nachteilen sowie den Anzeigen „Aufstiegstempo“ und „Risiko“ (je 1 bis 5 Punkte)
4. Berufswahl:
   - **Büroangestellter:** Geld ×1,5, Einfluss ×0,7
   - **Facharbeiter:** Geld ×0,7, Einfluss ×1,5, Anhänger ×1,2
5. Kurze Einführung in drei Karten. Danach erscheinen Hinweise im Spiel, wenn eine neue Funktion zum ersten Mal freigeschaltet wird.

### 4.2 Ressourcen

| Ressource | Freischaltung | Zweck |
|---|---|---|
| Geld | Start | Generatoren, Wahlkampf, Bestechung, Einbürgerung |
| Einfluss | Start | Allianzen, Aufstiegsanforderungen, politische Aktionen |
| Anhänger | Stufe 2 | Wahlen, Mobilisierung; in Borealis und Zentralia wenig wert |
| Loyalität des Apparats | Stufe 5 (Borealis und Zentralia: Stufe 3) | Schutz vor Putsch, Voraussetzung für autokratischen Aufstieg |
| Diplomatisches Kapital | Stufe 8 | Außenpolitik |

Dazu kommen zwei Balken, die keine Währung sind: Zustimmung und Unruhe (4.3).

**Spielweise (Hybrid):** Am Anfang tippt man selbst. „Schicht arbeiten“ bringt Geld, „Mit Kollegen reden“ bringt Einfluss. Mit den Erträgen kauft man Generatoren, die automatisch Erträge liefern, zum Beispiel:
- Geld: Überstunden, Nebenjob, Kleinunternehmen …
- Einfluss: Stammtisch, Vereinsarbeit, Ortsverband, Pressekontakte …
- Anhänger: Flyer, Infostand, Social-Media-Team, Kampagnenbüro …

Die Kosten steigen pro Kauf um den Faktor 1,15 (Config). Neue Generatoren werden mit den Stufen freigeschaltet. Später übernehmen Berater und Mitarbeiter auch das Tippen.

### 4.3 Zustimmung und Unruhe
- **Zustimmung (0–100 %):** Demokraten brauchen sie für Wahlen. Sie bewegt sich langsam auf einen Grundwert zu und wird durch Aktionen, Ereignisse und Allianzen verändert. Bei Autokraten bestimmt sie, wie schnell die Unruhe steigt.
- **Unruhe (0–100 %):** steigt vor allem durch autokratische Aktionen, autokratische Aufstiege und negative Ereignisse. Sie sinkt langsam von selbst.
- Bei 100 % Unruhe: Ein Autokrat wird gestürzt (Revolution). Ein Demokrat muss zurücktreten und fällt zwei Stufen zurück.
- Fairness: Ab 70 % erscheint eine deutliche Warnung. Zwischen dem Erreichen von 90 % und einem Sturz liegen mindestens 60 Sekunden echte Zeit, in denen man gegensteuern kann.

### 4.4 Die vier Staaten
Die Namen sind Platzhalter und in `states.ts` änderbar.

| Staat | Vorbild | Staatsform | Vorteile | Nachteile | Tempo / Risiko |
|---|---|---|---|---|---|
| Novaria | USA | Präsidialdemokratie | Geld ×1,4, Spenden- und Lobby-Generatoren | Wahlkämpfe ×1,5 teurer, Zustimmung schwankt stärker | 3 / 2 |
| Rhenanien | Deutschland | Parlamentarische Demokratie | Unruhe sinkt schneller, Allianzen (Koalitionen) günstiger | Aufstiegsanforderungen ×1,2, Geld ×0,9 | 2 / 1 |
| Borealis | Russland | Autoritäres Präsidialsystem mit Scheinwahlen | schneller Aufstieg, Rohstoffeinnahmen, Loyalität kaufbar | hohe Grund-Unruhe, Oligarchen als Rivalen, schlechte Startbeziehungen im Ausland | 4 / 4 |
| Zentralia | China | Einparteienstaat | hohe Wirtschaftsleistung, starker Apparat, Unruhe steigt langsam, solange die Loyalität hoch ist | Anhänger fast wertlos, Aufstieg nur über Loyalität und Einfluss, Säuberungen bei niedriger Loyalität | 3 / 3 |

Jeder Staat hat eigene Ämter, eine eigene Farbwelt, eine fiktive Flagge und einen eigenen Baustil in den Szenen.

### 4.5 Karriereleitern (je 12 Stufen)
Die Titel sind Entwürfe und in `careers.ts` änderbar. Stufen mit (W) erfordern auf dem demokratischen Pfad eine gewonnene Wahl.

- **Novaria:** Arbeiter → Vorarbeiter → Bezirksdelegierter (W) → Stadtrat (W) → Bürgermeister (W) → Abgeordneter im Staatsparlament (W) → Gouverneur (W) → Kongressabgeordneter (W) → Senator (W) → Minister → Vizepräsident (W) → Präsident (W)
- **Rhenanien:** Arbeiter → Betriebsrat (W) → Ortsvereinsvorsitzender (W) → Stadtrat (W) → Bürgermeister (W) → Landtagsabgeordneter (W) → Landesminister → Ministerpräsident → Bundestagsabgeordneter (W) → Bundesminister → Bundeskanzler (W) → Präsident (W)
- **Borealis:** Arbeiter → Brigadeleiter → Parteisekretär im Betrieb → Stadtdumaabgeordneter → Bürgermeister → Gebietsgouverneur → Dumaabgeordneter → Vizeminister → Minister → Premierminister → Präsident → Präsident auf Lebenszeit
- **Zentralia:** Arbeiter → Gruppenleiter → Sekretär der Parteizelle → Kreiskader → Bürgermeister → Provinzkader → Provinzgouverneur → Provinzparteisekretär → Zentralkomitee → Politbüro → Ständiger Ausschuss → Generalsekretär auf Lebenszeit

Auf dem autokratischen Pfad in Novaria und Rhenanien bekommen die Stufen ab 6 eigene Titel (Feld `titleAutocratic`). Die oberste Stufe heißt dort „Diktator“.

Jede Stufe verlangt mehrere Ressourcen, nicht nur Geld, damit sich niemand allein mit Geld nach oben kauft.

### 4.6 Pfade
- Novaria und Rhenanien beginnen demokratisch. Ab Stufe 5 (Bürgermeister) steht die einmalige Entscheidung „Autoritären Kurs einschlagen“ zur Verfügung. Sie ist unumkehrbar und wird über einen Dialog bestätigt, der die Folgen klar benennt.
- Borealis und Zentralia sind immer autokratisch.

**Demokratischer Pfad**
- Aufstieg über Wahlen. Vor der Wahl sieht man die Siegchance in Prozent, berechnet aus Zustimmung, Anhängern im Verhältnis zum Bedarf und optionalem Wahlkampfbudget. Die Formel steht in der Config, die Chance liegt immer zwischen 5 und 95 %.
- Man entscheidet selbst, wann man kandidiert.
- Niederlage: zwei Stufen zurück, die Ressourcen bleiben.

**Autokratischer Pfad**
- Aufstiegsanforderungen ×0,7. Aufstieg ohne echte Wahl über „Macht ausbauen“: kostet Loyalität und Geld und erhöht die Unruhe.
- Zusätzliche Aktionen: Presse kontrollieren, Opposition schikanieren, Wahlergebnis korrigieren, Notstand ausrufen, Loyalität kaufen, Repression. Repression senkt die Unruhe sofort, kostet aber Zustimmung und Auslandsbeziehungen. Alle anderen Aktionen erhöhen die Unruhe. Vor dem Ausführen zeigt eine Vorschau die Folgen.
- **Putschrisiko:** Liegt die Loyalität des Apparats unter 25 % und die Unruhe über 60 %, gibt es ein sichtbares Putschrisiko pro Minute. In Zentralia heißt das Säuberung und kann schon bei niedriger Loyalität allein eintreten.

### 4.7 Scheitern und Vermächtnis
- Wahl verloren oder Rücktritt: zwei Stufen zurück, mindestens bis Stufe 1.
- Sturz (Revolution, Putsch, Säuberung): Der Durchlauf endet. Es folgt ein nüchterner Abschlussbildschirm mit Statistik und den erhaltenen Vermächtnis-Punkten, danach ein Neustart als Arbeiter mit freier Staatswahl. Charakter, Vermächtnis und Erfolge bleiben erhalten.
- Vermächtnis-Punkte hängen von der höchsten erreichten Stufe und der Gesamtleistung ab. Man gibt sie in einem Vermächtnis-Baum mit etwa zehn dauerhaften Boni aus, zum Beispiel +10 % Geld, schneller sinkende Unruhe oder Start mit einem Generator.
- An der Spitze: Siegesbildschirm mit Statistik (Zeit, Staat, Pfad). Danach die Wahl zwischen „Ruhestand“ (Memoiren, großer Vermächtnis-Bonus, Neustart) und „Weiterregieren“ (Amtsjahre zählen hoch, Krisen werden häufiger, außenpolitische Ziele).

### 4.8 Auswandern
- Ab Stufe 5 kann man für Geld die Staatsbürgerschaft eines anderen Staates kaufen. Die Kosten stehen in der Config.
- Animation von etwa 3 Sekunden, überspringbar: Die Figur packt einen Koffer, ein Flugzeug fliegt über eine stilisierte Karte von der alten zur neuen Flagge.
- Folgen: Neustart als Arbeiter im neuen Staat mit erneuter Berufswahl. Die gesamte politische Anerkennung geht verloren (Stufe, Einfluss, Anhänger, Loyalität, Allianzen, diplomatisches Kapital). Das Geld bleibt vollständig erhalten, ebenso Charakter, Vermächtnis und Erfolge.
- Beispielstrategie: in Novaria Geld verdienen und es in einem anderen Staat als Startkapital nutzen. Beim Balancing gilt: Geld beschleunigt, ersetzt aber keine anderen Anforderungen.

### 4.9 Ereigniskarten
- Karten zum Wischen wie im Spiel Reigns: rechts Ja, links Nein, zusätzlich zwei Buttons. Beim Anziehen der Karte zeigen kleine Icons, welche Werte sich ändern werden, ohne genaue Zahlen.
- Mindestens 30 Karten in der ersten Version, jede mit Bedingungen (Stufenbereich, Staat, Pfad). Beispiele: Streik im Werk, Spendenangebot eines Bauunternehmers, Journalist fragt nach einer Dienstwagen-Affäre, Hochwasser, Handelsstreit mit einem Nachbarstaat, Oligarch bietet Unterstützung an, Parteifreund intrigiert.
- Nüchterner, realistischer Ton, fiktive Namen.
- Etwa alle 2 bis 4 Minuten, skaliert mit dem Tempo-Faktor. Höchstens drei offene Karten im Stapel, angezeigt als Badge. Offline entstehen keine Karten.

### 4.10 Netzwerk und Allianzen
- Gruppen: Gewerkschaften, Wirtschaft, Medien, Verwaltung, Zivilgesellschaft (nur Demokratien), Militär, Sicherheitsdienste (autokratisch), Oligarchen (Borealis), Parteiapparat (Zentralia). Freischaltung nach Stufe.
- Jede Gruppe hat eine Loyalität von 0 bis 100 %, die man mit Geld oder Einfluss erhöht und die langsam wieder sinkt.
- Ab bestimmten Schwellen gibt es passive Boni, etwa Wirtschaft: mehr Geld; Medien: steigende Zustimmung; Gewerkschaften: mehr Anhänger; Militär: Schutz vor Putsch.
- Rivalitäten: Wer eine Gruppe stärkt, verärgert ihre Gegenspieler leicht, zum Beispiel Gewerkschaften und Wirtschaft. Ereignisse können Allianzen zerbrechen lassen.

### 4.11 Außenpolitik
- Freischaltung ab Stufe 8. Bis dahin zeigt der Tab „Welt“ ein Schloss mit Hinweis.
- Beteiligt sind die drei anderen Hauptstaaten und zwei kleine fiktive Staaten. Jede Beziehung liegt zwischen −100 und +100.
- Aktionen kosten diplomatisches Kapital: Staatsbesuch, Handelsabkommen (dauerhafter Geldbonus), Bündnis (schützt vor bestimmten Krisen), Sanktionen (bringen im Inland Zustimmung, verschlechtern die Beziehung). Nur autokratisch: Militärmanöver an der Grenze (Loyalität des Militärs und kurzfristige Zustimmung steigen, Beziehungen sinken, Krisenrisiko steigt).
- Außenpolitische Krisen erscheinen als Ereigniskarten. Krieg ist in Version 1 keine eigene Simulation.

### 4.12 Tempo und Langzeitmotivation
- `GAME_SPEED` in `balancing.ts` skaliert die gesamte Spielzeit. Bei 1 dauert ein Durchlauf bis Stufe 12 bei aktivem Spielen etwa 60 Minuten: Stufen 1–4 je 2–4 Minuten, Stufen 5–8 je 5–6 Minuten, Stufen 9–12 je 6–8 Minuten. Der autokratische Pfad ist etwa 30 % schneller.
- Mit kleineren Werten lässt sich das Spiel auf Wochen oder Monate strecken, ohne andere Werte anzufassen. Die Balancing-Simulation muss mit `GAME_SPEED` 1 und 0,05 stimmige Ergebnisse liefern.
- Langzeitmotivation durch den Vermächtnis-Baum, etwa 20 Erfolge mit kosmetischen Belohnungen (z. B. „Vom Blaumann ins Präsidentenamt“, „Alle vier Staaten regiert“, „Bei 99 % Unruhe überlebt“), vier Staaten mit unterschiedlicher Spielweise, Auswanderungs-Strategien und Statistiken.

### 4.13 Charakter-Editor
- Name, Körperbau (3 Varianten), Hautton (8), Gesichtsform (3), Frisur (8, inklusive Glatze), Haarfarbe (8), Bart (5), Brille (4)
- Partei: Name, Farbe (8), Symbol (8 schlichte Icons)
- Zufalls-Button
- Beim Start ein einzelner Bildschirm mit Abschnitten, später jederzeit im Profil änderbar
- Die Kleidung ergibt sich automatisch aus Stufe, Staat und Pfad (siehe 5.5). Accessoires wie Anstecker, Schärpe und Orden werden über Erfolge freigeschaltet.
- Die Figur wird aus SVG-Einzelteilen zusammengesetzt und erscheint in allen Szenen und Zeremonien.

---

## 5. Optik

### 5.1 Grundstil
- Oberflächen im Infografik-Stil nach dem Vorbild von Democracy 4: Icons, Kreise, Verbindungslinien, Daten im Vordergrund, klare Hierarchie.
- Figur und Szenen als flache, stilisierte Vektorillustration: klare Farbflächen, leicht vereinfachte Proportionen, dezente Schatten.
- Hell- und Dunkelmodus folgen der iPhone-Einstellung (`prefers-color-scheme`).
- Designsystem mit Farb-Tokens als CSS-Variablen: Grundfarben, Akzentfarbe je Staat, Varianten je Pfad. Kontraste mindestens WCAG AA.
- Schrift: Überschriften, Titel und Amtsbezeichnungen in Source Serif 4 (Anmutung einer Tageszeitung), alles andere in Inter.
- Icons einheitlich aus lucide-react.

### 5.2 Farbstimmung
- Jeder Staat hat eine eigene Farbwelt. Vorschläge: Novaria Marineblau und Sand, Rhenanien Anthrazit und Gold, Borealis Eisblau und Dunkelrot, Zentralia Rot und Gold.
- Demokratischer Pfad: hell, klar, freundlich.
- Autokratischer Pfad: entsättigte, dunklere Farben mit roten Akzenten.

### 5.3 Hauptbildschirm (Tab „Karriere“)
Von oben nach unten:
1. Ressourcenleiste (Geld, Einfluss, Anhänger, weitere nach Freischaltung) und die Balken Zustimmung und Unruhe
2. Nachrichtenticker als schmales Laufband
3. Szene mit der Figur (etwa 40 % der Bildschirmhöhe), darin Amtstitel und Stufe
4. Aktionen: Tipp-Buttons, Aufstieg bzw. Kandidieren, die wichtigsten Upgrades
5. Tab-Leiste

### 5.4 Szenen
- Aufgebaut aus Ebenen, jede als eigene Komponente: Himmel, Hintergrundgebäude, Hauptgebäude, Menschen, Effekte. So lassen sich einzelne Ebenen später durch echte Illustrationen ersetzen, ohne den Spielcode anzufassen.
- Fünf Szenengruppen je Staat: Werkhalle bzw. Büro (je nach Beruf), Rathaus, Regionalparlament, Parlament bzw. Ministerium, Regierungssitz bzw. Palast. Der Baustil orientiert sich am jeweiligen Vorbild.
- Belebt: Passanten laufen durchs Bild, Flaggen wehen, Wolken ziehen vorbei.
- Autokratischer Pfad: Propagandaplakate mit dem Porträt der eigenen Figur, Überwachungskameras, Soldaten, graue Palette.

### 5.5 Kleidung der Figur
Blaumann bzw. Bürohemd → Sakko → Anzug → Staatsanzug mit Anstecker → Anzug mit Schärpe. Auf dem autokratischen Pfad ab Stufe 8: Uniform mit Orden. Idle-Animation mit Atmen und Blinzeln.

### 5.6 Vereidigung beim Aufstieg
Die Inszenierung wächst mit dem Amt:
- Stufen 1–3: Handschlag mit dem Vorgesetzten, kleine Urkunde
- Stufen 4–6: Zeremonie im Rathaus, Applaus, ein paar Gäste
- Stufen 7–9: Vereidigung im Parlament, Flaggen, Blitzlichter der Presse
- Stufen 10–11: große Staatszeremonie, Menschenmenge, Ehrengarde
- Stufe 12: riesige Inauguration mit Militäraufgebot, Parade, Überflug, Fahnenmeer
- Autokratischer Pfad: Militärparade, Propagandabanner, organisierte jubelnde Menge

Dauer 2 bis 6 Sekunden, ab dem zweiten Ansehen per Tipp überspringbar. Zum Schluss wird der neue Titel groß eingeblendet.

### 5.7 Unruhe sichtbar machen
- Balken: grün unter 40 %, gelb von 40 bis 70 %, rot über 70 %
- ab 50 %: Demonstranten mit Schildern in der Szene, ihre Zahl wächst mit der Unruhe
- ab 70 %: Der Bildschirmrand pulsiert rot
- Nachrichtenticker: normale Meldungen, mit steigender Unruhe immer mehr Meldungen über Proteste und Gerüchte

### 5.8 Netzwerk-Tab
Beziehungsnetz wie in Democracy 4: die eigene Figur in der Mitte, die Gruppen als Kreise darum. Die Größe eines Kreises zeigt die Macht der Gruppe, der Füllgrad ihre Loyalität. Dicke Linien stehen für starke Allianzen, rot gestrichelte für Spannungen. Tippen auf einen Kreis öffnet ein Detailfenster von unten.

### 5.9 Welt-Tab
Stilisierte Infografik-Karte ohne reale Geografie: Staaten als Kreise mit Flagge, verbunden durch Linien in der Farbe ihrer Beziehung. Details öffnen sich von unten.

### 5.10 Animationen im Spielbetrieb
Lebendig, aber dezent: hochfliegende Zahlen beim Tippen („+12 €“), gleitende Balken, weiche Übergänge von 150 bis 300 ms.

### 5.11 App-Icon
Schlichtes Emblem, etwa ein Rednerpult oder ein aufsteigender Balken, als SVG gezeichnet und per Skript in die nötigen PNG-Größen exportiert (180, 192, 512 px).

---

## 6. Bildschirme und Navigation

Tab-Leiste unten mit fünf Reitern:
1. **Karriere:** Hauptbildschirm
2. **Netzwerk:** Allianzen
3. **Investieren:** Generatoren und Upgrades
4. **Welt:** Außenpolitik (ab Stufe 8)
5. **Profil:** Charakter, Vermächtnis, Erfolge, Statistik, Einstellungen, Backup-Code

Details öffnen sich als Fenster von unten (Bottom Sheets), damit alles mit dem Daumen erreichbar bleibt.

---

## 7. Projektstruktur (Vorschlag)

```
src/
  engine/     reine Spiellogik (tick, economy, career, elections, unrest, events, save)
  config/     alle Zahlen und Inhalte
  i18n/       Spieltexte (de.ts)
  store/      Zustand-Store und Anbindung der Engine
  ui/         Komponenten und Bildschirme
  art/        SVG-Ebenen: Figur, Szenen, Zeremonien, Effekte
  debug/      Debug-Menü
scripts/      simulate.ts, Icon-Export
tests/        Playwright-Tests
docs/SPEC.md  dieses Dokument
ARCHITEKTUR.md
CLAUDE.md
```

---

## 8. Umsetzungsphasen

**Phase 0 – Fundament:** Projekt-Setup, Lint, Tests, `npm run check`, PWA-Grundgerüst mit Manifest und Icon, Deployment auf GitHub Pages, Speichersystem mit Versionierung, Validierung und Backup-Code, Spielschleife mit Delta-Zeit und Offline-Berechnung, Zahlenformatierung, Gerüst des Debug-Menüs, `CLAUDE.md`, `ARCHITEKTUR.md`. Alles mit Tests. Ergebnis: eine leere App mit Tab-Leiste, die sich auf dem iPhone installieren lässt.

**Phase 1 – Kernschleife:** Startablauf (einfacher Editor, Staatswahl mit zunächst nur Rhenanien spielbar, Berufswahl), Geld, Einfluss und Anhänger, Tippen mit hochfliegenden Zahlen, Generatoren, Investieren-Tab, Layout des Hauptbildschirms, Figur und erste Szene.

**Phase 2 – Karriere:** alle 12 Stufen von Rhenanien mit Anforderungen und Wahlen, Zustimmung und Unruhe, Vereidigungen in allen Größenordnungen, Szenengruppen, Balancing-Simulation.

**Phase 3 – Ereignisse:** Wisch-Karten mit mindestens 30 Karten, Nachrichtenticker, alle Unruhe-Signale.

**Phase 4 – Netzwerk:** Allianzen, Beziehungsnetz, Rivalitäten.

**Phase 5 – Staaten und Pfade:** alle vier Staaten mit Ämtern, Farbwelten und Baustil, autokratischer Pfad mit Aktionen und Putschrisiko, Sturz, Vermächtnis. Danach ist die Rohfassung komplett spielbar, Ziel etwa 60 Minuten bis an die Spitze.

**Phase 6 – Außenpolitik:** Welt-Tab, Aktionen, Krisenkarten.

**Phase 7 – Auswandern, Erfolge, voller Editor:** Staatsbürgerschaft kaufen mit Animation, Erfolge, Accessoires, Siegesbildschirm, Weiterregieren.

**Phase 8 – Feinschliff:** Balancing mit der Simulation, Performance-Messung auf dem iPhone-Profil, Barrierefreiheit und eine gezielte Bug-Suche über alle Übergänge. Dazu gehören Fälle wie Aufstieg während einer offenen Ereigniskarte, Sturz während einer Zeremonie, Auswandern mit offenen Karten, Rückkehr aus dem Offline-Modus kurz vor einer Wahl, schnelles Mehrfachtippen auf Kauf-Buttons und Neuladen mitten in einer Animation.

---

## 9. Definition of Done (für jede Phase)

- `npm run check` läuft ohne Fehler und ohne Warnungen.
- Neue Logik ist mit Tests abgedeckt, der Playwright-Smoke-Test ist grün.
- Im iPhone-Profil geprüft: kein Layout-Bruch, keine Konsolenfehler, Safe Areas korrekt.
- Speichern und Laden funktionieren nach dem Neuladen, alte Spielstände werden migriert.
- `ARCHITEKTUR.md` ist aktualisiert, der Commit ist gemacht.
- Ich bekomme eine kurze Testanleitung und eine Liste bekannter Einschränkungen.

---

## Anhang: Entscheidungen aus der Planungsrunde (2026-09-28)

- Projektordner: `~/Desktop/Idle Politics`.
- GitHub (Repo, Pages-Deployment) wird später eingerichtet. Der Actions-Workflow liegt bereit, der `base`-Pfad ist über die Umgebungsvariable `BASE_PATH` einstellbar.
- Anhänger: Freischaltung ab Stufe 2 wird korrekt umgesetzt. In Phase 1 testbar über „Zu Stufe springen“ im Debug-Menü.
- Editor in Phase 1: Name, Hautton, Frisur, Haarfarbe, Zufalls-Button. Das Datenmodell enthält alle Merkmale aus 4.13, die übrigen Felder kommen in Phase 7.
- Währung: jeder Staat hat ein Währungszeichen in `states.ts` (Rhenanien: €).
