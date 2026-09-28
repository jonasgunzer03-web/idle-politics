import { Lock } from 'lucide-react';
import styles from './Tabs.module.css';

export function LockedTab({ title, text }: { title: string; text: string }) {
  return (
    <section className={styles.placeholder}>
      <Lock size={40} aria-hidden="true" className={styles.placeholderIcon} />
      <h1 className={styles.placeholderTitle}>{title}</h1>
      <p className={styles.placeholderText}>{text}</p>
    </section>
  );
}
