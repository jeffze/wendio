#!/usr/bin/env node
// eclaircir-fond-cartes.js — éclaircit le fond bouleau des cartes en
// appliquant un filtre linéaire UNIQUEMENT sur les pixels identifiés
// comme fond (flood fill BFS depuis les bords).
//
// Le sujet (chiffre, perles, boîtes de texte, badges) reste intact
// car non-connecté aux bords ou au-dessus du seuil de luminance.
//
// Usage :
//   node scripts/eclaircir-fond-cartes.js          # toutes les cartes → cartes-pales/
//   node scripts/eclaircir-fond-cartes.js 12       # une carte précise (12.jpg)
//   node scripts/eclaircir-fond-cartes.js clan-1pt # idem

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// === Paramètres ajustables ===

// Luminance max pour qu'un pixel candidat soit considéré « fond » lors
// du BFS. Plus haut = plus de pixels considérés fond. Trop haut = risque
// de manger des bords du sujet.
const SEUIL = 110;

// Filtre linéaire appliqué aux pixels du fond : out = MULT * in + OFFSET
// (équivaut à Sharp.linear(MULT, OFFSET)).
const MULT   = 1.5;
const OFFSET = 50;

// === Constantes ===

const CARTES_DIR = path.join(__dirname, '..', 'cartes');
const OUT_DIR    = path.join(__dirname, '..', 'cartes-pales');

function clamp(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

async function eclaircirFond(file) {
  const inputPath  = path.join(CARTES_DIR, file);
  const outputPath = path.join(OUT_DIR, file);

  const img = sharp(inputPath);
  const meta = await img.metadata();
  const W = meta.width;
  const H = meta.height;

  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const C = info.channels;

  const fond = new Uint8Array(W * H);
  const queue = new Int32Array(W * H);
  let qHead = 0, qTail = 0;

  function essayer(x, y) {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const k = y * W + x;
    if (fond[k]) return;
    const i = k * C;
    if (Math.max(data[i], data[i + 1], data[i + 2]) < SEUIL) {
      fond[k] = 1;
      queue[qTail++] = k;
    }
  }

  for (let x = 0; x < W; x++) { essayer(x, 0); essayer(x, H - 1); }
  for (let y = 0; y < H; y++) { essayer(0, y); essayer(W - 1, y); }

  while (qHead < qTail) {
    const k = queue[qHead++];
    const x = k % W;
    const y = (k - x) / W;
    essayer(x - 1, y);
    essayer(x + 1, y);
    essayer(x, y - 1);
    essayer(x, y + 1);
  }

  let count = 0;
  for (let k = 0; k < W * H; k++) {
    if (fond[k]) {
      const i = k * C;
      data[i]     = clamp(MULT * data[i]     + OFFSET);
      data[i + 1] = clamp(MULT * data[i + 1] + OFFSET);
      data[i + 2] = clamp(MULT * data[i + 2] + OFFSET);
      count++;
    }
  }

  await sharp(data, { raw: { width: W, height: H, channels: C } })
    .jpeg({ quality: 85 })
    .toFile(outputPath);

  const pct = ((count / (W * H)) * 100).toFixed(1);
  console.log(`  ${file.padEnd(20)} ${W}×${H}  fond filtré : ${pct}%`);
}

async function main() {
  const onlyArg = process.argv[2];
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let files = fs.readdirSync(CARTES_DIR).filter(f => f.endsWith('.jpg'));
  if (onlyArg) {
    const target = onlyArg.endsWith('.jpg') ? onlyArg : onlyArg + '.jpg';
    files = files.filter(f => f === target);
    if (files.length === 0) {
      console.error(`Aucun fichier ${target} trouvé dans ${CARTES_DIR}`);
      process.exit(1);
    }
  }

  console.log(`Filtre fond : seuil=${SEUIL}, mult=${MULT}, offset=${OFFSET}`);
  console.log(`${files.length} carte(s) à traiter`);
  console.log('');
  const t0 = Date.now();
  for (const f of files) await eclaircirFond(f);
  console.log('');
  console.log(`✅ ${files.length} carte(s) en ${((Date.now() - t0) / 1000).toFixed(1)}s → ${OUT_DIR}`);
}

main().catch(e => { console.error(e); process.exit(1); });
