// Erzeugt die PNG-Icons (180, 192, 512 px) aus assets/icon.svg.
// Aufruf: npm run icons
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = `${root}assets/icon.svg`;
const outDir = `${root}public/icons`;
const svg = readFileSync(source, 'utf8');

const targets: { file: string; size: number }[] = [
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
];

mkdirSync(outDir, { recursive: true });
for (const { file, size } of targets) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync(`${outDir}/${file}`, png);
  console.log(`✓ ${file} (${size}×${size})`);
}
copyFileSync(source, `${outDir}/icon.svg`);
console.log('✓ icon.svg');
