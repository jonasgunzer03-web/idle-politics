import { defaultConfig } from '../config';
import type { PolicyEffects, PolicyShock } from '../config/party';
import { formatNumber } from '../engine/format';
import {
  GROUP_IDS,
  RESOURCE_IDS,
  type GoodId,
  type LineTag,
  type LocationId,
  type MachineId,
  type PolicyId,
} from '../engine/ids';
import { hash32, personFromSeed, type PersonProfile } from '../engine/people';
import type { ChronicleEntry, RunState } from '../engine/schema';
import { de, fill } from '../i18n/de';
import { careerTitle, locationName } from './gameText';

// Anzeige-Texte für Menschen (Namen), Waren, Maschinen, Gesetze und die Chronik.

const cfg = defaultConfig;

export function personName(profile: PersonProfile): string {
  const { first, last } = de.industry.people;
  return `${first[profile.first % first.length] ?? ''} ${last[profile.last % last.length] ?? ''}`;
}

export function nameFromSeed(seed: number): string {
  return personName(personFromSeed(seed));
}

export function rivalParty(seed: number): string {
  const list = de.party.rival.parties;
  return list[hash32(seed, 11) % list.length] ?? list[0] ?? '';
}

export function goodName(id: GoodId, office: boolean): string {
  const t = de.industry.goods[id];
  return office ? t.office : t.name;
}

export function machineName(id: MachineId, office: boolean): string {
  const t = de.industry.machines[id];
  return office ? t.office : t.name;
}

/** Name der Ausbaustufe eines Gebäudes (z. B. „Fabrik“). */
export function levelName(location: LocationId, level: number, office: boolean): string {
  const t = de.industry.levels[location];
  const list = office ? t.office : t.skilled;
  return list[Math.max(0, Math.min(list.length - 1, level - 1))] ?? '';
}

export function roleName(location: LocationId, office: boolean): string {
  const t = de.industry.roles[location];
  return office ? t.office : t.skilled;
}

function signed(value: number, decimals = 0): string {
  const text = formatNumber(Math.abs(value), { smallDecimals: decimals, rounding: 'round' });
  return `${value >= 0 ? '+' : '−'}${text}`;
}

/** Dauerhafte Wirkungen als lesbare Zeilen, mit Kennzeichen, ob sie gut sind. */
export function effectLines(effects: PolicyEffects | undefined): { text: string; good: boolean }[] {
  if (!effects) return [];
  const l = de.party.effectLabels;
  const lines: { text: string; good: boolean }[] = [];
  for (const id of RESOURCE_IDS) {
    const v = effects.resource?.[id];
    if (v)
      lines.push({
        text: fill(l.resource, { value: signed(v * 100), resource: de.resources[id] }),
        good: v > 0,
      });
  }
  for (const [tag, v] of Object.entries(effects.lineSpeed ?? {}) as [LineTag | 'all', number][]) {
    if (!v) continue;
    lines.push({
      text:
        tag === 'all'
          ? fill(l.lineSpeedAll, { value: signed(v * 100) })
          : fill(l.lineSpeed, { value: signed(v * 100), tag: de.party.tags[tag] }),
      good: v > 0,
    });
  }
  const simple: [keyof PolicyEffects, string, boolean][] = [
    ['approvalBase', l.approvalBase, true],
    ['unrestTarget', l.unrestTarget, false],
    ['moraleTarget', l.moraleTarget, true],
    ['electionBonus', l.electionBonus, true],
    ['loyaltyDrift', l.loyaltyDrift, true],
    ['rivalTarget', l.rivalTarget, false],
    ['relationsDrift', l.relationsDrift, true],
  ];
  for (const [key, label, positiveIsGood] of simple) {
    const v = effects[key];
    if (typeof v === 'number' && v !== 0) {
      lines.push({ text: fill(label, { value: signed(v, 1) }), good: v > 0 === positiveIsGood });
    }
  }
  if (effects.coupRisk) {
    lines.push({
      text: fill(l.coupRisk, { value: signed(effects.coupRisk * 100) }),
      good: effects.coupRisk < 0,
    });
  }
  return lines;
}

/** Einmalige Wirkungen als Zeilen. */
export function shockLines(shock: PolicyShock | undefined): { text: string; good: boolean }[] {
  if (!shock) return [];
  const l = de.party.effectLabels;
  const lines: { text: string; good: boolean }[] = [];
  const simple: [keyof PolicyShock, string, boolean][] = [
    ['approval', l.approval, true],
    ['unrest', l.unrest, false],
    ['loyalty', l.loyalty, true],
    ['morale', l.morale, true],
    ['rival', l.rival, false],
    ['relationsAll', l.relationsAll, true],
  ];
  for (const [key, label, positiveIsGood] of simple) {
    const v = shock[key];
    if (typeof v === 'number' && v !== 0) {
      lines.push({ text: fill(label, { value: signed(v) }), good: v > 0 === positiveIsGood });
    }
  }
  for (const g of GROUP_IDS) {
    const v = shock.groups?.[g];
    if (v)
      lines.push({
        text: fill(l.group, { group: de.groups[g].name, value: signed(v) }),
        good: v > 0,
      });
  }
  return lines;
}

/** Kurze Dauer wie „5 Min.“ oder „40 s“. */
export function shortDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 90) return `${seconds} s`;
  return `${Math.round(seconds / 60)} Min.`;
}

export function policyName(id: PolicyId): string {
  return de.party.policies[id].name;
}

/** Schlagzeile eines Chronik-Eintrags. */
export function chronicleHeadline(
  entry: ChronicleEntry,
  run: Pick<RunState, 'stateId' | 'path' | 'profession' | 'rival'>,
  playerName: string,
): string {
  const p = entry.params;
  const office = run.profession === 'office';
  const str = (key: string) => {
    const v = p[key];
    return typeof v === 'string' ? v : '';
  };
  const num = (key: string) => {
    const v = p[key];
    return typeof v === 'number' ? v : 0;
  };
  const rival = nameFromSeed(
    typeof p.seed === 'number' && entry.key.startsWith('election') ? p.seed : run.rival.seed,
  );
  const values: Record<string, string | number> = {
    name: playerName,
    rival,
    stage: num('stage'),
    count: num('count'),
    level: num('level'),
  };
  switch (entry.key) {
    case 'promoted':
    case 'electionWon':
      values.title = careerTitle({ stateId: run.stateId, path: run.path, stage: num('stage') });
      break;
    case 'lawEnacted':
    case 'lawRevoked':
      values.policy = policyName(str('policy') as PolicyId);
      break;
    case 'consequence': {
      const policy = de.party.policies[str('policy') as PolicyId] as
        (typeof de.party.policies)[PolicyId] | undefined;
      values.title = policy?.consequences[num('index')]?.title ?? '';
      break;
    }
    case 'buildingUpgraded': {
      const location = str('location') as LocationId;
      values.building = locationName(location, office);
      values.levelName = levelName(location, num('level'), office);
      break;
    }
    case 'machineBuilt':
      values.machine = machineName(str('machine') as MachineId, office);
      break;
    case 'advisorJoined':
    case 'advisorLeft':
    case 'advisorDefected':
      values.advisor = nameFromSeed(num('seed'));
      values.faction = str('faction')
        ? de.party.factions[str('faction') as keyof typeof de.party.factions].short
        : '';
      break;
    default:
      break;
  }
  return fill(de.party.chronicle.headlines[entry.key], values);
}

/** Spieljahr eines Zeitpunkts (Amtsjahre-Takt aus der Config). */
export function yearOf(playMs: number): number {
  return Math.floor(playMs / (cfg.balancing.ruling.secondsPerYear * 1000)) + 1;
}
