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
  buildProject,
  buildingUpgradeCost,
  buyGenerator,
  buyMachine,
  buyVehicle,
  canAfford,
  generatorCost,
  hasRoom,
  hireCost,
  hireStaff,
  machineCost,
  performAction,
  projectCost,
  upgradeBuilding,
  vehicleCost,
} from '../src/engine/economy';
import {
  advisorHireCost,
  counterBlock,
  enactBlock,
  enactPolicy,
  hireAdvisor,
  rivalCounter,
  seats,
} from '../src/engine/party';
import { findPolicy } from '../src/engine/modifiers';
import {
  cycleInputs,
  cycleOutputs,
  findBuilding,
  isBuildingOpen,
  isResourceKey,
} from '../src/engine/production';
import { findEvent, resolveEvent } from '../src/engine/events';
import { createNewGame, startRun } from '../src/engine/game';
import {
  GOOD_IDS,
  MAX_STAGE,
  RESOURCE_IDS,
  VEHICLE_IDS,
  type GoodId,
  type LocationId,
  type ResourceId,
  type ResourceMap,
  type StateId,
} from '../src/engine/ids';
import { investCost, investInGroup } from '../src/engine/alliances';
import { groupsFor, groupLoyalty, nextRequirement } from '../src/engine/rules';
import type { GameState } from '../src/engine/schema';
import { tick } from '../src/engine/tick';
import { isActionUnlocked, isGeneratorUnlocked } from '../src/engine/unlocks';
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
  // Was schon reichlich da ist (doppelter Bedarf), zählt kaum noch
  const need = (have: number, required: number) =>
    required <= 0 ? 0.05 : Math.min(1, Math.max(0.05, 2 - have / required));
  return {
    money: 1,
    influence:
      (req.money / Math.max(1, req.influence)) * need(run.resources.influence, req.influence),
    followers:
      req.followers > 0
        ? (req.money / req.followers) * need(run.resources.followers, req.followers)
        : 0.02,
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

type Option = { cost: Partial<ResourceMap>; apply: (g: GameState) => GameState };

/** Die Figur virtuell in ein Gebäude stellen (nur zum Bewerten von Käufen dort). */
function placedAt(game: GameState, location: LocationId, cfg: GameConfig): GameState {
  const run = game.run;
  const loc = cfg.world.locations.find((l) => l.id === location);
  if (!run || !loc) return game;
  return { ...game, run: { ...run, world: { posX: loc.x, target: null, inside: true } } };
}

/** Kaufoptionen in einem Gebäude (Mitarbeiter, Ausbau + Mitarbeiter, Maschinen). */
function localOptions(game: GameState, location: LocationId, cfg: GameConfig): Option[] {
  const run = game.run;
  if (!run || !isBuildingOpen(run, location, cfg)) return [];
  const options: Option[] = [];
  for (const action of cfg.world.actions) {
    if (action.location !== location || !isActionUnlocked(run, action, cfg)) continue;
    const cost = hireCost(run, action, cfg);
    if (hasRoom(run, location, cfg)) {
      options.push({ cost, apply: (g) => hireStaff(g, action.id, cfg) });
    } else {
      // Gebäude voll: Ausbau zusammen mit dem nächsten Mitarbeiter bewerten
      const up = buildingUpgradeCost(run, location, cfg);
      if (up) {
        const total: Partial<ResourceMap> = {};
        for (const id of RESOURCE_IDS) total[id] = (up[id] ?? 0) + (cost[id] ?? 0);
        options.push({
          cost: total,
          apply: (g) => hireStaff(upgradeBuilding(g, location, cfg), action.id, cfg),
        });
      }
    }
  }
  const building = findBuilding(location, cfg);
  for (const id of building?.machines ?? []) {
    const cost = machineCost(run, id, cfg);
    if (cost) options.push({ cost, apply: (g) => buyMachine(g, id, cfg) });
  }
  return options;
}

function globalOptions(game: GameState, cfg: GameConfig): Option[] {
  const run = game.run;
  if (!run) return [];
  const options: Option[] = [];
  for (const def of cfg.balancing.generators) {
    if (!isGeneratorUnlocked(run, def, cfg)) continue;
    options.push({
      cost: generatorCost(def, run.generators[def.id] ?? 0, 1, cfg),
      apply: (g) => buyGenerator(g, def.id, 1, cfg).game,
    });
  }
  for (const p of cfg.projects) {
    options.push({ cost: projectCost(run, p.id, cfg), apply: (g) => buildProject(g, p.id, cfg) });
  }
  return options;
}

function bestOption(
  game: GameState,
  options: Option[],
  cfg: GameConfig,
  payback: number,
): { score: number; next: GameState } | null {
  const run = game.run;
  if (!run) return null;
  const w = weights(game, cfg);
  let best: { score: number; next: GameState } | null = null;
  for (const option of options) {
    if (!canAfford(run.resources, option.cost)) continue;
    const next = option.apply(game);
    if (next === game) continue;
    const gain = deltaRate(game, next, w, cfg);
    if (gain <= 0) continue;
    const seconds = value(option.cost, w) / gain;
    if (seconds > payback) continue;
    if (!best || seconds < best.score) best = { score: seconds, next };
  }
  return best;
}

/** Kauft Investitionen mit kurzer Amortisationszeit (hier im Gebäude und überall gültige). */
function investGreedily(game: GameState, cfg: GameConfig, payback: number): GameState {
  let current = game;
  for (let guard = 0; guard < 40; guard++) {
    const run = current.run;
    if (!run) return current;
    // Nicht investieren, wenn der Aufstieg sofort möglich ist
    if (careerStatus(current, cfg)?.ready) return current;
    const here = run.world.inside ? currentLocation(run, cfg) : null;
    const options = [
      ...globalOptions(current, cfg),
      ...(here ? localOptions(current, here, cfg) : []),
    ];
    const best = bestOption(current, options, cfg, payback);
    if (!best) return current;
    current = best.next;
  }
  return current;
}

/** In welchem Gebäude gäbe es gerade den besten Kauf? */
function bestPurchaseLocation(
  game: GameState,
  cfg: GameConfig,
  payback: number,
): LocationId | null {
  let best: { score: number; location: LocationId } | null = null;
  for (const b of cfg.industry.buildings) {
    const placed = placedAt(game, b.location, cfg);
    const option = bestOption(placed, localOptions(placed, b.location, cfg), cfg, payback);
    if (option && (!best || option.score < best.score)) {
      best = { score: option.score, location: b.location };
    }
  }
  return best?.location ?? null;
}

/** Wert einer Ware: was die beste Verbraucher-Linie daraus macht. */
function goodWeights(game: GameState, w: ResourceMap, cfg: GameConfig): Record<GoodId, number> {
  const result = { wares: 0, contacts: 0, flyers: 0, files: 0 };
  const run = game.run;
  if (!run) return result;
  for (const action of cfg.world.actions) {
    if (!isActionUnlocked(run, action, cfg)) continue;
    const inputs = cycleInputs(run, action, cfg);
    const outputs = cycleOutputs(game, action, cfg);
    const out = RESOURCE_IDS.reduce((sum, id) => sum + (outputs[id] ?? 0) * w[id], 0);
    for (const good of GOOD_IDS) {
      const need = inputs[good];
      if (need) result[good] = Math.max(result[good], out / need);
    }
  }
  return result;
}

/** Welche Linie bringt beim Tippen am meisten von der knappsten Währung? */
function bestTap(game: GameState, cfg: GameConfig, onlyHere: boolean) {
  const run = game.run;
  if (!run) return undefined;
  const req = nextRequirement(run, cfg);
  const deficit: ResourceMap = {
    money: req.money / Math.max(1, run.resources.money),
    influence: req.influence / Math.max(1, run.resources.influence),
    followers: req.followers > 0 ? req.followers / Math.max(1, run.resources.followers) : 0,
    diplomacy: 0,
  };
  const w = weights(game, cfg);
  const gw = goodWeights(game, w, cfg);
  const here = run.world.inside ? currentLocation(run, cfg) : null;
  let best: { action: (typeof cfg.world.actions)[number]; score: number } | null = null;
  for (const action of cfg.world.actions) {
    if (!isActionUnlocked(run, action, cfg)) continue;
    if (onlyHere && action.location !== here) continue;
    const inputs = cycleInputs(run, action, cfg);
    const available = (Object.entries(inputs) as [GoodId | ResourceId, number][]).every(
      ([k, need]) => (isResourceKey(k) ? run.resources[k] : run.goods[k]) >= need,
    );
    if (!available) continue;
    const outputs = cycleOutputs(game, action, cfg);
    let score = 0;
    for (const [k, amount] of Object.entries(outputs) as [GoodId | ResourceId, number][]) {
      score += isResourceKey(k) ? amount * w[k] * deficit[k] : amount * gw[k];
    }
    for (const [k, need] of Object.entries(inputs) as [GoodId | ResourceId, number][]) {
      score -= isResourceKey(k) ? need * w[k] : need * gw[k] * 0.5;
    }
    if (!best || score > best.score) best = { action, score };
  }
  return best?.action;
}

/** Im Parteibüro: Berater holen, nützliche Beschlüsse fassen, den Rivalen bremsen. */
function doPolitics(game: GameState, cfg: GameConfig): GameState {
  let current = game;
  const run = current.run;
  if (!run) return current;
  const useful = ['financier', 'strategist', 'mediaSavvy', 'organizer', 'campaigner'];
  const cost = advisorHireCost(run, cfg);
  if (
    run.advisors.length < seats(run, cfg) &&
    (cost.influence ?? 0) < run.resources.influence * 0.25
  ) {
    const index = run.advisorPool.candidates.findIndex((c) => useful.includes(c.skill));
    if (index >= 0) current = hireAdvisor(current, index, cfg);
  }
  const w = weights(current, cfg);
  for (const id of current.run?.agenda.items ?? []) {
    const r = current.run;
    const def = findPolicy(id, cfg);
    if (!r || !def || enactBlock(r, id, cfg) !== null) continue;
    // Keine Gesetze, die die Zustimmung drücken oder die Unruhe heben
    if ((def.effects.approvalBase ?? 0) < 0 || (def.effects.unrestTarget ?? 0) > 0) continue;
    const next = enactPolicy(current, id, cfg);
    const gain = deltaRate(current, next, w, cfg);
    const helpsPolitics =
      (def.effects.approvalBase ?? 0) > 0 || (def.effects.unrestTarget ?? 0) < 0;
    if (gain > 0 || helpsPolitics) current = next;
  }
  const r = current.run;
  if (r && r.rival.strength > 55 && counterBlock(r, 'counterCampaign', cfg) === null) {
    current = rivalCounter(current, 'counterCampaign', cfg).game;
  }
  return current;
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
  let lastPlan = -Infinity;
  let lastPolitics = 0;
  let target: LocationId | null = null;

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
      const payback = 150 / cfg.balancing.gameSpeed;
      // Alle 30 Sekunden neu entscheiden, wo man hingeht: zum besten Kauf, sonst zum besten Tippen
      if (elapsed - lastPlan >= 30_000 || !game.run?.world.inside) {
        lastPlan = elapsed;
        const politicsDue = elapsed - lastPolitics >= 90_000;
        const shop = bestPurchaseLocation(game, cfg, payback);
        const tapAction = bestTap(game, cfg, false);
        target = politicsDue ? 'partyOffice' : (shop ?? tapAction?.location ?? target);
        if (politicsDue) lastPolitics = elapsed;
      }
      if (target) game = goInside(game, target, cfg);
      const rr = game.run;
      if (rr?.world.inside && currentLocation(rr, cfg) === 'partyOffice')
        game = doPolitics(game, cfg);
      const tap = bestTap(game, cfg, true);
      if (tap && game.run?.world.inside) {
        for (let i = 0; i < TAPS_PER_SECOND * stepSeconds; i++)
          game = performAction(game, tap.id, cfg).game;
      }
      game = investGreedily(game, cfg, payback);
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
    if (
      process.argv.includes('--trace') &&
      game.run &&
      elapsed % (Number(process.env.TRACE_MIN ?? 120) * 60_000) < stepMs
    ) {
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
            `E${fmt(req.influence)} A${fmt(req.followers)} | Zust ${rr.approval.toFixed(0)} Unr ${rr.unrest.toFixed(0)} Loy ${rr.loyalty.toFixed(0)} | Gen ${Object.values(rr.generators).reduce((a, b) => a + b, 0)} Staff ${Object.values(rr.actions).reduce((a, b) => a + b.staff, 0)} Lv ${Object.values(rr.buildings).reduce((a, b) => a + b.level, 0)} Laws ${Object.keys(rr.laws).length} Adv ${rr.advisors.length} Rival ${rr.rival.strength.toFixed(0)} Proj ${Object.values(rr.projects).reduce((a, b) => a + b, 0)} Fz ${rr.vehicle}`,
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
