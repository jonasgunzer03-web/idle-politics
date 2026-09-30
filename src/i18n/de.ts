// Alle Spieltexte auf Deutsch. Für eine englische Version wird eine Datei en.ts mit
// demselben Aufbau ergänzt (der Typ `Strings` erzwingt Vollständigkeit).

import type { GeneratorId, ProfessionId, ResourceId, StateId } from '../engine/ids';
import { eventTexts } from './de-events';
import { industryTexts } from './de-industry';
import { partyTexts } from './de-party';
import { politicsTexts } from './de-politics';
import { worldTexts } from './de-world';

export const de = {
  appName: 'Idle Politics',

  names: {
    first: [
      'Mara',
      'Jonas',
      'Lene',
      'Tarik',
      'Ida',
      'Emil',
      'Selin',
      'Oskar',
      'Nora',
      'Karim',
      'Frieda',
      'Milan',
      'Aylin',
      'Bruno',
      'Greta',
      'Levin',
    ],
    last: [
      'Albrecht',
      'Brandt',
      'Kessler',
      'Lindqvist',
      'Moravec',
      'Novak',
      'Ostrowski',
      'Petrow',
      'Reinholt',
      'Sander',
      'Tamm',
      'Vogler',
      'Weidlich',
      'Yilmaz',
      'Zander',
      'Haberland',
    ],
    parties: ['Bürgerliste', 'Neue Mitte', 'Bündnis Zukunft', 'Volksforum', 'Aufbruch'],
  },

  tabs: {
    career: 'Karriere',
    network: 'Netzwerk',
    invest: 'Wirtschaft',
    world: 'Welt',
    profile: 'Profil',
  },

  resources: {
    money: 'Geld',
    influence: 'Einfluss',
    followers: 'Anhänger',
    diplomacy: 'Diplomatie',
  } satisfies Record<ResourceId, string>,

  bars: {
    approval: 'Zustimmung',
    unrest: 'Unruhe',
    loyalty: 'Loyalität',
  },

  title: {
    subtitle: 'Vom Arbeiter an die Spitze des Staates',
    newGame: 'Neues Spiel',
    disclaimer: 'Alle Staaten, Personen und Parteien sind frei erfunden.',
  },

  setup: {
    back: 'Zurück',
    next: 'Weiter',
    start: 'Karriere beginnen',
    stepOf: 'Schritt {current} von {total}',
    character: {
      title: 'Deine Figur',
      name: 'Name',
      namePlaceholder: 'Vor- und Nachname',
      nameMissing: 'Bitte gib einen Namen ein.',
      skinTone: 'Hautton',
      hairStyle: 'Frisur',
      hairColor: 'Haarfarbe',
      random: 'Zufall',
      option: '{label} {n}',
      hairStyles: ['Glatze', 'Kurz', 'Seitenscheitel', 'Stoppeln', 'Lang', 'Dutt', 'Locken', 'Bob'],
      build: 'Körperbau',
      builds: ['Schmal', 'Mittel', 'Kräftig'],
      faceShape: 'Gesichtsform',
      faceShapes: ['Rund', 'Oval', 'Kantig'],
      beard: 'Bart',
      beards: ['Keiner', 'Stoppeln', 'Schnurrbart', 'Kinnbart', 'Vollbart'],
      glasses: 'Brille',
      glassesOptions: ['Keine', 'Rund', 'Eckig', 'Halbrand'],
      party: 'Partei',
      partyName: 'Name der Partei',
      partyColor: 'Parteifarbe',
      partySymbol: 'Symbol',
      partySymbols: ['Stern', 'Rose', 'Eiche', 'Faust', 'Taube', 'Sonne', 'Anker', 'Ähre'],
      sections: { person: 'Person', looks: 'Aussehen', partyTitle: 'Partei' },
    },
    restartTitle: 'Neuer Durchlauf',
    state: {
      title: 'Wähle deinen Staat',
      tempo: 'Aufstiegstempo',
      risk: 'Risiko',
      soon: 'Bald verfügbar',
      current: 'Aktuell',
      pros: 'Vorteile',
      cons: 'Nachteile',
      rating: '{value} von 5',
    },
    profession: {
      title: 'Wähle deinen Beruf',
    },
  },

  states: {
    novaria: {
      name: 'Novaria',
      government: 'Präsidialdemokratie',
      pros: ['Geld ×1,4', 'Spenden- und Lobby-Generatoren'],
      cons: ['Wahlkämpfe ×1,5 teurer', 'Zustimmung schwankt stärker'],
    },
    rhenania: {
      name: 'Rhenanien',
      government: 'Parlamentarische Demokratie',
      pros: ['Unruhe sinkt schneller', 'Koalitionen günstiger'],
      cons: ['Aufstiegsanforderungen ×1,2', 'Geld ×0,9'],
    },
    borealis: {
      name: 'Borealis',
      government: 'Autoritäres Präsidialsystem mit Scheinwahlen',
      pros: ['Schneller Aufstieg', 'Rohstoffeinnahmen', 'Loyalität kaufbar'],
      cons: ['Hohe Grund-Unruhe', 'Oligarchen als Rivalen', 'Schlechte Beziehungen im Ausland'],
    },
    zentralia: {
      name: 'Zentralia',
      government: 'Einparteienstaat',
      pros: [
        'Hohe Wirtschaftsleistung',
        'Starker Apparat',
        'Unruhe steigt langsam bei hoher Loyalität',
      ],
      cons: [
        'Anhänger fast wertlos',
        'Aufstieg nur über Loyalität und Einfluss',
        'Säuberungen bei niedriger Loyalität',
      ],
    },
  } satisfies Record<StateId, { name: string; government: string; pros: string[]; cons: string[] }>,

  professions: {
    office: {
      name: 'Büroangestellter',
      pros: ['Geld ×1,5'],
      cons: ['Einfluss ×0,7'],
      text: 'Solides Gehalt, aber wenig Kontakt zur Basis.',
    },
    skilled: {
      name: 'Facharbeiter',
      pros: ['Einfluss ×1,5', 'Anhänger ×1,2'],
      cons: ['Geld ×0,7'],
      text: 'Weniger Lohn, dafür bestens vernetzt in Werk und Gewerkschaft.',
    },
  } satisfies Record<ProfessionId, { name: string; pros: string[]; cons: string[]; text: string }>,

  // Amtstitel je Staat, Stufe 1 bis 12. `autocratic` ersetzt ab Stufe 6 den Titel auf dem
  // autokratischen Pfad (nur Novaria und Rhenanien).
  careers: {
    novaria: {
      titles: [
        'Arbeiter',
        'Vorarbeiter',
        'Bezirksdelegierter',
        'Stadtrat',
        'Bürgermeister',
        'Abgeordneter im Staatsparlament',
        'Gouverneur',
        'Kongressabgeordneter',
        'Senator',
        'Minister',
        'Vizepräsident',
        'Präsident',
      ],
      autocratic: {
        6: 'Parteikommissar im Staatsparlament',
        7: 'Militärgouverneur',
        8: 'Mitglied des Notstandsrats',
        9: 'Senator auf Lebenszeit',
        10: 'Minister mit Sondervollmachten',
        11: 'Stellvertreter des Staatschefs',
        12: 'Diktator',
      },
    },
    rhenania: {
      titles: [
        'Arbeiter',
        'Betriebsrat',
        'Ortsvereinsvorsitzender',
        'Stadtrat',
        'Bürgermeister',
        'Landtagsabgeordneter',
        'Landesminister',
        'Ministerpräsident',
        'Bundestagsabgeordneter',
        'Bundesminister',
        'Bundeskanzler',
        'Präsident',
      ],
      autocratic: {
        6: 'Landesbevollmächtigter',
        7: 'Landeskommissar',
        8: 'Statthalter',
        9: 'Mitglied des Staatsrats',
        10: 'Sonderminister',
        11: 'Kanzler mit Notstandsvollmacht',
        12: 'Diktator',
      },
    },
    borealis: {
      titles: [
        'Arbeiter',
        'Brigadeleiter',
        'Parteisekretär im Betrieb',
        'Stadtdumaabgeordneter',
        'Bürgermeister',
        'Gebietsgouverneur',
        'Dumaabgeordneter',
        'Vizeminister',
        'Minister',
        'Premierminister',
        'Präsident',
        'Präsident auf Lebenszeit',
      ],
      autocratic: {},
    },
    zentralia: {
      titles: [
        'Arbeiter',
        'Gruppenleiter',
        'Sekretär der Parteizelle',
        'Kreiskader',
        'Bürgermeister',
        'Provinzkader',
        'Provinzgouverneur',
        'Provinzparteisekretär',
        'Zentralkomitee',
        'Politbüro',
        'Ständiger Ausschuss',
        'Generalsekretär auf Lebenszeit',
      ],
      autocratic: {},
    },
  } satisfies Record<StateId, { titles: string[]; autocratic: Partial<Record<number, string>> }>,

  career: {
    stage: 'Stufe {stage} von {max}',
  },

  invest: {
    title: 'Investieren',
    buyMode: 'Kaufmenge',
    modes: { one: '×1', ten: '×10', max: 'Max' },
    owned: 'Besitz: {count}',
    perUnit: '{amount} je Stück',
    total: '· gesamt {amount}',
    buy: 'Kaufen',
    buyCount: '{count} kaufen',
    missing: 'Fehlt: {amount}',
    unlockAt: 'Ab Stufe {stage}',
    groupLocked: 'Wird ab Stufe {stage} freigeschaltet.',
    vehiclesTitle: 'Fortbewegung',
    vehicleOwned: 'Aktuell',
    vehicleSpeed: '{speed}× so schnell wie zu Fuß',
    vehicleBuy: 'Kaufen',
    staffTitle: 'Mitarbeiter',
    staffText:
      'Mitarbeiter stellst du in den Gebäuden ein. Sie erledigen die Tätigkeit dort automatisch.',
    staffEntry: '{action}: {count} Mitarbeiter',
    groups: {
      money: 'Geld verdienen',
      influence: 'Einfluss gewinnen',
      followers: 'Anhänger werben',
      diplomacy: 'Diplomatie pflegen',
    } satisfies Record<ResourceId, string>,
  },

  generators: {
    overtime: { name: 'Überstunden', text: 'Ein paar Stunden mehr in der Woche.' },
    sideJob: { name: 'Nebenjob', text: 'Am Wochenende Regale einräumen.' },
    smallBusiness: { name: 'Kleinunternehmen', text: 'Ein eigener Handwerksbetrieb.' },
    rentals: { name: 'Vermietung', text: 'Zwei Wohnungen in der Altstadt.' },
    company: { name: 'Mittelständische Firma', text: 'Hundert Beschäftigte, solide Aufträge.' },
    holding: { name: 'Holding', text: 'Beteiligungen in mehreren Branchen.' },
    conglomerate: { name: 'Konzern', text: 'Ein Imperium aus Industrie und Handel.' },
    donorCircle: { name: 'Spenderkreis', text: 'Wohlhabende Unterstützer mit Scheckbuch.' },
    lobbyFirm: { name: 'Lobby-Agentur', text: 'Profis, die Türen öffnen und Geld einsammeln.' },
    rawMaterials: { name: 'Rohstoffeinnahmen', text: 'Anteile an Öl- und Gasförderung.' },
    stateEnterprise: { name: 'Staatsbetrieb', text: 'Ein Werk unter Parteiaufsicht.' },
    regularsTable: { name: 'Stammtisch', text: 'Jeden Donnerstag in der Eckkneipe.' },
    clubWork: { name: 'Vereinsarbeit', text: 'Kassenwart im Sportverein.' },
    localBranch: { name: 'Ortsverband', text: 'Ein eigener Ortsverband der Partei.' },
    pressContacts: { name: 'Pressekontakte', text: 'Journalisten, die zurückrufen.' },
    thinkTank: { name: 'Denkfabrik', text: 'Studien, die deine Positionen stützen.' },
    foundation: { name: 'Stiftung', text: 'Einfluss auf Wissenschaft, Kultur und Eliten.' },
    flyers: { name: 'Flyer', text: 'Handzettel in Briefkästen und am Werkstor.' },
    infoStand: { name: 'Infostand', text: 'Samstags auf dem Marktplatz.' },
    socialMediaTeam: { name: 'Social-Media-Team', text: 'Drei Leute, die rund um die Uhr posten.' },
    campaignOffice: { name: 'Kampagnenbüro', text: 'Hauptamtliche Kräfte für den Wahlkampf.' },
    mediaGroup: { name: 'Mediengruppe', text: 'Zeitungen und Radiosender auf deiner Seite.' },
    tvNetwork: { name: 'Fernsehsender', text: 'Ein eigener Sender mit landesweiter Reichweite.' },
    embassyStaff: { name: 'Botschaftsstab', text: 'Diplomaten, die Beziehungen pflegen.' },
    summitOffice: { name: 'Gipfelbüro', text: 'Organisiert Treffen der Staatschefs.' },
  } satisfies Record<GeneratorId, { name: string; text: string }>,

  scene: {
    label: '{name} als {title}',
  },

  common: {
    ok: 'OK',
    cancel: 'Abbrechen',
    close: 'Schließen',
    perSecond: '/s',
    locked: 'Gesperrt',
  },

  offline: {
    title: 'Willkommen zurück',
    awayFor: 'Du warst {duration} weg.',
    capped: 'Angerechnet wurden {cap} (Höchstwert).',
    gainedIntro: 'Während du weg warst:',
  },

  intro: {
    next: 'Weiter',
    start: 'Los geht’s',
    step: 'Schritt {current} von {total}',
    cards: [
      {
        title: 'Ganz unten anfangen',
        text: 'Du stehst in deinem Werk bzw. Büro. Tippe auf „Schicht arbeiten“, um Geld zu verdienen.',
      },
      {
        title: 'Durch die Stadt',
        text: 'Tippe auf ein Gebäude in der Straße oder auf ein Ziel in der Liste, dann läuft deine Figur hin. In der Kneipe knüpfst du Kontakte, im Parteibüro beginnt deine Karriere.',
      },
      {
        title: 'Arbeiten lassen',
        text: 'Stelle in den Gebäuden Mitarbeiter ein und kaufe im Tab „Investieren“ Generatoren. Sie bringen dir Erträge, auch bis zu acht Stunden, während die App geschlossen ist.',
      },
    ],
  },

  recovered: {
    title: 'Spielstand wiederhergestellt',
    text: 'Der letzte Speicherstand war beschädigt. Du spielst mit dem vorherigen Stand weiter.',
  },

  storage: {
    unavailable:
      'Der Speicher ist gesperrt (z. B. privater Modus). Dein Fortschritt wird nicht gespeichert.',
    quota: 'Der Speicher ist voll. Dein Fortschritt wird gerade nicht gespeichert.',
    unknown: 'Speichern ist fehlgeschlagen. Das Spiel versucht es weiter.',
    invalid: 'Der Spielstand konnte nicht geprüft werden und wurde nicht gespeichert.',
  },

  update: {
    available: 'Update verfügbar',
    reload: 'Neu laden',
  },

  rotate: 'Bitte Gerät drehen',
  rotateHint: 'Idle Politics wird im Hochformat gespielt.',

  errorBoundary: {
    title: 'Da ist etwas schiefgelaufen',
    text: 'Dein Spielstand ist sicher gespeichert. Lade die App neu, um weiterzuspielen.',
    reload: 'Neu laden',
  },

  profile: {
    title: 'Profil',
    sections: {
      character: 'Figur',
      legacy: 'Vermächtnis',
      achievements: 'Erfolge',
      stats: 'Statistik',
      settings: 'Speicher',
    },
    editCharacter: 'Figur bearbeiten',
    save: 'Speichern',
    accessories: 'Accessoires',
    accessoriesLocked: 'Accessoires schaltest du über Erfolge frei.',
    emigrate: 'Auswandern',
    stats: {
      runs: 'Durchläufe',
      highest: 'Höchste Stufe',
      statesRuled: 'Regierte Staaten',
      taps: 'Tätigkeiten ausgeführt',
      playtime: 'Spielzeit',
      events: 'Entscheidungen',
      emigrations: 'Auswanderungen',
      overthrows: 'Stürze',
    },
    backupTitle: 'Backup-Code',
    backupText:
      'Mit diesem Code kannst du deinen Spielstand sichern oder auf ein anderes Gerät übertragen.',
    iosHint:
      'Hinweis für iPhone: Die App auf dem Home-Bildschirm und der Safari-Tab haben getrennte Speicher. Zum Umziehen kopierst du hier den Code und fügst ihn auf der anderen Seite unter „Code einfügen“ ein.',
    export: 'Code erzeugen',
    copy: 'Kopieren',
    copied: 'Kopiert',
    copyFailed: 'Kopieren nicht möglich. Markiere den Code und kopiere ihn von Hand.',
    importLabel: 'Code einfügen',
    importPlaceholder: 'IP1.…',
    importButton: 'Spielstand laden',
    importConfirm: 'Der aktuelle Spielstand wird durch den Stand aus dem Code ersetzt. Fortfahren?',
    importSuccess: 'Spielstand geladen.',
    importErrors: {
      empty: 'Bitte zuerst einen Code einfügen.',
      format: 'Das ist kein gültiger Backup-Code.',
      checksum: 'Der Code ist unvollständig oder enthält einen Tippfehler.',
      corrupt: 'Der Code ist beschädigt.',
      invalid: 'Der Code enthält keinen gültigen Spielstand.',
    },
    version: 'Version {version}',
  },

  ...worldTexts,
  ...politicsTexts,
  industry: industryTexts,
  party: partyTexts,
  events: eventTexts,

  debug: {
    title: 'Debug',
    open: 'Debug-Menü öffnen',
    addResources: '+1.000 von allem',
    addResourcesBig: '+1 Mio. von allem',
    jump1h: 'Zeitsprung +1 Std.',
    jump8h: 'Zeitsprung +8 Std.',
    stage: 'Stufe',
    setStage: 'Zu Stufe springen',
    meters: 'Werte setzen',
    triggerEvent: 'Ereignis auslösen',
    triggerOverthrow: 'Sturz auslösen',
    forceElection: 'Wahl gewinnen (nächste Stufe)',
    switchState: 'Staat wechseln',
    reset: 'Spielstand zurücksetzen',
    resetConfirm: 'Spielstand wirklich löschen? Das lässt sich nicht rückgängig machen.',
  },
};

export type Strings = typeof de;

/** Platzhalter wie {duration} ersetzen. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const v = values[key];
    return v === undefined ? match : String(v);
  });
}
