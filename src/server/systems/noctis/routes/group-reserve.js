const express = require('express');
const router  = express.Router({ mergeParams: true }); // pour accéder à :sessionId

const { authenticate, requireGM } = require('../../../middlewares/auth');

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseGroupReserve(raw) {
    if (!raw) return null;
    return {
        ...raw,
        principes: _parseJSON(raw.principes, []),
        interdits: _parseJSON(raw.interdits, []),
    };
}

function _parseJSON(str, fallback) {
    try { return JSON.parse(str); } catch { return fallback; }
}

/**
 * Charge ou crée la fiche de groupe pour une session.
 * INSERT OR IGNORE garantit qu'une seule ligne existe par session.
 */
function getOrCreate(db, sessionId) {
    db.prepare(`
        INSERT OR IGNORE INTO session_group_reserve (session_id)
        VALUES (?)
    `).run(sessionId);
    return db.prepare(
        'SELECT * FROM session_group_reserve WHERE session_id = ?'
    ).get(sessionId);
}

function broadcastGroupReserve(io, sessionId, payload) {
    if (!io) return;
    io.to(`noctis_session_${sessionId}`)
        .emit('noctis:group-reserve-update', payload);
}

// ── GET /api/noctis/sessions/:sessionId/group-reserve ─────────────────────────

router.get('/', authenticate, (req, res) => {
    try {
        const sessionId = parseInt(req.params.sessionId, 10);
        const raw    = getOrCreate(req.db, sessionId);
        res.json(parseGroupReserve(raw));
    } catch (err) {
        console.error('[noctis] GET group-reserve:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── PUT /api/noctis/sessions/:sessionId/group-reserve ─────────────────────────
// Mise à jour complète des champs (GM uniquement pour principes/interdits/règle)

router.put('/', authenticate, (req, res) => {
    try {
        const sessionId = parseInt(req.params.sessionId, 10);
        const { current, principes, interdits, regle_acces, notes } = req.body;

        // Les champs narratifs sont réservés au GM
        const isGM = req.user?.isGM === true;
        if (!isGM && (principes !== undefined || interdits !== undefined || regle_acces !== undefined)) {
            return res.status(403).json({ error: 'Modification réservée au GM.' });
        }

        getOrCreate(req.db, sessionId);

        const fields  = [];
        const params  = { sessionId };

        if (current     !== undefined) { fields.push('current = @current');         params.current     = Math.max(0, current); }
        if (principes   !== undefined) { fields.push('principes = @principes');     params.principes   = JSON.stringify(principes); }
        if (interdits   !== undefined) { fields.push('interdits = @interdits');     params.interdits   = JSON.stringify(interdits); }
        if (regle_acces !== undefined) { fields.push('regle_acces = @regle_acces'); params.regle_acces = regle_acces; }
        if (notes       !== undefined) { fields.push('notes = @notes');             params.notes       = notes; }

        if (!fields.length) return res.status(400).json({ error: 'Aucun champ valide.' });

        fields.push('updated_at = CURRENT_TIMESTAMP');
        req.db.prepare(`
            UPDATE session_group_reserve SET ${fields.join(', ')} WHERE session_id = @sessionId
        `).run(params);

        const updated = parseGroupReserve(
            req.db.prepare('SELECT * FROM session_group_reserve WHERE session_id = ?').get(sessionId)
        );

        broadcastGroupReserve(req.app.get('io'), sessionId, updated);
        res.json(updated);
    } catch (err) {
        console.error('[noctis] PUT group-reserve:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/noctis/sessions/:sessionId/group-reserve/fluctuation ────────────
// Fluctuation narrative (+/- selon principes/interdits respectés ou transgressés)

router.post('/fluctuation', authenticate, (req, res) => {
    try {
        const sessionId = parseInt(req.params.sessionId, 10);
        const { delta, raison } = req.body;

        if (typeof delta !== 'number') {
            return res.status(400).json({ error: 'delta (number) requis.' });
        }

        const raw    = getOrCreate(req.db, sessionId);
        const newCurrent = Math.max(0, raw.current + delta);

        req.db.prepare(`
            UPDATE session_group_reserve
            SET current = ?, updated_at = CURRENT_TIMESTAMP
            WHERE session_id = ?
        `).run(newCurrent, sessionId);

        const updated = parseGroupReserve(
            req.db.prepare('SELECT * FROM session_group_reserve WHERE session_id = ?').get(sessionId)
        );

        console.log(`[noctis] group-reserve fluctuation session=${sessionId} delta=${delta} raison="${raison ?? ''}"`);
        broadcastGroupReserve(req.app.get('io'), sessionId, updated);
        res.json(updated);
    } catch (err) {
        console.error('[noctis] POST group-reserve/fluctuation:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;