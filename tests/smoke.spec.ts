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

test('App startet mit Tab-Leiste, ohne Konsolenfehler', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await page.goto('./');
  for (const tab of ['career', 'network', 'invest', 'world', 'profile']) {
    await expect(page.getByTestId(`tab-${tab}`)).toBeVisible();
  }
  await page.getByTestId('tab-profile').click();
  await expect(page.getByRole('heading', { name: 'Profil' })).toBeVisible();
  await page.getByTestId('tab-world').click();
  await expect(page.getByRole('heading', { name: 'Außenpolitik' })).toBeVisible();
  expect(problems).toEqual([]);
});

test('Kein horizontales Scrollen, Tab-Leiste am unteren Rand', async ({ page }) => {
  await page.goto('./');
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  const box = await page.getByTestId('tab-career').boundingBox();
  const viewport = page.viewportSize();
  expect(box && viewport && box.y + box.height).toBeGreaterThan((viewport?.height ?? 0) - 100);
  // Tap-Fläche mindestens 44 × 44
  expect(box?.height).toBeGreaterThanOrEqual(44);
});

test('Spielstand übersteht Neuladen (Debug-Schnellstart)', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await page.goto('./?debug=1');
  await page.getByTestId('debug-open').click();
  await page.getByRole('button', { name: 'Testlauf starten (Rhenanien)' }).click();
  await expect(page.getByTestId('intro-dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Los geht’s' }).click();
  await expect(page.getByTestId('intro-dialog')).toBeHidden();

  await page.getByTestId('debug-open').click();
  await page.getByRole('button', { name: '+1.000 von allem' }).click();
  await page.getByRole('button', { name: 'Schließen' }).click();
  await expect(page.getByTestId('resource-money-amount')).toHaveText('1.000 €');

  await page.reload();
  await expect(page.getByTestId('resource-money-amount')).toHaveText('1.000 €');
  // Einführung erscheint nach dem Neuladen nicht erneut
  await expect(page.getByTestId('intro-dialog')).toHaveCount(0);
  expect(problems).toEqual([]);
});

test('Backup-Code lässt sich erzeugen und wieder einlesen', async ({ page }) => {
  await page.goto('./?debug=1');
  await page.getByTestId('debug-open').click();
  await page.getByRole('button', { name: 'Testlauf starten (Rhenanien)' }).click();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Los geht’s' }).click();
  await page.getByTestId('debug-open').click();
  await page.getByRole('button', { name: '+1.000 von allem' }).click();
  await page.getByRole('button', { name: 'Schließen' }).click();

  await page.getByTestId('tab-profile').click();
  await page.getByTestId('backup-export').click();
  const code = await page.getByTestId('backup-code').inputValue();
  expect(code).toMatch(/^IP1\./);

  // Spielstand löschen, dann per Code wiederherstellen
  page.on('dialog', (dialog) => {
    dialog.accept().catch(() => undefined);
  });
  await page.getByTestId('debug-open').click();
  await page.getByRole('button', { name: 'Spielstand zurücksetzen' }).click();
  await expect(page.getByTestId('resource-money-amount')).toHaveCount(0);

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
    // Precaching kann nach „ready“ noch kurz laufen
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
