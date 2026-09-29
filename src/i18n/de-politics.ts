import type { AccessoryId, AchievementId, AutocracyActionId, LegacyId } from '../engine/ids';
import type { HintId, RunEndReason } from '../engine/schema';

// Texte für Karriere, Politik, Zeremonien, Vermächtnis, Erfolge und Nachrichten.

export const politicsTexts = {
  careerPanel: {
    title: 'Nächster Schritt',
    top: 'Du hast die Spitze erreicht.',
    next: 'Nächste Stufe: {title}',
    election: 'Wahl',
    appointment: 'Ernennung',
    power: 'Macht ausbauen',
    requirements: 'Kosten',
    followersNeed: 'Anhänger für die Wahl',
    loyaltyNeed: 'Loyalität des Apparats',
    goToVenue: 'Zum {place}',
    readyAt: 'Bereit – geh ins {place}',
    run: 'Kandidieren',
    promote: 'Amt übernehmen',
    expand: 'Macht ausbauen',
    chance: 'Siegchance {value} %',
    campaign: 'Wahlkampfbudget',
    campaigns: ['Kein', 'Klein', 'Mittel', 'Groß'],
    campaignCost: '+{amount}',
    confirmRun:
      'Kandidieren mit {chance} % Siegchance? Bei einer Niederlage fällst du zwei Stufen zurück. Die Kosten sind dann verloren.',
    expandWarning: 'Kostet {loyalty} % Loyalität, Unruhe +{unrest} %.',
    fixBonus: 'Wahlergebnis korrigiert: 40 % günstiger',
    ruling: 'Amtsjahr {years}',
  },

  election: {
    wonTitle: 'Wahl gewonnen',
    wonText: 'Mit {chance} % Siegchance hast du dich durchgesetzt.',
    lostTitle: 'Wahl verloren',
    lostText:
      'Trotz {chance} % Siegchance hat es nicht gereicht. Du fällst auf Stufe {stage} zurück: {title}. Deine Anhänger bleiben dir.',
  },

  resigned: {
    title: 'Rücktritt',
    text: 'Die Unruhe im Land war nicht mehr zu beherrschen. Du bist zurückgetreten und fällst auf Stufe {stage} zurück.',
  },

  meters: {
    approval: 'Zustimmung',
    unrest: 'Unruhe',
    loyalty: 'Loyalität',
    unrestWarning: 'Unruhe gefährlich hoch',
    unrestCritical: 'Sturz droht in {seconds} s',
    coupRisk: 'Putschrisiko {value} %/min',
    purgeRisk: 'Säuberungsrisiko {value} %/min',
  },

  ceremony: {
    skip: 'Tippen zum Überspringen',
    newTitle: 'Neues Amt',
    tiers: [
      'Handschlag mit dem Vorgesetzten',
      'Feierstunde im Rathaus',
      'Vereidigung im Parlament',
      'Große Staatszeremonie',
      'Amtseinführung',
    ],
    autocratic: 'Parade zu Ehren des neuen Amtsinhabers',
  },

  autocracy: {
    title: 'Macht sichern',
    turnTitle: 'Autoritären Kurs einschlagen',
    turnText: 'Du kannst Wahlen umgehen und deine Macht direkt ausbauen. Das ist unumkehrbar.',
    turnConsequences: [
      'Aufstieg ohne Wahlen, Anforderungen × 0,7',
      'Dafür brauchst du die Loyalität des Apparats',
      'Unruhe steigt sofort um 15 %',
      'Die Zivilgesellschaft wendet sich ab',
      'Beziehungen zum Ausland verschlechtern sich',
      'Bei 100 % Unruhe droht eine Revolution – der Durchlauf endet',
    ],
    turnConfirm: 'Kurs einschlagen',
    preview: 'Folgen',
    cooldown: 'Wieder in {seconds} s',
    actions: {
      pressControl: { name: 'Presse kontrollieren', text: 'Zustimmung steigt, Unruhe auch.' },
      harassOpposition: {
        name: 'Opposition schikanieren',
        text: 'Loyalität steigt, Unruhe deutlich.',
      },
      fixElection: {
        name: 'Wahlergebnis korrigieren',
        text: 'Nächstes „Macht ausbauen“ 40 % günstiger.',
      },
      emergency: {
        name: 'Notstand ausrufen',
        text: 'Viel Loyalität, mehr Unruhe, weniger Zustimmung.',
      },
      buyLoyalty: { name: 'Loyalität kaufen', text: 'Geld gegen Loyalität des Apparats.' },
      repression: {
        name: 'Repression',
        text: 'Unruhe sinkt sofort. Kostet Zustimmung und Auslandsbeziehungen.',
      },
    } satisfies Record<AutocracyActionId, { name: string; text: string }>,
    effect: {
      approval: 'Zustimmung',
      unrest: 'Unruhe',
      loyalty: 'Loyalität',
      relations: 'Ausland',
    },
  },

  eventUi: {
    badge: 'Offene Entscheidungen: {count}',
    open: 'Entscheidungen',
    swipeHint: 'Nach rechts wischen = Ja, nach links = Nein',
    yes: 'Ja',
    no: 'Nein',
    affects: 'Betrifft',
  },

  protestSigns: [
    'Rücktritt!',
    'Genug!',
    'Freiheit!',
    'Wir sind viele',
    'Nicht mit uns',
    'Hört uns zu',
  ],

  ticker: {
    label: 'Nachrichten',
    normal: [
      'Stadtwerke kündigen neue Buslinie an',
      'Wetterdienst: sonniges Wochenende erwartet',
      'Handwerkskammer meldet volle Auftragsbücher',
      'Stadtbibliothek verlängert Öffnungszeiten',
      'Sportverein steigt in die Landesliga auf',
      'Neue Kita im Nordviertel eröffnet',
      'Wirtschaftsforscher erwarten leichtes Wachstum',
      'Hafen meldet Rekordumschlag',
      'Landesmuseum zeigt neue Ausstellung',
      'Ingenieure prüfen Zustand der alten Brücke',
      'Umfrage: Mehrheit zufrieden mit Nahverkehr',
      'Technologiefirma kündigt 300 neue Stellen an',
    ],
    tense: [
      'Mieterverein kritisiert steigende Mieten',
      'Gewerkschaften drohen mit Warnstreiks',
      'Opposition wirft Regierung Untätigkeit vor',
      'Proteste vor dem Rathaus angekündigt',
      'Kommentar: Vertrauen in die Politik sinkt',
    ],
    unrest: [
      'Tausende demonstrieren in der Innenstadt',
      'Polizei meldet Ausschreitungen bei Kundgebung',
      'Gerüchte über Spaltung in der Regierung',
      'Streiks legen den Nahverkehr lahm',
      'Opposition fordert Rücktritt',
      'Barrikaden in mehreren Stadtteilen',
    ],
    autocratic: [
      'Staatsmedien loben Wirtschaftskurs',
      'Neue Denkmäler zu Ehren der Führung eingeweiht',
      'Behörden verschärfen Kontrollen an den Grenzen',
    ],
  },

  runEnd: {
    reasons: {
      revolution: {
        title: 'Revolution',
        text: 'Das Volk ist auf die Straße gegangen. Deine Herrschaft ist vorbei.',
      },
      coup: {
        title: 'Putsch',
        text: 'Der Apparat hat sich gegen dich gewandt. Über Nacht wurdest du abgesetzt.',
      },
      purge: {
        title: 'Säuberung',
        text: 'Die Partei hat dich fallen lassen. Dein Name verschwindet aus den Akten.',
      },
      retired: { title: 'Ruhestand', text: 'Du ziehst dich zurück und schreibst deine Memoiren.' },
    } satisfies Record<RunEndReason, { title: string; text: string }>,
    stats: 'Bilanz',
    state: 'Staat',
    path: 'Pfad',
    highest: 'Höchstes Amt',
    time: 'Spielzeit',
    earned: 'Verdient',
    points: 'Vermächtnis-Punkte',
    continue: 'Neu beginnen',
    hint: 'Charakter, Vermächtnis und Erfolge bleiben erhalten.',
    paths: { democratic: 'Demokratisch', autocratic: 'Autokratisch' },
  },

  victory: {
    title: 'An der Spitze',
    text: 'Vom Arbeiter bis ganz nach oben. Wie geht es weiter?',
    retire: 'Ruhestand',
    retireText: 'Memoiren schreiben, doppelte Vermächtnis-Punkte, Neustart.',
    continue: 'Weiterregieren',
    continueText: 'Amtsjahre sammeln. Krisen kommen häufiger.',
  },

  emigration: {
    title: 'Auswandern',
    text: 'Kaufe die Staatsbürgerschaft eines anderen Staates. Stufe, Einfluss, Anhänger, Allianzen und Diplomatie gehen verloren. Dein Geld nimmst du mit.',
    cost: 'Preis: {amount}',
    minStage: 'Ab Stufe {stage} möglich.',
    choose: 'Wohin?',
    confirm: 'Auswandern nach {country}? Du beginnst dort als Arbeiter.',
    flying: 'Auf dem Weg nach {country}',
    skip: 'Überspringen',
    professionTitle: 'Dein Beruf in {country}',
  },

  legacy: {
    title: 'Vermächtnis',
    points: '{points} Punkte',
    text: 'Punkte bekommst du am Ende jedes Durchlaufs. Die Boni gelten dauerhaft.',
    level: 'Stufe {level} von {max}',
    buy: 'Für {cost} kaufen',
    maxed: 'Ausgebaut',
    requires: 'Erst „{name}“',
    nodes: {
      moneyBoost: { name: 'Vermögen', text: '+10 % Geld je Stufe' },
      influenceBoost: { name: 'Netzwerker', text: '+10 % Einfluss je Stufe' },
      followersBoost: { name: 'Volksnähe', text: '+10 % Anhänger je Stufe' },
      calmNation: { name: 'Besonnenheit', text: 'Unruhe sinkt 20 % schneller je Stufe' },
      popularity: { name: 'Beliebtheit', text: 'Zustimmung +3 je Stufe' },
      headStart: { name: 'Vorsprung', text: 'Start mit 5 Überstunden je Stufe' },
      startCapital: { name: 'Startkapital', text: '+500 Geld zu Beginn je Stufe' },
      campaignVeteran: { name: 'Wahlkampfprofi', text: '+4 % Siegchance je Stufe' },
      swiftFeet: { name: 'Flinke Füße', text: 'Wege 25 % schneller je Stufe' },
      longRest: { name: 'Lange Ruhe', text: 'Offline-Deckel +2 Stunden je Stufe' },
    } satisfies Record<LegacyId, { name: string; text: string }>,
  },

  achievements: {
    title: 'Erfolge',
    progress: '{done} von {total}',
    reward: 'Belohnung: {item}',
    unlocked: 'Erfolg freigeschaltet',
    list: {
      firstShift: { name: 'Erste Schicht', text: 'Einmal gearbeitet.' },
      firstInvestment: { name: 'Erste Investition', text: 'Einen Generator gekauft.' },
      firstElection: { name: 'Gewählt', text: 'Die erste Wahl gewonnen.' },
      firstStaff: { name: 'Chef', text: 'Den ersten Mitarbeiter eingestellt.' },
      newVehicle: { name: 'Mobil', text: 'Ein Fahrzeug gekauft.' },
      mayor: { name: 'Stadtoberhaupt', text: 'Stufe 5 erreicht.' },
      minister: { name: 'Kabinett', text: 'Stufe 10 erreicht.' },
      blueCollarPresident: {
        name: 'Vom Blaumann ins Präsidentenamt',
        text: 'Auf demokratischem Weg an die Spitze.',
      },
      dictator: { name: 'Alleinherrscher', text: 'Auf autokratischem Weg an die Spitze.' },
      allStates: { name: 'Weltpolitiker', text: 'Alle vier Staaten regiert.' },
      survivedUnrest: { name: 'Am Abgrund', text: 'Bei 99 % Unruhe überlebt.' },
      overthrown: { name: 'Gestürzt', text: 'Einmal gestürzt worden.' },
      emigrant: { name: 'Neuanfang', text: 'Ausgewandert.' },
      coalitionBuilder: { name: 'Brückenbauer', text: 'Drei Gruppen über 80 % Loyalität.' },
      diplomat: { name: 'Diplomat', text: 'Zwei Bündnisse geschlossen.' },
      regionalDeveloper: { name: 'Landesvater', text: 'Zehn Ausbaustufen in den Regionen.' },
      millionaire: { name: 'Millionär', text: '1 Million Geld auf einmal besessen.' },
      veteran: { name: 'Dauerbrenner', text: 'Fünf Amtsjahre weiterregiert.' },
      retiree: { name: 'Memoiren', text: 'In den Ruhestand gegangen.' },
      eventVeteran: { name: 'Entscheider', text: '50 Entscheidungen getroffen.' },
    } satisfies Record<AchievementId, { name: string; text: string }>,
  },

  accessories: {
    partyPin: 'Parteiabzeichen',
    tie: 'Krawatte in Parteifarbe',
    sash: 'Schärpe',
    medal: 'Orden',
  } satisfies Record<AccessoryId, string>,

  hints: {
    followersUnlocked: {
      title: 'Neu: Anhänger',
      text: 'Ab jetzt sammelst du Anhänger. Du brauchst sie für Wahlen. Auf dem Marktplatz verteilst du Flyer, im Parteibüro machst du Parteiarbeit.',
    },
    networkUnlocked: {
      title: 'Neu: Netzwerk',
      text: 'Gewerkschaften und Wirtschaft interessieren sich für dich. Im Tab „Netzwerk“ umwirbst du sie und bekommst dafür dauerhafte Boni.',
    },
    loyaltyUnlocked: {
      title: 'Neu: Loyalität des Apparats',
      text: 'Verwaltung, Polizei und Partei beobachten dich. Wer autokratisch aufsteigen will, braucht ihre Loyalität. Sinkt sie zu tief, droht ein Putsch.',
    },
    oldTownUnlocked: {
      title: 'Neues Viertel: Altstadt',
      text: 'Rechts vom Parteibüro beginnt jetzt die Altstadt mit Rathaus, Zeitungshaus und Bank. Deine nächsten Karriereschritte machst du im Rathaus.',
    },
    governmentUnlocked: {
      title: 'Neues Viertel: Regierungsviertel',
      text: 'Parlament und Ministerium sind jetzt erreichbar. Ein Fahrzeug spart dir lange Wege.',
    },
    capitalUnlocked: {
      title: 'Neues Viertel: Prachtmeile',
      text: 'Der Regierungssitz liegt am Ende der Prachtmeile. Dort entscheidet sich der Weg an die Spitze.',
    },
    worldUnlocked: {
      title: 'Neu: Welt-Karte',
      text: 'Im Tab „Welt“ baust du Regionen aus und pflegst Beziehungen zu anderen Staaten. Diplomatisches Kapital sammelst du im Botschaftsviertel.',
    },
    firstEvent: {
      title: 'Entscheidungen',
      text: 'Oben rechts wartet eine Entscheidung. Wische die Karte nach rechts für Ja oder nach links für Nein. Du kannst dir Zeit lassen, höchstens drei Karten warten.',
    },
    autocraticTurn: {
      title: 'Ein anderer Weg',
      text: 'Als Bürgermeister kannst du jetzt einen autoritären Kurs einschlagen. Das geht schneller, ist aber riskant und unumkehrbar. Du findest die Option in der Karriere-Übersicht.',
    },
  } satisfies Record<HintId, { title: string; text: string }>,
};
