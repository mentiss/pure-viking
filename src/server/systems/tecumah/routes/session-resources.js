// src/server/systems/tecumah/routes/session-resources.js
// Routes REST pour les ressources de session Tecumah.
// Montée automatiquement sur /api/tecumah/session-resources par loader.js.
//
// Seule ressource : complications.
//
// Qui peut modifier les complications ?
//   - Via SOCKET (update-session-resources) : joueurs ET GM
//       → déclenché automatiquement par la DiceModal quand Wild Die = 1
//       → déclenché manuellement par le GM depuis TabResource
//   - Via REST PUT : tout utilisateur authentifié (joueur ou GM)
//       → utilisé comme fallback ou par les boutons de dépense GM
//
// Le clamp ≥ 0 est appliqué côté serveur dans les deux cas.

const express = require('express');
const router  = express.Router();

const { authenticate, requireGM } = require('../../../middlewares/auth');

// ── GET /:sessionId — Lecture (tout utilisateur authentifié) ──────────────────

router.get('/:sessionId', authenticate, (req, res) => {
    try {
        const sessionId = Number(req.params.sessionId);

        req.db.prepare(
            'INSERT OR IGNORE INTO session_resources (session_id) VALUES (?)'
        ).run(sessionId);

        const row = req.db.prepare(
            'SELECT complications, updated_at FROM session_resources WHERE session_id = ?'
        ).get(sessionId);

        if (!row) return res.status(404).json({ error: 'Session introuvable' });

        res.json({ sessionId, complications: row.complications, updatedAt: row.updated_at });
    } catch (err) {
        console.error('[tecumah] GET /session-resources:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── PUT /:sessionId — Modification (tout utilisateur authentifié) ─────────────
// Payload : { field: 'complications', delta: number }
// Clampé à ≥ 0 côté serveur.
// Broadcast Socket.io après modification.

router.put('/:sessionId', authenticate, (req, res) => {
    try {
        const sessionId = Number(req.params.sessionId);
        const { field, delta } = req.body;

        if (field !== 'complications') {
            return res.status(400).json({ error: `Champ non autorisé : ${field}` });
        }
        if (typeof delta !== 'number' || !Number.isInteger(delta)) {
            return res.status(400).json({ error: 'delta doit être un entier' });
        }

        req.db.prepare(
            'INSERT OR IGNORE INTO session_resources (session_id) VALUES (?)'
        ).run(sessionId);

        const row = req.db.prepare(
            'SELECT complications FROM session_resources WHERE session_id = ?'
        ).get(sessionId);

        if (!row) return res.status(404).json({ error: 'Session introuvable' });

        const newVal = Math.max(0, row.complications + delta);

        req.db.prepare(`
            UPDATE session_resources
            SET complications = ?, updated_at = CURRENT_TIMESTAMP
            WHERE session_id = ?
        `).run(newVal, sessionId);

        // Broadcast vers toute la room
        const io = req.app.get('io');
        if (io) {
            io.to(`tecumah_session_${sessionId}`).emit('session-resources-update', {
                sessionId,
                complications: newVal,
            });
        }

        res.json({ sessionId, complications: newVal });
    } catch (err) {
        console.error('[tecumah] PUT /session-resources:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;