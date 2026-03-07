// src/server/utils/characters.js
// Fonctions utilitaires génériques, indépendantes de tout système de jeu.
//
// generateAccessUrl() est conservée ici comme implémentation de référence
// (vocabulaire viking) et sert de fallback dans ensureUniqueCode.
// Chaque slug peut surcharger cette logique via config.js → generateAccessUrl.

function generateAccessCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Implémentation par défaut — vocabulaire Viking (backward compat).
function generateAccessUrl() {
    const adjectives = ['brave', 'fierce', 'wise', 'swift', 'strong', 'cunning', 'bold', 'mighty'];
    const nouns      = ['warrior', 'raider', 'skald', 'jarl', 'berserker', 'shield', 'axe', 'raven'];
    const adj  = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num  = Math.floor(Math.random() * 9999);
    return `${adj}-${noun}-${num}`;
}

/**
 * Génère un code et une URL uniques pour un personnage ou une session.
 *
 * @param {'character'|'session'} type
 * @param {import('better-sqlite3').Database} db  - Connexion better-sqlite3
 * @param {() => string} [generateUrlFn]           - Fonction slug-spécifique (optionnelle).
 *                                                   Fallback : generateAccessUrl() viking ci-dessus.
 * @returns {{ code: string, url: string }}
 */
function ensureUniqueCode(type = 'character', db, generateUrlFn = generateAccessUrl) {
    const table = type === 'session' ? 'game_sessions' : 'characters';
    let code, url, attempts = 0;

    do {
        code = generateAccessCode();
        url  = generateUrlFn();
        const existing = db.prepare(
            `SELECT id FROM ${table} WHERE access_code = ? OR access_url = ?`
        ).get(code, url);
        if (!existing) break;
        attempts++;
    } while (attempts < 10);

    if (attempts >= 10) throw new Error('Unable to generate unique access codes after 10 attempts');
    return { code, url };
}

module.exports = { generateAccessCode, generateAccessUrl, ensureUniqueCode };