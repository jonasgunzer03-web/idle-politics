import { Anchor, Bird, Flower2, Hand, Star, Sun, TreeDeciduous, Wheat, type LucideIcon } from 'lucide-react';

// Acht schlichte Parteisymbole (Reihenfolge = Index im Charakter).
const SYMBOLS: LucideIcon[] = [Star, Flower2, TreeDeciduous, Hand, Bird, Sun, Anchor, Wheat];

export function PartySymbol({ index, size = 18 }: { index: number; size?: number }) {
  const Icon = SYMBOLS[index] ?? Star;
  return <Icon size={size} aria-hidden="true" />;
}
