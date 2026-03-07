// src/server/systems/dune/config.js
// Configuration du système Dune: Adventures in the Imperium.
//
// generateAccessUrl génère des URLs thématiques à l'univers Dune.
// Elle est passée à ensureUniqueCode() dans les routes characters.

const path = require('path');

// Vocabulaire thématique Dune
const ADJECTIVES = [
    'noble', 'ancien', 'sacre', 'eternel', 'mystique', 'imperial',
    'fremen', 'sombre', 'doré', 'errant', 'sage', 'redoutable',
];
const NOUNS = [
    'atreides', 'harkonnen', 'fremen', 'mentat', 'sardaukar',
    'stilgar', 'missionaria', 'shai-hulud', 'arrakis', 'sietch',
    'giedi', 'caladan', 'kwisatz', 'gom-jabbar', 'thufir',
];

/**
 * Génère une URL d'accès thématique Dune.
 * @returns {string}  ex : "noble-atreides-3147"
 */
function generateAccessUrl() {
    const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num  = Math.floor(Math.random() * 9999);
    return `${adj}-${noun}-${num}`;
}

module.exports = {
    slug:       'dune',
    label:      'Dune: Adventures in the Imperium',
    dbPath:     path.join(__dirname, '../../../../database/dune.db'),
    schemaPath: path.join(__dirname, '../../../../database-template/dune-schema.sql'),
    generateAccessUrl,
};