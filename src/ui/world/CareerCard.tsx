import { ChevronRight, Crown, Vote } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { defaultConfig } from '../../config';
import { careerVenue } from '../../config/careers';
import { de, fill } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import { careerView } from '../careerView';
import styles from './CareerCard.module.css';

const cfg = defaultConfig;

/** Kompakte Karriere-Übersicht: nächste Stufe, Fortschritt, nächster Schritt. */
export function CareerCard() {
  const view = useGame(
    useShallow((s) => {
      const v = careerView(s.game, cfg);
      if (!v) return null;
      return {
        top: v.top,
        nextTitle: v.nextTitle,
        mode: v.mode,
        venueName: v.venueName,
        atVenue: v.atVenue,
        ready: v.ready,
        bars: v.bars.map((b) => `${b.key}|${b.label}|${b.ratio.toFixed(3)}|${b.text}`).join('\n'),
        years:
          s.game.run?.rulingSince != null
            ? Math.floor(
                (s.game.run.playMs - s.game.run.rulingSince) /
                  1000 /
                  cfg.balancing.ruling.secondsPerYear,
              )
            : null,
      };
    }),
  );
  const stage = useGame((s) => s.game.run?.stage ?? 1);
  if (!view) return null;

  const open = () => gameStore.getState().openSheet({ kind: 'career' });
  const modeLabel =
    view.mode === 'election'
      ? de.careerPanel.election
      : view.mode === 'power'
        ? de.careerPanel.power
        : de.careerPanel.appointment;

  if (view.top) {
    return (
      <section className={styles.card} data-testid="career-card">
        <Crown size={22} aria-hidden="true" className={styles.crown} />
        <div>
          <p className={styles.title}>{de.careerPanel.top}</p>
          {view.years !== null && (
            <p className={styles.sub}>{fill(de.careerPanel.ruling, { years: view.years + 1 })}</p>
          )}
        </div>
      </section>
    );
  }

  const bars = view.bars
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [key = '', label = '', ratio = '0', text = ''] = line.split('|');
      return { key, label, ratio: Number(ratio), text };
    });

  return (
    <section className={styles.card} data-testid="career-card">
      <button
        type="button"
        className={styles.main}
        onClick={open}
        aria-label={de.careerPanel.title}
      >
        <div className={styles.head}>
          <Vote size={18} aria-hidden="true" />
          <span className={styles.title}>
            {fill(de.careerPanel.next, { title: view.nextTitle })}
          </span>
          <span className={styles.badge}>{modeLabel}</span>
          <ChevronRight size={18} aria-hidden="true" className={styles.chev} />
        </div>
        <div className={styles.bars}>
          {bars.map((b) => (
            <div key={b.key} className={styles.bar}>
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
      </button>
      {view.ready && !view.atVenue && (
        <button
          type="button"
          className={styles.go}
          onClick={() => {
            gameStore.getState().walkTo(careerVenue(stage));
          }}
          data-testid="career-go"
        >
          {fill(de.careerPanel.goToVenue, { place: view.venueName })}
        </button>
      )}
      {view.ready && view.atVenue && (
        <button type="button" className={styles.go} onClick={open} data-testid="career-open">
          {view.mode === 'election'
            ? de.careerPanel.run
            : view.mode === 'power'
              ? de.careerPanel.expand
              : de.careerPanel.promote}
        </button>
      )}
    </section>
  );
}
