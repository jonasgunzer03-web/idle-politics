import {
  Briefcase,
  Globe,
  Lock,
  Network,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { de } from '../../i18n/de';
import styles from './TabBar.module.css';

export type TabId = 'career' | 'network' | 'invest' | 'world' | 'profile';

const TABS: { id: TabId; icon: LucideIcon }[] = [
  { id: 'career', icon: Briefcase },
  { id: 'network', icon: Network },
  { id: 'invest', icon: TrendingUp },
  { id: 'world', icon: Globe },
  { id: 'profile', icon: UserRound },
];

interface Props {
  active: TabId;
  onSelect: (tab: TabId) => void;
  locked: Partial<Record<TabId, boolean>>;
}

export function TabBar({ active, onSelect, locked }: Props) {
  return (
    <nav className={styles.bar} aria-label="Hauptnavigation">
      {TABS.map(({ id, icon: Icon }) => {
        const isLocked = locked[id] === true;
        return (
          <button
            key={id}
            type="button"
            className={styles.tab}
            aria-current={active === id ? 'page' : undefined}
            onClick={() => {
              onSelect(id);
            }}
            data-testid={`tab-${id}`}
          >
            <span className={styles.iconWrap}>
              <Icon size={22} aria-hidden="true" />
              {isLocked && <Lock className={styles.lock} size={12} aria-hidden="true" />}
            </span>
            <span className={styles.label}>{de.tabs[id]}</span>
          </button>
        );
      })}
    </nav>
  );
}
