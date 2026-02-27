// src/server/routes/dice.js
// Route générique historique des jets de dés.
// Partagée par tous les systèmes.
// Utilise req.db et req.system.slug pour les rooms Socket.

const express = require('express');
const router = express.Router();

router.post('/roll', (req, res) => {
    try {
        const {
            character_id, character_name, session_id,
            roll_type, roll_target, pool, threshold,
            results, successes, saga_spent = 0, saga_recovered = 0
        } = req.body;

        if (!roll_type || pool === undefined || threshold === undefined || !results || successes === undefined)
            return res.status(400).json({ error: 'Missing required fields' });

        const result = req.db.prepare(`
            INSERT INTO dice_history
            (character_id, session_id, roll_type, roll_target, pool, threshold, results, successes, saga_spent, saga_recovered)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            character_id || null, session_id || null,
            roll_type, roll_target || null,
            pool, threshold, JSON.stringify(results),
            successes, saga_spent, saga_recovered
        );

        const rollData = {
            id: result.lastInsertRowid,
            character_id, character_name: character_name || 'Anonyme',
            session_id, roll_type, roll_target,
            pool, threshold, results, successes,
            saga_spent, saga_recovered,
            created_at: new Date().toISOString()
        };

        const io = req.app.get('io');
        if (io) {
            const room = session_id ? `${req.system.slug}_session_${session_id}` : null;
            room ? io.to(room).emit('dice-roll', rollData) : io.emit('dice-roll', rollData);
        }

        res.status(201).json(rollData);
    } catch (error) {
        console.error('Error saving dice roll:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/history/:characterId', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const { sessionId } = req.query;
        let query = 'SELECT * FROM dice_history WHERE character_id = ?';
        const params = [req.params.characterId];
        if (sessionId) { query += ' AND session_id = ?'; params.push(sessionId); }
        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);
        res.json(req.db.prepare(query).all(...params).map(h => ({ ...h, results: JSON.parse(h.results) })));
    } catch (error) {
        console.error('Error fetching dice history:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/history', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const { sessionId } = req.query;
        let query = `
            SELECT dh.*, COALESCE(c.prenom, 'Anonyme') as character_name, c.player_name
            FROM dice_history dh
            LEFT JOIN characters c ON dh.character_id = c.id
        `;
        const params = [];
        if (sessionId) { query += ' WHERE dh.session_id = ?'; params.push(sessionId); }
        query += ' ORDER BY dh.created_at DESC LIMIT ?';
        params.push(limit);
        res.json(req.db.prepare(query).all(...params).map(h => ({ ...h, results: JSON.parse(h.results) })));
    } catch (error) {
        console.error('Error fetching dice history:', error);
        res.status(500).json({ error: error.message });
    }
});

router.delete('/history/session/:sessionId', (req, res) => {
    try {
        const result = req.db.prepare('DELETE FROM dice_history WHERE session_id = ?').run(req.params.sessionId);
        res.json({ deleted: result.changes });
    } catch (error) {
        console.error('Error deleting dice history:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;