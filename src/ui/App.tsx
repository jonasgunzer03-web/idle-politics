import { lazy, Suspense, useState, type CSSProperties } from 'react';
import { defaultConfig } from '../config';
import { DebugMenu } from '../debug/DebugMenu';
import { groupsFor, isWorldUnlocked } from '../engine/rules';
import { de } from '../i18n/de';
import { useGame } from '../store';
import { useGameLoop } from '../store/useGameLoop';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Meters, UnrestBorder } from './components/Meters';
import { ResourceBar } from './components/ResourceBar';
import { RotateOverlay } from './components/RotateOverlay';
import { StorageBanner } from './components/StorageBanner';
import { TabBar, type TabId } from './components/TabBar';
import { Toasts } from './components/Toasts';
import { UpdatePrompt } from './components/UpdatePrompt';
import { OverlayHost } from './dialogs/OverlayHost';
import { FloatingNumbers } from './effects/FloatingNumbers';
import { CeremonyScreen } from './screens/CeremonyScreen';
import { EmigrationScreen, RunEndScreen, VictoryScreen } from './screens/EndScreens';
import { SetupFlow } from './setup/SetupFlow';
import { SheetHost } from './sheets/SheetHost';
import { CareerTab } from './tabs/CareerTab';
import { InvestTab } from './tabs/InvestTab';
import { NetworkTab } from './tabs/NetworkTab';
import { ProfileTab } from './tabs/ProfileTab';
import { WorldTab } from './tabs/WorldTab';
import styles from './App.module.css';

const cfg = defaultConfig;

// Minispiele mit three.js erst beim ersten Öffnen laden
const MinigameScreen = lazy(() => import('../minigame/MinigameScreen'));

function MinigameHost() {
  const location = useGame((s) => s.minigame);
  if (!location) return null;
  return (
    <Suspense fallback={<div className={styles.minigameLoading}>{de.minigame.loading}</div>}>
      <MinigameScreen location={location} />
    </Suspense>
  );
}

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

/** Normales Spiel: Kopfzeile, Tab-Inhalt, Tab-Leiste, Dialoge und Fenster. */
function Playing() {
  const [tab, setTab] = useState<TabId>('career');
  const networkLocked = useGame((s) =>
    s.game.run ? groupsFor(s.game.run, cfg).length === 0 : true,
  );
  const worldLocked = useGame((s) => (s.game.run ? !isWorldUnlocked(s.game.run, cfg) : true));
  return (
    <>
      <header className={styles.header}>
        <ResourceBar />
        <Meters />
      </header>
      <StorageBanner />
      <main className={`${styles.content} ${tab === 'career' ? styles.flush : ''}`} key={tab}>
        <TabContent tab={tab} />
      </main>
      <TabBar
        active={tab}
        onSelect={setTab}
        locked={{ network: networkLocked, world: worldLocked }}
      />
      <FloatingNumbers />
      <OverlayHost />
      <SheetHost />
      <UnrestBorder />
      <MinigameHost />
    </>
  );
}

function Shell() {
  useGameLoop();
  const hydrated = useGame((s) => s.hydrated);
  const phase = useGame((s) => s.game.phase);
  const stateId = useGame((s) => s.game.run?.stateId ?? null);
  const autocratic = useGame((s) => s.game.run?.path === 'autocratic');
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
      data-path={autocratic ? 'autocratic' : 'democratic'}
      data-debug={debug ? 'true' : 'false'}
    >
      {phase === 'setup' && (
        <div className={styles.setup}>
          <SetupFlow />
        </div>
      )}
      {phase === 'playing' && <Playing />}
      {phase === 'ceremony' && <CeremonyScreen />}
      {phase === 'victory' && <VictoryScreen />}
      {phase === 'runEnded' && <RunEndScreen />}
      {phase === 'emigrating' && <EmigrationScreen />}
      {/* Immer eingebunden: registriert den Service Worker schon auf dem Titelbildschirm */}
      <UpdatePrompt />
      <Toasts />
      {debug && phase === 'playing' && <DebugMenu />}
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
