import { useState } from 'react';
import { Check, Copy, Lock, Pencil, Plane, Trophy } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Figure } from '../../art/figure/Figure';
import { outfitFor } from '../../art/figure/outfit';
import { defaultConfig } from '../../config';
import { partyColors } from '../../config/appearance';
import { formatDuration } from '../../engine/format';
import { canBuyLegacy, legacyCost } from '../../engine/game';
import { legacyLevel } from '../../engine/rules';
import { de, fill } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import { Button } from '../components/Button';
import { PartySymbol } from '../components/PartySymbol';
import styles from './Tabs.module.css';

const cfg = defaultConfig;

type Message = { tone: 'error' | 'success'; text: string } | null;

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function CharacterSection() {
  const character = useGame((s) => s.game.character);
  const outfit = useGame((s) => (s.game.run ? outfitFor(s.game.run) : 'officeShirt'));
  const canEmigrate = useGame((s) => (s.game.run?.stage ?? 0) >= cfg.balancing.emigration.minStage);
  const store = gameStore.getState();
  if (!character) return null;
  const color = partyColors[character.party.color] ?? '#b3261e';
  return (
    <section className={styles.card}>
      <div className={styles.characterRow}>
        <div className={styles.miniFigure}>
          <Figure character={character} outfit={outfit} animated={false} />
        </div>
        <div>
          <h2 className={styles.cardTitle}>{character.name}</h2>
          <p className={styles.party} style={{ color }}>
            <PartySymbol index={character.party.symbol} size={16} />
            {character.party.name}
          </p>
        </div>
      </div>
      <div className={styles.row}>
        <Button
          variant="secondary"
          onClick={() => store.openSheet({ kind: 'editor' })}
          data-testid="open-editor"
        >
          <Pencil size={16} aria-hidden="true" />
          {de.profile.editCharacter}
        </Button>
        <Button
          variant="secondary"
          disabled={!canEmigrate}
          onClick={() => store.openSheet({ kind: 'emigration' })}
          data-testid="open-emigration"
        >
          <Plane size={16} aria-hidden="true" />
          {de.profile.emigrate}
        </Button>
      </div>
      {!canEmigrate && (
        <p className={styles.muted}>
          {fill(de.emigration.minStage, { stage: cfg.balancing.emigration.minStage })}
        </p>
      )}
    </section>
  );
}

function LegacySection() {
  const v = useGame(
    useShallow((s) => ({
      points: s.game.meta.legacyPoints,
      levels: cfg.legacyNodes.map((n) => legacyLevel(s.game, n.id)).join(','),
      buyable: cfg.legacyNodes.map((n) => (canBuyLegacy(s.game, n.id, cfg) ? 1 : 0)).join(''),
      costs: cfg.legacyNodes.map((n) => legacyCost(s.game, n.id, cfg) ?? -1).join(','),
    })),
  );
  const levels = v.levels.split(',').map(Number);
  const costs = v.costs.split(',').map(Number);
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>
        {de.legacy.title} ·{' '}
        <span className="num">{fill(de.legacy.points, { points: v.points })}</span>
      </h2>
      <p className={styles.muted}>{de.legacy.text}</p>
      <div className={styles.legacyGrid}>
        {cfg.legacyNodes.map((node, i) => {
          const level = levels[i] ?? 0;
          const cost = costs[i] ?? -1;
          const maxed = cost < 0;
          const locked =
            node.requires !== undefined &&
            (levels[cfg.legacyNodes.findIndex((n) => n.id === node.requires)] ?? 0) < 1;
          const text = de.legacy.nodes[node.id];
          return (
            <div key={node.id} className={styles.legacyNode} data-level={level}>
              <p className={styles.legacyName}>{text.name}</p>
              <p className={styles.muted}>{text.text}</p>
              <p className={`${styles.muted} num`}>
                {fill(de.legacy.level, { level, max: node.costs.length })}
              </p>
              {maxed ? (
                <span className={styles.maxed}>{de.legacy.maxed}</span>
              ) : locked && node.requires ? (
                <span className={styles.muted}>
                  <Lock size={12} aria-hidden="true" />{' '}
                  {fill(de.legacy.requires, { name: de.legacy.nodes[node.requires].name })}
                </span>
              ) : (
                <button
                  type="button"
                  className={styles.smallBuy}
                  disabled={v.buyable[i] !== '1'}
                  onClick={() => {
                    gameStore.getState().buyLegacy(node.id);
                  }}
                  data-testid={`legacy-${node.id}`}
                >
                  {fill(de.legacy.buy, { cost })}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AchievementsSection() {
  const done = useGame((s) => s.game.meta.achievements.join(','));
  const list = done ? done.split(',') : [];
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>
        {de.achievements.title} ·{' '}
        <span className="num">
          {fill(de.achievements.progress, { done: list.length, total: cfg.achievements.length })}
        </span>
      </h2>
      <ul className={styles.achievements}>
        {cfg.achievements.map((a) => {
          const unlocked = list.includes(a.id);
          const text = de.achievements.list[a.id];
          return (
            <li
              key={a.id}
              className={styles.achievement}
              data-unlocked={unlocked ? 'true' : 'false'}
            >
              <Trophy size={18} aria-hidden="true" />
              <div>
                <p className={styles.legacyName}>{text.name}</p>
                <p className={styles.muted}>
                  {text.text}
                  {a.reward &&
                    ` ${fill(de.achievements.reward, { item: de.accessories[a.reward] })}`}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function StatsSection() {
  const m = useGame((s) => s.game.meta);
  const t = de.profile.stats;
  const rows: [string, string][] = [
    [t.runs, String(m.runsStarted)],
    [t.highest, String(m.highestStageEver)],
    [t.statesRuled, m.statesRuled.map((id) => de.states[id].name).join(', ') || '–'],
    [t.taps, m.totalTaps.toLocaleString('de-DE')],
    [t.playtime, formatDuration(m.totalPlayMs)],
    [t.events, String(m.eventsResolved)],
    [t.emigrations, String(m.emigrations)],
    [t.overthrows, String(m.overthrows)],
  ];
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>{de.profile.sections.stats}</h2>
      <dl className={styles.stats}>
        {rows.map(([k, v]) => (
          <div key={k} className={styles.statRow}>
            <dt>{k}</dt>
            <dd className="num">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
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
      <CharacterSection />
      <LegacySection />
      <AchievementsSection />
      <StatsSection />
      <BackupSection />
      <p className={styles.footer}>{fill(de.profile.version, { version: __APP_VERSION__ })}</p>
    </div>
  );
}
