import { expect, test, type Page } from '@playwright/test';

// Smoke-Test im iPhone-13-Profil (WebKit). Läuft gegen den Produktions-Build (vite preview).

function collectConsoleProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') problems.push(msg.text());
  });
  page.on('pageerror', (err) => problems.push(err.message));
  return problems;
}

async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

/** Alle wartenden Dialoge (Hinweise) mit OK schließen. */
async function closeDialogs(page: Page) {
  for (let i = 0; i < 10; i++) {
    const ok = page.getByRole('dialog').getByRole('button', { name: 'OK' });
    if ((await ok.count()) === 0) return;
    await ok.first().click();
  }
}

/** Startablauf: Titel → Figur → Staat → Beruf → Einführung. */
async function completeSetup(page: Page, name = 'Ida Brandt') {
  await page.getByTestId('new-game').click();
  await page.getByTestId('character-name').fill(name);
  await expectNoHorizontalScroll(page);
  await page.getByTestId('setup-next').click();
  await expect(page.getByTestId('state-rhenania')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('setup-next').click();
  await page.getByTestId('profession-skilled').click();
  await page.getByTestId('setup-start').click();
  await expect(page.getByTestId('intro-dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Los geht’s' }).click();
  await expect(page.getByTestId('intro-dialog')).toBeHidden();
}

/** Store im Debug-Modus direkt ansprechen (nur für Testabkürzungen). */
async function debug(page: Page, code: string) {
  await page.evaluate(code);
}

test('Kompletter Ablauf: anlegen, arbeiten, kaufen, neu laden', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await page.goto('./');
  await expect(page.getByTestId('title-screen')).toBeVisible();
  await completeSetup(page);

  // Start im Werk (drinnen)
  await expect(page.getByTestId('world-view')).toHaveAttribute('data-mode', 'inside');
  const tap = page.getByTestId('tap-work');
  // Nach fünf Schichten erklärt ein Hinweis die Produktionskette
  for (let i = 0; i < 5; i++) await tap.click();
  await closeDialogs(page);
  // 0,315 € Lohn je Schicht, schnelles Tippen gibt Kombo-Bonus: nach 32 Schichten ≥ 10 €
  for (let i = 0; i < 27; i++) await tap.click();
  await expect(page.getByTestId('combo')).not.toContainText('×1,0');
  const money = await page.getByTestId('resource-money-amount').textContent();
  expect(Number((money ?? '0').replace(/[^\d,]/g, '').replace(',', '.'))).toBeGreaterThanOrEqual(
    10,
  );

  // Kaufen im Investieren-Tab
  await page.getByTestId('tab-invest').click();
  await page.getByTestId('buy-overtime').click();
  await expect(page.getByTestId('generator-overtime-owned')).toHaveText('1');
  // Der nächste Kauf ist teurer (10 € → 12 €)
  await expect(page.getByTestId('buy-overtime')).toHaveAttribute('aria-label', /12 €/);
  await expectNoHorizontalScroll(page);

  // Neu laden: Spielstand ist noch da
  await page.reload();
  await expect(page.getByTestId('title-screen')).toHaveCount(0);
  await expect(page.getByTestId('intro-dialog')).toHaveCount(0);
  await page.getByTestId('tab-invest').click();
  await expect(page.getByTestId('generator-overtime-owned')).toHaveText('1');
  expect(problems).toEqual([]);
});

test('Durch die Welt laufen, hineingehen und netzwerken', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await page.goto('./');
  await completeSetup(page);
  await page.getByTestId('leave').click();
  await expect(page.getByTestId('world-view')).toHaveAttribute('data-mode', 'street');
  await page.getByTestId('dest-pub').click();
  // Zu Fuß etwa 2 Sekunden
  await expect(page.getByTestId('location-outside')).toContainText('Eckkneipe', { timeout: 6000 });
  await page.getByTestId('enter').click();
  // 0,75 Einfluss je Gespräch: nach drei Gesprächen wird „2“ angezeigt
  for (let i = 0; i < 3; i++) await page.getByTestId('tap-network').click();
  await expect(page.getByTestId('resource-influence-amount')).toHaveText('2');
  // Tippen auf ein Gebäude in der Straße lässt die Figur ebenfalls losgehen
  await page.getByTestId('leave').click();
  await page.getByTestId('goto-partyOffice').click();
  await expect(page.getByTestId('location-outside')).toContainText('Parteibüro', {
    timeout: 6000,
  });
  expect(problems).toEqual([]);
});

test('Produktionskette, Ausbau und Beschluss im Parteibüro', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await page.goto('./?debug=1');
  await completeSetup(page);
  // Im Werk Waren herstellen, auf dem Markt verkaufen
  for (let i = 0; i < 5; i++) await page.getByTestId('tap-work').click();
  await closeDialogs(page);
  await page.getByTestId('leave').click();
  await page.getByTestId('dest-market').click();
  await expect(page.getByTestId('location-outside')).toContainText('Marktplatz', { timeout: 8000 });
  await page.getByTestId('enter').click();
  const before = await page.getByTestId('resource-money-amount').textContent();
  await page.getByTestId('tap-sell').click();
  await expect(page.getByTestId('resource-money-amount')).not.toHaveText(before ?? '');
  // Mit Startgeld aus dem Debug-Menü: Händler einstellen und den Markt ausbauen
  await debug(page, 'window.__idlePolitics.getState().debugAddResources(1e6)');
  await page.getByTestId('hire-sell').click();
  await expect(page.getByTestId('action-sell')).toContainText('1 Mitarbeiter');
  await page.getByTestId('tab-build').click();
  await page.getByTestId('upgrade-building').click();
  await expect(page.getByTestId('building-card')).toContainText('Wochenmarkt');
  await page.getByTestId('tab-team').click();
  await expect(page.getByTestId('location-inside')).toContainText('Händler');
  // Im Parteibüro einen Beschluss fassen
  await page.getByTestId('leave').click();
  await page.getByTestId('dest-partyOffice').click();
  await expect(page.getByTestId('location-outside')).toContainText('Parteibüro', { timeout: 8000 });
  await page.getByTestId('enter').click();
  await expect(page.getByTestId('agenda')).toBeVisible();
  await page.locator('[data-testid^="proposal-"]').first().click();
  await expect(page.getByTestId('policy-sheet')).toBeVisible();
  await page.getByTestId('enact').click();
  await expect(page.getByTestId('policy-sheet')).toBeHidden();
  await expect(page.getByTestId('laws')).not.toContainText('Noch nichts beschlossen');
  // Die Chronik berichtet davon
  await page.getByTestId('ticker').click();
  await expect(page.getByTestId('chronicle-sheet')).toContainText('Beschlossen');
  await expectNoHorizontalScroll(page);
  expect(problems).toEqual([]);
});

test('Aufstieg mit Zeremonie (Ernennung, Debug-Abkürzung)', async ({ page }) => {
  await page.goto('./?debug=1');
  await completeSetup(page);
  await debug(
    page,
    '(() => { const s = window.__idlePolitics.getState(); s.debugSetStage(6); s.debugAddResources(1e9); })()',
  );
  await closeDialogs(page);
  await page.getByTestId('career-go').click();
  await expect(page.getByTestId('location-outside')).toContainText('Rathaus', { timeout: 10_000 });
  await page.getByTestId('enter').click();
  await page.getByTestId('career-open').click();
  await page.getByTestId('promote').click();
  await expect(page.getByTestId('ceremony')).toBeVisible();
  await expect(page.getByTestId('ceremony-title')).toHaveText('Landesminister');
  // Die Zeremonie endet von selbst
  await expect(page.getByTestId('ceremony')).toBeHidden({ timeout: 10_000 });
  await closeDialogs(page);
  await expect(page.getByTestId('career-card')).toContainText('Ministerpräsident');
});

test('Entscheidungskarte per Wischen beantworten', async ({ page }) => {
  await page.goto('./?debug=1');
  await completeSetup(page);
  await debug(page, 'window.__idlePolitics.getState().debugTriggerEvent()');
  await closeDialogs(page);
  await page.getByTestId('events-badge').click();
  const card = page.getByTestId('event-card');
  await expect(card).toBeVisible();
  // Warten, bis das Fenster fertig hochgefahren ist (sonst stimmt die Position nicht)
  await page.waitForTimeout(400);
  const box = await card.boundingBox();
  if (!box) throw new Error('Karte nicht sichtbar');
  const y = box.y + box.height / 2;
  const x = box.x + box.width / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 80, y, { steps: 5 });
  await page.mouse.move(x + 220, y, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByTestId('events-sheet')).toBeHidden();
  await expect(page.getByTestId('events-badge')).toBeDisabled();
});

test('Sturz beendet den Durchlauf, Neustart in einem anderen Staat', async ({ page }) => {
  await page.goto('./?debug=1');
  await completeSetup(page);
  await debug(page, 'window.__idlePolitics.getState().debugOverthrow()');
  await expect(page.getByTestId('run-end')).toBeVisible();
  await page.getByTestId('run-end-continue').click();
  await page.getByTestId('state-borealis').click();
  await page.getByTestId('setup-next').click();
  await page.getByTestId('profession-office').click();
  await page.getByTestId('setup-start').click();
  await expect(page.getByTestId('world-view')).toBeVisible();
  await page.getByTestId('tab-profile').click();
  await expect(page.getByText('Ida Brandt')).toBeVisible();
});

test('Tab-Leiste, Layout und Tap-Flächen', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await page.goto('./');
  await completeSetup(page);
  for (const tab of ['career', 'network', 'invest', 'world', 'profile']) {
    await page.getByTestId(`tab-${tab}`).click();
    await expectNoHorizontalScroll(page);
    const box = await page.getByTestId(`tab-${tab}`).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  expect(problems).toEqual([]);
});

test('Backup-Code lässt sich erzeugen und wieder einlesen', async ({ page }) => {
  await page.goto('./?debug=1');
  await completeSetup(page);
  await debug(page, 'window.__idlePolitics.getState().debugAddResources(1000)');
  await page.getByTestId('tab-profile').click();
  await page.getByTestId('backup-export').click();
  const code = await page.getByTestId('backup-code').inputValue();
  expect(code).toMatch(/^IP1\./);
  page.on('dialog', (dialog) => {
    dialog.accept().catch(() => undefined);
  });
  await debug(page, 'window.__idlePolitics.getState().resetGame(Date.now())');
  await expect(page.getByTestId('title-screen')).toBeVisible();
  await completeSetup(page, 'Temp Person');
  await page.getByTestId('tab-profile').click();
  await page.getByTestId('backup-input').fill(code);
  await page.getByTestId('backup-import').click();
  await expect(page.getByText('Spielstand geladen.')).toBeVisible();
  await expect(page.getByTestId('resource-money-amount')).toHaveText('1.000 €');
});

test('PWA: Manifest und Offline-Cache', async ({ page }) => {
  await page.goto('./');
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBeTruthy();
  const manifest = await page.evaluate(async (href) => {
    const res = await fetch(href);
    return (await res.json()) as { start_url: string; scope: string; display: string };
  }, manifestHref ?? '');
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('/');
  expect(manifest.scope).toBe('/');
  // Playwright-WebKit kann Service Worker nicht mit simuliertem Offline-Modus testen,
  // deshalb wird geprüft, dass alle Dateien vorab im Cache liegen.
  const cached = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    for (let i = 0; i < 50; i++) {
      const urls: string[] = [];
      for (const key of await caches.keys()) {
        const cache = await caches.open(key);
        for (const req of await cache.keys()) urls.push(new URL(req.url).pathname);
      }
      if (urls.some((u) => u.endsWith('.woff2'))) return urls;
      await new Promise((r) => setTimeout(r, 100));
    }
    return [];
  });
  expect(cached).toContain('/index.html');
  expect(cached.some((u) => /\/assets\/.+\.js$/.test(u))).toBe(true);
  expect(cached.some((u) => u.endsWith('.woff2'))).toBe(true);
  expect(cached).toContain('/icons/icon-192.png');
});

test('Minispiel „Selbst anpacken“ öffnen, laufen, verdienen und schließen', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await page.goto('./?debug=1');
  await completeSetup(page);
  await closeDialogs(page);
  await page.getByTestId('play-minigame').click();
  await expect(page.getByTestId('minigame')).toBeVisible();
  const stage = page.getByRole('application');
  await expect(stage.locator('canvas')).toBeVisible();
  // Joystick: zur Maschine, zur Theke, zur Kasse. Gesteuert wird nach der gemeldeten
  // Position, damit der Test auch auf langsamen Rechnern (Software-Grafik) klappt.
  const box = await stage.boundingBox();
  if (!box) throw new Error('Spielfläche nicht sichtbar');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const state = async () =>
    stage.evaluate((el) => {
      const d = (el as HTMLElement).dataset;
      return {
        x: Number(d.px ?? 0),
        z: Number(d.pz ?? 0),
        carry: Number(d.carry ?? 0),
        counter: Number(d.counter ?? 0),
      };
    });
  const walkTo = async (tx: number, tz: number, reach = 0.6) => {
    for (let i = 0; i < 60; i++) {
      const s = await state();
      const dx = tx - s.x;
      const dz = tz - s.z;
      const d = Math.hypot(dx, dz);
      if (d < reach) return;
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx + (dx / d) * 50, cy + (dz / d) * 50, { steps: 2 });
      await page.waitForTimeout(Math.min(600, 150 + d * 120));
      await page.mouse.up();
    }
  };
  const before = await page.getByTestId('resource-money-amount').first().textContent();
  await walkTo(-3.4, -3.6);
  await expect.poll(async () => (await state()).carry, { timeout: 15_000 }).toBeGreaterThan(0);
  await page.waitForTimeout(800);
  await walkTo(2.5, -1.6, 0.4);
  await expect.poll(async () => (await state()).carry, { timeout: 15_000 }).toBe(0);
  // Kunden kaufen; danach das Geld an der Kasse einsammeln
  await expect
    .poll(async () => stage.evaluate((el) => Number((el as HTMLElement).dataset.cash ?? 0)), {
      timeout: 30_000,
    })
    .toBeGreaterThan(0);
  await walkTo(1.6, 0.9, 0.5);
  await expect(page.getByTestId('resource-money-amount').first()).not.toHaveText(before ?? '', {
    timeout: 15_000,
  });
  await page.getByTestId('minigame-close').click();
  await expect(page.getByTestId('minigame')).toBeHidden();
  expect(problems).toEqual([]);
});

test('Gesetz per Wisch-Karte im Rathaus beschließen', async ({ page }) => {
  await page.goto('./?debug=1');
  await completeSetup(page);
  await debug(
    page,
    '(() => { const s = window.__idlePolitics.getState(); s.debugSetStage(5); s.debugAddResources(1e9); })()',
  );
  await closeDialogs(page);
  await page.getByTestId('leave').click();
  await page.getByTestId('dest-townHall').click();
  await expect(page.getByTestId('location-outside')).toContainText('Rathaus', { timeout: 10_000 });
  await page.getByTestId('enter').click();
  await closeDialogs(page);
  const card = page.getByTestId('law-card');
  await expect(card).toBeVisible();
  const policy = await card.getAttribute('data-policy');
  await card.scrollIntoViewIfNeeded();
  const box = await card.boundingBox();
  if (!box) throw new Error('Karte nicht sichtbar');
  const x = box.x + box.width / 2;
  const y = box.y + 60;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 80, y, { steps: 5 });
  await page.mouse.move(x + 220, y, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator(`[data-testid="law-card"][data-policy="${policy}"]`)).toHaveCount(0);
  await expect(page.getByTestId('laws')).not.toContainText('Noch nichts beschlossen');
});
