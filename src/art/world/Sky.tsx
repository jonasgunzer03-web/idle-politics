import { memo } from 'react';
import styles from './Sky.module.css';

export type Weather = 'clear' | 'cloudy' | 'rain' | 'snow';

/**
 * Himmel mit Tagesverlauf: Tages-, Abend- und Nachtverlauf blenden im Rhythmus der Welt
 * über (Klassen day/dusk/night, siehe global.css). Sonne und Mond wandern im Bogen,
 * nachts funkeln Sterne. Dazu ziehende Wolken und Wetter.
 */
export const Sky = memo(function Sky({
  grey = false,
  weather = 'clear',
}: {
  grey?: boolean;
  weather?: Weather;
}) {
  const clouds = weather === 'clear' ? 3 : 6;
  return (
    <div className={`${styles.sky} ${grey ? styles.grey : ''}`} aria-hidden="true">
      <div className={`${styles.layer} ${styles.duskLayer} dusk`} />
      <div className={`${styles.layer} ${styles.nightLayer} night`} />
      <div className={`${styles.stars} night`}>
        {Array.from({ length: 28 }, (_, i) => (
          <span
            key={i}
            className={styles.star}
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 55}%`,
              animationDelay: `${-(i % 7) * 0.6}s`,
              transform: `scale(${0.6 + (i % 3) * 0.3})`,
            }}
          />
        ))}
      </div>
      <div className={styles.orbit}>
        <div className={styles.sun} />
      </div>
      <div className={`${styles.orbit} ${styles.moonOrbit}`}>
        <div className={styles.moon} />
      </div>
      {Array.from({ length: clouds }, (_, i) => (
        <div
          key={i}
          className={styles.cloud}
          style={{
            top: `${2 + ((i * 11) % 26)}%`,
            animationDuration: `${70 + i * 23}s`,
            animationDelay: `${-i * 31}s`,
            opacity: weather === 'clear' ? 0.9 - i * 0.15 : 0.95,
          }}
        >
          <svg
            viewBox="0 0 80 30"
            className={styles.cloudSvg}
            style={{ width: `${80 + (i % 3) * 30}px` }}
          >
            <g className={weather === 'clear' ? styles.cloudFill : styles.cloudGrey}>
              <ellipse cx="25" cy="20" rx="20" ry="9" />
              <ellipse cx="42" cy="14" rx="16" ry="11" />
              <ellipse cx="58" cy="20" rx="17" ry="8" />
            </g>
          </svg>
        </div>
      ))}
      {weather !== 'clear' && <div className={styles.overcast} />}
    </div>
  );
});

/** Regen oder Schnee vor der Straße (eigene Ebene über allem). */
export const Precipitation = memo(function Precipitation({ weather }: { weather: Weather }) {
  if (weather !== 'rain' && weather !== 'snow') return null;
  const snow = weather === 'snow';
  return (
    <div className={styles.precip} aria-hidden="true">
      {Array.from({ length: snow ? 40 : 60 }, (_, i) => (
        <span
          key={i}
          className={snow ? styles.flake : styles.drop}
          style={{
            left: `${(i * 29) % 100}%`,
            animationDuration: `${snow ? 5 + (i % 5) : 0.7 + (i % 4) * 0.12}s`,
            animationDelay: `${-(i % 9) * (snow ? 0.7 : 0.13)}s`,
          }}
        />
      ))}
    </div>
  );
});
