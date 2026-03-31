// src/server/systems/cyberpunk/routes/threats.js
const express = require('express');
const router  = express.Router();
const { authenticate, requireGM } = require('../../../middlewares/auth');

// ── GET / ─────────────────────────────────────────────────────────────────────
router.get('/', authenticate, (req, res) => {
    try {
        const { sessionId } = req.query;
        let rows;
        if (sessionId) {
            rows = req.db.prepare(`
                SELECT t.*, GROUP_CONCAT(ct.clock_id) AS clock_ids
                FROM threats t
                LEFT JOIN clock_threats ct ON ct.threat_id = t.id
                WHERE t.session_id = ? OR t.session_id IS NULL
                GROUP BY t.id
                ORDER BY t.pinned DESC, t.sort_order ASC, t.created_at DESC
            `).all(sessionId);
        } else {
            rows = req.db.prepare(`
                SELECT t.*, GROUP_CONCAT(ct.clock_id) AS clock_ids
                FROM threats t
                LEFT JOIN clock_threats ct ON ct.threat_id = t.id
                GROUP BY t.id
                ORDER BY t.pinned DESC, t.sort_order ASC, t.created_at DESC
            `).all();
        }
        res.json(rows.map(_formatThreat));
    } catch (err) {
        console.error('[cyberpunk] GET /threats:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /:id ──────────────────────────────────────────────────────────────────
router.get('/:id', authenticate, (req, res) => {
    try {
        const row = req.db.prepare(`
            SELECT t.*, GROUP_CONCAT(ct.clock_id) AS clock_ids
            FROM threats t
            LEFT JOIN clock_threats ct ON ct.threat_id = t.id
            WHERE t.id = ?
            GROUP BY t.id
        `).get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Threat introuvable' });
        res.json(_formatThreat(row));
    } catch (err) {
        console.error('[cyberpunk] GET /threats/:id:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── POST / ────────────────────────────────────────────────────────────────────
router.post('/', authenticate, requireGM, (req, res) => {
    try {
        const { sessionId, name, type, impulse, moves, notes, clockIds, icon, status } = req.body;
        if (!name) return res.status(400).json({ error: 'name est requis' });

        const movesJson = JSON.stringify(Array.isArray(moves) ? moves : []);
        const result = req.db.prepare(`
            INSERT INTO threats (session_id, name, type, impulse, moves_json, notes, icon, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            sessionId ?? null, name,
            type ?? '', impulse ?? '', movesJson, notes ?? '',
            icon ?? '⚠', status ?? 'active'
        );

        const threatId = result.lastInsertRowid;
        if (Array.isArray(clockIds) && clockIds.length > 0) {
            _setThreatClocks(req.db, threatId, clockIds);
        }
        res.status(201).json(_loadThreat(req.db, threatId));
    } catch (err) {
        console.error('[cyberpunk] POST /threats:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── PUT /:id ──────────────────────────────────────────────────────────────────
router.put('/:id', authenticate, requireGM, (req, res) => {
    try {
        const { name, type, impulse, moves, notes, clockIds, sessionId, icon, status } = req.body;
        const id = req.params.id;
        const movesJson = Array.isArray(moves) ? JSON.stringify(moves) : null;

        req.db.prepare(`
            UPDATE threats SET
                name       = COALESCE(?, name),
                type       = COALESCE(?, type),
                impulse    = COALESCE(?, impulse),
                moves_json = COALESCE(?, moves_json),
                notes      = COALESCE(?, notes),
                session_id = COALESCE(?, session_id),
                icon       = COALESCE(?, icon),
                status     = COALESCE(?, status),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            name ?? null, type ?? null, impulse ?? null, movesJson,
            notes ?? null, sessionId ?? null, icon ?? null, status ?? null, id
        );

        if (Array.isArray(clockIds)) _setThreatClocks(req.db, id, clockIds);
        res.json(_loadThreat(req.db, id));
    } catch (err) {
        console.error('[cyberpunk] PUT /threats/:id:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── PATCH /:id/pin — Toggle épinglage ─────────────────────────────────────────
router.patch('/:id/pin', authenticate, requireGM, (req, res) => {
    try {
        const row = req.db.prepare('SELECT pinned FROM threats WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Threat introuvable' });
        req.db.prepare('UPDATE threats SET pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(row.pinned ? 0 : 1, req.params.id);
        res.json(_loadThreat(req.db, req.params.id));
    } catch (err) {
        console.error('[cyberpunk] PATCH /threats/:id/pin:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── PATCH /:id/status — Changer le statut narratif ───────────────────────────
router.patch('/:id/status', authenticate, requireGM, (req, res) => {
    try {
        const { status } = req.body;
        const allowed = ['active', 'dormante', 'neutralisée'];
        if (!allowed.includes(status)) return res.status(400).json({ error: 'Statut invalide' });
        req.db.prepare('UPDATE threats SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(status, req.params.id);
        res.json(_loadThreat(req.db, req.params.id));
    } catch (err) {
        console.error('[cyberpunk] PATCH /threats/:id/status:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── PATCH /reorder — Mise à jour sort_order en batch ─────────────────────────
router.patch('/reorder', authenticate, requireGM, (req, res) => {
    try {
        const { items } = req.body; // [{ id, sortOrder }]
        if (!Array.isArray(items)) return res.status(400).json({ error: 'items requis' });
        const stmt = req.db.prepare('UPDATE threats SET sort_order = ? WHERE id = ?');
        const tx   = req.db.transaction(() => items.forEach(({ id, sortOrder }) => stmt.run(sortOrder, id)));
        tx();
        res.json({ success: true });
    } catch (err) {
        console.error('[cyberpunk] PATCH /threats/reorder:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────
router.delete('/:id', authenticate, requireGM, (req, res) => {
    try {
        req.db.prepare('DELETE FROM threats WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        console.error('[cyberpunk] DELETE /threats/:id:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function _formatThreat(row) {
    let moves = [];
    try { moves = JSON.parse(row.moves_json || '[]'); } catch (_) {}
    return {
        id:        row.id,
        sessionId: row.session_id ?? null,
        name:      row.name,
        type:      row.type      ?? '',
        impulse:   row.impulse   ?? '',
        moves,
        notes:     row.notes     ?? '',
        icon:      row.icon      ?? '⚠',
        status:    row.status    ?? 'active',
        pinned:    !!row.pinned,
        sortOrder: row.sort_order ?? 0,
        clockIds:  row.clock_ids ? row.clock_ids.split(',').map(Number) : [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function _loadThreat(db, id) {
    const row = db.prepare(`
        SELECT t.*, GROUP_CONCAT(ct.clock_id) AS clock_ids
        FROM threats t
                 LEFT JOIN clock_threats ct ON ct.threat_id = t.id
        WHERE t.id = ?
        GROUP BY t.id
    `).get(id);
    return row ? _formatThreat(row) : null;
}

function _setThreatClocks(db, threatId, clockIds) {
    db.prepare('DELETE FROM clock_threats WHERE threat_id = ?').run(threatId);
    const stmt = db.prepare('INSERT OR IGNORE INTO clock_threats (clock_id, threat_id) VALUES (?, ?)');
    for (const cid of clockIds) stmt.run(cid, threatId);
}

module.exports = router;