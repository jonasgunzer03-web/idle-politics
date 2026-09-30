import {
  Archive,
  Beer,
  Calculator,
  Camera,
  ConciergeBell,
  Cog,
  FolderOpen,
  Languages,
  Layers,
  Mic,
  Music,
  Package,
  Phone,
  Printer,
  ScrollText,
  Server,
  Store,
  TrendingUp,
  Tv,
  Landmark,
  UtensilsCrossed,
  MessagesSquare,
  Vault,
  Vote,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import type { GoodId, MachineId } from '../../engine/ids';

// Symbole für Waren und Maschinen.

const goodIcons: Record<GoodId, LucideIcon> = {
  wares: Package,
  contacts: MessagesSquare,
  flyers: ScrollText,
  files: FolderOpen,
};

export function GoodIcon({ good, size = 16 }: { good: GoodId; size?: number }) {
  const Icon = goodIcons[good];
  return <Icon size={size} aria-hidden="true" style={{ color: `var(--goods-${good})` }} />;
}

const machineIcons: Record<MachineId, LucideIcon> = {
  conveyor: Cog,
  warehouse: Warehouse,
  beerTap: Beer,
  jukebox: Music,
  stalls: Store,
  register: Calculator,
  printer: Printer,
  phoneBank: Phone,
  counter: ConciergeBell,
  archive: Archive,
  rotary: ScrollText,
  photoLab: Camera,
  tickerBoard: TrendingUp,
  vault: Vault,
  mics: Mic,
  votingBoard: Vote,
  mainframe: Server,
  fileLift: Layers,
  interpreters: Languages,
  banquet: UtensilsCrossed,
  tvStudio: Tv,
  balcony: Landmark,
};

export function MachineIcon({ machine, size = 22 }: { machine: MachineId; size?: number }) {
  const Icon = machineIcons[machine];
  return <Icon size={size} aria-hidden="true" />;
}
