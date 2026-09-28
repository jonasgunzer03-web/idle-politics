import { useState } from 'react';
import { Bug } from 'lucide-react';
import { MAX_STAGE } from '../engine/ids';
import { randomSeed } from '../engine/rng';
import { de } from '../i18n/de';
import { gameStore, useGame } from '../store';
import { BottomSheet } from '../ui/components/BottomSheet';
import { Button } from '../ui/components/Button';
import { randomCharacter } from '../ui/characterDefaults';
import styles from './DebugMenu.module.css';

const HOUR_MS = 3_600_000;

/** Debug-Menü: nur im Entwicklungsmodus oder mit ?debug=1 in der Adresse. */
export function DebugMenu() {
  const [open, setOpen] = useState(false);
  const hasRun = useGame((s) => s.game.run !== null);
  const stage = useGame((s) => s.game.run?.stage ?? 1);
  const actions = gameStore.getState();

  return (
    <>
      <button
        type="button"
        className={styles.fab}
        onClick={() => {
          setOpen(true);
        }}
        aria-label={de.debug.open}
        data-testid="debug-open"
      >
        <Bug size={20} aria-hidden="true" />
      </button>
      {open && (
        <BottomSheet
          title={de.debug.title}
          onClose={() => {
            setOpen(false);
          }}
          testId="debug-menu"
        >
          {!hasRun && (
            <>
              <p className={styles.note}>{de.debug.noRun}</p>
              <Button
                block
                onClick={() => {
                  actions.beginRun(
                    {
                      character: randomCharacter(randomSeed()),
                      stateId: 'rhenania',
                      profession: 'office',
                    },
                    Date.now(),
                  );
                  setOpen(false);
                }}
              >
                {de.debug.quickStart}
              </Button>
            </>
          )}
          {hasRun && (
            <>
              <div className={styles.grid}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    actions.debugAddResources(1_000);
                  }}
                >
                  {de.debug.addResources}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    actions.debugAddResources(1_000_000);
                  }}
                >
                  {de.debug.addResourcesBig}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    actions.debugTimeJump(HOUR_MS, Date.now());
                    setOpen(false);
                  }}
                >
                  {de.debug.jump1h}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    actions.debugTimeJump(8 * HOUR_MS, Date.now());
                    setOpen(false);
                  }}
                >
                  {de.debug.jump8h}
                </Button>
              </div>
              <div className={styles.stageRow}>
                <span>
                  {de.debug.stage} <strong className="num">{stage}</strong>
                </span>
                <Button
                  variant="secondary"
                  disabled={stage <= 1}
                  onClick={() => {
                    actions.debugSetStage(stage - 1);
                  }}
                  aria-label={`${de.debug.setStage} ${stage - 1}`}
                >
                  −
                </Button>
                <Button
                  variant="secondary"
                  disabled={stage >= MAX_STAGE}
                  onClick={() => {
                    actions.debugSetStage(stage + 1);
                  }}
                  aria-label={`${de.debug.setStage} ${stage + 1}`}
                >
                  +
                </Button>
              </div>
            </>
          )}
          <Button
            variant="danger"
            block
            onClick={() => {
              if (window.confirm(de.debug.resetConfirm)) {
                actions.resetGame(Date.now());
                setOpen(false);
              }
            }}
          >
            {de.debug.reset}
          </Button>
        </BottomSheet>
      )}
    </>
  );
}
