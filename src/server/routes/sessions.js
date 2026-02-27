// src/server/routes/sessions.js
// Route générique des sessions de jeu.
// Partagée par tous les systèmes — aucune dépendance à un système spécifique.
// Utilise req.db (injecté par systemResolver) et req.system.slug pour les rooms Socket.

const express = require('express');
const router = express.Router();
const { authenticate, requireGM } = require('../middlewares/auth');
const { ensureUniqueCode } = require('../utils/characters');

// ─── Helper ─────────────────────────────────────────────────────────────────

function loadSessionWithCharacters(db, sessionId) {
    const session = db.prepare('SELECT * FROM game_sessions WHERE id = ?').get(sessionId);
    if (!session) return null;

    const characters = db.prepare(`
        SELECT c.id, c.player_name, c.prenom, c.surnom, c.access_url, c.avatar,
               c.saga_actuelle, c.saga_totale, c.tokens_blessure, c.tokens_fatigue,
               sc.joined_at
        FROM session_characters sc
        JOIN characters c ON sc.character_id = c.id
        WHERE sc.session_id = ?
        ORDER BY sc.joined_at DESC
    `).all(sessionId);

    return {
        id: session.id,
        name: session.name,
        accessCode: session.access_code,
        accessUrl: session.access_url,
        date: session.date,
        notes: session.notes,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
        characters: characters.map(c => ({
            id: c.id,
            playerName: c.player_name,
            name: `${c.prenom}${c.surnom ? ' "' + c.surnom + '"' : ''}`,
            accessUrl: c.access_url,
            avatar: c.avatar,
            sagaActuelle: c.saga_actuelle,
            sagaTotale: c.saga_totale,
            tokensBlessure: c.tokens_blessure,
            tokensFatigue: c.tokens_fatigue,
            joinedAt: c.joined_at
        }))
    };
}

// ─── Routes ─────────────────────────────────────────────────────────────────

router.get('/', authenticate, requireGM, (req, res) => {
    try {
        const sessions = req.db.prepare(`
            SELECT s.*, COUNT(sc.character_id) as character_count
            FROM game_sessions s
            LEFT JOIN session_characters sc ON s.id = sc.session_id
            GROUP BY s.id
            ORDER BY s.updated_at DESC
        `).all();

        res.json(sessions.map(s => ({
            id: s.id,
            name: s.name,
            accessCode: s.access_code,
            accessUrl: s.access_url,
            date: s.date,
            notes: s.notes,
            characterCount: s.character_count,
            createdAt: s.created_at,
            updatedAt: s.updated_at
        })));
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id', authenticate, (req, res) => {
    try {
        const session = loadSessionWithCharacters(req.db, req.params.id);
        if (!session) return res.status(404).json({ error: 'Session not found' });
        res.json(session);
    } catch (error) {
        console.error('Error fetching session:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/', authenticate, requireGM, (req, res) => {
    try {
        const { name, date, notes } = req.body;
        if (!name?.trim()) return res.status(400).json({ error: 'Session name is required' });

        const { code, url } = ensureUniqueCode('session', req.db);
        const result = req.db.prepare(`
            INSERT INTO game_sessions (name, access_code, access_url, date, notes)
            VALUES (?, ?, ?, ?, ?)
        `).run(name.trim(), code, url, date || new Date().toISOString(), notes || null);

        res.status(201).json(loadSessionWithCharacters(req.db, result.lastInsertRowid));
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ error: error.message });
    }
});

router.put('/:id', authenticate, requireGM, (req, res) => {
    try {
        const { name, date, notes } = req.body;
        if (!req.db.prepare('SELECT id FROM game_sessions WHERE id = ?').get(req.params.id))
            return res.status(404).json({ error: 'Session not found' });

        req.db.prepare(`
            UPDATE game_sessions SET name = ?, date = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(name || null, date || null, notes || null, req.params.id);

        res.json(loadSessionWithCharacters(req.db, req.params.id));
    } catch (error) {
        console.error('Error updating session:', error);
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', authenticate, requireGM, (req, res) => {
    try {
        const result = req.db.prepare('DELETE FROM game_sessions WHERE id = ?').run(req.params.id);
        if (result.changes === 0) return res.status(404).json({ error: 'Session not found' });
        res.json({ deleted: true, id: parseInt(req.params.id) });
    } catch (error) {
        console.error('Error deleting session:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/:sessionId/characters/:characterId', authenticate, requireGM, (req, res) => {
    try {
        const { sessionId, characterId } = req.params;
        const db = req.db;

        if (!db.prepare('SELECT id FROM game_sessions WHERE id = ?').get(sessionId))
            return res.status(404).json({ error: 'Session not found' });
        if (!db.prepare('SELECT id FROM characters WHERE id = ?').get(characterId))
            return res.status(404).json({ error: 'Character not found' });
        if (db.prepare('SELECT * FROM session_characters WHERE session_id = ? AND character_id = ?').get(sessionId, characterId))
            return res.status(400).json({ error: 'Character already in this session' });

        db.prepare('INSERT INTO session_characters (session_id, character_id) VALUES (?, ?)').run(sessionId, characterId);
        res.json(loadSessionWithCharacters(db, sessionId));
    } catch (error) {
        console.error('Error adding character to session:', error);
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:sessionId/characters/:characterId', authenticate, requireGM, (req, res) => {
    try {
        const { sessionId, characterId } = req.params;
        const result = req.db.prepare(
            'DELETE FROM session_characters WHERE session_id = ? AND character_id = ?'
        ).run(sessionId, characterId);

        if (result.changes === 0) return res.status(404).json({ error: 'Character not in this session' });
        res.json(loadSessionWithCharacters(req.db, sessionId));
    } catch (error) {
        console.error('Error removing character from session:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;