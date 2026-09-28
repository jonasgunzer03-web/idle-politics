import { Shuffle } from 'lucide-react';
import { Figure } from '../../art/figure/Figure';
import type { Outfit } from '../../art/figure/outfit';
import { appearanceCounts, hairColors, nameLimits, partyColors, skinTones } from '../../config/appearance';
import { randomSeed } from '../../engine/rng';
import type { Character } from '../../engine/schema';
import { de, fill } from '../../i18n/de';
import { randomCharacter } from '../characterDefaults';
import { Button } from './Button';
import { PartySymbol } from './PartySymbol';
import styles from './CharacterEditor.module.css';

type NumericKey = 'build' | 'skinTone' | 'faceShape' | 'hairStyle' | 'hairColor' | 'beard' | 'glasses';

function Swatches({ label, colors, value, onChange }: {
  label: string;
  colors: readonly string[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{label}</legend>
      <div className={styles.swatches} role="radiogroup" aria-label={label}>
        {colors.map((color, i) => (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={fill(de.setup.character.option, { label, n: i + 1 })}
            className={styles.swatch}
            style={{ background: color }}
            onClick={() => {
              onChange(i);
            }}
          />
        ))}
      </div>
    </fieldset>
  );
}

function Chips({ label, options, value, onChange, testId }: {
  label: string;
  options: readonly string[];
  value: number;
  onChange: (v: number) => void;
  testId?: string;
}) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{label}</legend>
      <div className={styles.chips} role="radiogroup" aria-label={label} data-testid={testId}>
        {options.map((name, i) => (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={value === i}
            className={styles.chip}
            onClick={() => {
              onChange(i);
            }}
          >
            {name}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

interface Props {
  draft: Character;
  onChange: (c: Character) => void;
  outfit: Outfit;
  /** Kurzer Editor (Startablauf) oder vollständig (Profil). */
  full: boolean;
}

/** Charakter-Editor: Vorschau, Name, Aussehen, Partei. */
export function CharacterEditor({ draft, onChange, outfit, full }: Props) {
  const c = de.setup.character;
  const set = (key: NumericKey) => (v: number) => {
    onChange({ ...draft, [key]: v });
  };
  return (
    <div className={styles.editor}>
      <div className={styles.preview}>
        <Figure character={draft} outfit={outfit} />
        <Button
          variant="secondary"
          className={styles.random}
          onClick={() => {
            const random = randomCharacter(randomSeed());
            // Name und Partei bleiben, wenn schon gesetzt
            onChange({ ...random, name: draft.name || random.name, party: full ? draft.party : random.party, accessories: draft.accessories });
          }}
        >
          <Shuffle size={18} aria-hidden="true" />
          {c.random}
        </Button>
      </div>

      <label className={styles.legend} htmlFor="character-name">
        {c.name}
      </label>
      <input
        id="character-name"
        className={styles.input}
        value={draft.name}
        maxLength={nameLimits.character}
        placeholder={c.namePlaceholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        onChange={(e) => {
          onChange({ ...draft, name: e.target.value });
        }}
        data-testid="character-name"
      />
      {draft.name.trim().length === 0 && <p className={styles.error}>{c.nameMissing}</p>}

      <Chips label={c.build} options={c.builds.slice(0, appearanceCounts.build)} value={draft.build} onChange={set('build')} />
      <Swatches label={c.skinTone} colors={skinTones} value={draft.skinTone} onChange={set('skinTone')} />
      <Chips label={c.faceShape} options={c.faceShapes.slice(0, appearanceCounts.faceShape)} value={draft.faceShape} onChange={set('faceShape')} />
      <Chips label={c.hairStyle} options={c.hairStyles.slice(0, appearanceCounts.hairStyle)} value={draft.hairStyle} onChange={set('hairStyle')} />
      <Swatches label={c.hairColor} colors={hairColors} value={draft.hairColor} onChange={set('hairColor')} />
      <Chips label={c.beard} options={c.beards.slice(0, appearanceCounts.beard)} value={draft.beard} onChange={set('beard')} />
      <Chips label={c.glasses} options={c.glassesOptions.slice(0, appearanceCounts.glasses)} value={draft.glasses} onChange={set('glasses')} />

      <h3 className={styles.section}>{c.sections.partyTitle}</h3>
      <label className={styles.legend} htmlFor="party-name">
        {c.partyName}
      </label>
      <input
        id="party-name"
        className={styles.input}
        value={draft.party.name}
        maxLength={nameLimits.party}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(e) => {
          onChange({ ...draft, party: { ...draft.party, name: e.target.value } });
        }}
        data-testid="party-name"
      />
      <Swatches
        label={c.partyColor}
        colors={partyColors}
        value={draft.party.color}
        onChange={(color) => {
          onChange({ ...draft, party: { ...draft.party, color } });
        }}
      />
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{c.partySymbol}</legend>
        <div className={styles.symbols} role="radiogroup" aria-label={c.partySymbol}>
          {c.partySymbols.slice(0, appearanceCounts.partySymbol).map((name, i) => (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={draft.party.symbol === i}
              aria-label={name}
              className={styles.symbol}
              style={{ color: partyColors[draft.party.color] }}
              onClick={() => {
                onChange({ ...draft, party: { ...draft.party, symbol: i } });
              }}
            >
              <PartySymbol index={i} size={22} />
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
