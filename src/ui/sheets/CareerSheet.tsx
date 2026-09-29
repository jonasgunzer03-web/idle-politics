import { useState } from 'react';
import { ShieldHalf, TriangleAlert } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { defaultConfig } from '../../config';
import { careerVenue } from '../../config/careers';
import { canTurnAutocratic } from '../../engine/career';
import { isAutocracyAvailable } from '../../engine/autocracy';
import { de, fill } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import { BottomSheet } from '../components/BottomSheet';
import { Button } from '../components/Button';
import { careerView } from '../careerView';
import styles from './Sheets.module.css';

const cfg = defaultConfig;

/** Karriere-Details: Anforderungen, Wahl mit Wahlkampfbudget, Ernennung, Macht ausbauen, Kurswechsel. */
export function CareerSheet() {
  const close = () => {
    gameStore.getState().closeSheet();
  };
  const v = useGame(
    useShallow((s) => {
      const view = careerView(s.game, cfg);
      const run = s.game.run;
      if (!view || !run) return null;
      return {
        top: view.top,
        nextTitle: view.nextTitle,
        mode: view.mode,
        venueName: view.venueName,
        atVenue: view.atVenue,
        ready: view.ready,
        bars: JSON.stringify(view.bars),
        chances: view.chances.join(','),
        costs: view.campaignCosts.join('|'),
        affordable: view.campaignAffordable.map((a) => (a ? '1' : '0')).join(''),
        fixBonus: view.fixBonus,
        canTurn: canTurnAutocratic(s.game, cfg),
        autocracy: isAutocracyAvailable(run, cfg),
        stage: run.stage,
      };
    }),
  );
  const [campaign, setCampaign] = useState(0);
  const [confirmTurn, setConfirmTurn] = useState(false);
  if (!v) return null;
  const bars = JSON.parse(v.bars) as { key: string; label: string; ratio: number; text: string }[];
  const chances = v.chances ? v.chances.split(',').map(Number) : [];
  const costs = v.costs.split('|');
  const store = gameStore.getState();

  return (
    <BottomSheet
      title={v.top ? de.careerPanel.top : fill(de.careerPanel.next, { title: v.nextTitle })}
      onClose={close}
      testId="career-sheet"
    >
      {!v.top && (
        <>
          <div className={styles.bars}>
            {bars.map((b) => (
              <div key={b.key}>
                <div className={styles.barRow}>
                  <span>{b.label}</span>
                  <span className="num">{b.text}</span>
                </div>
                <div className={styles.track}>
                  <div
                    className={`${styles.fill} ${b.ratio >= 1 ? styles.full : ''}`}
                    style={{ transform: `scaleX(${b.ratio})` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {v.mode === 'election' && (
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>{de.careerPanel.campaign}</legend>
              <div
                className={styles.options}
                role="radiogroup"
                aria-label={de.careerPanel.campaign}
              >
                {de.careerPanel.campaigns.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    role="radio"
                    aria-checked={campaign === i}
                    className={styles.option}
                    onClick={() => {
                      setCampaign(i);
                    }}
                    data-testid={`campaign-${i}`}
                  >
                    <span className={styles.optionTitle}>{label}</span>
                    <span className="num">
                      {fill(de.careerPanel.chance, { value: chances[i] ?? 0 })}
                    </span>
                    <span className={`${styles.muted} num`}>{costs[i]}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {v.mode === 'power' && (
            <p className={styles.note}>
              <TriangleAlert size={16} aria-hidden="true" />
              {fill(de.careerPanel.expandWarning, {
                loyalty: cfg.balancing.autocracy.powerLoyaltyCost,
                unrest: cfg.balancing.autocracy.powerUnrest,
              })}
              {v.fixBonus && ` ${de.careerPanel.fixBonus}`}
            </p>
          )}

          {!v.atVenue ? (
            <Button
              block
              variant="secondary"
              onClick={() => {
                store.walkTo(careerVenue(v.stage));
                close();
              }}
              data-testid="career-sheet-go"
            >
              {fill(de.careerPanel.goToVenue, { place: v.venueName })}
            </Button>
          ) : v.mode === 'election' ? (
            <Button
              block
              disabled={v.affordable[campaign] !== '1'}
              onClick={() => {
                store.runElection(campaign);
              }}
              data-testid="run-election"
            >
              {de.careerPanel.run} ·{' '}
              {fill(de.careerPanel.chance, { value: chances[campaign] ?? 0 })}
            </Button>
          ) : (
            <Button
              block
              disabled={!v.ready}
              onClick={() => {
                store.promote();
              }}
              data-testid="promote"
            >
              {v.mode === 'power' ? de.careerPanel.expand : de.careerPanel.promote}
            </Button>
          )}
          {v.mode === 'election' && v.atVenue && (
            <p className={styles.muted}>
              {fill(de.careerPanel.confirmRun, { chance: chances[campaign] ?? 0 })}
            </p>
          )}
        </>
      )}

      {v.autocracy && (
        <Button
          variant="secondary"
          block
          onClick={() => {
            store.closeSheet();
            store.openSheet({ kind: 'autocracy' });
          }}
          data-testid="open-autocracy"
        >
          <ShieldHalf size={18} aria-hidden="true" />
          {de.autocracy.title}
        </Button>
      )}

      {v.canTurn && (
        <section className={styles.danger}>
          <h3 className={styles.subTitle}>{de.autocracy.turnTitle}</h3>
          <p className={styles.muted}>{de.autocracy.turnText}</p>
          {confirmTurn ? (
            <>
              <ul className={styles.list}>
                {de.autocracy.turnConsequences.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <div className={styles.row2}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setConfirmTurn(false);
                  }}
                >
                  {de.common.cancel}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    store.turnAutocratic();
                    setConfirmTurn(false);
                  }}
                  data-testid="confirm-turn"
                >
                  {de.autocracy.turnConfirm}
                </Button>
              </div>
            </>
          ) : (
            <Button
              variant="secondary"
              onClick={() => {
                setConfirmTurn(true);
              }}
              data-testid="turn-autocratic"
            >
              {de.autocracy.turnTitle}
            </Button>
          )}
        </section>
      )}
    </BottomSheet>
  );
}
