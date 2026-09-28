import type { GameConfig } from '../config';
import { campaignCost, careerStatus, electionChance } from '../engine/career';
import { MAX_STAGE } from '../engine/ids';
import { isLoyaltyUnlocked } from '../engine/rules';
import type { GameState } from '../engine/schema';
import { de, fill } from '../i18n/de';
import { careerTitle, formatResource, locationName } from './gameText';

// Aufbereitete Anzeige der Karriere (nächste Stufe, Fortschritt, Knopf). Nur Texte, Zahlen
// und Wahrheitswerte, damit Komponenten per flachem Vergleich nur bei Änderungen zeichnen.

export interface ProgressBar {
  key: 'money' | 'influence' | 'followers' | 'loyalty';
  label: string;
  /** 0 bis 1. */
  ratio: number;
  text: string;
}

export interface CareerView {
  top: boolean;
  nextTitle: string;
  mode: 'election' | 'appointment' | 'power';
  venueName: string;
  atVenue: boolean;
  ready: boolean;
  bars: ProgressBar[];
  /** Siegchance je Wahlkampfbudget (nur bei Wahlen). */
  chances: number[];
  campaignCosts: string[];
  /** Alle Kosten inkl. Wahlkampf bezahlbar? (je Budget) */
  campaignAffordable: boolean[];
  fixBonus: boolean;
}

export function careerView(game: GameState, cfg: GameConfig): CareerView | null {
  const run = game.run;
  const status = careerStatus(game, cfg);
  if (!run || !status) return null;
  const office = run.profession === 'office';
  const top = run.stage >= MAX_STAGE;
  const req = status.requirement;
  const bars: ProgressBar[] = [];
  const add = (key: ProgressBar['key'], have: number, need: number, label: string, money = false) => {
    if (need <= 0) return;
    bars.push({
      key,
      label,
      ratio: Math.min(1, have / need),
      text: `${formatResource(key === 'loyalty' ? 'influence' : key, have, money ? run.stateId : null)} / ${formatResource(
        key === 'loyalty' ? 'influence' : key,
        need,
        money ? run.stateId : null,
        { rounding: 'ceil' },
      )}`,
    });
  };
  add('money', run.resources.money, status.cost.money ?? 0, de.resources.money, true);
  add('influence', run.resources.influence, status.cost.influence ?? 0, de.resources.influence);
  if (status.election) add('followers', run.resources.followers, req.followers, de.resources.followers);
  if (status.autocratic && isLoyaltyUnlocked(run, cfg)) {
    const need = Math.max(req.loyalty, cfg.balancing.autocracy.powerLoyaltyCost);
    bars.push({
      key: 'loyalty',
      label: de.careerPanel.loyaltyNeed,
      ratio: Math.min(1, run.loyalty / need),
      text: `${Math.floor(run.loyalty)} % / ${need} %`,
    });
  }
  const campaigns = cfg.balancing.elections.campaigns;
  const chances = status.election ? campaigns.map((_, i) => electionChance(game, i, cfg)) : [];
  const costs = status.election ? campaigns.map((_, i) => campaignCost(game, i, cfg)) : [];
  return {
    top,
    nextTitle: top ? '' : careerTitle({ ...run, stage: run.stage + 1 }),
    mode: status.autocratic ? 'power' : status.election ? 'election' : 'appointment',
    venueName: locationName(status.venue, office),
    atVenue: status.atVenue,
    ready: status.ready,
    bars,
    chances,
    campaignCosts: costs.map((c) => (c > 0 ? fill(de.careerPanel.campaignCost, { amount: formatResource('money', c, run.stateId, { rounding: 'ceil' }) }) : '')),
    campaignAffordable: costs.map((c) => run.resources.money >= (status.cost.money ?? 0) + c && run.resources.influence >= (status.cost.influence ?? 0)),
    fixBonus: run.fixElectionBonus,
  };
}
