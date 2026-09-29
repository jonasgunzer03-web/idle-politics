// Balancing-Simulation: Ein Bot spielt jeden Staat und Pfad ohne Oberfläche durch.
// Aufruf: npm run simulate            (GAME_SPEED 1 und 0,05)
//         npm run simulate -- --quick (nur GAME_SPEED 1)
// Optionen: --verbose (Raten je Stufe), --only=Novaria (nur passende Szenarien)
// Der Lauf schlägt fehl, wenn eine Stufe unerreichbar ist oder länger als das Dreifache
// ihrer Zielzeit dauert.

import { targetFactor } from '../src/config/careers';
import { defaultConfig, withGameSpeed } from '../src/config';
import { MAX_STAGE } from '../src/engine/ids';
import { scenarios, simulate } from './sim-core';

function main() {
  const quick = process.argv.includes('--quick');
  const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
  const speedArg = process.argv.find((a) => a.startsWith('--speed='))?.slice(8);
  const speeds = speedArg ? [Number(speedArg)] : quick ? [1] : [1, 0.05];
  let failed = false;
  for (const speed of speeds) {
    const cfg = withGameSpeed(defaultConfig, speed);
    const stepSeconds = speed < 1 ? 5 : 1;
    console.log(`\n=== GAME_SPEED ${speed} ===`);
    for (const scenario of scenarios.filter((sc) => !only || sc.label.startsWith(only))) {
      const result = simulate(scenario, cfg, stepSeconds);
      const factor = targetFactor(cfg.states[scenario.stateId].tempo, scenario.autocratic);
      const rows = result.times.map((t) => {
        const target = ((cfg.targetMinutes[t.stage - 2] ?? 7) * factor) / speed;
        const ratio = t.minutes / target;
        // Nach einer verlorenen Wahl (zwei Stufen zurück) zählt die Überschreitung nicht als Fehler
        const flag = t.afterLoss
          ? ' (nach Wahlniederlage)'
          : ratio > 3
            ? ' ✗ zu lang'
            : ratio > 2
              ? ' ! langsam'
              : '';
        if (ratio > 3 && !t.afterLoss) failed = true;
        return `  Stufe ${String(t.stage).padStart(2)}: ${t.minutes.toFixed(1).padStart(7)} min (Ziel ${target.toFixed(1)})${flag}`;
      });
      const reached = result.finalStage >= MAX_STAGE;
      if (!reached) failed = true;
      console.log(
        `\n${scenario.label}: ${reached ? 'Spitze erreicht' : `✗ nur Stufe ${result.finalStage}`} nach ${result.total.toFixed(1)} min` +
          ` · Wahlen ${result.elections.won} gewonnen / ${result.elections.lost} verloren` +
          (result.endedBy ? ` · Ende: ${result.endedBy}` : ''),
      );
      console.log(rows.join('\n'));
    }
  }
  if (failed) {
    console.error('\nSimulation: Mindestens eine Stufe ist unerreichbar oder dauert zu lang.');
    process.exit(1);
  }
  console.log('\nSimulation: alle Staaten und Pfade im Zielkorridor.');
}

main();
