// Hilfsskript (nur lokal, braucht `npm run dev` auf Port 5188): Screenshots einzelner
// Bildschirme im iPhone-Profil. Aufruf: node scripts/shots.mjs <ordner> <szene> [<szene> …]
// Szenen: career, vote, party, events, world, invest, profile, network, setup
import { devices, webkit } from '@playwright/test';

const [out = '/tmp', ...scenes] = process.argv.slice(2);
const browser = await webkit.launch();
const S = 'window.__idlePolitics.getState()';

async function fresh() {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') console.log('CONSOLE', m.text());
  });
  await page.goto('http://localhost:5188/');
  return page;
}

async function setup(page) {
  await page.getByTestId('new-game').click();
  await page.getByTestId('character-name').fill('Ida Brandt');
  await page.getByTestId('setup-next').click();
  await page.getByTestId('setup-next').click();
  await page.getByTestId('profession-skilled').click();
  await page.getByTestId('setup-start').click();
  for (const name of ['Weiter', 'Weiter', 'Los geht’s'])
    await page.getByRole('button', { name }).click();
}

async function closeDialogs(page) {
  for (let i = 0; i < 8; i++) {
    const ok = page.getByRole('dialog').getByRole('button', { name: 'OK' });
    if ((await ok.count()) === 0) return;
    await ok.first().click();
  }
}

async function goInside(page, location) {
  await page.evaluate(`${S}.leave()`);
  await page.evaluate(`${S}.walkTo('${location}')`);
  await page.evaluate(`${S}.debugTimeJump(120000, Date.now())`);
  await page.waitForTimeout(300);
  await page.evaluate(`${S}.enter()`);
  await page.waitForTimeout(300);
  await closeDialogs(page);
}

for (const scene of scenes) {
  const page = await fresh();
  if (scene === 'setup') {
    await page.screenshot({ path: `${out}/${scene}-title.png` });
    await page.getByTestId('new-game').click();
    await page.screenshot({ path: `${out}/${scene}-character.png` });
    await page.close();
    continue;
  }
  await setup(page);
  await page.evaluate(
    `${S}.debugSetStage(${scene === 'world' ? 9 : 6}); ${S}.debugAddResources(1e9);`,
  );
  await closeDialogs(page);
  if (scene === 'production') {
    await page.evaluate(`${S}.debugSetStage(1)`);
    await closeDialogs(page);
    await page.locator('main').evaluate((m) => (m.scrollTop = 520));
    for (let i = 0; i < 14; i++) {
      await closeDialogs(page);
      await page.getByTestId('tap-work').click({ timeout: 3000 });
    }
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${out}/${scene}.png` });
  } else if (scene === 'career') {
    await page.screenshot({ path: `${out}/${scene}.png` });
  } else if (scene === 'vote' || scene === 'party') {
    await goInside(page, scene === 'vote' ? 'townHall' : 'partyOffice');
    await page.evaluate(`window.scrollTo(0, 0)`);
    const panel = page.getByTestId('location-inside');
    await panel.scrollIntoViewIfNeeded();
    await page.locator('main').evaluate((m) => (m.scrollTop = 900));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/${scene}.png` });
  } else if (scene === 'events') {
    await page.evaluate(`${S}.debugTriggerEvent()`);
    await closeDialogs(page);
    await page.getByTestId('events-badge').click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${out}/${scene}.png` });
  } else {
    await page.getByTestId(`tab-${scene}`).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${out}/${scene}.png` });
  }
  await page.close();
}
await browser.close();
