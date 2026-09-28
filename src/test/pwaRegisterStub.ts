// Ersatz für das virtuelle Modul von vite-plugin-pwa in Unit-Tests.
import { useState } from 'react';

export function useRegisterSW(): {
  needRefresh: [boolean, (v: boolean) => void];
  offlineReady: [boolean, (v: boolean) => void];
  updateServiceWorker: (reload?: boolean) => Promise<void>;
} {
  const needRefresh = useState(false);
  const offlineReady = useState(false);
  return { needRefresh, offlineReady, updateServiceWorker: () => Promise.resolve() };
}
