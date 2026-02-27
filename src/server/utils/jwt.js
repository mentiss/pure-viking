// src/server/utils/jwt.js
// Utilitaires JWT et refresh tokens.
// Les fonctions qui touchent la BDD acceptent `db` en paramètre
// pour rester agnostiques du système (plus de getDb() en dur).

const jwt     = require('jsonwebtoken');
const crypto  = require('node:crypto');

const JWT_SECRET          = process.env.JWT_SECRET;
const ACCESS_EXPIRATION   = process.env.JWT_ACCESS_EXPIRATION;
const REFRESH_EXPIRATION  = process.env.JWT_REFRESH_EXPIRATION;

function parseDuration(duration) {
    if (typeof duration === 'number') return duration;
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error(`Invalid duration format: ${duration}`);
    const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
    return parseInt(match[1]) * multipliers[match[2]];
}

function generateJWT(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: parseDuration(ACCESS_EXPIRATION) });
}

/**
 * @param {number} characterId
 * @param {Database} db - connexion better-sqlite3 du système
 */
function generateRefreshToken(characterId, db) {
    const token = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(REFRESH_EXPIRATION));

    db.prepare(`INSERT INTO refresh_tokens (character_id, token, expires_at) VALUES (?, ?, ?)`)
        .run(characterId, token, expiresAt.toISOString());

    return token;
}

function checkAccessToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return false;
    }
}

/**
 * @param {string} token
 * @param {Database} db
 */
function checkRefreshToken(token, db) {
    return db.prepare(`
        SELECT * FROM refresh_tokens
        WHERE token = ? AND datetime(expires_at) > datetime('now')
    `).get(token) || null;
}

/**
 * @param {string} token
 * @param {Database} db
 */
function deleteRefreshToken(token, db) {
    db.prepare(`DELETE FROM refresh_tokens WHERE token = ?`).run(token);
}

/**
 * @param {Database} db
 */
function cleanExpiredTokens(db) {
    return db.prepare(`DELETE FROM refresh_tokens WHERE datetime(expires_at) < datetime('now')`).run().changes;
}

module.exports = {
    generateJWT,
    generateRefreshToken,
    checkAccessToken,
    checkRefreshToken,
    deleteRefreshToken,
    cleanExpiredTokens
};