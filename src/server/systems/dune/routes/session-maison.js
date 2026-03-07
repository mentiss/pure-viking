// src/server/systems/dune/routes/session-maison.js
// Maison rattachée à une session : nom + description, purement narratif.
// Montée automatiquement par le loader sur /api/dune/session-maison.
//
// Visibilité : GM + Joueurs (lecture et écriture).
// Pas de mécanique pour l'instant — extension future possible.

const express = require('express');
const router  = express.Router();
const { authenticate } = require('../../../middlewares/auth');

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Initialise la ligne maison si elle n'existe pas encore.
 * @param {import('better-sqlite3').Database} db
 * @param {number} sessionId
 * @returns {object} ligne brute
 */
function ensureMaison(db, sessionId) {
    db.prepare(`
        INSERT OR IGNORE INTO session_maison (session_id) VALUES (?)
    `).run(sessionId);
    return db.prepare(
        'SELECT * FROM session_maison WHERE session_id = ?'
    ).get(sessionId);
}

function formatMaison(row) {
    return {
        sessionId:   row.session_id,
        nom:         row.nom         ?? '',
        description: row.description ?? '',
        updatedAt:   row.updated_at,
    };
}

// ─── GET /:id — Lecture ───────────────────────────────────────────────────────

router.get('/:id', authenticate, (req, res) => {
    try {
        const sessionId = Number(req.params.id);

        if (!req.db.prepare('SELECT id FROM game_sessions WHERE id = ?').get(sessionId)) {
            return res.status(404).json({ error: 'Session introuvable' });
        }

        const row = ensureMaison(req.db, sessionId);
        res.json(formatMaison(row));
    } catch (err) {
        console.error('[dune] GET /session-maison/:id:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── PUT /:id — Mise à jour nom + description ────────────────────────────────
// Body : { nom?: string, description?: string }
// Accessible GM + Joueurs (narratif collaboratif).

router.put('/:id', authenticate, (req, res) => {
    try {
        const sessionId = Number(req.params.id);
        const { nom, description } = req.body;

        if (nom === undefined && description === undefined) {
            return res.status(400).json({ error: 'Au moins un champ requis : nom ou description' });
        }

        if (!req.db.prepare('SELECT id FROM game_sessions WHERE id = ?').get(sessionId)) {
            return res.status(404).json({ error: 'Session introuvable' });
        }

        ensureMaison(req.db, sessionId);

        req.db.prepare(`
            UPDATE session_maison
            SET nom         = COALESCE(?, nom),
                description = COALESCE(?, description),
                updated_at  = CURRENT_TIMESTAMP
            WHERE session_id = ?
        `).run(nom ?? null, description ?? null, sessionId);

        const updated = req.db.prepare(
            'SELECT * FROM session_maison WHERE session_id = ?'
        ).get(sessionId);

        // Broadcast Socket.io — tout le monde reçoit la mise à jour
        const io   = req.app.get('io');
        const slug = req.system.slug;
        if (io) {
            io.to(`${slug}_session_${sessionId}`).emit('session-maison-update', formatMaison(updated));
        }

        res.json(formatMaison(updated));
    } catch (err) {
        console.error('[dune] PUT /session-maison/:id:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;