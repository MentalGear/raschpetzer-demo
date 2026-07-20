#!/usr/bin/env node
// Generates responsive web versions of the images in originals/ into responsive/.
// For each source image, produces WebP variants at several widths (skipping widths
// larger than the source) plus a single optimized JPEG fallback for older browsers.
//
// Usage: node scripts/generate-responsive-images.js

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'originals');
const OUT_DIR = path.join(ROOT, 'responsive');

const WIDTHS = [480, 960, 1920];
const WEBP_QUALITY = 80;
const JPEG_QUALITY = 82;
const JPEG_FALLBACK_WIDTH = 1920;

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = fs
    .readdirSync(SRC_DIR)
    .filter((f) => /\.(jpe?g)$/i.test(f))
    .sort();

  for (const file of files) {
    const srcPath = path.join(SRC_DIR, file);
    const base = file.replace(/\.(jpe?g)$/i, '');
    const image = sharp(srcPath);
    const { width } = await image.metadata();

    for (const targetWidth of WIDTHS) {
      if (targetWidth > width) continue;
      const outPath = path.join(OUT_DIR, `${base}-${targetWidth}w.webp`);
      await sharp(srcPath)
        .resize({ width: targetWidth, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(outPath);
    }

    const fallbackWidth = Math.min(JPEG_FALLBACK_WIDTH, width);
    const fallbackPath = path.join(OUT_DIR, `${base}-fallback.jpg`);
    await sharp(srcPath)
      .resize({ width: fallbackWidth, withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toFile(fallbackPath);

    console.log(`generated ${base} (source width ${width}px)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
