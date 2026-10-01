// Hilfsskript (nur lokal): Minispiel im iPhone-Profil öffnen, laufen, Screenshots speichern.
import { webkit, devices } from '@playwright/test';

const out = process.argv[2] ?? '/tmp';
const location = process.argv[3] ?? 'workplace';
const browser = await webkit.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('CONSOLE', m.text()); });
await page.goto('http://localhost:5188/');
await page.getByTestId('new-game').click();
await page.getByTestId('character-name').fill('Ida Brandt');
await page.getByTestId('setup-next').click();
await page.getByTestId('setup-next').click();
await page.getByTestId('profession-skilled').click();
await page.getByTestId('setup-start').click();
for (const name of ['Weiter', 'Weiter', 'Los geht’s']) await page.getByRole('button', { name }).click();
const S = 'window.__idlePolitics.getState()';
await page.evaluate(`${S}.debugSetStage(11); ${S}.debugAddResources(1e12);`);
if (location !== 'workplace') {
  await page.evaluate(`(() => { const s = ${S}; s.leave(); })()`);
  await page.evaluate(`${S}.walkTo('${location}')`);
  await page.waitForTimeout(500);
  await page.evaluate(`${S}.debugTimeJump(120000, Date.now())`);
  await page.waitForTimeout(500);
  await page.evaluate(`${S}.enter()`);
}
for (let i = 0; i < 6; i++) {
  const ok = page.getByRole('dialog').getByRole('button', { name: 'OK' });
  if ((await ok.count()) === 0) break;
  await ok.first().click();
}
await page.evaluate(`${S}.openMinigame('${location}')`);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/1-start.png` });
const stage = page.locator('[role="application"]');
const box = await stage.boundingBox();
const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
async function joy(dx, dy, ms) {
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + dx, cy + dy, { steps: 3 });
  await page.waitForTimeout(ms);
  await page.mouse.up();
}
await joy(-30, -56, 1500);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/2-source.png` });
await joy(56, 20, 1600);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/3-counter.png` });
await joy(-20, 50, 600);
await page.waitForTimeout(4000);
await page.screenshot({ path: `${out}/4-cash.png` });
await browser.close();
