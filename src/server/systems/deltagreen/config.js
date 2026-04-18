// src/server/systems/deltagreen/config.js
// Configuration du slug Delta Green (système BRP percentile D100).
// Détecté automatiquement par loader.js au démarrage.

const path = require('path');

// Vocabulaire thématique Delta Green — agences et termes opérationnels
const ADJECTIVES = [
    'classified', 'covert', 'special', 'federal', 'tactical',
    'active', 'black', 'deep', 'restricted', 'shadow',
    'interim', 'clearance', 'secured', 'redacted', 'clandestine',
];
const NOUNS = [
    'agent', 'handler', 'operative', 'asset', 'contact',
    'case', 'protocol', 'directive', 'mandate', 'clearance',
    'dossier', 'field', 'vector', 'delta', 'control',
];

/**
 * Génère une URL d'accès thématique Delta Green.
 * @returns {string}  ex : "classified-agent-4721"
 */
function generateAccessUrl() {
    const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num  = Math.floor(Math.random() * 9999);
    return `${adj}-${noun}-${num}`;
}

module.exports = {
    slug:       'deltagreen',
    label:      'Delta Green',
    dbPath:     path.join(__dirname, '../../../../database/deltagreen.db'),
    schemaPath: path.join(__dirname, '../../../../database-template/deltagreen-schema.sql'),
    generateAccessUrl,
};