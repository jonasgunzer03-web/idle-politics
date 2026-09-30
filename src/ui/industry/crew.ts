import type { BustMood, BustOutfit } from '../../art/people/Bust';
import type { LocationId } from '../../engine/ids';

/** Kleidung der Belegschaft je Gebäude. */
export const OUTFIT_BY_LOCATION: Record<LocationId, BustOutfit> = {
  workplace: 'overall',
  pub: 'apron',
  market: 'apron',
  partyOffice: 'shirt',
  townHall: 'blazer',
  newspaper: 'shirt',
  bank: 'suit',
  parliament: 'suit',
  ministry: 'suit',
  embassy: 'suit',
  palace: 'suit',
};

export function moodOf(morale: number, striking: boolean): BustMood {
  if (striking || morale < 35) return 'angry';
  return morale >= 60 ? 'happy' : 'neutral';
}
