import { useState } from 'react';
import {
  DoorClosed,
  DoorOpen,
  Factory,
  Gamepad2,
  Landmark,
  Lock,
  Square,
  Users,
  Wrench,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { defaultConfig } from '../../config';
import type { LocationId } from '../../engine/ids';
import { buildingLevel } from '../../engine/production';
import { findLocation, isLocationOpen } from '../../engine/unlocks';
import { currentLocation, travelSeconds } from '../../engine/world';
import { de, fill } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import { Button } from '../components/Button';
import { BuildTab } from '../industry/BuildTab';
import { ProductionTab } from '../industry/ProductionTab';
import { TeamTab } from '../industry/TeamTab';
import tabStyles from '../industry/Industry.module.css';
import { PoliticsTab } from '../party/PoliticsTab';
import { locationName } from '../gameText';
import { levelName } from '../peopleText';
import styles from './LocationPanel.module.css';

const cfg = defaultConfig;

/** Was man am aktuellen Ort tun kann: unterwegs, davor oder drinnen. */
export function LocationPanel() {
  const view = useGame(
    useShallow((s) => {
      const run = s.game.run;
      if (!run) return null;
      const here = currentLocation(run, cfg);
      const loc = here ? findLocation(here, cfg) : undefined;
      const target = run.world.target;
      return {
        here,
        target,
        seconds: target ? Math.ceil(travelSeconds(s.game, target, cfg)) : 0,
        inside: run.world.inside && here !== null,
        open: loc ? isLocationOpen(run, loc, cfg) : false,
        unlockStage: loc?.unlockStage ?? 1,
        office: run.profession === 'office',
      };
    }),
  );
  if (!view) return null;
  const store = gameStore.getState();

  if (view.target) {
    return (
      <section className={styles.panel}>
        <p className={styles.walking}>
          {fill(de.ui.walkingTo, { place: locationName(view.target, view.office) })}
          <span className="num"> · {fill(de.ui.seconds, { n: view.seconds })}</span>
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            store.stopWalking();
          }}
        >
          <Square size={16} aria-hidden="true" />
          {de.ui.stop}
        </Button>
      </section>
    );
  }

  if (!view.here) {
    return (
      <section className={styles.panel}>
        <p className={styles.muted}>{de.ui.tapHint}</p>
      </section>
    );
  }

  const name = locationName(view.here, view.office);

  if (!view.inside) {
    return (
      <section className={styles.panel} data-testid="location-outside">
        <div className={styles.placeHead}>
          <div>
            <h2 className={styles.placeName}>{name}</h2>
            <p className={styles.muted}>{de.locations[view.here].text}</p>
          </div>
        </div>
        {view.open ? (
          <Button
            block
            onClick={() => {
              store.enter();
            }}
            data-testid="enter"
          >
            <DoorOpen size={18} aria-hidden="true" />
            {de.ui.enter}
          </Button>
        ) : (
          <p className={styles.muted}>
            <Lock size={14} aria-hidden="true" /> {fill(de.ui.locked, { stage: view.unlockStage })}
          </p>
        )}
      </section>
    );
  }

  return <Inside key={view.here} location={view.here} name={name} />;
}

type TabKey = 'production' | 'build' | 'team' | 'politics';

/** Drinnen: Reiter Produktion, Ausbau, Team (im Parteibüro zusätzlich Politik). */
function Inside({ location, name }: { location: LocationId; name: string }) {
  const party = location === 'partyOffice';
  const [tab, setTab] = useState<TabKey>(party ? 'politics' : 'production');
  const info = useGame(
    useShallow((s) => {
      const run = s.game.run;
      return {
        level: run ? buildingLevel(run, location) : 1,
        office: run?.profession === 'office',
        agenda: run?.agenda.items.length ?? 0,
      };
    }),
  );
  const tabs: { key: TabKey; label: string; icon: typeof Factory; badge?: number }[] = [
    ...(party
      ? [
          {
            key: 'politics' as const,
            label: de.industry.ui.tabs.politics,
            icon: Landmark,
            badge: info.agenda,
          },
        ]
      : []),
    { key: 'production', label: de.industry.ui.tabs.production, icon: Factory },
    { key: 'build', label: de.industry.ui.tabs.build, icon: Wrench },
    { key: 'team', label: de.industry.ui.tabs.team, icon: Users },
  ];
  return (
    <section className={styles.panel} data-testid="location-inside">
      <div className={styles.placeHead}>
        <div>
          <h2 className={styles.placeName}>{name}</h2>
          <p className={styles.muted}>
            {fill(de.industry.ui.levelName, {
              level: info.level,
              name: levelName(location, info.level, info.office),
            })}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            gameStore.getState().leave();
          }}
          data-testid="leave"
        >
          <DoorClosed size={16} aria-hidden="true" />
          {de.ui.leave}
        </Button>
      </div>
      <button
        type="button"
        className={styles.play}
        onClick={() => {
          gameStore.getState().openMinigame(location);
        }}
        data-testid="play-minigame"
      >
        <span className={styles.playIcon}>
          <Gamepad2 size={26} strokeWidth={2.4} aria-hidden="true" />
        </span>
        <span className={styles.playText}>
          <strong>{de.minigame.play}</strong>
          <small>{fill(de.minigame.playSub, { title: de.minigame.titles[location] })}</small>
        </span>
      </button>
      <div className={tabStyles.tabs} role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            className={tabStyles.tab}
            aria-selected={tab === t.key}
            onClick={() => {
              setTab(t.key);
            }}
            data-testid={`tab-${t.key}`}
          >
            <t.icon size={15} aria-hidden="true" />
            {t.label}
            {t.badge ? <span className={tabStyles.badge}>{t.badge}</span> : null}
          </button>
        ))}
      </div>
      {tab === 'production' && (
        <ProductionTab
          location={location}
          onFull={() => {
            setTab('build');
          }}
        />
      )}
      {tab === 'build' && <BuildTab location={location} />}
      {tab === 'team' && <TeamTab location={location} />}
      {tab === 'politics' && <PoliticsTab />}
    </section>
  );
}
