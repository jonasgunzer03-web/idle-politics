import { memo } from 'react';
import type { Character } from '../../engine/schema';
import { Figure } from '../figure/Figure';
import type { Outfit } from '../figure/outfit';
import { CloudLayer, PasserbyLayer, SkyLayer, SkylineLayer, WorkplaceLayer } from './layers';
import styles from './Scene.module.css';

// Szenengruppen je Karrierestufe. Phase 1: Arbeitsplatz. Rathaus, Parlamente und
// Regierungssitz folgen in Phase 2.
export type SceneGroup = 'workplace';

interface Props {
  group: SceneGroup;
  workplace: 'factory' | 'office';
  character: Character;
  outfit: Outfit;
  label: string;
}

/** Szene mit Figur, aufgebaut aus Ebenen: Himmel, Wolken, Hintergrund, Gebäude, Menschen. */
export const Scene = memo(function Scene({ workplace, character, outfit, label }: Props) {
  return (
    <div className={styles.scene} role="img" aria-label={label} data-testid="scene">
      <SkyLayer />
      <CloudLayer />
      <SkylineLayer />
      <WorkplaceLayer kind={workplace} />
      <PasserbyLayer />
      <div className={styles.figureSlot}>
        <Figure character={character} outfit={outfit} />
      </div>
    </div>
  );
});
