// One-off script: genereer PWA-iconen vanuit public/favicon.svg
// Run met `node scripts/gen-pwa-icons.mjs` na elke icon-update.
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const svg = readFileSync(resolve(root, 'public/favicon.svg'));

async function render(size, outFile, opts = {}) {
  const img = sharp(svg, { density: 384 }).resize(size, size);
  if (opts.padding) {
    // Maskable: voeg safe-zone padding toe (~10% rondom)
    const inner = Math.round(size * 0.8);
    const buf = await sharp(svg, { density: 384 })
      .resize(inner, inner)
      .png()
      .toBuffer();
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 87, g: 70, b: 175, alpha: 1 },
      },
    })
      .composite([{ input: buf, gravity: 'center' }])
      .png()
      .toFile(resolve(root, 'public', outFile));
  } else {
    await img.png().toFile(resolve(root, 'public', outFile));
  }
  console.log(`Wrote ${outFile}`);
}

await render(192, 'pwa-192.png');
await render(512, 'pwa-512.png');
await render(512, 'pwa-512-maskable.png', { padding: true });
await render(180, 'apple-touch-icon.png');
