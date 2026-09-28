import { Component, type ErrorInfo, type ReactNode } from 'react';
import { de } from '../../i18n/de';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * Fängt Abstürze der Oberfläche ab. Der Spielstand wird dabei nicht angefasst: Gespeichert
 * wird nur ein geprüfter Stand, und der letzte gültige bleibt im zweiten Speicherplatz.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[Idle Politics] Absturz der Oberfläche', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div className={styles.wrap} role="alert">
        <h1 className={styles.title}>{de.errorBoundary.title}</h1>
        <p className={styles.text}>{de.errorBoundary.text}</p>
        <button
          type="button"
          className={styles.button}
          onClick={() => {
            window.location.reload();
          }}
        >
          {de.errorBoundary.reload}
        </button>
      </div>
    );
  }
}
