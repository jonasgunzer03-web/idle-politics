import { Coins, Globe, Handshake, Users, type LucideIcon } from 'lucide-react';
import type { ResourceId } from '../../engine/ids';

const resourceIcons: Record<ResourceId, LucideIcon> = {
  money: Coins,
  influence: Handshake,
  followers: Users,
  diplomacy: Globe,
};

interface Props {
  resource: ResourceId;
  size?: number;
}

export function ResourceIcon({ resource, size = 16 }: Props) {
  const Icon = resourceIcons[resource];
  return <Icon size={size} aria-hidden="true" style={{ color: `var(--res-${resource})` }} />;
}
