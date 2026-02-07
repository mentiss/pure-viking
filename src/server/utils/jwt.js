const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const {getDb} = require("./db");

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_EXPIRATION = process.env.JWT_ACCESS_EXPIRATION;
const REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION;

function parseDuration(duration) {
    if (typeof duration === 'number') return duration;

    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
        throw new Error(`Invalid duration format: ${duration}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = {
        s: 1,
        m: 60,
        h: 3600,
        d: 86400
    };

    return value * multipliers[unit];
}

function generateJWT(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: parseDuration(ACCESS_EXPIRATION) });
}

function generateRefreshToken(characterId) {
    const db = getDb();
    const token = crypto.randomBytes(40).toString('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(REFRESH_EXPIRATION));

    db.prepare(`INSERT INTO refresh_tokens (character_id, token, expires_at) VALUES(?, ?, ?)`)
        .run(characterId, token, expiresAt.toISOString());

    return token;
}

function checkAccessToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return false
    }
}

function checkRefreshToken(token) {
    const db = getDb();
    const result = db.prepare(`SELECT * FROM refresh_tokens WHERE token = ? AND datetime(expires_at) > datetime('now');`)
        .get(token);
    return result || null;
}

function deleteRefreshToken(token) {
    const db = getDb();
    db.prepare(`DELETE FROM refresh_tokens where token = ?`).run(token);
}

function cleanExpiredTokens() {
    const db = getDb();
    const result = db.prepare(`DELETE FROM refresh_tokens WHERE datetime(expires_at) < datetime('now')`).run();

    return result.changes;
}

module.exports = {generateJWT, generateRefreshToken, checkAccessToken, checkRefreshToken, deleteRefreshToken, cleanExpiredTokens};