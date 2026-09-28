// Alle Spieltexte auf Deutsch. Für eine englische Version wird eine Datei en.ts mit
// demselben Aufbau ergänzt (der Typ `Strings` erzwingt Vollständigkeit).

import type { ResourceId } from '../engine/ids';

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
    invest: 'Investieren',
    world: 'Welt',
    profile: 'Profil',
  },

  resources: {
    money: 'Geld',
    influence: 'Einfluss',
    followers: 'Anhänger',
    loyalty: 'Loyalität',
    diplomacy: 'Diplomatie',
  } satisfies Record<ResourceId, string>,

  bars: {
    approval: 'Zustimmung',
    unrest: 'Unruhe',
  },

  common: {
    ok: 'OK',
    cancel: 'Abbrechen',
    close: 'Schließen',
    perSecond: '/s',
    locked: 'Gesperrt',
  },

  placeholders: {
    careerEmpty: 'Noch kein Durchlauf gestartet.',
    careerRunning: 'Hier entsteht dein Arbeitsplatz.',
    network: {
      title: 'Netzwerk',
      text: 'Hier knüpfst du später Allianzen mit Gewerkschaften, Wirtschaft, Medien und weiteren Gruppen.',
    },
    invest: {
      title: 'Investieren',
      text: 'Hier kaufst du bald Generatoren, die automatisch Geld, Einfluss und Anhänger einbringen.',
    },
    world: {
      title: 'Außenpolitik',
      text: 'Die Außenpolitik wird ab Stufe 8 freigeschaltet.',
    },
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
        text: 'Du beginnst als einfacher Arbeiter. Tippe auf „Schicht arbeiten“ für Geld und auf „Mit Kollegen reden“ für Einfluss.',
      },
      {
        title: 'Für dich arbeiten lassen',
        text: 'Im Tab „Investieren“ kaufst du Generatoren. Sie bringen dir auch dann Erträge, wenn du nicht tippst – sogar bis zu acht Stunden, während die App geschlossen ist.',
      },
      {
        title: 'Aufsteigen',
        text: 'Mit genug Geld, Einfluss und Anhängern steigst du Stufe für Stufe auf. Behalte Zustimmung und Unruhe im Blick.',
      },
    ],
  },

  hints: {
    followersUnlocked: {
      title: 'Neu: Anhänger',
      text: 'Ab jetzt sammelst du Anhänger. Du brauchst sie für Wahlen. Flyer und Infostände findest du im Tab „Investieren“.',
    },
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

  debug: {
    title: 'Debug',
    open: 'Debug-Menü öffnen',
    quickStart: 'Testlauf starten (Rhenanien)',
    addResources: '+1.000 von allem',
    addResourcesBig: '+1 Mio. von allem',
    jump1h: 'Zeitsprung +1 Std.',
    jump8h: 'Zeitsprung +8 Std.',
    stage: 'Stufe',
    setStage: 'Zu Stufe springen',
    reset: 'Spielstand zurücksetzen',
    resetConfirm: 'Spielstand wirklich löschen? Das lässt sich nicht rückgängig machen.',
    noRun: 'Kein laufender Durchlauf.',
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
