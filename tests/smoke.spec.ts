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
  for (let i = 0; i < 17; i++) await tap.click();
  await expect(page.getByTestId('resource-money-amount')).toHaveText('10 €');

  // Kaufen im Investieren-Tab
  await page.getByTestId('tab-invest').click();
  await page.getByTestId('buy-overtime').click();
  await expect(page.getByTestId('generator-overtime-owned')).toHaveText('1');
  await expect(page.getByTestId('buy-overtime')).toBeDisabled();
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
