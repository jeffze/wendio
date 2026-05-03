#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC = path.resolve(__dirname, '..', '..', 'Carte Wendio');
const DST = path.resolve(__dirname, '..', 'cartes');
const QUALITY = 85;

function targetName(file) {
  const m1 = file.match(/^carte chiffre (\d+)\.png$/i);
  if (m1) return `${m1[1]}.jpg`;
  const m2 = file.match(/^(\d+) points?\.png$/i);
  if (m2) return `clan-${m2[1]}pt.jpg`;
  return null;
}

async function run() {
  const files = fs.readdirSync(SRC).filter(f => f.toLowerCase().endsWith('.png'));
  const jobs = [];
  const skipped = [];

  for (const f of files) {
    const name = targetName(f);
    if (!name) { skipped.push(f); continue; }
    jobs.push({ src: path.join(SRC, f), dst: path.join(DST, name), srcName: f, dstName: name });
  }

  console.log(`Source: ${SRC}`);
  console.log(`Cible:  ${DST}`);
  console.log(`Trouvé ${jobs.length} cartes à convertir (qualité JPG ${QUALITY}).`);
  if (skipped.length) console.log(`Ignoré: ${skipped.join(', ')}`);

  let ok = 0, fail = 0;
  for (const j of jobs) {
    try {
      const buf = await sharp(j.src).jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
      fs.writeFileSync(j.dst, buf);
      const kb = Math.round(buf.length / 1024);
      console.log(`  ✓ ${j.srcName.padEnd(28)} → ${j.dstName.padEnd(14)} ${kb}KB`);
      ok++;
    } catch (e) {
      console.error(`  ✗ ${j.srcName}: ${e.message}`);
      fail++;
    }
  }
  console.log(`\nTerminé: ${ok} OK, ${fail} erreurs.`);
  process.exit(fail ? 1 : 0);
}

run();
