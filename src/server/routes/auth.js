// src/server/routes/auth.js
// Route d'authentification — générique dans son mécanisme, liée au système
// car les personnages et refresh_tokens sont dans la BDD du système.
// Montée sur /api/:system/auth via systemResolver → a accès à req.db.

const express = require('express');
const router = express.Router();
const { loginRateLimiter } = require('../middlewares/rateLimits');
const { authenticate } = require('../middlewares/auth');
const {
    generateJWT,
    generateRefreshToken,
    checkRefreshToken,
    deleteRefreshToken
} = require('../utils/jwt');

// ─── Helper : loadFullCharacter dynamique selon le système ──────────────────
// On charge le controller du système pour avoir le bon loadFullCharacter.
function getController(req) {
    const { loadFullCharacter } = require(`../systems/${req.system.slug}/characterController`);
    return { loadFullCharacter };
}

// ─── POST /api/:system/auth/login ────────────────────────────────────────────

router.post('/login', loginRateLimiter, (req, res) => {
    try {
        const db = req.db;
        const { code } = req.body;
        const char = req.targetCharacter; // fourni par loginRateLimiter

        if (code && code.toUpperCase() !== char.access_code) {
            db.prepare(`
                UPDATE characters
                SET login_attempts = login_attempts + 1, last_attempt_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(char.id);
            return res.status(401).json({ error: 'Invalid code' });
        }

        db.prepare('UPDATE characters SET login_attempts = 0 WHERE id = ?').run(char.id);

        const isGM = char.id === -1;
        const accessToken = generateJWT({ characterId: char.id, isGM });
        const refreshToken = generateRefreshToken(char.id, db);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        const { loadFullCharacter } = getController(req);
        const fullCharacter = loadFullCharacter(db, char.id);

        res.json({ accessToken, character: fullCharacter });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── POST /api/:system/auth/refresh ──────────────────────────────────────────

router.post('/refresh', (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) return res.status(401).json({ error: 'No refresh token provided' });

        const db = req.db;
        const tokenData = checkRefreshToken(refreshToken, db);
        if (!tokenData) return res.status(401).json({ error: 'Invalid or expired refresh token' });

        const char = db.prepare('SELECT id FROM characters WHERE id = ?').get(tokenData.character_id);
        if (!char) {
            deleteRefreshToken(refreshToken, db);
            return res.status(401).json({ error: 'Character not found' });
        }

        const isGM = char.id === -1;
        const accessToken = generateJWT({ characterId: char.id, isGM });

        res.json({ accessToken });
    } catch (error) {
        console.error('Refresh error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── POST /api/:system/auth/logout ───────────────────────────────────────────

router.post('/logout', (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (refreshToken) deleteRefreshToken(refreshToken, req.db);
        res.clearCookie('refreshToken');
        res.json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── GET /api/:system/auth/me ────────────────────────────────────────────────

router.get('/me', authenticate, (req, res) => {
    try {
        const { loadFullCharacter } = getController(req);
        const character = loadFullCharacter(req.db, req.user.characterId);
        if (!character) return res.status(404).json({ error: 'Character not found' });
        res.json({ character });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;