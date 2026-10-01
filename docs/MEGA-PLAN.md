# Mega-Umbau – Bauplan

Wunsch des Auftraggebers (01.10.2026): Das Spiel soll sofort jeden optisch und spielerisch
abholen. Simpler, ansprechender, charakteristischer – wie ein Spiel für die Massen, nicht wie
eine Entwickler-Version. Vorlage: Casual-Arcade-Idle-Spiele (weiche 3D-Figuren, Stapel,
Geldbündel, Verkaufstheke, schräge Draufsicht).

Entscheidungen: **Gemischt** (Minispiele in echtem 3D, Menüs und Stadt als flaches buntes
Cartoon-Design) · **Idle bleibt Kern, Minispiele als Bonus** · **Daumen-Joystick** ·
**nichts streichen** · **eigene Weltkarte** statt Kreis-Infografik.

## A. Neues Design-System (alle Bildschirme)

- Runde, fette Spielschrift (Fredoka für Überschriften/Zahlen, Nunito für Text), lokal.
- Helle, satte Farben: Himmelblau als Grund, weiße Karten mit kräftigem Unterschatten,
  „gummiartige“ Knöpfe mit dunkler Unterkante, die beim Drücken einsinken.
- Ressourcenleiste als dicke Pillen mit runden Icon-Plaketten, Tab-Leiste mit großen Icons.
- Nur noch heller Modus (Spiel-Look, wie in Casual-Spielen üblich).
- Stadtansicht: kräftigere Farben, weichere Formen (Palette + Himmel), weniger Grau.

## B. Minispiele in 3D (three.js, nachgeladen)

- Eigener Vollbildmodus „Selbst anpacken“ an jedem Ort (Knopf im Gebäudefenster), in allen
  Stufen spielbar. Figur = eigener Charakter, Steuerung per Daumen-Joystick.
- Ein gemeinsamer Baukasten, je Ort anders eingekleidet:
  **Quelle** (Maschine erzeugt Stück für Stück einen Stapel) → **Tragen** (Figur sammelt
  bis zur Tragkraft) → **Theke** (Kunden stellen sich an und kaufen) → **Geldhaufen**
  (drüberlaufen = einsammeln) → **Ausbau-Felder** (draufstellen = echtes Upgrade des
  Gebäudes, Mitarbeiter einstellen, Maschine kaufen – dieselben Käufe wie im Menü).
- Eingestellte Mitarbeiter laufen als Helfer mit und tragen selbst.
- Werk: Kisten vom Band zum Lieferwagen · Kneipe: Bier zapfen und servieren · Markt: Obst
  und Waren an Kunden · Parteibüro: Flugblätter drucken und verteilen · Rathaus: Akten
  stempeln und am Schalter ausgeben · Zeitung: Zeitungen drucken, am Kiosk verkaufen ·
  Bank: Geldsäcke zum Tresor · Parlament: Reden schreiben, am Pult halten · Ministerium:
  Akten an Beamte · Botschaft: Geschenke an Gesandte · Palast: Orden an Bürger.
- Belohnung je verkauftem Stück: ein Vielfaches eines Durchgangs der Linie plus ein paar
  Sekunden des laufenden Ertrags (wächst so mit dem Spiel mit). Werte in `config/minigames.ts`.

## C. Abstimmen per Wisch-Karte

- Gesetzesvorlagen und Ereignis-Fragen als Kartenstapel: rechts wischen = zustimmen,
  links = ablehnen. Karte zeigt Bild, kurzen Text, Wirkungen als Chips und die Meinung der
  Berater (Daumen hoch/runter).
- Abstimmen im Parteibüro **und im Rathaus** (ab Stufe 4) und im Parlament.

## D. Eigene Weltkarte

- Erfundener Kontinent mit Meer, Inseln, Bergen und Flüssen; jedes Land als eigene Fläche,
  das eigene Land mit vier Provinzen (Regionen) und Hauptstadt. Beziehungen färben die
  Grenzen, Handel als Schiffsrouten, Bündnisse als Banner.

## E. Spieldynamik ohne neue Komplexität

- Immer sichtbares Ziel: Fortschrittsbalken zum nächsten Aufstieg in der Kopfzeile.
- Tipp-Kombo: schnelles Tippen füllt eine Flamme, bis ×3 Ertrag.
- Minispiele als aktiver Turbo, Wisch-Karten als schnelle Entscheidungen.

## Stand

Alle Punkte umgesetzt (Commits „Mega 1“ bis „Mega 4“). `npm run check` grün.

## Reihenfolge

1. Design-System + Kopfzeile + Tab-Leiste + Knöpfe/Karten/Fenster
2. 3D-Baukasten + Werk-Minispiel + Joystick + Anbindung an Engine (Tests)
3. Minispiele für alle anderen Orte
4. Wisch-Karten (Gesetze, Ereignisse), Abstimmen im Rathaus
5. Weltkarte
6. Stadt-Farben, Ziel-Balken, Tipp-Kombo
7. Tests, Doku, Veröffentlichung
