const {loginRateLimiter} = require('../middlewares/rateLimits');
const express = require('express');
const {checkRefreshToken, deleteRefreshToken, generateJWT, generateRefreshToken} = require('../utils/jwt');
const {getDb} = require('../utils/db');
const {loadFullCharacter} = require('../utils/characters');
const {authenticate} = require("../middlewares/auth");
const router = express.Router();

router.post('/login', loginRateLimiter, (req, res) => {
    try {
        const db = getDb();
        const { code } = req.body;
        const char = req.targetCharacter; // Fourni par le rate limiter

        // Vérifier le code
        if (code && code.toUpperCase() !== char.access_code) {
            // Incrémenter tentatives
            db.prepare(`
                UPDATE characters 
                SET login_attempts = login_attempts + 1, last_attempt_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `).run(char.id);

            return res.status(401).json({ error: 'Invalid code' });
        }

        db.prepare('UPDATE characters SET login_attempts = 0 WHERE id = ?').run(char.id);

        // Générer tokens
        const isGM = char.id === -1;
        const accessToken = generateJWT({
            characterId: char.id,
            isGM
        });
        const refreshToken = generateRefreshToken(char.id);

        // Stocker refresh token dans cookie httpOnly
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // HTTPS en prod
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 jours
        });

        const fullCharacter = loadFullCharacter(db, char.id);

        res.json({
            accessToken,
            character: fullCharacter
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/refresh', (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ error: 'No refresh token provided' });
        }

        const tokenData = checkRefreshToken(refreshToken);

        if (!tokenData) {
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }

        // Vérifier que le personnage existe toujours
        const db = getDb();
        const char = db.prepare('SELECT id FROM characters WHERE id = ?').get(tokenData.character_id);

        if (!char) {
            deleteRefreshToken(refreshToken);
            return res.status(401).json({ error: 'Character not found' });
        }

        // Générer nouveau access token
        const isGM = char.id === -1;
        const accessToken = generateJWT({
            characterId: char.id,
            isGM
        });

        res.json({ accessToken });

    } catch (error) {
        console.error('Refresh error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/logout', (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (refreshToken) {
            deleteRefreshToken(refreshToken);
        }

        res.clearCookie('refreshToken');
        res.json({ success: true });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/me', authenticate, (req, res) => {
    try {
        const db = getDb();
        const character = loadFullCharacter(db, req.user.characterId);

        if (!character) {
            return res.status(404).json({ error: 'Character not found' });
        }

        res.json({ character });

    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;