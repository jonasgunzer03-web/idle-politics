import {
  Beer,
  BriefcaseBusiness,
  Clock,
  Factory,
  FileText,
  Flag,
  House,
  Landmark,
  Lightbulb,
  Megaphone,
  Newspaper,
  Smartphone,
  Store,
  Tent,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import type { GeneratorId } from '../../engine/ids';

const icons: Record<GeneratorId, LucideIcon> = {
  overtime: Clock,
  sideJob: BriefcaseBusiness,
  smallBusiness: Store,
  rentals: House,
  company: Factory,
  holding: Landmark,
  regularsTable: Beer,
  clubWork: UsersRound,
  localBranch: Flag,
  pressContacts: Newspaper,
  thinkTank: Lightbulb,
  flyers: FileText,
  infoStand: Tent,
  socialMediaTeam: Smartphone,
  campaignOffice: Megaphone,
};

export function GeneratorIcon({ id, size = 22 }: { id: GeneratorId; size?: number }) {
  const Icon = icons[id];
  return <Icon size={size} aria-hidden="true" />;
}
