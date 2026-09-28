// Kalibrierung: stellt die Aufstiegsanforderungen (careers.ts) so ein, dass der Bot die
// Zielzeiten trifft. Je Stufe wird ein gemeinsamer Faktor für Geld, Einfluss und Anhänger
// angepasst (die Verhältnisse zwischen den Währungen bleiben erhalten). Jede Stufe bleibt
// mindestens MIN_GROWTH-mal so teuer wie die vorige. Gibt die neue Tabelle zum Einfügen aus.
// Aufruf: npx tsx scripts/calibrate.ts [Runden]

import { targetFactor, type StageRequirement } from '../src/config/careers';
import { defaultConfig, type GameConfig } from '../src/config';
import { scenarios, simulate } from './sim-core';

const rounds = Number(process.argv[2] ?? 8);
const MIN_GROWTH = 1.6;
const calibrationScenarios = scenarios.filter((s) =>
  ['Novaria demokratisch', 'Rhenanien demokratisch', 'Borealis', 'Zentralia'].includes(s.label),
);

function round2(n: number): number {
  if (n < 100) return Math.max(1, Math.round(n));
  const magnitude = Math.pow(10, Math.floor(Math.log10(n)) - 1);
  return Math.round(n / magnitude) * magnitude;
}

let reqs: StageRequirement[] = defaultConfig.stageRequirements.map((r) => ({ ...r }));

for (let round = 1; round <= rounds; round++) {
  const cfg: GameConfig = { ...defaultConfig, stageRequirements: reqs };
  const logRatio = reqs.map(() => ({ sum: 0, n: 0 }));
  let total = 0;
  for (const scenario of calibrationScenarios) {
    const result = simulate(scenario, cfg, 1);
    total += result.total;
    const factor = targetFactor(cfg.states[scenario.stateId].tempo, scenario.autocratic);
    for (const t of result.times) {
      const acc = logRatio[t.stage - 2];
      const target = (cfg.targetMinutes[t.stage - 2] ?? 7) * factor;
      if (!acc) continue;
      acc.sum += Math.log(Math.max(0.05, t.minutes) / target);
      acc.n += 1;
    }
  }
  let worst = 0;
  let previous: StageRequirement | null = null;
  reqs = reqs.map((r, i) => {
    const acc = logRatio[i];
    const mean = acc && acc.n > 0 ? acc.sum / acc.n : 0;
    worst = Math.max(worst, Math.abs(mean));
    const f = Math.min(2.5, Math.max(0.4, Math.exp(-mean * 0.6)));
    let next: StageRequirement = {
      money: r.money * f,
      influence: r.influence * f,
      followers: r.followers * f,
      loyalty: r.loyalty,
    };
    if (previous) {
      const minF = (previous.money * MIN_GROWTH) / next.money;
      if (minF > 1) {
        next = {
          ...next,
          money: next.money * minF,
          influence: next.influence * minF,
          followers: next.followers * minF,
        };
      }
    }
    previous = next;
    return next;
  });
  reqs = reqs.map((r) => ({
    money: round2(r.money),
    influence: round2(r.influence),
    followers: r.followers > 0 ? round2(r.followers) : 0,
    loyalty: r.loyalty,
  }));
  console.log(
    `Runde ${round}: größte mittlere Abweichung Faktor ${Math.exp(worst).toFixed(2)}, ` +
      `Ø Gesamtzeit ${(total / calibrationScenarios.length).toFixed(0)} min`,
  );
}

console.log('\nNeue Tabelle für src/config/careers.ts:\n');
reqs.forEach((r, i) => {
  const f = (n: number) => n.toLocaleString('en-US').replace(/,/g, '_');
  console.log(
    `  { money: ${f(r.money)}, influence: ${f(r.influence)}, followers: ${f(r.followers)}, loyalty: ${r.loyalty} }, // → ${i + 2}`,
  );
});
