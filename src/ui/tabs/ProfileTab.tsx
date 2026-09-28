import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { de, fill } from '../../i18n/de';
import { gameStore } from '../../store';
import { Button } from '../components/Button';
import styles from './Tabs.module.css';

type Message = { tone: 'error' | 'success'; text: string } | null;

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function BackupSection() {
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [input, setInput] = useState('');
  const [message, setMessage] = useState<Message>(null);

  const onExport = () => {
    setCode(gameStore.getState().exportCode() ?? '');
    setCopied(false);
  };

  const onCopy = () => {
    copyText(code)
      .then((ok) => {
        setCopied(ok);
        if (!ok) setMessage({ tone: 'error', text: de.profile.copyFailed });
      })
      .catch(() => {
        setMessage({ tone: 'error', text: de.profile.copyFailed });
      });
  };

  const onImport = () => {
    if (input.trim().length === 0) {
      setMessage({ tone: 'error', text: de.profile.importErrors.empty });
      return;
    }
    if (!window.confirm(de.profile.importConfirm)) return;
    const result = gameStore.getState().importCode(input, Date.now());
    if (result.ok) {
      setInput('');
      setMessage({ tone: 'success', text: de.profile.importSuccess });
    } else {
      setMessage({ tone: 'error', text: de.profile.importErrors[result.error] });
    }
  };

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>{de.profile.backupTitle}</h2>
      <p className={styles.muted}>{de.profile.backupText}</p>
      <p className={styles.hint}>{de.profile.iosHint}</p>

      <div className={styles.row}>
        <Button variant="secondary" onClick={onExport} data-testid="backup-export">
          {de.profile.export}
        </Button>
        {code && (
          <Button variant="secondary" onClick={onCopy}>
            {copied ? (
              <Check size={18} aria-hidden="true" />
            ) : (
              <Copy size={18} aria-hidden="true" />
            )}
            {copied ? de.profile.copied : de.profile.copy}
          </Button>
        )}
      </div>
      {code && (
        <textarea
          className={styles.code}
          readOnly
          value={code}
          aria-label={de.profile.backupTitle}
          data-testid="backup-code"
          onFocus={(e) => {
            e.currentTarget.select();
          }}
        />
      )}

      <label htmlFor="backup-import" className={styles.message}>
        {de.profile.importLabel}
      </label>
      <textarea
        id="backup-import"
        className={styles.code}
        value={input}
        placeholder={de.profile.importPlaceholder}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(e) => {
          setInput(e.target.value);
          setMessage(null);
        }}
        data-testid="backup-input"
      />
      <Button onClick={onImport} data-testid="backup-import">
        {de.profile.importButton}
      </Button>
      {message && (
        <p className={`${styles.message} ${styles[message.tone]}`} role="status">
          {message.text}
        </p>
      )}
    </section>
  );
}

export function ProfileTab() {
  return (
    <div className={styles.page}>
      <h1>{de.profile.title}</h1>
      <BackupSection />
      <p className={styles.footer}>{fill(de.profile.version, { version: __APP_VERSION__ })}</p>
    </div>
  );
}
