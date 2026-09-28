import { defaultConfig } from '../config';
import { formatNumber, type FormatOptions } from '../engine/format';
import {
  RESOURCE_IDS,
  type ActionId,
  type LocationId,
  type ResourceId,
  type ResourceMap,
  type StateId,
} from '../engine/ids';
import type { RunState } from '../engine/schema';
import { de } from '../i18n/de';

/** Amtstitel einer Stufe, auf dem autokratischen Pfad ggf. mit eigenem Titel. */
export function careerTitle(run: Pick<RunState, 'stateId' | 'stage' | 'path'>): string {
  const ladder = de.careers[run.stateId];
  const autocratic: Partial<Record<number, string>> = ladder.autocratic;
  const special = run.path === 'autocratic' ? autocratic[run.stage] : undefined;
  return special ?? ladder.titles[run.stage - 1] ?? ladder.titles[0] ?? '';
}

/** Betrag einer Währung, bei Geld mit Währungszeichen des Staates. */
export function formatResource(
  resource: ResourceId,
  amount: number,
  stateId: StateId | null,
  options?: FormatOptions,
): string {
  const text = formatNumber(amount, options);
  if (resource === 'money' && stateId) return `${text} ${defaultConfig.states[stateId].currency}`;
  return text;
}

/** Beträge wie „120 € · 5 Einfluss“ (aufgerundet: angezeigte Preise sind nie zu niedrig). */
export function formatCost(map: Partial<ResourceMap>, stateId: StateId | null): string {
  return RESOURCE_IDS.filter((id) => (map[id] ?? 0) > 0)
    .map((id) => {
      const amount = formatResource(id, map[id] ?? 0, stateId, { rounding: 'ceil' });
      return id === 'money' ? amount : `${amount} ${de.resources[id]}`;
    })
    .join(' · ');
}

/** Erträge wie „+1,2 € · +0,4 Einfluss“. */
export function formatGain(
  map: Partial<ResourceMap>,
  stateId: StateId | null,
  suffix = '',
): string {
  return RESOURCE_IDS.filter((id) => (map[id] ?? 0) > 0)
    .map((id) => {
      const amount = formatResource(id, map[id] ?? 0, stateId, {
        signed: true,
        smallDecimals: 1,
        rounding: 'round',
      });
      return (id === 'money' ? amount : `${amount} ${de.resources[id]}`) + suffix;
    })
    .join(' · ');
}

/** Name eines Ortes; das Werk heißt für Büroangestellte „Büro“. */
export function locationName(id: LocationId, office: boolean): string {
  const t = de.locations[id];
  return office ? t.office : t.name;
}

export function actionName(id: ActionId, office: boolean): string {
  const t = de.actions[id];
  return office ? t.office : t.name;
}
