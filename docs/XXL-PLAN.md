# XXL-Erweiterung – Bauplan

Wunsch des Auftraggebers (30.09.2026): deutlich grafischeres Spiel, sichtbare Arbeiter und
Maschinen, Gebäude verbessern, Politik im Parteibüro mit Folgen, eigenes funktionierendes System
aufbauen, emotionale Bindung. Entscheidungen: Detail-Seitenansicht, Produktionsketten, Sitzung
mit Beratern, dazu benannte Mitarbeiter, lebendige Bürger, Rivale, Stadtchronik.

## A. Produktionsketten (Engine)

- **Waren** (neu, keine Währung): Waren, Kontakte, Flugblätter, Akten. Lager je Ware, Größe
  wächst mit der Ausbaustufe der erzeugenden Gebäude und Lager-Maschinen.
- **Produktionslinien** (bisher „Tätigkeiten“): verbrauchen Waren/Geld und erzeugen Waren und
  Währungen. Tippen = ein Durchgang von Hand, Mitarbeiter = automatische Durchgänge.
  Fehlt eine Zutat, stockt die Linie (Engpass wird angezeigt).
  - Werk → Waren (+ Lohn) · Kneipe → Einfluss + Kontakte · Markt: Waren → Geld,
    Flugblätter → Anhänger · Parteibüro: Geld → Flugblätter, Kontakte → Einfluss/Anhänger ·
    Rathaus → Akten · Zeitung: Kontakte → Anhänger · Bank: Kontakte → Geld ·
    Parlament: Akten → Einfluss/Anhänger · Ministerium → Geld/Einfluss/Akten ·
    Botschaft: Waren → Diplomatie · Regierungssitz: Akten → Anhänger/Einfluss
- **Gebäude-Ausbaustufen 1–5**: mehr Plätze für Mitarbeiter, mehr Maschinen, sichtbar größer.
- **Maschinen** (2 je Gebäude, Stufe ≤ Ausbaustufe): Tempo, Ertrag, Sparsamkeit, Lager.
- **Arbeiterstimmung** (0–100): wirkt auf das Tempo; unter 20 % Streik.
- **Benannte Mitarbeiter**: aus dem Durchlauf-Seed abgeleitet (Name, Gesicht, Eigenschaft).

## B. Politik im Parteibüro (Engine)

- **Berater** (bis 5 Sitze je nach Stufe): Name, Flügel (Wirtschaft, Soziales, Sicherheit,
  Freiheit, Volk), Fähigkeit (passiver Bonus), Loyalität. Illoyale Berater spalten sich ab und
  laufen zum Rivalen über.
- **Beschlüsse/Gesetze**: Tagesordnung mit drei Vorlagen, Berater debattieren (dafür/dagegen),
  Spieler entscheidet. Dauerhafte Wirkungen, teils Spätfolgen nach Minuten. Berater des
  passenden Flügels warnen vor Spätfolgen. Begrenzte Plätze für aktive Gesetze.
- **Rivale**: eigener Politiker mit Stärke; senkt Wahlchancen, handelt selbst (Schmutzkampagne,
  Berater abwerben, Kundgebung), Gegenmaßnahmen im Parteibüro. Autokraten können ihn verhaften.
- **Stadtchronik**: Schlagzeilen zu allem Wichtigen, Zeitungsseite, speist den Ticker.

## C. Grafik

- Tag-und-Nacht-Zyklus, Wetter, Parallaxe mit Tiefenebenen, Verläufe und Licht.
- Gebäude wachsen sichtbar mit der Ausbaustufe (Stockwerke, Schornsteine, Leuchtschrift …).
- Lieferwagen fahren Waren zwischen den Gebäuden, Bürgerzahl wächst mit dem Erfolg,
  Sprechblasen mit Meinungen zu Gesetzen, Plakate des Rivalen.
- Innenräume mit Tiefe, laufenden Arbeitern und animierten Maschinen je Ausbaustufe.
- Parteibüro: runder Tisch mit Beratern.

## D. Oberfläche

- Gebäude-Fenster mit Reitern: Produktion, Ausbau, Team (Parteibüro: Sitzung, Berater, Rivale).
- Tab „Wirtschaft“ (vorher Investieren): Produktionsnetz als Grafik, Lager, Fahrzeuge,
  Beteiligungen.
- Chronik als Zeitungsseite (Tipp auf den Ticker).

## Stand

Alle Punkte umgesetzt (Commits „XXL 1“ bis „XXL 4“).

## Reihenfolge

1. Engine Produktionsketten + Speicherstand v3 + Migration + Tests + Bot/Kalibrierung
2. Engine Politik (Berater, Gesetze, Rivale, Chronik, Stimmung) + Tests + Bot
3. Oberfläche für beides
4. Grafik draußen (Himmel, Gebäude-Stufen, Leben auf der Straße)
5. Grafik drinnen (Innenräume, Arbeiter, Maschinen, Sitzungssaal)
6. Smoke-Tests, Doku, Veröffentlichung
