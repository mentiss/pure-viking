// src/server/systems/tecumah/config.js
// Configuration du slug Tecumah Gulch.
// Découvert automatiquement par loader.js au démarrage.

const path = require('path');
const { generateAccessCode } = require('../../utils/characters');

// ── Vocabulaire Western pour les URLs ─────────────────────────────────────────
// Génère des URLs thématiques du type : "dusty-revolver-47"
// Plus lisibles et mémorables que du base36 aléatoire.

const ADJECTIVES = [
    'dusty', 'rusty', 'wild', 'lone', 'iron', 'golden', 'silver', 'dark',
    'swift', 'brave', 'bold', 'quiet', 'ragged', 'scarred', 'wanted',
    'desert', 'canyon', 'stone', 'copper', 'crimson',
];

const NOUNS = [
    'revolver', 'sheriff', 'outlaw', 'ranger', 'cowboy', 'spur', 'saddle',
    'lasso', 'bandit', 'drifter', 'gunslinger', 'marshal', 'bounty', 'saloon',
    'cactus', 'tumbleweed', 'canyon', 'prairie', 'stallion', 'frontier',
];

/**
 * Génère une URL d'accès thématique Western.
 * Format : "{adjectif}-{nom}-{nombre 2 chiffres}"
 * Ex : "dusty-revolver-42", "lone-gunslinger-07"
 * Espace de collision très faible (20×20×90 = 36 000 combinaisons).
 */
function generateAccessUrl() {
    const adj    = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun   = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const suffix = String(Math.floor(Math.random() * 90) + 10); // 10–99
    return `${adj}-${noun}-${suffix}`;
}

module.exports = {
    slug:       'tecumah',
    label:      'Tecumah Gulch',
    dbPath:     path.join(__dirname, '../../../../database/tecumah.db'),
    schemaPath: path.join(__dirname, '../../../../database-template/tecumah-schema.sql'),

    generateAccessCode,
    generateAccessUrl,
};