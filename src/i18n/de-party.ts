import type { ChronicleKey, FactionId, PolicyId, RivalCounterId, SkillId } from '../engine/ids';
import type { PolicyArea } from '../config/party';
import type { LineTag } from '../engine/ids';

// Texte zur Politik im Parteibüro: Flügel, Berater, Gesetze, Rivale, Stadtchronik.

export const partyTexts = {
  factions: {
    economic: { name: 'Wirtschaftsflügel', short: 'Wirtschaft' },
    social: { name: 'Sozialflügel', short: 'Soziales' },
    security: { name: 'Law-and-Order-Flügel', short: 'Sicherheit' },
    liberty: { name: 'Freiheitsflügel', short: 'Freiheit' },
    populist: { name: 'Volksflügel', short: 'Volk' },
  } satisfies Record<FactionId, { name: string; short: string }>,

  /** Was Berater in der Sitzung sagen: Index 0 = strikt dagegen … 4 = begeistert. */
  stanceLines: {
    economic: [
      'Das ruiniert unsere Wirtschaft. Nur über meine Leiche.',
      'Ich sehe die Kosten, nicht den Nutzen.',
      'Rechnerisch egal. Macht, was ihr wollt.',
      'Das rechnet sich. Ich bin dabei.',
      'Das ist Wachstum pur. Sofort beschließen!',
    ],
    social: [
      'Das trifft die Schwächsten. Ich kann das nicht mittragen.',
      'Wer zahlt am Ende die Zeche? Die Leute auf der Straße.',
      'Für die kleinen Leute ändert das wenig.',
      'Das hilft den Menschen. Gut so.',
      'Endlich Gerechtigkeit! Ich stehe voll dahinter.',
    ],
    security: [
      'Das öffnet dem Chaos die Tür. Nein!',
      'Ich habe Bedenken, was die Ordnung angeht.',
      'Sicherheitspolitisch ohne Belang.',
      'Das sorgt für Ordnung. Einverstanden.',
      'Genau diese Härte brauchen wir!',
    ],
    liberty: [
      'Das ist ein Angriff auf die Freiheit. Niemals.',
      'Mir ist dabei nicht wohl, zu viel Staat.',
      'Die Freiheit berührt das kaum.',
      'Mehr Freiheit, weniger Bevormundung. Ja.',
      'Ein Meilenstein für die offene Gesellschaft!',
    ],
    populist: [
      'Das versteht draußen kein Mensch. Das kostet uns Stimmen!',
      'Die Leute werden das nicht mögen.',
      'Den Wählern ist das ziemlich egal.',
      'Das kommt gut an. Machen wir.',
      'Das Volk wird uns dafür lieben!',
    ],
  } satisfies Record<FactionId, [string, string, string, string, string]>,

  skills: {
    campaigner: { name: 'Wahlkämpferin', text: '+5 Punkte Wahlchance' },
    financier: { name: 'Finanzexperte', text: '+10 % Geld' },
    strategist: { name: 'Stratege', text: '+10 % Einfluss' },
    mediaSavvy: { name: 'Medienprofi', text: '+10 % Anhänger' },
    organizer: { name: 'Organisator', text: '+8 % Tempo aller Betriebe' },
    diplomat: { name: 'Diplomatin', text: '+20 % Diplomatie, bessere Beziehungen' },
    enforcer: { name: 'Hardliner', text: 'Apparat treuer, Rivale schwächer' },
  } satisfies Record<SkillId, { name: string; text: string }>,

  areas: {
    economy: 'Wirtschaft',
    social: 'Soziales',
    security: 'Sicherheit',
    media: 'Medien',
    foreign: 'Außenpolitik',
    party: 'Partei',
  } satisfies Record<PolicyArea, string>,

  policies: {
    workersFirst: {
      name: 'Arbeiter zuerst',
      text: 'Die Partei stellt sich klar hinter die Belegschaften.',
      pro: 'Endlich denkt mal jemand an uns!',
      contra: 'Und wer bezahlt das alles?',
      consequences: [],
    },
    businessFriendly: {
      name: 'Wirtschaftsfreundlicher Kurs',
      text: 'Weniger Auflagen, mehr Freiheit für Unternehmen.',
      pro: 'Gut für die Arbeitsplätze.',
      contra: 'Die Chefs werden reicher, wir nicht.',
      consequences: [],
    },
    volunteerNetwork: {
      name: 'Ehrenamtsnetz',
      text: 'Freiwillige tragen die Botschaft in jede Straße.',
      pro: 'Ich mach mit!',
      contra: 'Schon wieder jemand an der Tür …',
      consequences: [],
    },
    partyDiscipline: {
      name: 'Fraktionsdisziplin',
      text: 'Alle ziehen an einem Strang. Abweichler werden ermahnt.',
      pro: 'Endlich Geschlossenheit.',
      contra: 'Hier darf man ja gar nichts mehr sagen.',
      consequences: [
        {
          title: 'Frust an der Basis',
          text: 'Viele Mitglieder fühlen sich übergangen und bleiben zu Hause.',
        },
      ],
    },
    openMeetings: {
      name: 'Offene Parteitage',
      text: 'Jedes Mitglied darf mitreden und abstimmen.',
      pro: 'Das ist echte Demokratie!',
      contra: 'Das Gerede hört nie auf.',
      consequences: [
        {
          title: 'Flügelkämpfe',
          text: 'Auf offener Bühne streiten die Flügel – der Rivale reibt sich die Hände.',
        },
      ],
    },
    publicTransit: {
      name: 'Nahverkehr ausbauen',
      text: 'Neue Straßenbahnlinien für alle Viertel.',
      pro: 'Nie wieder im Stau stehen!',
      contra: 'Teures Prestigeprojekt.',
      consequences: [],
    },
    tradeFair: {
      name: 'Messe & Gewerbe',
      text: 'Eine große Messe lockt Händler und Kapital in die Stadt.',
      pro: 'Die Stadt brummt!',
      contra: 'Nur was für die Großen.',
      consequences: [],
    },
    cityPolice: {
      name: 'Mehr Stadtpolizei',
      text: 'Streifen in allen Vierteln, rund um die Uhr.',
      pro: 'Endlich fühl ich mich sicher.',
      contra: 'Überall Uniformen. Unheimlich.',
      consequences: [
        {
          title: 'Bürgerrechtsdebatte',
          text: 'Berichte über Übergriffe machen die Runde. Die Zivilgesellschaft protestiert.',
        },
      ],
    },
    pressFreedom: {
      name: 'Pressefreiheit stärken',
      text: 'Unabhängige Redaktionen, freier Zugang zu Informationen.',
      pro: 'Eine freie Presse ist alles!',
      contra: 'Die schreiben doch eh, was sie wollen.',
      consequences: [],
    },
    lowTaxes: {
      name: 'Steuern senken',
      text: 'Mehr Netto vom Brutto – für alle.',
      pro: 'Mehr im Geldbeutel, super!',
      contra: 'Wer soll dann die Schulen bezahlen?',
      consequences: [
        {
          title: 'Haushaltsloch',
          text: 'Die Kassen sind leer. Kürzungen treffen Schulen und Straßen.',
        },
      ],
    },
    wealthTax: {
      name: 'Reichensteuer',
      text: 'Wer viel hat, gibt mehr.',
      pro: 'Das ist nur gerecht.',
      contra: 'Die Firmen wandern ab!',
      consequences: [],
    },
    housing: {
      name: 'Sozialer Wohnungsbau',
      text: 'Bezahlbare Wohnungen für Familien und Arbeiter.',
      pro: 'Endlich eine bezahlbare Wohnung!',
      contra: 'Betonklötze überall.',
      consequences: [],
    },
    industrialPolicy: {
      name: 'Industrieoffensive',
      text: 'Subventionen und Genehmigungen im Eiltempo für die Industrie.',
      pro: 'Arbeit, Arbeit, Arbeit!',
      contra: 'Und die Umwelt?',
      consequences: [
        {
          title: 'Umweltskandal',
          text: 'Giftige Abwässer im Fluss. Die Bilder gehen um die Welt.',
        },
      ],
    },
    digitalState: {
      name: 'Digitaler Staat',
      text: 'Behördengänge per Knopfdruck.',
      pro: 'Nie wieder Warteschlange!',
      contra: 'Ich versteh diese Apps nicht.',
      consequences: [],
    },
    pensionReform: {
      name: 'Rentenreform',
      text: 'Später in Rente, dafür stabile Kassen.',
      pro: 'Vernünftig und nötig.',
      contra: 'Bis 70 schuften? Nie!',
      consequences: [],
    },
    familyBonus: {
      name: 'Familiengeld',
      text: 'Jede Familie bekommt monatlich einen Zuschuss.',
      pro: 'Das hilft uns wirklich.',
      contra: 'Wahlgeschenke auf Pump.',
      consequences: [],
    },
    surveillance: {
      name: 'Überwachungsgesetz',
      text: 'Kameras und Datenabgleich gegen Verbrechen.',
      pro: 'Wer nichts zu verbergen hat …',
      contra: 'Der große Bruder schaut zu.',
      consequences: [],
    },
    mediaLaw: {
      name: 'Mediengesetz',
      text: 'Ein Rat wacht über „ausgewogene“ Berichterstattung.',
      pro: 'Schluss mit den Lügen der Presse.',
      contra: 'Das ist Zensur!',
      consequences: [
        {
          title: 'Protest aus dem Ausland',
          text: 'Nachbarstaaten und Journalistenverbände verurteilen das Gesetz scharf.',
        },
      ],
    },
    openBorders: {
      name: 'Weltoffenheit',
      text: 'Offene Grenzen für Handel, Wissenschaft und Kultur.',
      pro: 'Die Welt ist bei uns zu Gast!',
      contra: 'Wir verlieren unsere Eigenart.',
      consequences: [],
    },
    protectionism: {
      name: 'Schutzzölle',
      text: 'Heimische Produkte zuerst.',
      pro: 'Unsere Arbeit, unser Land!',
      contra: 'Alles wird teurer.',
      consequences: [],
    },
    education: {
      name: 'Bildungsoffensive',
      text: 'Neue Schulen, bessere Ausbildung – eine Investition in die Zukunft.',
      pro: 'Unsere Kinder verdienen das Beste.',
      contra: 'Bringt doch erst in Jahren was.',
      consequences: [
        {
          title: 'Die Saat geht auf',
          text: 'Die ersten gut ausgebildeten Jahrgänge bringen frischen Schwung in alle Betriebe.',
        },
      ],
    },
    army: {
      name: 'Armee stärken',
      text: 'Mehr Geld für Soldaten und Ausrüstung.',
      pro: 'Ein starkes Land braucht Schutz.',
      contra: 'Panzer statt Kindergärten?',
      consequences: [],
    },
    greatProject: {
      name: 'Jahrhundertbauwerk',
      text: 'Ein Wahrzeichen, das die Welt bestaunen wird.',
      pro: 'Wir schreiben Geschichte!',
      contra: 'Größenwahn auf Steuerkosten.',
      consequences: [
        {
          title: 'Kostenexplosion',
          text: 'Das Bauwerk kostet dreimal so viel wie geplant. Die Stimmung kippt.',
        },
      ],
    },
    constitutionReform: {
      name: 'Verfassungsreform',
      text: 'Mehr direkte Demokratie, starke Grundrechte.',
      pro: 'Ein großer Tag für die Demokratie.',
      contra: 'Warum an Bewährtem rütteln?',
      consequences: [],
    },
    stateOfEmergency: {
      name: 'Notstandsgesetze',
      text: 'Versammlungen verboten, Sonderbefugnisse für die Sicherheitskräfte.',
      pro: 'Endlich Ruhe auf den Straßen.',
      contra: 'Das ist das Ende der Freiheit.',
      consequences: [],
    },
    personalityCult: {
      name: 'Personenkult',
      text: 'Dein Porträt in jedem Klassenzimmer, dein Name auf jedem Platz.',
      pro: 'Ein großer Führer für ein großes Volk!',
      contra: 'Das ist doch lächerlich.',
      consequences: [],
    },
  } satisfies Record<
    PolicyId,
    {
      name: string;
      text: string;
      pro: string;
      contra: string;
      consequences: { title: string; text: string }[];
    }
  >,

  /** Beschriftung der Wirkungen. {value} mit Vorzeichen. */
  effectLabels: {
    resource: '{value} % {resource}',
    lineSpeed: '{value} % Tempo {tag}',
    lineSpeedAll: '{value} % Tempo aller Betriebe',
    approvalBase: 'Zustimmung dauerhaft {value}',
    unrestTarget: 'Unruhe dauerhaft {value}',
    moraleTarget: 'Arbeiterstimmung {value}',
    electionBonus: 'Wahlchance {value}',
    loyaltyDrift: 'Loyalität des Apparats {value}/Min.',
    rivalTarget: 'Rivale {value}',
    coupRisk: 'Putschgefahr {value} %',
    relationsDrift: 'Beziehungen {value}/Min.',
    approval: 'Zustimmung {value}',
    unrest: 'Unruhe {value}',
    loyalty: 'Loyalität {value}',
    morale: 'Stimmung {value}',
    rival: 'Rivale {value}',
    relationsAll: 'Beziehungen zu allen Staaten {value}',
    group: '{group} {value}',
  },
  tags: {
    industry: 'Industrie',
    trade: 'Handel',
    party: 'Partei',
    media: 'Medien',
    finance: 'Finanzen',
    state: 'Verwaltung',
    diplomacy: 'Diplomatie',
  } satisfies Record<LineTag, string>,

  session: {
    title: 'Parteisitzung',
    agenda: 'Tagesordnung',
    agendaEmpty: 'Keine Vorlagen – neue Vorlagen in {time}.',
    agendaNext: 'Neue Tagesordnung in {time}',
    laws: 'Geltende Beschlüsse',
    lawsCount: '{count} von {max}',
    lawsEmpty: 'Noch nichts beschlossen.',
    discuss: 'Beraten',
    enact: 'Beschließen',
    decree: 'Verfügen',
    reject: 'Ablehnen',
    revoke: 'Aufheben',
    since: 'seit {time}',
    effects: 'Wirkung',
    shock: 'Sofort',
    later: 'Spätfolgen',
    warning: '{name} warnt: „{title}“ nach etwa {time}',
    unknownLater: 'Ob es Spätfolgen gibt, kann am Tisch niemand abschätzen.',
    noLater: 'Keine absehbaren Spätfolgen.',
    fired: 'Eingetreten: {title}',
    pending: 'Droht: {title}',
    vote: '{for} dafür · {against} dagegen · {neutral} neutral',
    voteEmpty: 'Niemand am Tisch – du entscheidest allein.',
    loyaltyUp: 'Befürworter werden treuer, Gegner verlieren Vertrauen.',
    cost: 'Kosten',
    blocks: {
      away: 'Nur im Parteibüro, Rathaus oder Parlament',
      agenda: 'Nicht auf der Tagesordnung',
      slots: 'Alle Plätze belegt – erst ein Gesetz aufheben',
      conflict: 'Widerspricht: {law}',
      money: 'Zu wenig Mittel',
      stage: 'Noch nicht möglich',
    },
    citizens: 'Stimmen von der Straße',
    goToOffice: 'Zum Parteibüro',
    openSession: 'Sitzung eröffnen',
  },

  lawDeck: {
    title: 'Abstimmung',
    hint: 'Nach rechts wischen = zustimmen, nach links = ablehnen',
    left: 'noch {count}',
    empty: 'Alles abgestimmt! Neue Vorlagen in {time}.',
    yes: 'DAFÜR',
    no: 'DAGEGEN',
    for: 'dafür',
    against: 'dagegen',
    debate: 'Beraten',
    warning: '{faction} warnt: {title}',
  },

  advisors: {
    title: 'Beratertisch',
    seats: '{count} von {max} Plätzen',
    empty: 'Freier Platz',
    candidates: 'Bewerber',
    candidatesNext: 'Neue Bewerber in {time}',
    noCandidates: 'Gerade keine Bewerber.',
    hire: 'An den Tisch holen',
    dismiss: 'Verabschieden',
    loyalty: 'Loyalität {value} %',
    disloyal: 'Unzufrieden – könnte überlaufen!',
    blocks: {
      away: 'Nur im Parteibüro, Rathaus oder Parlament',
      seats: 'Alle Plätze belegt',
      money: 'Zu wenig Einfluss',
      missing: 'Nicht verfügbar',
    },
  },

  rival: {
    title: 'Dein Rivale',
    parties: ['Neue Ordnung', 'Liste Fortschritt', 'Heimatbund', 'Die Mutigen', 'Volkspartei Plus'],
    strength: 'Stärke {value} %',
    election: 'Wirkung auf deine Wahlchance: {value} Punkte',
    jailed: 'Sitzt in Haft. Von ihm geht keine Gefahr mehr aus.',
    notYet: 'Noch kennt dich niemand. Ab Stufe {stage} tritt ein Rivale auf.',
    quotes: {
      weak: ['Ich gebe nicht auf!', 'Wartet nur ab …', 'Noch ist nichts entschieden.'],
      mid: [
        'Die Leute haben genug von dir.',
        'Ich bin die echte Alternative!',
        'Wir sehen uns an der Urne.',
      ],
      strong: [
        'Deine Tage sind gezählt!',
        'Das Volk steht hinter mir!',
        'Bald sitze ich auf deinem Stuhl.',
      ],
    },
    counters: {
      counterCampaign: {
        name: 'Gegenkampagne',
        text: 'Plakate, Anzeigen, Hausbesuche. Sicher, aber teuer.',
      },
      exposeScandal: {
        name: 'Skandal aufdecken',
        text: 'Ein Tipp aus seinem Umfeld. Klappt es, ist er schwer beschädigt – sonst fällt es auf dich zurück.',
      },
      arrest: {
        name: 'Verhaften lassen',
        text: 'Nur, wenn er schwach ist. Das Ausland wird empört sein.',
      },
    } satisfies Record<RivalCounterId, { name: string; text: string }>,
    chance: '{chance} % Erfolgschance',
    blocks: {
      inactive: 'Nicht möglich',
      path: 'Nur auf autokratischem Weg',
      strength: 'Er ist noch zu stark',
      cooldown: 'Wieder möglich in {time}',
      away: 'Nur im Parteibüro, Rathaus oder Parlament',
      money: 'Zu wenig Mittel',
    },
    success: 'Das hat gesessen!',
    failure: 'Das ging nach hinten los …',
  },

  chronicle: {
    paper: 'Der Tagesbote',
    title: 'Stadtchronik',
    subtitle: 'Alles, was in deiner Stadt geschah',
    empty: 'Noch keine Schlagzeilen.',
    year: 'Jahr {year}',
    open: 'Chronik öffnen',
    headlines: {
      runStart: '{name} tritt an – eine neue Geschichte beginnt',
      promoted: 'Aufstieg! {name} ist jetzt {title}',
      electionWon: 'Wahlsieg! {name} schlägt {rival}',
      electionLost: 'Niederlage: {rival} gewinnt die Wahl',
      resigned: 'Rücktritt nach Unruhen – {name} zieht die Konsequenzen',
      autocraticTurn: 'Kurswechsel: {name} regiert mit harter Hand',
      lawEnacted: 'Beschlossen: {policy}',
      lawRevoked: 'Kehrtwende: {policy} wird aufgehoben',
      consequence: '{title}',
      buildingUpgraded: 'Ausgebaut: {building} ist jetzt {levelName}',
      machineBuilt: 'Neu im Betrieb: {machine} (Stufe {level})',
      firstWorker: 'Der erste Mitarbeiter ist eingestellt!',
      workforce: 'Jobmotor: {count} Menschen arbeiten jetzt für {name}',
      advisorJoined: '{advisor} ({faction}) holt sich einen Platz am Tisch',
      advisorLeft: '{advisor} verlässt den Beratertisch',
      advisorDefected: 'Verrat! {advisor} läuft zu {rival} über',
      rivalSmear: 'Schmutzkampagne: {rival} verbreitet Gerüchte',
      rivalPoach: '{rival} umwirbt deine Berater',
      rivalRally: 'Großkundgebung von {rival} – die Stimmung heizt sich auf',
      rivalCountered: 'Gegenkampagne zeigt Wirkung – {rival} verliert an Boden',
      rivalScandal: 'Skandal! Schwere Vorwürfe gegen {rival}',
      rivalScandalFailed: 'Bumerang: Vorwürfe gegen {rival} lösen sich in Luft auf',
      rivalJailed: '{rival} verhaftet – Proteste im In- und Ausland',
      strikeStarted: 'Streik! Die Belegschaften legen die Arbeit nieder',
      strikeEnded: 'Einigung: Der Streik ist vorbei',
    } satisfies Record<ChronicleKey, string>,
  },

  /** Was Passanten sagen, je nach Stimmung im Land. */
  citizens: {
    happy: [
      'Schöne Zeiten gerade!',
      'Die Stadt blüht auf.',
      'Ich wähl dich wieder!',
      'Hast du die neuen Laternen gesehen?',
      'Endlich geht es voran.',
    ],
    neutral: [
      'Mal sehen, was kommt.',
      'Wieder teurer geworden …',
      'Politik, Politik …',
      'Schönes Wetter heute.',
      'Kennst du den neuen Laden?',
    ],
    angry: [
      'Die da oben machen, was sie wollen!',
      'So geht das nicht weiter.',
      'Wir gehen auf die Straße!',
      'Rücktritt!',
      'Ich kann mir nichts mehr leisten.',
    ],
  },
};
