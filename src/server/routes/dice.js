// routes/dice.js - API historique des jets de dés
const express = require('express');
const router = express.Router();
const {getDb} = require('../utils/db');

// POST /api/dice/roll - Enregistrer un jet de dés
router.post('/roll', (req, res) => {
    try {
        const { 
            character_id, 
            character_name,
            session_id,
            roll_type, 
            roll_target,
            pool, 
            threshold, 
            results, 
            successes,
            saga_spent = 0,
            saga_recovered = 0,
            details = {}
        } = req.body;
        
        if (!roll_type || pool === undefined || threshold === undefined || !results || successes === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const db = getDb();
        const result = db.prepare(`
            INSERT INTO dice_history 
            (character_id, session_id, roll_type, roll_target, pool, threshold, results, successes, saga_spent, saga_recovered)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            character_id || null,
            session_id || null,
            roll_type,
            roll_target || null,
            pool,
            threshold,
            JSON.stringify(results),
            successes,
            saga_spent,
            saga_recovered
        );
        
        const rollData = { 
            id: result.lastInsertRowid,
            character_id,
            character_name: character_name || 'Anonyme',
            session_id,
            roll_type,
            roll_target,
            pool,
            threshold,
            results,
            successes,
            saga_spent,
            saga_recovered,
            created_at: new Date().toISOString()
        };
        
        // Broadcast via WebSocket
        const io = req.app.get('io');
        if (io) {
            if(session_id) {
                io.to(`session-${session_id}`).emit('dice-roll', rollData);
                console.log(`[SERVER] Sending dice-roll to session-${session_id}`);
            } else {
                io.emit('dice-roll', rollData);
                console.log(`[SERVER] Sending dice-roll event broadcast to ${io.sockets.sockets.size} clients`);
            }
        }
        
        res.status(201).json(rollData);
    } catch (error) {
        console.error('Error saving dice roll:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/dice/history/:characterId - Historique d'un personnage
router.get('/history/:characterId', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const sessionId = req.query.sessionId;
        const db = getDb();

        let query = `
            SELECT * FROM dice_history 
            WHERE character_id = ?
        `;

        const params = [req.params.characterId];

        // Filtrer par session
        if (sessionId) {
            query += ` AND session_id = ?`;
            params.push(sessionId);
        }

        query += ` ORDER BY created_at DESC LIMIT ?`;
        params.push(limit);

        const history = db.prepare(query).all(...params);
        
        res.json(history.map(h => ({
            id: h.id,
            character_id: h.character_id,
            session_id: h.session_id,
            roll_type: h.roll_type,
            pool: h.pool,
            threshold: h.threshold,
            results: JSON.parse(h.results),
            successes: h.successes,
            saga_spent: h.saga_spent,
            saga_recovered: h.saga_recovered,
            created_at: h.created_at
        })));
    } catch (error) {
        console.error('Error fetching dice history:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/dice/history - Tout l'historique (optionnel)
router.get('/history', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const sessionId = req.query.sessionId;
        const db = getDb();

        let query = `
            SELECT dh.*, 
                   COALESCE(c.prenom || CASE WHEN c.surnom IS NOT NULL THEN ' "' || c.surnom || '"' ELSE '' END, c.prenom, 'Anonyme') as character_name,
                   c.player_name
            FROM dice_history dh
            LEFT JOIN characters c ON dh.character_id = c.id
        `;

        const params = [];

        // Filtrer par session si fourni
        if (sessionId) {
            query += ` WHERE dh.session_id = ?`;
            params.push(sessionId);
        }

        query += ` ORDER BY dh.created_at DESC LIMIT ?`;
        params.push(limit);

        const history = db.prepare(query).all(...params);
        
        res.json(history.map(h => ({
            id: h.id,
            character_id: h.character_id,
            session_id: h.session_id,
            character_name: h.character_name,
            player_name: h.player_name,
            roll_type: h.roll_type,
            roll_target: h.roll_target,
            pool: h.pool,
            threshold: h.threshold,
            results: JSON.parse(h.results),
            successes: h.successes,
            saga_spent: h.saga_spent,
            saga_recovered: h.saga_recovered,
            created_at: h.created_at
        })));
    } catch (error) {
        console.error('Error fetching all dice history:', error);
        res.status(500).json({ error: error.message });
    }
});

router.delete('/history/session/:sessionId', (req, res) => {
    try {
        const db = getDb();
        const result = db.prepare('DELETE FROM dice_history WHERE session_id = ?').run(req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json({ deleted: true, id: parseInt(req.params.id), count: result.changes });
    } catch (error) {
        console.error('Error deleting session history:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/dice/history/:id - Supprimer un jet
router.delete('/history/:id', (req, res) => {
    try {
        const db = getDb();
        const result = db.prepare('DELETE FROM dice_history WHERE id = ?').run(req.params.id);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Roll not found' });
        }
        
        res.json({ deleted: true, id: parseInt(req.params.id) });
    } catch (error) {
        console.error('Error deleting dice roll:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/dice/history - Reset tout l'historique
router.delete('/history', (req, res) => {
    try {
        const db = getDb();
        const result = db.prepare('DELETE FROM dice_history').run();
        
        res.json({ deleted: true, count: result.changes });
    } catch (error) {
        console.error('Error resetting dice history:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
