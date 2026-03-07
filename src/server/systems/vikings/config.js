// src/server/systems/vikings/config.js
// Configuration du système Pure Vikings.
//
// generateAccessUrl est définie ici (slug-spécifique) plutôt qu'en dur dans
// utils/characters.js. ensureUniqueCode reçoit cette fonction en paramètre.

const path = require('path');

/**
 * Génère une URL d'accès thématique Viking.
 * @returns {string}  ex : "brave-warrior-4217"
 */
function generateAccessUrl() {
    const adjectives = ['brave', 'fierce', 'wise', 'swift', 'strong', 'cunning', 'bold', 'mighty'];
    const nouns      = ['warrior', 'raider', 'skald', 'jarl', 'berserker', 'shield', 'axe', 'raven'];
    const adj  = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num  = Math.floor(Math.random() * 9999);
    return `${adj}-${noun}-${num}`;
}

module.exports = {
    slug:       'vikings',
    label:      'Pure Vikings',
    dbPath:     path.join(__dirname, '../../../../database/pure-vikings.db'),
    schemaPath: path.join(__dirname, '../../../../database-template/schema.sql'),
    generateAccessUrl,
};