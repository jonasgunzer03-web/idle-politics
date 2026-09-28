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

/** Startablauf: Titel → Figur → Staat → Beruf → Einführung. */
async function completeSetup(page: Page, name = 'Ida Brandt') {
  await page.getByTestId('new-game').click();
  await page.getByTestId('character-name').fill(name);
  await expectNoHorizontalScroll(page);
  await page.getByTestId('setup-next').click();
  await expect(page.getByTestId('state-rhenania')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('state-novaria')).toBeDisabled();
  await expectNoHorizontalScroll(page);
  await page.getByTestId('setup-next').click();
  await page.getByTestId('profession-skilled').click();
  await page.getByTestId('setup-start').click();
  await expect(page.getByTestId('intro-dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Los geht’s' }).click();
  await expect(page.getByTestId('intro-dialog')).toBeHidden();
}

test('Kompletter Ablauf: anlegen, tippen, kaufen, neu laden', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await page.goto('./');
  await expect(page.getByTestId('title-screen')).toBeVisible();
  await completeSetup(page);

  await expect(page.getByTestId('career-title')).toHaveText('Arbeiter');
  await expect(page.getByTestId('scene')).toBeVisible();

  // Tippen, bis genug Geld für Überstunden (10 €) da ist: 0,63 € pro Tipp
  const tap = page.getByTestId('tap-work');
  for (let i = 0; i < 17; i++) await tap.click();
  await expect(page.getByTestId('resource-money-amount')).toHaveText('10 €');

  // Kaufen
  await page.getByTestId('buy-overtime').click();
  await expect(page.getByTestId('generator-overtime-owned')).toHaveText('1');
  await expect(page.getByTestId('buy-overtime')).toBeDisabled();

  // Investieren-Tab
  await page.getByTestId('tab-invest').click();
  await expect(page.getByTestId('invest-group-money')).toBeVisible();
  await expect(page.getByTestId('invest-group-followers')).toContainText('Stufe 2');
  await expectNoHorizontalScroll(page);

  // Neu laden: Spielstand ist noch da, kein Startablauf, keine Einführung
  await page.reload();
  await expect(page.getByTestId('title-screen')).toHaveCount(0);
  await expect(page.getByTestId('intro-dialog')).toHaveCount(0);
  await page.getByTestId('tab-invest').click();
  await expect(page.getByTestId('generator-overtime-owned')).toHaveText('1');

  // Das Geld wächst durch den Generator weiter
  const before = await page.getByTestId('resource-money-amount').textContent();
  await page.waitForTimeout(2500);
  const after = await page.getByTestId('resource-money-amount').textContent();
  expect(after).not.toBe(before);

  expect(problems).toEqual([]);
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
  const viewport = page.viewportSize();
  const tabBox = await page.getByTestId('tab-career').boundingBox();
  expect((tabBox?.y ?? 0) + (tabBox?.height ?? 0)).toBeGreaterThan((viewport?.height ?? 0) - 100);
  expect(problems).toEqual([]);
});

test('Anhänger ab Stufe 2 mit einmaligem Hinweis (Debug)', async ({ page }) => {
  await page.goto('./?debug=1');
  await completeSetup(page);
  await expect(page.getByTestId('resource-followers')).toHaveCount(0);
  await page.getByTestId('debug-open').click();
  await page.getByRole('button', { name: 'Zu Stufe springen 2' }).click();
  // Nie zwei Overlays gleichzeitig: Das Debug-Menü schließt sich, der Hinweis erscheint
  await expect(page.getByTestId('debug-menu')).toHaveCount(0);
  await expect(page.getByTestId('hint-followersUnlocked')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.getByTestId('hint-followersUnlocked').getByRole('button', { name: 'OK' }).click();
  await expect(page.getByTestId('resource-followers')).toBeVisible();
  await expect(page.getByTestId('career-title')).toHaveText('Betriebsrat');
  await page.reload();
  await expect(page.getByTestId('hint-followersUnlocked')).toHaveCount(0);
});

test('Offline-Fortschritt über Zeitsprung (Debug)', async ({ page }) => {
  await page.goto('./?debug=1');
  await completeSetup(page);
  await page.getByTestId('debug-open').click();
  await page.getByRole('button', { name: '+1.000 von allem' }).click();
  await page.getByRole('button', { name: 'Schließen' }).click();
  await page.getByTestId('buy-overtime').click();
  await page.getByTestId('debug-open').click();
  await page.getByRole('button', { name: 'Zeitsprung +1 Std.' }).click();
  await expect(page.getByTestId('offline-dialog')).toBeVisible();
  await expect(page.getByTestId('offline-dialog')).toContainText('1 Std.');
  await page.getByTestId('offline-dialog').getByRole('button', { name: 'OK' }).click();
  await expect(page.getByTestId('offline-dialog')).toBeHidden();
});

test('Backup-Code lässt sich erzeugen und wieder einlesen', async ({ page }) => {
  await page.goto('./?debug=1');
  await completeSetup(page);
  await page.getByTestId('debug-open').click();
  await page.getByRole('button', { name: '+1.000 von allem' }).click();
  await page.getByRole('button', { name: 'Schließen' }).click();

  await page.getByTestId('tab-profile').click();
  await page.getByTestId('backup-export').click();
  const code = await page.getByTestId('backup-code').inputValue();
  expect(code).toMatch(/^IP1\./);

  page.on('dialog', (dialog) => {
    dialog.accept().catch(() => undefined);
  });
  await page.getByTestId('debug-open').click();
  await page.getByRole('button', { name: 'Spielstand zurücksetzen' }).click();
  await expect(page.getByTestId('title-screen')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('title-screen')).toBeVisible();

  // Wiederherstellen: neuen Durchlauf anlegen, Code im Profil einfügen
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

  // Offline-Fähigkeit: Der Service Worker muss alle Dateien vorab im Cache ablegen.
  // (Playwright-WebKit kann Service Worker nicht mit simuliertem Offline-Modus testen,
  // deshalb wird der Cache-Inhalt geprüft.)
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
  expect(cached.some((u) => /\/assets\/.+\.css$/.test(u))).toBe(true);
  expect(cached.some((u) => u.endsWith('.woff2'))).toBe(true);
  expect(cached).toContain('/icons/icon-192.png');
});
