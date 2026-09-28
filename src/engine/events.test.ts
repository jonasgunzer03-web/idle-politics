import { cfg, playingGame, runOf } from '../test/fixtures';
import { zeroResources } from './economy';
import { applyEffect, drawEvent, findEvent, resolveEvent, tickEvents } from './events';
import { de } from '../i18n/de';
import { nextRequirement } from './rules';
import type { GameState } from './schema';

function drawMany(game: GameState, n: number): GameState {
  let g = game;
  for (let i = 0; i < n; i++) g = drawEvent(g, cfg);
  return g;
}

describe('Ereigniskarten', () => {
  it('es gibt mindestens 30 Karten, alle mit Text', () => {
    expect(cfg.events.length).toBeGreaterThanOrEqual(30);
    const texts: Record<string, unknown> = de.events;
    for (const e of cfg.events) expect(texts[e.id]).toBeDefined();
  });

  it('Karten kommen erst, wenn ihre Zeit erreicht ist', () => {
    const game = playingGame({ events: { open: [], nextAt: 10_000, crisisAt: null }, playMs: 5_000 });
    expect(runOf(tickEvents(game, cfg)).events.open).toHaveLength(0);
    const due = playingGame({ events: { open: [], nextAt: 10_000, crisisAt: null }, playMs: 10_000 });
    const next = runOf(tickEvents(due, cfg));
    expect(next.events.open).toHaveLength(1);
    expect(next.events.nextAt).toBeGreaterThanOrEqual(10_000 + 120_000);
    expect(next.events.nextAt).toBeLessThanOrEqual(10_000 + 240_000);
  });

  it('höchstens drei offene Karten, keine doppelte', () => {
    const run = runOf(drawMany(playingGame({ stage: 5 }), 10));
    expect(run.events.open).toHaveLength(3);
    expect(new Set(run.events.open.map((o) => o.id)).size).toBe(3);
  });

  it('Bedingungen: Stufe, Staat, Pfad', () => {
    for (let seed = 1; seed < 40; seed++) {
      const game = { ...playingGame({ stage: 2 }), rngState: seed };
      const card = runOf(drawEvent(game, cfg)).events.open[0];
      const def = card ? findEvent(card.id, cfg) : undefined;
      expect(def).toBeDefined();
      if (!def) continue;
      expect(def.minStage).toBeLessThanOrEqual(2);
      expect(def.maxStage).toBeGreaterThanOrEqual(2);
      expect(def.states === undefined || def.states.includes('rhenania')).toBe(true);
      expect(def.path === undefined || def.path === 'democratic').toBe(true);
      expect(def.foreign).not.toBe(true);
    }
  });

  it('Krisenkarten nur bei schlechten Beziehungen ohne Bündnis', () => {
    const good = playingGame({ stage: 9 });
    expect(runOf(drawEvent(good, cfg, true)).events.open).toHaveLength(0);
    const bad = playingGame({ stage: 9, relations: { borealis: -60 } });
    const card = runOf(drawEvent(bad, cfg, true)).events.open[0];
    expect(card?.target).toBe('borealis');
    expect(findEvent(card?.id ?? '', cfg)?.crisis).toBe(true);
    const allied = playingGame({
      stage: 9,
      relations: { borealis: -60 },
      treaties: { borealis: { trade: false, alliance: true } },
    });
    expect(runOf(drawEvent(allied, cfg, true)).events.open).toHaveLength(0);
  });

  it('Antwort wirkt genau einmal und entfernt die Karte', () => {
    const game = playingGame({ stage: 3, events: { open: [{ id: 'constructionDonation', target: null }], nextAt: 1e12, crisisAt: null } });
    const next = resolveEvent(game, 0, 'yes', cfg);
    const req = nextRequirement(runOf(game), cfg);
    expect(runOf(next).resources.money).toBeCloseTo(0.3 * req.money);
    expect(runOf(next).approval).toBe(47);
    expect(runOf(next).events.open).toHaveLength(0);
    expect(next.meta.eventsResolved).toBe(1);
    expect(resolveEvent(next, 0, 'yes', cfg)).toBe(next);
  });

  it('Verluste treiben nichts ins Minus', () => {
    const run = runOf(playingGame({ resources: zeroResources() }));
    const after = applyEffect(run, { money: -0.5, approval: -200 }, null, cfg);
    expect(after.resources.money).toBe(0);
    expect(after.approval).toBe(0);
  });

  it('Novaria: Zustimmung schwankt stärker', () => {
    const nov = runOf(playingGame({}, { stateId: 'novaria' }));
    expect(applyEffect(nov, { approval: 4 }, null, cfg).approval).toBe(56);
  });

  it('außerhalb des Spiels keine Karten', () => {
    const game = { ...playingGame({ events: { open: [], nextAt: 0, crisisAt: null } }), phase: 'ceremony' as const };
    expect(tickEvents(game, cfg)).toBe(game);
  });
});
