// src/server/systems/cyberpunk/routes/moves.js
// ─────────────────────────────────────────────────────────────────────────────
// Routes bibliothèque de moves.
// Montée automatiquement sur /api/cyberpunk/moves par loader.js.
//
// GET  /          → tous les moves approuvés (+ pending si GM)
// GET  /playbook/:pb → moves d'un playbook spécifique + moves de base
// POST /          → créer un move custom (joueur ou GM)
// PATCH /:id/approve → valider un move custom (GM uniquement)
// PUT  /:id       → modifier un move custom (GM ou créateur)
// DELETE /:id     → supprimer un move custom (GM uniquement)
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router  = express.Router();

const { authenticate, requireGM } = require('../../../middlewares/auth');

// ── GET / — Tous les moves approuvés ─────────────────────────────────────────

router.get('/', authenticate, (req, res) => {
    try {
        const isGM = req.user?.isGM === true;

        // GM voit tout (y compris les customs en attente)
        // Joueurs ne voient que les approuvés
        const rows = isGM
            ? req.db.prepare('SELECT * FROM moves ORDER BY type, playbook, name').all()
            : req.db.prepare('SELECT * FROM moves WHERE is_approved = 1 ORDER BY type, playbook, name').all();

        res.json(rows.map(_formatMove));
    } catch (err) {
        console.error('[cyberpunk] GET /moves:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /playbook/:pb — Moves d'un playbook + moves de base ──────────────────

router.get('/playbook/:pb', (req, res) => {
    try {
        const pb = req.params.pb;

        const rows = req.db.prepare(`
            SELECT * FROM moves
            WHERE is_approved = 1
              AND (playbook = ? OR playbook IS NULL)
            ORDER BY type, name
        `).all(pb);

        res.json(rows.map(_formatMove));
    } catch (err) {
        console.error('[cyberpunk] GET /moves/playbook/:pb:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── POST / — Créer un move custom ────────────────────────────────────────────

router.post('/', authenticate, (req, res) => {
    try {
        const { name, stat, description, playbook } = req.body;
        const isGM = req.user?.isGM === true;

        if (!name || !description) {
            return res.status(400).json({ error: 'name et description sont requis' });
        }

        // Les moves créés par le GM sont auto-approuvés
        // Les moves créés par un joueur sont en attente (is_approved = 0)
        const isApproved    = isGM ? 1 : 0;
        const createdBy     = req.user?.characterId ?? null;

        const result = req.db.prepare(`
            INSERT INTO moves (type, playbook, name, stat, description, is_approved, created_by)
            VALUES ('custom', ?, ?, ?, ?, ?, ?)
        `).run(playbook ?? null, name, stat ?? null, description, isApproved, createdBy);

        const move = req.db.prepare('SELECT * FROM moves WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(_formatMove(move));
    } catch (err) {
        console.error('[cyberpunk] POST /moves:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── PATCH /:id/approve — Valider un move custom (GM) ─────────────────────────

router.patch('/:id/approve', authenticate, requireGM, (req, res) => {
    try {
        const { approved } = req.body; // true = approuver, false = rejeter (supprime)
        const id = req.params.id;

        const move = req.db.prepare('SELECT * FROM moves WHERE id = ? AND type = ?').get(id, 'custom');
        if (!move) return res.status(404).json({ error: 'Move custom introuvable' });

        if (approved === false) {
            // Rejet → suppression
            req.db.prepare('DELETE FROM moves WHERE id = ?').run(id);
            return res.json({ deleted: true });
        }

        req.db.prepare('UPDATE moves SET is_approved = 1 WHERE id = ?').run(id);
        const updated = req.db.prepare('SELECT * FROM moves WHERE id = ?').get(id);
        res.json(_formatMove(updated));
    } catch (err) {
        console.error('[cyberpunk] PATCH /moves/:id/approve:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── PUT /:id — Modifier un move custom ───────────────────────────────────────

router.put('/:id', authenticate, (req, res) => {
    try {
        const { name, stat, description, playbook } = req.body;
        const id   = req.params.id;
        const isGM = req.user?.isGM === true;

        const move = req.db.prepare('SELECT * FROM moves WHERE id = ?').get(id);
        if (!move) return res.status(404).json({ error: 'Move introuvable' });

        // Seul le GM peut modifier les moves officiels
        if (move.type === 'official' && !isGM) {
            return res.status(403).json({ error: 'Seul le GM peut modifier les moves officiels' });
        }

        req.db.prepare(`
            UPDATE moves SET
                name        = COALESCE(?, name),
                stat        = COALESCE(?, stat),
                description = COALESCE(?, description),
                playbook    = COALESCE(?, playbook)
            WHERE id = ?
        `).run(name ?? null, stat ?? null, description ?? null, playbook ?? null, id);

        const updated = req.db.prepare('SELECT * FROM moves WHERE id = ?').get(id);
        res.json(_formatMove(updated));
    } catch (err) {
        console.error('[cyberpunk] PUT /moves/:id:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── DELETE /:id — Supprimer un move (GM uniquement) ──────────────────────────

router.delete('/:id', authenticate, requireGM, (req, res) => {
    try {
        const move = req.db.prepare('SELECT * FROM moves WHERE id = ?').get(req.params.id);
        if (!move) return res.status(404).json({ error: 'Move introuvable' });

        // Supprime aussi les character_moves liés (CASCADE en BDD mais on log)
        req.db.prepare('DELETE FROM moves WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        console.error('[cyberpunk] DELETE /moves/:id:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function _formatMove(m) {
    return {
        id:          m.id,
        type:        m.type,
        playbook:    m.playbook ?? null,
        name:        m.name,
        stat:        m.stat ?? null,
        description: m.description,
        isApproved:  !!m.is_approved,
        createdBy:   m.created_by ?? null,
        createdAt:   m.created_at,
    };
}

module.exports = router;