import type { LucideIcon } from 'lucide-react';
import styles from './Tabs.module.css';

export function Placeholder({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <section className={styles.placeholder}>
      <Icon size={40} aria-hidden="true" className={styles.placeholderIcon} />
      <h1 className={styles.placeholderTitle}>{title}</h1>
      <p className={styles.placeholderText}>{text}</p>
    </section>
  );
}
