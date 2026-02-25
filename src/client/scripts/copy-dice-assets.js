#!/usr/bin/env node
/**
 * scripts/copy-dice-assets.js
 *
 * Copie les assets statiques de dice-box-threejs dans public/dice-assets/
 * À exécuter après npm install ou intégrer dans le build.
 *
 * Ajouter dans package.json (section scripts) :
 *   "postinstall": "node scripts/copy-dice-assets.js",
 *   "copy-dice-assets": "node scripts/copy-dice-assets.js"
 */

import { cpSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const src = resolve(root, 'node_modules/@3d-dice/dice-box-threejs/public');
const dest = resolve(root, 'public/dice-assets');

if (!existsSync(src)) {
    console.error('❌ @3d-dice/dice-box-threejs non trouvé. Lance "npm install" d\'abord.');
    process.exit(1);
}

if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
}

cpSync(src, dest, { recursive: true });
console.log(`✅ Assets dice copiés : ${src} → ${dest}`);