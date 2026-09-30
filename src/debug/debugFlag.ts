import { DEV_EDITION } from './edition';

/** Debug-Modus: im Entwicklungsmodus immer, sonst über `?debug=1` in der Adresse. */
export function isDebugEnabled(): boolean {
  if (import.meta.env.DEV || DEV_EDITION) return true;
  try {
    return new URLSearchParams(window.location.search).get('debug') === '1';
  } catch {
    return false;
  }
}
