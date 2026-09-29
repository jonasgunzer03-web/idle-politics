// Kern der Balancing-Simulation: ein Bot, der das Spiel ohne Oberfläche spielt.
// Genutzt von simulate.ts (Bericht) und calibrate.ts (Anforderungen einstellen).

import type { GameConfig } from '../src/config';
import { careerVenue } from '../src/config/careers';
import { autocracyAction, autocracyCost, isAutocracyAvailable } from '../src/engine/autocracy';
import {
  campaignCost,
  careerStatus,
  electionChance,
  finishCeremony,
  isElectionStage,
  promote,
  runForElection,
  turnAutocratic,
} from '../src/engine/career';
import {
  actionProgress,
  actionYield,
  buildProject,
  buyActionUpgrade,
  buyGenerator,
  buyVehicle,
  canAfford,
  generatorCost,
  performAction,
  projectCost,
  upgradeCost,
  vehicleCost,
} from '../src/engine/economy';
import { findEvent, resolveEvent } from '../src/engine/events';
import { createNewGame, startRun } from '../src/engine/game';
import {
  MAX_STAGE,
  RESOURCE_IDS,
  VEHICLE_IDS,
  type ResourceMap,
  type StateId,
} from '../src/engine/ids';
import { investCost, investInGroup } from '../src/engine/alliances';
import { groupsFor, groupLoyalty, nextRequirement } from '../src/engine/rules';
import type { GameState } from '../src/engine/schema';
import { tick } from '../src/engine/tick';
import { findAction, isActionUnlocked, isGeneratorUnlocked } from '../src/engine/unlocks';
import { currentLocation, enterBuilding, walkTo } from '../src/engine/world';
import type { Character } from '../src/engine/schema';

const TAPS_PER_SECOND = 4;
const MAX_MINUTES = 400;

const character: Character = {
  name: 'Bot Tester',
  build: 1,
  skinTone: 0,
  faceShape: 0,
  hairStyle: 1,
  hairColor: 0,
  beard: 0,
  glasses: 0,
  party: { name: 'Testpartei', color: 0, symbol: 0 },
  accessories: [],
};

export interface Scenario {
  label: string;
  stateId: StateId;
  autocratic: boolean;
}

export const scenarios: Scenario[] = [
  { label: 'Novaria demokratisch', stateId: 'novaria', autocratic: false },
  { label: 'Novaria autokratisch', stateId: 'novaria', autocratic: true },
  { label: 'Rhenanien demokratisch', stateId: 'rhenania', autocratic: false },
  { label: 'Rhenanien autokratisch', stateId: 'rhenania', autocratic: true },
  { label: 'Borealis', stateId: 'borealis', autocratic: true },
  { label: 'Zentralia', stateId: 'zentralia', autocratic: true },
];

/** Relativer Wert der Währungen: knappe Währungen zählen mehr. */
function weights(game: GameState, cfg: GameConfig): ResourceMap {
  const run = game.run;
  if (!run) return { money: 1, influence: 1, followers: 1, diplomacy: 1 };
  const req = nextRequirement(run, cfg);
  return {
    money: 1,
    influence: req.money / Math.max(1, req.influence),
    followers: req.followers > 0 ? req.money / req.followers : 0.02,
    // Diplomatie wird nur für Außenpolitik gebraucht: bewusst niedrig bewertet
    diplomacy: req.money / 20_000,
  };
}

function value(map: Partial<ResourceMap>, w: ResourceMap): number {
  return RESOURCE_IDS.reduce((sum, id) => sum + (map[id] ?? 0) * w[id], 0);
}

function deltaRate(before: GameState, after: GameState, w: ResourceMap, cfg: GameConfig): number {
  // Unterschied der automatischen Erträge (über einen 1-Sekunden-Takt gemessen)
  const probe = (g: GameState) => {
    const r = g.run;
    if (!r) return 0;
    const t = tick({ ...g, run: { ...r, events: { ...r.events, nextAt: Infinity } } }, 1000, cfg);
    const r2 = t.run;
    if (!r2) return 0;
    const gain: Partial<ResourceMap> = {};
    for (const id of RESOURCE_IDS) gain[id] = r2.resources[id] - r.resources[id];
    return value(gain, w);
  };
  return probe(after) - probe(before);
}

/** Kauft Investitionen mit kurzer Amortisationszeit. */
function investGreedily(game: GameState, cfg: GameConfig, payback: number): GameState {
  let current = game;
  for (let guard = 0; guard < 40; guard++) {
    const run = current.run;
    if (!run) return current;
    const w = weights(current, cfg);
    const reserve = careerStatus(current, cfg);
    const options: { cost: Partial<ResourceMap>; apply: (g: GameState) => GameState }[] = [];
    for (const def of cfg.balancing.generators) {
      if (!isGeneratorUnlocked(run, def, cfg)) continue;
      options.push({
        cost: generatorCost(def, run.generators[def.id] ?? 0, 1, cfg),
        apply: (g) => buyGenerator(g, def.id, 1, cfg).game,
      });
    }
    const here = currentLocation(run, cfg);
    for (const action of cfg.world.actions) {
      if (action.location !== here || !run.world.inside || !isActionUnlocked(run, action, cfg))
        continue;
      options.push({
        cost: upgradeCost(run, action, 'staff', cfg),
        apply: (g) => buyActionUpgrade(g, action.id, 'staff', cfg),
      });
      if (actionProgress(run, action.id).training < action.training.maxLevel) {
        options.push({
          cost: upgradeCost(run, action, 'training', cfg),
          apply: (g) => buyActionUpgrade(g, action.id, 'training', cfg),
        });
      }
    }
    for (const p of cfg.projects) {
      options.push({ cost: projectCost(run, p.id, cfg), apply: (g) => buildProject(g, p.id, cfg) });
    }
    let best: { score: number; next: GameState } | null = null;
    for (const option of options) {
      if (!canAfford(run.resources, option.cost)) continue;
      const next = option.apply(current);
      if (next === current) continue;
      const gain = deltaRate(current, next, w, cfg);
      if (gain <= 0) continue;
      const seconds = value(option.cost, w) / gain;
      if (seconds > payback) continue;
      if (!best || seconds < best.score) best = { score: seconds, next };
    }
    // Nicht investieren, wenn der Aufstieg sofort möglich ist
    if (!best || reserve?.ready) return current;
    current = best.next;
  }
  return current;
}

/** Welche Tätigkeit bringt am meisten von der knappsten Währung? */
function bestAction(game: GameState, cfg: GameConfig) {
  const run = game.run;
  if (!run) return undefined;
  const req = nextRequirement(run, cfg);
  const deficit: ResourceMap = {
    money: req.money / Math.max(1, run.resources.money),
    influence: req.influence / Math.max(1, run.resources.influence),
    followers: req.followers > 0 ? req.followers / Math.max(1, run.resources.followers) : 0,
    diplomacy: 0,
  };
  let best: { id: string; score: number } | null = null;
  for (const action of cfg.world.actions) {
    if (!isActionUnlocked(run, action, cfg)) continue;
    const y = actionYield(game, action, cfg);
    const w = weights(game, cfg);
    const score = RESOURCE_IDS.reduce((s, id) => s + (y[id] ?? 0) * w[id] * deficit[id], 0);
    if (!best || score > best.score) best = { id: action.id, score };
  }
  return best ? findAction(best.id as never, cfg) : undefined;
}

function goInside(
  game: GameState,
  location: ReturnType<typeof careerVenue>,
  cfg: GameConfig,
): GameState {
  const run = game.run;
  if (!run) return game;
  if (currentLocation(run, cfg) === location)
    return run.world.inside ? game : enterBuilding(game, cfg);
  if (run.world.target === location) return game;
  return walkTo(game, location, cfg);
}

export interface StageTime {
  stage: number;
  minutes: number;
  /** In diesem Zeitraum ging eine Wahl verloren (zwei Stufen zurück). */
  afterLoss: boolean;
  /** Minuten ab Stufenbeginn, bis Geld/Einfluss/Anhänger die Anforderung erreichten. */
  satisfied: { money: number | null; influence: number | null; followers: number | null };
}

export function simulate(scenario: Scenario, cfg: GameConfig, stepSeconds: number) {
  let game = startRun(
    createNewGame(0, 12345),
    { character, stateId: scenario.stateId, profession: 'office' },
    0,
    cfg,
  );
  const times: StageTime[] = [];
  let stageStart = 0;
  let lastStage = 1;
  let elections = { won: 0, lost: 0 };
  const stepMs = stepSeconds * 1000;
  let elapsed = 0;
  let endedBy: string | null = null;
  let satisfied: StageTime['satisfied'] = { money: null, influence: null, followers: null };
  let lossInPeriod = false;

  while (elapsed < (MAX_MINUTES / cfg.balancing.gameSpeed) * 60_000) {
    if (game.phase === 'ceremony') game = finishCeremony(game);
    if (game.phase === 'victory' || game.phase === 'runEnded') {
      if (game.phase === 'runEnded') endedBy = game.pending.runEnd?.reason ?? 'ende';
      break;
    }
    const run = game.run;
    if (!run) break;

    // Karten sofort beantworten: die Antwort mit mehr Zustimmung, bei Autokraten weniger Unruhe
    while ((game.run?.events.open.length ?? 0) > 0) {
      const card = game.run?.events.open[0];
      const def = card ? findEvent(card.id, cfg) : undefined;
      if (!def) break;
      const score = (e: typeof def.yes) =>
        (e.approval ?? 0) - (e.unrest ?? 0) * 1.5 + (e.money ?? 0) * 20 + (e.loyalty ?? 0) * 0.5;
      game = resolveEvent(game, 0, score(def.yes) >= score(def.no) ? 'yes' : 'no', cfg);
    }

    if (scenario.autocratic && run.path === 'democratic' && run.stage >= 5) {
      game = turnAutocratic(game, cfg);
    }

    // Autokraten: Loyalität und Unruhe im Griff behalten
    const buyLoyaltyDef = cfg.balancing.autocracy.actions.find((a) => a.id === 'buyLoyalty');
    if (game.run && isAutocracyAvailable(game.run, cfg)) {
      const r = game.run;
      const status = careerStatus(game, cfg);
      const need =
        Math.max(status?.requirement.loyalty ?? 0, cfg.balancing.autocracy.powerLoyaltyCost) + 5;
      if (r.unrest > 65) game = autocracyAction(game, 'repression', cfg);
      else if (
        r.loyalty < need &&
        buyLoyaltyDef &&
        canAfford(r.resources, autocracyCost(r, buyLoyaltyDef, cfg))
      ) {
        game = autocracyAction(game, 'buyLoyalty', cfg);
      }
      if (r.approval < 40) game = autocracyAction(game, 'pressControl', cfg);
    }

    // Allianzen: Zustimmung und Geld stützen, wenn es günstig ist
    if (game.run) {
      const r = game.run;
      for (const g of groupsFor(r, cfg)) {
        if (groupLoyalty(r, g.id, cfg) >= 55) continue;
        const cost = investCost(r, g.id, cfg);
        if (value(cost, weights(game, cfg)) < r.resources.money * 0.05)
          game = investInGroup(game, g.id, cfg);
      }
    }

    // Fahrzeug: nächstes kaufen, wenn es weniger als 15 % des Geldes kostet
    if (game.run) {
      const r = game.run;
      const nextVehicle = VEHICLE_IDS[VEHICLE_IDS.indexOf(r.vehicle) + 1];
      if (nextVehicle) {
        const cost = vehicleCost(nextVehicle, cfg);
        if (
          (cost.money ?? 0) < r.resources.money * 0.15 &&
          (cost.influence ?? 0) < r.resources.influence * 0.15
        ) {
          game = buyVehicle(game, nextVehicle, cfg);
        }
      }
    }

    const status = careerStatus(game, cfg);
    const r = game.run;
    if (!status || !r) break;
    let wantsCareer = false;
    if (status.nextStage !== null && status.ready) {
      if (isElectionStage(r, cfg)) {
        // Kandidieren, sobald die Chance mit bezahlbarem Wahlkampf ≥ 85 % ist
        for (let c = cfg.balancing.elections.campaigns.length - 1; c >= 0; c--) {
          const total = (status.cost.money ?? 0) + campaignCost(game, c, cfg);
          if (r.resources.money >= total && electionChance(game, c, cfg) >= 85) {
            wantsCareer = true;
            game = goInside(game, status.venue, cfg);
            if (game.run && careerStatus(game, cfg)?.atVenue) {
              const result = runForElection(game, c, cfg);
              game = result.game;
              if (result.outcome?.won) elections = { ...elections, won: elections.won + 1 };
              else if (result.outcome) {
                elections = { ...elections, lost: elections.lost + 1 };
                lossInPeriod = true;
              }
            }
            break;
          }
        }
      } else {
        wantsCareer = true;
        game = goInside(game, status.venue, cfg);
        if (game.run && careerStatus(game, cfg)?.atVenue) game = promote(game, cfg);
      }
    }

    if (!wantsCareer && game.phase === 'playing') {
      const action = bestAction(game, cfg);
      if (action) {
        game = goInside(game, action.location, cfg);
        const rr = game.run;
        if (rr && rr.world.inside && currentLocation(rr, cfg) === action.location) {
          for (let i = 0; i < TAPS_PER_SECOND * stepSeconds; i++)
            game = performAction(game, action.id, cfg).game;
        }
      }
      game = investGreedily(game, cfg, 150 / cfg.balancing.gameSpeed);
    }

    if (game.run) {
      const rq = nextRequirement(game.run, cfg);
      const res = game.run.resources;
      const since = (elapsed - stageStart) / 60_000;
      if (satisfied.money === null && res.money >= rq.money)
        satisfied = { ...satisfied, money: since };
      if (satisfied.influence === null && res.influence >= rq.influence)
        satisfied = { ...satisfied, influence: since };
      if (satisfied.followers === null && res.followers >= rq.followers)
        satisfied = { ...satisfied, followers: since };
    }
    if (process.argv.includes('--trace') && game.run && elapsed % (120 * 60_000) < stepMs) {
      const rr = game.run;
      const st = careerStatus(game, cfg);
      console.log(
        `  [${(elapsed / 60_000).toFixed(0)} min] Stufe ${rr.stage} € ${rr.resources.money.toExponential(2)} E ${rr.resources.influence.toExponential(2)} A ${rr.resources.followers.toExponential(2)}` +
          ` | ready ${String(st?.ready)} Chance ${electionChance(game, 3, cfg)} Zust ${rr.approval.toFixed(0)} | Ort ${String(currentLocation(rr, cfg))} drin ${String(rr.world.inside)} Ziel ${String(rr.world.target)} | Gen ${Object.values(rr.generators).reduce((a, b) => a + b, 0)}`,
      );
    }
    if (game.phase === 'playing') game = tick(game, stepMs, cfg);
    elapsed += stepMs;
    const stage = game.run?.stage ?? lastStage;
    if (stage > lastStage && process.argv.includes('--verbose') && game.run) {
      const done = finishCeremony(game);
      const rr = done.run ?? game.run;
      const rates = tick(
        { ...done, phase: 'playing', run: { ...rr, events: { ...rr.events, nextAt: Infinity } } },
        1000,
        cfg,
      ).run;
      const req = nextRequirement(rr, cfg);
      const fmt = (n: number) => n.toExponential(1);
      if (rates) {
        console.log(
          `    → Stufe ${stage}: Rate €${fmt(rates.resources.money - rr.resources.money)}/s ` +
            `E${fmt(rates.resources.influence - rr.resources.influence)}/s ` +
            `A${fmt(rates.resources.followers - rr.resources.followers)}/s | nächste Anf. €${fmt(req.money)} ` +
            `E${fmt(req.influence)} A${fmt(req.followers)} | Zust ${rr.approval.toFixed(0)} Unr ${rr.unrest.toFixed(0)} Loy ${rr.loyalty.toFixed(0)} | Gen ${Object.values(rr.generators).reduce((a, b) => a + b, 0)} Staff ${Object.values(rr.actions).reduce((a, b) => a + b.staff, 0)} Train ${Object.values(rr.actions).reduce((a, b) => a + b.training, 0)} Proj ${Object.values(rr.projects).reduce((a, b) => a + b, 0)} Fz ${rr.vehicle}`,
        );
      }
    }
    if (stage > lastStage) {
      for (let s = lastStage + 1; s <= stage; s++) {
        times.push({
          stage: s,
          minutes: (elapsed - stageStart) / 60_000,
          satisfied,
          afterLoss: lossInPeriod,
        });
      }
      stageStart = elapsed;
      lossInPeriod = false;
      satisfied = { money: null, influence: null, followers: null };
    }
    lastStage = Math.max(lastStage, stage);
    if ((game.run?.stage ?? 0) >= MAX_STAGE && game.phase !== 'ceremony') break;
  }
  return { times, total: elapsed / 60_000, elections, endedBy, finalStage: lastStage };
}
