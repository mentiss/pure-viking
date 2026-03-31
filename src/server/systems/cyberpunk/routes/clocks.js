// src/server/systems/cyberpunk/routes/clocks.js
// ─────────────────────────────────────────────────────────────────────────────
// Routes Clocks (Horloges).
// Montée automatiquement sur /api/cyberpunk/clocks par loader.js.
//
// Une Clock peut être :
//   - rattachée à une session (session_id NOT NULL) → scope session
//   - non rattachée (session_id NULL)               → scope slug / campagne
//
// Les Clocks peuvent être liées à une ou plusieurs Threats (many-to-many).
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router  = express.Router();

const { authenticate, requireGM } = require('../../../middlewares/auth');

// ── GET / — Toutes les clocks (optionnel : filtrer par session) ───────────────

router.get('/', authenticate, (req, res) => {
    try {
        const { sessionId } = req.query;

        let rows;
        if (sessionId) {
            // Clocks de la session + clocks globales (scope campagne)
            rows = req.db.prepare(`
                SELECT c.*,
                    GROUP_CONCAT(ct.threat_id) AS threat_ids
                FROM clocks c
                LEFT JOIN clock_threats ct ON ct.clock_id = c.id
                WHERE c.session_id = ? OR c.session_id IS NULL
                GROUP BY c.id
                ORDER BY c.pinned DESC, c.session_id NULLS LAST, c.created_at DESC
            `).all(sessionId);
        } else {
            rows = req.db.prepare(`
                SELECT c.*,
                    GROUP_CONCAT(ct.threat_id) AS threat_ids
                FROM clocks c
                LEFT JOIN clock_threats ct ON ct.clock_id = c.id
                GROUP BY c.id
                ORDER BY c.pinned DESC, c.session_id NULLS LAST, c.created_at DESC
            `).all();
        }

        res.json(rows.map(_formatClock));
    } catch (err) {
        console.error('[cyberpunk] GET /clocks:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /:id — Une clock avec ses threats liées ───────────────────────────────

router.get('/:id', authenticate, (req, res) => {
    try {
        const row = req.db.prepare(`
            SELECT c.*,
                GROUP_CONCAT(ct.threat_id) AS threat_ids
            FROM clocks c
            LEFT JOIN clock_threats ct ON ct.clock_id = c.id
            WHERE c.id = ?
            GROUP BY c.id
        `).get(req.params.id);

        if (!row) return res.status(404).json({ error: 'Clock introuvable' });
        res.json(_formatClock(row));
    } catch (err) {
        console.error('[cyberpunk] GET /clocks/:id:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── POST / — Créer une clock (GM uniquement) ──────────────────────────────────

router.post('/', authenticate, requireGM, (req, res) => {
    try {
        const { sessionId, name, segments, consequence, threatIds, icon } = req.body;

        if (!name) return res.status(400).json({ error: 'name est requis' });
        const seg = parseInt(segments) || 6;

        const result = req.db.prepare(`
            INSERT INTO clocks (session_id, name, segments, current, consequence, icon)
            VALUES (?, ?, ?, 0, ?, ?)
        `).run(sessionId ?? null, name, seg, consequence ?? '', icon ?? '');

        const clockId = result.lastInsertRowid;

        // Liens threats
        if (Array.isArray(threatIds) && threatIds.length > 0) {
            _setClockThreats(req.db, clockId, threatIds);
        }

        res.status(201).json(_loadClock(req.db, clockId));
    } catch (err) {
        console.error('[cyberpunk] POST /clocks:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── PUT /:id — Modifier une clock (GM uniquement) ────────────────────────────

router.put('/:id', authenticate, requireGM, (req, res) => {
    try {
        const { name, segments, consequence, current, threatIds, icon } = req.body;
        const id = req.params.id;

        req.db.prepare(`
            UPDATE clocks SET
                name        = COALESCE(?, name),
                segments    = COALESCE(?, segments),
                consequence = COALESCE(?, consequence),
                current     = COALESCE(?, current),
                icon        = COALESCE(?, icon),
                updated_at  = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(name ?? null, segments ?? null, consequence ?? null, current ?? null, icon ?? '', id);

        // Remplacement des liens threats si fournis
        if (Array.isArray(threatIds)) {
            _setClockThreats(req.db, id, threatIds);
        }

        res.json(_loadClock(req.db, id));
    } catch (err) {
        console.error('[cyberpunk] PUT /clocks/:id:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── PATCH /:id/advance — Avancer ou reculer la clock (GM uniquement) ─────────

router.patch('/:id/advance', authenticate, requireGM, (req, res) => {
    try {
        const { delta } = req.body; // +1 ou -1 (ou N)
        if (delta === undefined) return res.status(400).json({ error: 'delta requis' });

        const clock = req.db.prepare('SELECT * FROM clocks WHERE id = ?').get(req.params.id);
        if (!clock) return res.status(404).json({ error: 'Clock introuvable' });

        const newVal = Math.max(0, Math.min(clock.segments, clock.current + delta));

        req.db.prepare(`
            UPDATE clocks SET current = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(newVal, req.params.id);

        res.json(_loadClock(req.db, req.params.id));
    } catch (err) {
        console.error('[cyberpunk] PATCH /clocks/:id/advance:', err);
        res.status(500).json({ error: err.message });
    }
});

router.patch('/:id/pin', authenticate, requireGM, (req, res) => {
    try {
        const row = req.db.prepare('SELECT pinned FROM clocks WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Clock introuvable' });
        req.db.prepare('UPDATE clocks SET pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(row.pinned ? 0 : 1, req.params.id);
        res.json(_loadClock(req.db, req.params.id));
    } catch (err) {
        console.error('[cyberpunk] PATCH /clocks/:id/pin:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── DELETE /:id — Supprimer une clock (GM uniquement) ────────────────────────

router.delete('/:id', authenticate, requireGM, (req, res) => {
    try {
        req.db.prepare('DELETE FROM clocks WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        console.error('[cyberpunk] DELETE /clocks/:id:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function _formatClock(row) {
    return {
        id:          row.id,
        sessionId:   row.session_id ?? null,
        name:        row.name,
        segments:    row.segments,
        current:     row.current,
        consequence: row.consequence ?? '',
        icon:        row.icon   ?? '⏱',
        pinned:      !!row.pinned,
        threatIds:   row.threat_ids ? row.threat_ids.split(',').map(Number) : [],
        createdAt:   row.created_at,
        updatedAt:   row.updated_at,
    };
}

function _loadClock(db, id) {
    const row = db.prepare(`
        SELECT c.*, GROUP_CONCAT(ct.threat_id) AS threat_ids
        FROM clocks c
        LEFT JOIN clock_threats ct ON ct.clock_id = c.id
        WHERE c.id = ?
        GROUP BY c.id
    `).get(id);
    return row ? _formatClock(row) : null;
}

function _setClockThreats(db, clockId, threatIds) {
    db.prepare('DELETE FROM clock_threats WHERE clock_id = ?').run(clockId);
    const stmt = db.prepare('INSERT INTO clock_threats (clock_id, threat_id) VALUES (?, ?)');
    for (const tid of threatIds) {
        stmt.run(clockId, tid);
    }
}

module.exports = router;