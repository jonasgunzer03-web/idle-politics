import { defaultConfig } from '../config';
import { formatNumber, type FormatOptions } from '../engine/format';
import type { ResourceId, StateId } from '../engine/ids';
import type { RunState } from '../engine/schema';
import { de } from '../i18n/de';

/** Amtstitel der aktuellen Stufe, auf dem autokratischen Pfad ggf. mit eigenem Titel. */
export function careerTitle(run: Pick<RunState, 'stateId' | 'stage' | 'path'>): string {
  const ladder = de.careers[run.stateId];
  const autocratic: Partial<Record<number, string>> = ladder.autocratic;
  const special = run.path === 'autocratic' ? autocratic[run.stage] : undefined;
  return special ?? ladder.titles[run.stage - 1] ?? ladder.titles[0] ?? '';
}

/** Betrag einer Ressource, bei Geld mit Währungszeichen des Staates. */
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
