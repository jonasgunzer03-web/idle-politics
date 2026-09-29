import { Footprints, Lock } from 'lucide-react';
import { defaultConfig } from '../../config';
import { careerVenue } from '../../config/careers';
import { isLocationOpen, isLocationReachable } from '../../engine/unlocks';
import { currentLocation, travelSeconds } from '../../engine/world';
import { de, fill } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import { locationName } from '../gameText';
import styles from './Destinations.module.css';

const cfg = defaultConfig;

interface DestinationView {
  id: (typeof cfg.world.locations)[number]['id'];
  label: string;
  seconds: number;
  here: boolean;
  target: boolean;
  open: boolean;
  venue: boolean;
}

/** Leiste mit allen erreichbaren Orten: Alternative zum Tippen in der Straße. */
export function Destinations() {
  // Als Text zusammengefasst, damit die Leiste nicht bei jedem Schritt neu zeichnet
  const key = useGame((s) => {
    const run = s.game.run;
    if (!run) return '';
    const here = currentLocation(run, cfg);
    return cfg.world.locations
      .filter((l) => isLocationReachable(run, l, cfg))
      .map((l) =>
        [
          l.id,
          Math.ceil(travelSeconds(s.game, l.id, cfg)),
          here === l.id ? 1 : 0,
          run.world.target === l.id ? 1 : 0,
          isLocationOpen(run, l, cfg) ? 1 : 0,
          careerVenue(run.stage) === l.id ? 1 : 0,
        ].join(':'),
      )
      .join('|');
  });
  const office = useGame((s) => s.game.run?.profession === 'office');
  const items: DestinationView[] = key
    ? key.split('|').map((entry) => {
        const [id = 'workplace', seconds = '0', here = '0', target = '0', open = '0', venue = '0'] =
          entry.split(':');
        const typed = id as DestinationView['id'];
        return {
          id: typed,
          label: locationName(typed, office),
          seconds: Number(seconds),
          here: here === '1',
          target: target === '1',
          open: open === '1',
          venue: venue === '1',
        };
      })
    : [];

  return (
    <nav className={styles.bar} aria-label={de.ui.destinations}>
      {items.map((d) => (
        <button
          key={d.id}
          type="button"
          className={styles.chip}
          aria-current={d.here ? 'location' : undefined}
          data-target={d.target ? 'true' : undefined}
          data-venue={d.venue ? 'true' : undefined}
          onClick={() => {
            gameStore.getState().walkTo(d.id);
          }}
          data-testid={`dest-${d.id}`}
        >
          <span className={styles.label}>
            {!d.open && <Lock size={12} aria-hidden="true" />}
            {d.label}
          </span>
          <span className={`${styles.meta} num`}>
            {d.here ? (
              de.ui.here
            ) : (
              <>
                <Footprints size={11} aria-hidden="true" />
                {fill(de.ui.seconds, { n: d.seconds })}
              </>
            )}
          </span>
        </button>
      ))}
    </nav>
  );
}
