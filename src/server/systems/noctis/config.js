'use strict';

const path = require('path');

// Vocabulaire thématique Dune
const ADJECTIVES = [
    'eclipse', 'ancien', 'flamme', 'heretique', 'fer', 'vapeur',
    'duc', 'zenith', 'sacre', 'ardent', 'selvarine', 'calarneen',
];

const NOUNS = [
    'alserre', 'calarn', 'solareon', 'selvarin', 'loreon', 'talosse',
    'ferrencourt', 'clamart', 'etherum', 'elandril', 'valean', 'mireldan',
    'theomond', 'maeron', 'luminar', 'roche', 'charbon', 'cenar', 'derak', 'halm',
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
    slug:       'noctis',
    label:      'Noctis Solis',
    dbPath:     path.join(__dirname, '../../../../database/noctis.db'),
    schemaPath: path.join(__dirname, '../../../../database-template/noctis-solis.sql'),
    generateAccessUrl,
};