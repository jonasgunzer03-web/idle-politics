import { cfg, playingGame, runOf } from '../test/fixtures';
import { electionChance } from './career';
import { zeroResources } from './economy';
import { modifiers } from './modifiers';
import {
  advisorStance,
  enactBlock,
  enactPolicy,
  hireAdvisor,
  isConsequenceForeseen,
  refreshAgenda,
  rejectPolicy,
  revokePolicy,
  rivalCounter,
  rivalElectionEffect,
  tickParty,
} from './party';
import { nextRequirement, resourceMultiplier } from './rules';
import type { Advisor, GameState, RunState } from './schema';
import { findPolicy } from './modifiers';

const rich = { ...zeroResources(), money: 1e12, influence: 1e12, followers: 1e12, diplomacy: 1e9 };
const OFFICE = { posX: 860, target: null, inside: true };

function inOffice(overrides: Partial<RunState> = {}): GameState {
  return playingGame({ world: OFFICE, resources: rich, ...overrides });
}

function advisor(faction: Advisor['faction'], loyalty = 60): Advisor {
  return { seed: 1, faction, skill: 'strategist', loyalty, joinedAt: 0 };
}

function policy(id: Parameters<typeof findPolicy>[0]) {
  const p = findPolicy(id, cfg);
  if (!p) throw new Error(id);
  return p;
}

describe('Beschlüsse im Parteibüro', () => {
  it('Beschluss wirkt dauerhaft und kostet Einfluss', () => {
    const game = inOffice({ agenda: { items: ['businessFriendly'], refreshAt: 1e12 } });
    const before = resourceMultiplier(game, 'money', cfg);
    const after = enactPolicy(game, 'businessFriendly', cfg);
    expect(runOf(after).laws.businessFriendly).toBeDefined();
    expect(resourceMultiplier(after, 'money', cfg)).toBeCloseTo(before * 1.12);
    expect(runOf(after).resources.influence).toBeLessThan(rich.influence);
    expect(runOf(after).agenda.items).toEqual([]);
    expect(runOf(after).chronicle.at(-1)?.key).toBe('lawEnacted');
  });

  it('Nur im Parteibüro und nur, was auf der Tagesordnung steht', () => {
    const away = playingGame({
      resources: rich,
      agenda: { items: ['businessFriendly'], refreshAt: 1e12 },
    });
    expect(enactBlock(runOf(away), 'businessFriendly', cfg)).toBe('away');
    // Im Rathaus wird ebenfalls abgestimmt (Wisch-Karten)
    const townHall = playingGame({
      stage: 5,
      resources: rich,
      agenda: { items: ['businessFriendly'], refreshAt: 1e12 },
      world: { posX: 1220, target: null, inside: true },
    });
    expect(enactBlock(runOf(townHall), 'businessFriendly', cfg)).toBeNull();
    expect(runOf(rejectPolicy(townHall, 'businessFriendly', cfg)).agenda.items).toEqual([]);
    const notListed = inOffice({ agenda: { items: [], refreshAt: 1e12 } });
    expect(enactPolicy(notListed, 'businessFriendly', cfg)).toBe(notListed);
  });

  it('Gegensätzliche Gesetze schließen sich aus', () => {
    const game = inOffice({
      laws: { workersFirst: { since: 0, fired: 0 } },
      agenda: { items: ['businessFriendly'], refreshAt: 1e12 },
    });
    expect(enactBlock(runOf(game), 'businessFriendly', cfg)).toBe('conflict');
  });

  it('Begrenzte Plätze für geltende Gesetze', () => {
    const game = inOffice({
      laws: { workersFirst: { since: 0, fired: 0 }, volunteerNetwork: { since: 0, fired: 0 } },
      agenda: { items: ['partyDiscipline'], refreshAt: 1e12 },
    });
    expect(enactBlock(runOf(game), 'partyDiscipline', cfg)).toBe('slots');
  });

  it('Berater reagieren auf Beschlüsse: Befürworter treuer, Gegner verärgert', () => {
    const game = inOffice({
      agenda: { items: ['businessFriendly'], refreshAt: 1e12 },
      advisors: [advisor('economic'), advisor('social')],
    });
    const after = runOf(enactPolicy(game, 'businessFriendly', cfg));
    expect(after.advisors[0]?.loyalty).toBeGreaterThan(60);
    expect(after.advisors[1]?.loyalty).toBeLessThan(60);
    expect(advisorStance(advisor('economic'), policy('businessFriendly'))).toBe(2);
  });

  it('Ablehnen: Befürworter sind enttäuscht', () => {
    const game = inOffice({
      agenda: { items: ['businessFriendly'], refreshAt: 1e12 },
      advisors: [advisor('economic')],
    });
    const after = runOf(rejectPolicy(game, 'businessFriendly', cfg));
    expect(after.advisors[0]?.loyalty).toBeLessThan(60);
    expect(after.agenda.items).toEqual([]);
  });

  it('Spätfolgen treten nach der Wartezeit ein – und wirken dann dauerhaft', () => {
    const def = policy('lowTaxes');
    const delay = (def.consequences?.[0]?.afterSeconds ?? 0) * 1000;
    const game = playingGame({
      stage: 4,
      laws: { lowTaxes: { since: 0, fired: 0 } },
      playMs: 1000,
    });
    const early = tickParty(game, 1000, cfg);
    expect(runOf(early).laws.lowTaxes?.fired).toBe(0);
    const late = tickParty(
      playingGame({ stage: 4, laws: { lowTaxes: { since: 0, fired: 0 } }, playMs: delay }),
      1000,
      cfg,
    );
    expect(runOf(late).laws.lowTaxes?.fired).toBe(1);
    expect(runOf(late).chronicle.some((c) => c.key === 'consequence')).toBe(true);
    // Haushaltsloch: +15 % − 12 % Geld
    expect(modifiers(runOf(late), cfg).resource.money).toBeCloseTo(0.03);
  });

  it('Berater des passenden Flügels sehen Spätfolgen voraus', () => {
    const def = policy('lowTaxes');
    const withSocial = runOf(inOffice({ advisors: [advisor('social')] }));
    const withoutSocial = runOf(inOffice({ advisors: [advisor('economic')] }));
    expect(isConsequenceForeseen(withSocial, def, 0)).toBe('social');
    expect(isConsequenceForeseen(withoutSocial, def, 0)).toBeNull();
  });

  it('Aufheben beendet auch eingetretene Spätfolgen, danach Sperrfrist', () => {
    const game = inOffice({ stage: 4, laws: { lowTaxes: { since: 0, fired: 1 } } });
    const revoked = revokePolicy(game, 'lowTaxes', cfg);
    expect(runOf(revoked).laws.lowTaxes).toBeUndefined();
    expect(modifiers(runOf(revoked), cfg).resource.money).toBe(0);
    const again = refreshAgenda(revoked, cfg);
    expect(runOf(again).agenda.items).not.toContain('lowTaxes');
  });

  it('Tagesordnung enthält nur passende Vorlagen', () => {
    const game = refreshAgenda(playingGame({ stage: 1 }), cfg);
    const items = runOf(game).agenda.items;
    expect(items.length).toBe(cfg.party.agendaSize);
    for (const id of items) expect(policy(id).minStage).toBeLessThanOrEqual(1);
  });
});

describe('Berater', () => {
  it('Bewerber an den Tisch holen, solange Plätze frei sind', () => {
    const game = inOffice({
      advisorPool: {
        candidates: [{ seed: 5, faction: 'social', skill: 'financier' }],
        refreshAt: 1e12,
      },
    });
    const hired = runOf(hireAdvisor(game, 0, cfg));
    expect(hired.advisors).toHaveLength(1);
    expect(hired.advisorPool.candidates).toHaveLength(0);
    // Finanzexperte: +10 % Geld
    expect(modifiers(hired, cfg).resource.money).toBeCloseTo(0.1);
    const full = inOffice({
      advisors: [advisor('economic'), advisor('social')],
      advisorPool: {
        candidates: [{ seed: 5, faction: 'social', skill: 'financier' }],
        refreshAt: 1e12,
      },
    });
    expect(hireAdvisor(full, 0, cfg)).toBe(full);
  });

  it('Sehr untreue Berater laufen irgendwann zum Rivalen über', () => {
    let game = playingGame({ stage: 3, advisors: [advisor('liberty', 0)] });
    for (let i = 0; i < 600 && runOf(game).advisors.length > 0; i++) {
      game = tickParty(game, 1000, cfg);
    }
    const run = runOf(game);
    expect(run.advisors).toHaveLength(0);
    expect(run.stats.defections).toBe(1);
    expect(run.chronicle.some((c) => c.key === 'advisorDefected')).toBe(true);
  });
});

describe('Rivale', () => {
  it('Ein starker Rivale senkt die Wahlchance, ein schwacher hebt sie', () => {
    const need = nextRequirement(runOf(playingGame({ stage: 3 })), cfg).followers;
    const resources = { ...zeroResources(), followers: need };
    const strong = playingGame({
      stage: 3,
      resources,
      rival: { seed: 1, strength: 90, status: 'active', nextMoveAt: 1e12 },
    });
    const weak = playingGame({
      stage: 3,
      resources,
      rival: { seed: 1, strength: 10, status: 'active', nextMoveAt: 1e12 },
    });
    expect(rivalElectionEffect(runOf(strong), cfg)).toBeLessThan(0);
    expect(rivalElectionEffect(runOf(weak), cfg)).toBeGreaterThan(0);
    expect(electionChance(strong, 0, cfg)).toBeLessThan(electionChance(weak, 0, cfg));
  });

  it('Der Rivale handelt von selbst und landet in der Chronik', () => {
    const game = playingGame({
      stage: 3,
      playMs: 10_000,
      rival: { seed: 1, strength: 50, status: 'active', nextMoveAt: 5_000 },
    });
    const after = runOf(tickParty(game, 1000, cfg));
    expect(after.rival.nextMoveAt).toBeGreaterThan(10_000);
    expect(after.chronicle.some((c) => c.key.startsWith('rival'))).toBe(true);
  });

  it('Gegenkampagne schwächt ihn sicher; Verhaftung nur für Autokraten', () => {
    const game = inOffice({
      stage: 3,
      rival: { seed: 1, strength: 50, status: 'active', nextMoveAt: 1e12 },
    });
    const result = rivalCounter(game, 'counterCampaign', cfg);
    expect(result.outcome?.success).toBe(true);
    expect(runOf(result.game).rival.strength).toBe(38);
    // Zweimal hintereinander geht nicht (Wartezeit)
    expect(rivalCounter(result.game, 'counterCampaign', cfg).outcome).toBeNull();
    expect(rivalCounter(game, 'arrest', cfg).outcome).toBeNull();
    const auto = inOffice({
      stage: 6,
      path: 'autocratic',
      rival: { seed: 1, strength: 20, status: 'active', nextMoveAt: 1e12 },
    });
    const jailed = rivalCounter(auto, 'arrest', cfg);
    expect(runOf(jailed.game).rival.status).toBe('jailed');
  });
});
