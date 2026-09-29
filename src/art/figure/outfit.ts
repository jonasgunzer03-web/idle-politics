import type { PathId, ProfessionId } from '../../engine/ids';

// Welche Kleidung trägt die Figur? Ergibt sich aus Beruf, Stufe und Pfad (Spezifikation 5.5):
// Blaumann bzw. Bürohemd → Sakko → Anzug → Staatsanzug mit Anstecker → Anzug mit Schärpe.
// Autokratischer Pfad ab Stufe 8: Uniform mit Orden.
export type Outfit =
  'overalls' | 'officeShirt' | 'blazer' | 'suit' | 'stateSuit' | 'sashSuit' | 'uniform';

export function outfitFor(run: {
  profession: ProfessionId;
  stage?: number;
  path?: PathId;
}): Outfit {
  const stage = run.stage ?? 1;
  if (run.path === 'autocratic' && stage >= 8) return 'uniform';
  if (stage >= 11) return 'sashSuit';
  if (stage >= 8) return 'stateSuit';
  if (stage >= 5) return 'suit';
  if (stage >= 3) return 'blazer';
  return run.profession === 'skilled' ? 'overalls' : 'officeShirt';
}
