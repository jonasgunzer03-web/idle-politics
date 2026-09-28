import { useState, type CSSProperties } from 'react';
import { defaultConfig } from '../config';
import { DebugMenu } from '../debug/DebugMenu';
import { de } from '../i18n/de';
import { useGame } from '../store';
import { useGameLoop } from '../store/useGameLoop';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ResourceBar } from './components/ResourceBar';
import { RotateOverlay } from './components/RotateOverlay';
import { StatusBars } from './components/StatusBars';
import { StorageBanner } from './components/StorageBanner';
import { TabBar, type TabId } from './components/TabBar';
import { UpdatePrompt } from './components/UpdatePrompt';
import { OverlayHost } from './dialogs/OverlayHost';
import { CareerTab } from './tabs/CareerTab';
import { InvestTab, NetworkTab, WorldTab } from './tabs/OtherTabs';
import { ProfileTab } from './tabs/ProfileTab';
import styles from './App.module.css';

const cfg = defaultConfig;

function TabContent({ tab }: { tab: TabId }) {
  switch (tab) {
    case 'career':
      return <CareerTab />;
    case 'network':
      return <NetworkTab />;
    case 'invest':
      return <InvestTab />;
    case 'world':
      return <WorldTab />;
    case 'profile':
      return <ProfileTab />;
  }
}

function Shell() {
  useGameLoop();
  const [tab, setTab] = useState<TabId>('career');
  const hydrated = useGame((s) => s.hydrated);
  const stateId = useGame((s) => s.game.run?.stateId ?? null);
  const worldLocked = useGame(
    (s) => (s.game.run?.stage ?? 1) < cfg.balancing.resourceUnlockStage.diplomacy,
  );
  const debug = useGame((s) => s.debug);

  const palette = cfg.states[stateId ?? 'rhenania'].palette;
  const themeVars = {
    '--state-primary': palette.primary,
    '--state-secondary': palette.secondary,
    '--state-on-primary': palette.onPrimary,
  } as CSSProperties;

  if (!hydrated) return <div className={styles.splash} />;

  return (
    <div
      className={styles.app}
      style={themeVars}
      data-state={stateId ?? 'none'}
      data-debug={debug ? 'true' : 'false'}
    >
      <header className={styles.header}>
        {stateId ? (
          <>
            <ResourceBar />
            {tab === 'career' && <StatusBars />}
          </>
        ) : (
          <p className={styles.brand}>{de.appName}</p>
        )}
      </header>
      <UpdatePrompt />
      <StorageBanner />
      <main className={styles.content} key={tab}>
        <TabContent tab={tab} />
      </main>
      <TabBar active={tab} onSelect={setTab} locked={{ world: worldLocked }} />
      <OverlayHost />
      {debug && <DebugMenu />}
      <RotateOverlay />
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <Shell />
    </ErrorBoundary>
  );
}
