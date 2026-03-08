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

// ─── Helper : expression SQL du nom de personnage (identique à sessions.js) ──
// Cache par connexion pour ne pas re-pragma à chaque requête.
const _nameExprCache = new WeakMap();

function getCharNameExpr(db) {
    if (_nameExprCache.has(db)) return _nameExprCache.get(db);

    const cols = db.pragma('table_info(characters)').map(c => c.name);
    let expr;
    if (cols.includes('nom')) {
        // Dune : champ `nom` direct
        expr = cols.includes('prenom')
            ? "c.prenom || c.nom"
            : "c.nom";
    } else if (cols.includes('prenom')) {
        // Vikings : prénom + surnom optionnel
        expr = cols.includes('surnom')
            ? "c.prenom || COALESCE(' \"' || c.surnom || '\"', '')"
            : "c.prenom";
    } else {
        expr = "c.player_name";
    }

    _nameExprCache.set(db, expr);
    return expr;
}

module.exports = { generateAccessCode, ensureUniqueCode, getCharNameExpr };