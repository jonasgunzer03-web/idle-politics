import { useState, type ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Figure } from '../../art/figure/Figure';
import { outfitFor } from '../../art/figure/outfit';
import { Flag } from '../../art/flag/Flag';
import { defaultConfig } from '../../config';
import { PROFESSION_IDS, STATE_IDS, type ProfessionId, type StateId } from '../../engine/ids';
import { randomSeed } from '../../engine/rng';
import { characterSchema, type Character } from '../../engine/schema';
import { de, fill } from '../../i18n/de';
import { gameStore } from '../../store';
import { Button } from '../components/Button';
import { CharacterEditor } from '../components/CharacterEditor';
import { randomCharacter } from '../characterDefaults';
import styles from './SetupFlow.module.css';

type Step = 'title' | 'character' | 'state' | 'profession';
const STEPS: Step[] = ['character', 'state', 'profession'];
const cfg = defaultConfig;

function StepFrame({
  step,
  title,
  onBack,
  children,
  action,
}: {
  step: Step;
  title: string;
  /** Fehlt beim Neustart nach einem Durchlauf (kein Schritt davor). */
  onBack?: () => void;
  children: ReactNode;
  action: ReactNode;
}) {
  return (
    <div className={styles.frame}>
      <header className={styles.frameHeader}>
        {onBack ? (
          <button type="button" className={styles.back} onClick={onBack} aria-label={de.setup.back}>
            <ChevronLeft size={24} aria-hidden="true" />
          </button>
        ) : (
          <span className={styles.back} aria-hidden="true" />
        )}
        <div>
          <p className={styles.stepOf}>
            {fill(de.setup.stepOf, { current: STEPS.indexOf(step) + 1, total: STEPS.length })}
          </p>
          <h1 className={styles.frameTitle}>{title}</h1>
        </div>
      </header>
      <div className={styles.frameBody}>{children}</div>
      <footer className={styles.frameFooter}>{action}</footer>
    </div>
  );
}

function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className={styles.title} data-testid="title-screen">
      <div className={styles.titleInner}>
        <img src={`${import.meta.env.BASE_URL}icons/icon.svg`} alt="" className={styles.emblem} />
        <h1 className={styles.titleHeading}>{de.appName}</h1>
        <p className={styles.subtitle}>{de.title.subtitle}</p>
      </div>
      <div className={styles.titleFooter}>
        <Button block onClick={onStart} data-testid="new-game">
          {de.title.newGame}
        </Button>
        <p className={styles.disclaimer}>{de.title.disclaimer}</p>
      </div>
    </div>
  );
}

function CharacterStep({
  draft,
  onChange,
  onBack,
  onNext,
}: {
  draft: Character;
  onChange: (c: Character) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const valid = characterSchema.safeParse(draft).success;
  return (
    <StepFrame
      step="character"
      title={de.setup.character.title}
      onBack={onBack}
      action={
        <Button block disabled={!valid} onClick={onNext} data-testid="setup-next">
          {de.setup.next}
        </Button>
      }
    >
      <CharacterEditor draft={draft} onChange={onChange} outfit="overalls" full />
    </StepFrame>
  );
}

function Dots({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.rating}>
      <span>{label}</span>
      <span className={styles.dots} aria-label={fill(de.setup.state.rating, { value })}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={n <= value ? styles.dotOn : styles.dotOff} />
        ))}
      </span>
    </div>
  );
}

function StateStep({
  value,
  onChange,
  onBack,
  onNext,
}: {
  value: StateId;
  onChange: (s: StateId) => void;
  onBack?: () => void;
  onNext: () => void;
}) {
  return (
    <StepFrame
      step="state"
      title={de.setup.state.title}
      onBack={onBack}
      action={
        <Button
          block
          disabled={!cfg.states[value].playable}
          onClick={onNext}
          data-testid="setup-next"
        >
          {de.setup.next}
        </Button>
      }
    >
      <div className={styles.cards} role="radiogroup" aria-label={de.setup.state.title}>
        {STATE_IDS.map((id) => {
          const def = cfg.states[id];
          const text = de.states[id];
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={value === id}
              disabled={!def.playable}
              className={styles.card}
              style={{ ['--card-accent' as string]: def.palette.primary }}
              onClick={() => {
                onChange(id);
              }}
              data-testid={`state-${id}`}
            >
              <div className={styles.cardHead}>
                <Flag flag={def.flag} width={44} />
                <div className={styles.cardTitles}>
                  <span className={styles.cardName}>{text.name}</span>
                  <span className={styles.cardSub}>{text.government}</span>
                </div>
                {!def.playable && <span className={styles.badge}>{de.setup.state.soon}</span>}
              </div>
              <ul className={styles.effects}>
                {text.pros.map((p) => (
                  <li key={p} className={styles.pro}>
                    {p}
                  </li>
                ))}
                {text.cons.map((c) => (
                  <li key={c} className={styles.con}>
                    {c}
                  </li>
                ))}
              </ul>
              <div className={styles.ratings}>
                <Dots label={de.setup.state.tempo} value={def.tempo} />
                <Dots label={de.setup.state.risk} value={def.risk} />
              </div>
            </button>
          );
        })}
      </div>
    </StepFrame>
  );
}

function ProfessionStep({
  value,
  character,
  onChange,
  onBack,
  onStart,
}: {
  value: ProfessionId | null;
  character: Character;
  onChange: (p: ProfessionId) => void;
  onBack: () => void;
  onStart: () => void;
}) {
  return (
    <StepFrame
      step="profession"
      title={de.setup.profession.title}
      onBack={onBack}
      action={
        <Button block disabled={value === null} onClick={onStart} data-testid="setup-start">
          {de.setup.start}
        </Button>
      }
    >
      <div className={styles.cards} role="radiogroup" aria-label={de.setup.profession.title}>
        {PROFESSION_IDS.map((id) => {
          const text = de.professions[id];
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={value === id}
              className={`${styles.card} ${styles.professionCard}`}
              onClick={() => {
                onChange(id);
              }}
              data-testid={`profession-${id}`}
            >
              <div className={styles.professionFigure}>
                <Figure
                  character={character}
                  outfit={outfitFor({ profession: id })}
                  animated={false}
                />
              </div>
              <div>
                <span className={styles.cardName}>{text.name}</span>
                <p className={styles.cardSub}>{text.text}</p>
                <ul className={styles.effects}>
                  {text.pros.map((e) => (
                    <li key={e} className={styles.pro}>
                      {e}
                    </li>
                  ))}
                  {text.cons.map((e) => (
                    <li key={e} className={styles.con}>
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            </button>
          );
        })}
      </div>
    </StepFrame>
  );
}

/** Startablauf: Titel → Figur → Staat → Beruf. Danach beginnt der Durchlauf. */
export function SetupFlow() {
  const existing = gameStore.getState().game.character;
  // Nach einem Sturz oder Ruhestand: Charakter bleibt, es geht direkt zur Staatswahl
  const restart = existing !== null;
  const [step, setStep] = useState<Step>(restart ? 'state' : 'title');
  const [draft, setDraft] = useState<Character>(() => existing ?? randomCharacter(randomSeed()));
  const [stateId, setStateId] = useState<StateId>('rhenania');
  const [profession, setProfession] = useState<ProfessionId | null>(null);

  const start = () => {
    if (!profession) return;
    const character = characterSchema.safeParse({ ...draft, name: draft.name.trim() });
    if (!character.success) {
      setStep('character');
      return;
    }
    gameStore
      .getState()
      .beginRun(
        restart ? { stateId, profession } : { character: character.data, stateId, profession },
        Date.now(),
      );
  };

  switch (step) {
    case 'title':
      return (
        <TitleScreen
          onStart={() => {
            setStep('character');
          }}
        />
      );
    case 'character':
      return (
        <CharacterStep
          draft={draft}
          onChange={setDraft}
          onBack={() => {
            setStep('title');
          }}
          onNext={() => {
            setStep('state');
          }}
        />
      );
    case 'state':
      return (
        <StateStep
          value={stateId}
          onChange={setStateId}
          onBack={
            restart
              ? undefined
              : () => {
                  setStep('character');
                }
          }
          onNext={() => {
            setStep('profession');
          }}
        />
      );
    case 'profession':
      return (
        <ProfessionStep
          value={profession}
          character={draft}
          onChange={setProfession}
          onBack={() => {
            setStep('state');
          }}
          onStart={start}
        />
      );
  }
}
