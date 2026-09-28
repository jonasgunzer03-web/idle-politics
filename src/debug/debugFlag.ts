/** Debug-Modus: im Entwicklungsmodus immer, sonst über `?debug=1` in der Adresse. */
export function isDebugEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  try {
    return new URLSearchParams(window.location.search).get('debug') === '1';
  } catch {
    return false;
  }
}
