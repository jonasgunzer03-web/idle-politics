import { useShallow } from 'zustand/react/shallow';
import { Scene } from '../../art/scene/Scene';
import { outfitFor } from '../../art/figure/outfit';
import { Flag } from '../../art/flag/Flag';
import { defaultConfig } from '../../config';
import { MAX_STAGE, TAP_ACTION_IDS } from '../../engine/ids';
import { de, fill } from '../../i18n/de';
import { useGame } from '../../store';
import { GeneratorRow } from '../components/GeneratorRow';
import { TapButton } from '../components/TapButton';
import { careerTitle } from '../gameText';
import { suggestedGenerators } from '../generatorView';
import styles from './CareerTab.module.css';

const cfg = defaultConfig;
const SUGGESTION_COUNT = 3;

function SceneSection() {
  const scene = useGame(
    useShallow((s) => {
      const run = s.game.run;
      return run
        ? {
            stateId: run.stateId,
            stage: run.stage,
            title: careerTitle(run),
            outfit: outfitFor(run),
            workplace: run.profession === 'skilled' ? ('factory' as const) : ('office' as const),
          }
        : null;
    }),
  );
  const character = useGame((s) => s.game.character);
  if (!scene || !character) return null;
  return (
    <section className={styles.sceneWrap}>
      <Scene
        group="workplace"
        workplace={scene.workplace}
        character={character}
        outfit={scene.outfit}
        label={fill(de.scene.label, { name: character.name, title: scene.title })}
      />
      <div className={styles.titleCard}>
        <Flag flag={cfg.states[scene.stateId].flag} width={30} />
        <div>
          <p className={styles.office} data-testid="career-title">
            {scene.title}
          </p>
          <p className={styles.stage}>
            {fill(de.career.stage, { stage: scene.stage, max: MAX_STAGE })}
          </p>
        </div>
      </div>
    </section>
  );
}

function Suggestions() {
  const ids = useGame(useShallow((s) => suggestedGenerators(s.game, SUGGESTION_COUNT, cfg)));
  if (ids.length === 0) return null;
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{de.career.upgrades}</h2>
      <div className={styles.list}>
        {ids.map((id) => (
          <GeneratorRow key={id} id={id} mode={1} compact />
        ))}
      </div>
    </section>
  );
}

export function CareerTab() {
  return (
    <div className={styles.page}>
      <SceneSection />
      <section className={styles.section}>
        <h2 className="visually-hidden">{de.career.actions}</h2>
        <div className={styles.taps}>
          {TAP_ACTION_IDS.map((action) => (
            <TapButton key={action} action={action} />
          ))}
        </div>
      </section>
      <Suggestions />
    </div>
  );
}
