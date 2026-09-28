import type { ProfessionId } from '../../engine/ids';

// Welche Kleidung trägt die Figur? Ergibt sich aus Beruf, Stufe, Staat und Pfad.
// Phase 1: Arbeitskleidung je nach Beruf. Weitere Stufen (Sakko, Anzug, Schärpe,
// Uniform) folgen mit den Karrierestufen in Phase 2.
export type Outfit = 'overalls' | 'officeShirt';

export function outfitFor(run: { profession: ProfessionId }): Outfit {
  return run.profession === 'skilled' ? 'overalls' : 'officeShirt';
}
