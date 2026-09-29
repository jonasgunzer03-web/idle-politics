import { useState } from 'react';
import { Plane } from 'lucide-react';
import { Figure } from '../../art/figure/Figure';
import { outfitFor } from '../../art/figure/outfit';
import { Flag } from '../../art/flag/Flag';
import { defaultConfig } from '../../config';
import { ACCESSORY_IDS, STATE_IDS, type StateId } from '../../engine/ids';
import { canEmigrate, emigrationCost, unlockedAccessories } from '../../engine/game';
import { characterSchema, type Character } from '../../engine/schema';
import { de, fill } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import { BottomSheet } from '../components/BottomSheet';
import { Button } from '../components/Button';
import { CharacterEditor } from '../components/CharacterEditor';
import { formatResource } from '../gameText';
import styles from './Sheets.module.css';

const cfg = defaultConfig;

/** Charakter im Profil ändern, inklusive Accessoires aus Erfolgen. */
export function EditorSheet() {
  const game = gameStore.getState().game;
  const [draft, setDraft] = useState<Character | null>(game.character);
  const unlocked = useGame((s) => unlockedAccessories(s.game, cfg).join(','));
  const run = useGame((s) => s.game.run);
  const store = gameStore.getState();
  if (!draft) return null;
  const valid = characterSchema.safeParse(draft).success;
  const accessories = unlocked ? unlocked.split(',') : [];
  const outfit = run ? outfitFor(run) : 'officeShirt';
  return (
    <BottomSheet
      title={de.profile.editCharacter}
      onClose={() => {
        store.closeSheet();
      }}
      testId="editor-sheet"
    >
      <CharacterEditor draft={draft} onChange={setDraft} outfit={outfit} full />
      <h3 className={styles.subTitle}>{de.profile.accessories}</h3>
      {accessories.length === 0 ? (
        <p className={styles.muted}>{de.profile.accessoriesLocked}</p>
      ) : (
        <div className={styles.options}>
          {ACCESSORY_IDS.filter((a) => accessories.includes(a)).map((a) => {
            const on = draft.accessories.includes(a);
            return (
              <button
                key={a}
                type="button"
                role="switch"
                aria-checked={on}
                className={styles.option}
                onClick={() => {
                  setDraft({
                    ...draft,
                    accessories: on
                      ? draft.accessories.filter((x) => x !== a)
                      : [...draft.accessories, a],
                  });
                }}
              >
                <span className={styles.optionTitle}>{de.accessories[a]}</span>
              </button>
            );
          })}
        </div>
      )}
      <Button
        block
        disabled={!valid}
        onClick={() => {
          const parsed = characterSchema.safeParse({
            ...draft,
            name: draft.name.trim(),
            party: { ...draft.party, name: draft.party.name.trim() },
          });
          if (!parsed.success) return;
          store.updateCharacter(parsed.data);
          store.closeSheet();
        }}
        data-testid="editor-save"
      >
        {de.profile.save}
      </Button>
    </BottomSheet>
  );
}

/** Staatsbürgerschaft kaufen. */
export function EmigrationSheet() {
  const game = useGame((s) => s.game);
  const [target, setTarget] = useState<StateId | null>(null);
  const store = gameStore.getState();
  const run = game.run;
  if (!run) return null;
  const cost = emigrationCost(game, cfg);
  const minStage = cfg.balancing.emigration.minStage;
  return (
    <BottomSheet
      title={de.emigration.title}
      onClose={() => {
        store.closeSheet();
      }}
      testId="emigration-sheet"
    >
      <p className={styles.muted}>{de.emigration.text}</p>
      <p className="num">
        {fill(de.emigration.cost, {
          amount: formatResource('money', cost, run.stateId, { rounding: 'ceil' }),
        })}
      </p>
      {run.stage < minStage && (
        <p className={styles.note}>{fill(de.emigration.minStage, { stage: minStage })}</p>
      )}
      <h3 className={styles.subTitle}>{de.emigration.choose}</h3>
      <div className={styles.options}>
        {STATE_IDS.filter((id) => id !== run.stateId).map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={target === id}
            disabled={!canEmigrate(game, id, cfg)}
            className={styles.option}
            onClick={() => {
              setTarget(id);
            }}
            data-testid={`emigrate-${id}`}
          >
            <Flag flag={cfg.states[id].flag} width={36} />
            <span className={styles.optionTitle}>{de.states[id].name}</span>
            <span className={styles.muted}>{de.states[id].government}</span>
          </button>
        ))}
      </div>
      {target && (
        <>
          <p>{fill(de.emigration.confirm, { country: de.states[target].name })}</p>
          <Button
            block
            onClick={() => {
              store.startEmigration(target);
            }}
            data-testid="emigrate-confirm"
          >
            <Plane size={18} aria-hidden="true" />
            {de.emigration.title}
          </Button>
        </>
      )}
      {game.character && (
        <div className={styles.miniFigure} aria-hidden="true">
          <Figure character={game.character} outfit={outfitFor(run)} animated={false} />
        </div>
      )}
    </BottomSheet>
  );
}
