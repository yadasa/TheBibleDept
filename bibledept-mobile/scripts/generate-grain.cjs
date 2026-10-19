#!/usr/bin/env node
/** Rasterize the former GrainBackground SVG; Sharp is a generation-only tool. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
const sharpOption = args.indexOf('--sharp-module');
const sharp = require(sharpOption >= 0 ? args[sharpOption + 1] : 'sharp');
const checkOnly = args.includes('--check');
const root = path.resolve(__dirname, '..');
const directory = path.join(root, 'assets', 'grain');
const palette = fs.readFileSync(path.join(root, 'src', 'themeColors.ts'), 'utf8');
const tileSize = 120;

// The original seed, integer overflow, draw order and four random draws per
// fleck are preserved. Do not round coordinates: SVG handles their subpixels.
let seed = 1729;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}
const flecks = Array.from({ length: 1000 }, () => ({
  x: random() * tileSize,
  y: random() * tileSize,
  size: 0.7 + random() * 0.7,
  opacity: 0.3 + random() * 0.7,
}));

function svg(color, tiles = 1) {
  const rects = flecks.map(fleck =>
    `<rect x="${fleck.x}" y="${fleck.y}" width="${fleck.size}" height="${fleck.size}" opacity="${fleck.opacity}" fill="${color}"/>`,
  ).join('');
  const contents = tiles === 1 ? rects :
    `<defs><pattern id="grain" width="120" height="120" patternUnits="userSpaceOnUse">${rects}</pattern></defs><rect width="100%" height="100%" fill="url(#grain)"/>`;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tileSize * tiles}" height="${tileSize * tiles}">${contents}</svg>`);
}

async function pixels(input) {
  return sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

function repeatedPixels(tile, scale, tiles = 3) {
  const side = tileSize * scale;
  const width = side * tiles;
  const repeated = Buffer.alloc(width * width * 4);
  for (let y = 0; y < width; y++) {
    for (let x = 0; x < tiles; x++) {
      tile.copy(repeated, (y * width + x * side) * 4, (y % side) * side * 4, ((y % side) + 1) * side * 4);
    }
  }
  return repeated;
}

async function main() {
  fs.mkdirSync(directory, { recursive: true });
  let totalBytes = 0;
  for (const mode of ['dark', 'light']) {
    const color = palette.match(new RegExp(`${mode}:\\s*\\{[\\s\\S]*?ink:\\s*"(#[0-9A-Fa-f]{6})"`))?.[1];
    assert.ok(color, `Missing ${mode} theme ink`);
    for (const scale of [1, 2, 3]) {
      const name = `grain-${mode}${scale === 1 ? '' : `@${scale}x`}.png`;
      const file = path.join(directory, name);
      const image = await sharp(svg(color), { density: 72 * scale })
        .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
      if (!checkOnly) fs.writeFileSync(file, image);
      const actual = await pixels(fs.readFileSync(file));
      const expected = await pixels(image);
      assert.equal(actual.info.width, tileSize * scale);
      assert.equal(actual.info.height, tileSize * scale);
      assert.deepEqual(actual.data, expected.data, `${name} differs from its SVG source`);

      // Independently render the old repeating pattern across nine tiles. This
      // catches density mistakes, overlap changes and incorrect edge wrapping.
      const reference = await sharp(svg(color, 3), { density: 72 * scale })
        .ensureAlpha().raw().toBuffer();
      assert.deepEqual(repeatedPixels(actual.data, scale), reference, `${name} changes the repeated pattern`);
      totalBytes += image.length;
      console.log(`${checkOnly ? 'Verified' : 'Generated'} ${name}: ${image.length} bytes; 3×3 SVG comparison identical`);
    }
  }
  console.log(`Six bundled PNGs: ${totalBytes} bytes. Runtime layer opacity remains 0.16.`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
