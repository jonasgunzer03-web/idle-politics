import type { GameConfig } from '../config';
import type { PolicyDef, PolicyEffects } from '../config/party';
import { LINE_TAGS, RESOURCE_IDS, type LineTag, type PolicyId, type ResourceMap } from './ids';
import type { RunState } from './schema';

// Alle dauerhaften Wirkungen aus Gesetzen (inklusive eingetretener Spätfolgen) und den
// Fähigkeiten der Berater, zusammengefasst zu einem Satz Modifikatoren. Regeln, Produktion
// und Politik fragen hier nach.

export interface Modifiers {
  /** Zusätzlicher Ertrag je Währung als Anteil (0,1 = +10 %). */
  resource: ResourceMap;
  /** Zusätzliches Tempo je Liniengruppe und für alle Linien. */
  lineSpeed: Record<LineTag | 'all', number>;
  approvalBase: number;
  unrestTarget: number;
  moraleTarget: number;
  electionBonus: number;
  loyaltyDrift: number;
  rivalTarget: number;
  coupRisk: number;
  relationsDrift: number;
}

export function emptyModifiers(): Modifiers {
  const lineSpeed = { all: 0 } as Record<LineTag | 'all', number>;
  for (const tag of LINE_TAGS) lineSpeed[tag] = 0;
  return {
    resource: { money: 0, influence: 0, followers: 0, diplomacy: 0 },
    lineSpeed,
    approvalBase: 0,
    unrestTarget: 0,
    moraleTarget: 0,
    electionBonus: 0,
    loyaltyDrift: 0,
    rivalTarget: 0,
    coupRisk: 0,
    relationsDrift: 0,
  };
}

/** Wirkungen aufaddieren (verändert `into`). */
export function addEffects(into: Modifiers, effects: PolicyEffects | undefined): void {
  if (!effects) return;
  for (const id of RESOURCE_IDS) into.resource[id] += effects.resource?.[id] ?? 0;
  if (effects.lineSpeed) {
    for (const [tag, value] of Object.entries(effects.lineSpeed) as [LineTag | 'all', number][]) {
      into.lineSpeed[tag] += value;
    }
  }
  into.approvalBase += effects.approvalBase ?? 0;
  into.unrestTarget += effects.unrestTarget ?? 0;
  into.moraleTarget += effects.moraleTarget ?? 0;
  into.electionBonus += effects.electionBonus ?? 0;
  into.loyaltyDrift += effects.loyaltyDrift ?? 0;
  into.rivalTarget += effects.rivalTarget ?? 0;
  into.coupRisk += effects.coupRisk ?? 0;
  into.relationsDrift += effects.relationsDrift ?? 0;
}

export function findPolicy(id: PolicyId, cfg: GameConfig): PolicyDef | undefined {
  return cfg.party.policies.find((p) => p.id === id);
}

/** Millisekunden Spielzeit bis zur Spätfolge (skaliert mit GAME_SPEED). */
export function consequenceDelayMs(afterSeconds: number, cfg: GameConfig): number {
  return (afterSeconds * 1000) / cfg.balancing.gameSpeed;
}

// Zwischenspeicher: Innerhalb eines Takts wird dieselbe RunState oft befragt.
const cache = new WeakMap<RunState, WeakMap<GameConfig, Modifiers>>();

/** Alle aktiven Modifikatoren eines Durchlaufs. */
export function modifiers(run: RunState, cfg: GameConfig): Modifiers {
  const byCfg = cache.get(run);
  const hit = byCfg?.get(cfg);
  if (hit) return hit;
  const m = emptyModifiers();
  for (const [id, law] of Object.entries(run.laws) as [PolicyId, { fired: number }][]) {
    const def = findPolicy(id, cfg);
    if (!def) continue;
    addEffects(m, def.effects);
    const fired = Math.min(law.fired, def.consequences?.length ?? 0);
    for (let i = 0; i < fired; i++) addEffects(m, def.consequences?.[i]?.effects);
  }
  for (const advisor of run.advisors) {
    addEffects(m, cfg.party.skills.find((s) => s.id === advisor.skill)?.effects);
  }
  const map = byCfg ?? new WeakMap<GameConfig, Modifiers>();
  map.set(cfg, m);
  if (!byCfg) cache.set(run, map);
  return m;
}
