import { useState } from 'react';
import { Bug } from 'lucide-react';
import { MAX_STAGE, STATE_IDS } from '../engine/ids';
import { de } from '../i18n/de';
import { gameStore, useGame } from '../store';
import { BottomSheet } from '../ui/components/BottomSheet';
import { Button } from '../ui/components/Button';
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
                    actions.debugBoostBuildings();
                  }}
                  data-testid="debug-boost"
                >
                  {de.debug.boostBuildings}
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
                    // Schließen, damit ein ausgelöster Hinweis nie über dem Menü liegt
                    setOpen(false);
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
                    setOpen(false);
                  }}
                  aria-label={`${de.debug.setStage} ${stage + 1}`}
                >
                  +
                </Button>
              </div>
              <p className={styles.label}>{de.debug.meters}</p>
              <div className={styles.grid3}>
                {[
                  ['Zust. 20', { approval: 20 }],
                  ['Zust. 80', { approval: 80 }],
                  ['Unruhe 0', { unrest: 0 }],
                  ['Unruhe 75', { unrest: 75 }],
                  ['Unruhe 95', { unrest: 95 }],
                  ['Loyal. 10', { loyalty: 10 }],
                  ['Loyal. 90', { loyalty: 90 }],
                ].map(([label, values]) => (
                  <Button
                    key={label as string}
                    variant="secondary"
                    onClick={() => {
                      actions.debugSetMeters(
                        values as { approval?: number; unrest?: number; loyalty?: number },
                      );
                    }}
                  >
                    {label as string}
                  </Button>
                ))}
              </div>
              <div className={styles.grid}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    actions.debugTriggerEvent();
                    setOpen(false);
                  }}
                  data-testid="debug-event"
                >
                  {de.debug.triggerEvent}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    actions.debugOverthrow();
                    setOpen(false);
                  }}
                  data-testid="debug-overthrow"
                >
                  {de.debug.triggerOverthrow}
                </Button>
              </div>
              <p className={styles.label}>{de.debug.switchState}</p>
              <div className={styles.grid}>
                {STATE_IDS.map((id) => (
                  <Button
                    key={id}
                    variant="secondary"
                    onClick={() => {
                      actions.debugSwitchState(id);
                    }}
                  >
                    {de.states[id].name}
                  </Button>
                ))}
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
