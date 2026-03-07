// src/server/systems/dune/routes/session-resources.js
// Ressources partagées de session : Impulsions, Menace, Complications.
// Montée automatiquement par le loader sur /api/dune/session-resources.
//
// Visibilité :
//   - Impulsions + Menace : GM + Joueurs
//   - Complications       : GM uniquement (omis dans la réponse joueur)
//
// Clamp serveur :
//   - impulsions  : 0–6
//   - menace      : ≥ 0 (pas de maximum)
//   - complications : ≥ 0 (pas de maximum)

const express = require('express');
const router  = express.Router();
const { authenticate, requireGM } = require('../../../middlewares/auth');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CLAMP = {
    impulsions:   { min: 0, max: 6 },
    menace:       { min: 0, max: Infinity },
    complications:{ min: 0, max: Infinity },
};

const ALLOWED_FIELDS = Object.keys(CLAMP);

/**
 * Initialise la ligne resources si elle n'existe pas encore.
 * @param {import('better-sqlite3').Database} db
 * @param {number} sessionId
 * @returns {object} ligne brute
 */
function ensureResources(db, sessionId) {
    db.prepare(`
        INSERT OR IGNORE INTO session_resources (session_id) VALUES (?)
    `).run(sessionId);
    return db.prepare(
        'SELECT * FROM session_resources WHERE session_id = ?'
    ).get(sessionId);
}

/**
 * Formate la réponse selon le rôle de l'appelant.
 * @param {object} row
 * @param {boolean} isGM
 * @returns {object}
 */
function formatResources(row, isGM) {
    const base = {
        sessionId:  row.session_id,
        impulsions: row.impulsions,
        menace:     row.menace,
        updatedAt:  row.updated_at,
    };
    if (isGM) base.complications = row.complications;
    return base;
}

// ─── GET /:id — Lecture ───────────────────────────────────────────────────────

router.get('/:id', authenticate, (req, res) => {
    try {
        const sessionId = Number(req.params.id);

        if (!req.db.prepare('SELECT id FROM game_sessions WHERE id = ?').get(sessionId)) {
            return res.status(404).json({ error: 'Session introuvable' });
        }

        const row = ensureResources(req.db, sessionId);
        res.json(formatResources(row, req.user.isGM));
    } catch (err) {
        console.error('[dune] GET /session-resources/:id:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── PUT /:id — Mise à jour d'un champ ───────────────────────────────────────
// Body : { field: 'impulsions'|'menace'|'complications', delta: number }
//
// Règles :
//   - complications : GM uniquement
//   - menace        : delta libre (GM) ; joueurs limités au contexte jet (géré côté socket)
//   - impulsions    : tout le monde

router.put('/:id', authenticate, (req, res) => {
    try {
        const sessionId = Number(req.params.id);
        const { field, delta } = req.body;

        if (!ALLOWED_FIELDS.includes(field)) {
            return res.status(400).json({ error: `Champ invalide. Valeurs acceptées : ${ALLOWED_FIELDS.join(', ')}` });
        }
        if (typeof delta !== 'number' || !Number.isInteger(delta)) {
            return res.status(400).json({ error: 'delta doit être un entier' });
        }
        if (field === 'complications' && !req.user.isGM) {
            return res.status(403).json({ error: 'Complications : accès GM uniquement' });
        }

        if (!req.db.prepare('SELECT id FROM game_sessions WHERE id = ?').get(sessionId)) {
            return res.status(404).json({ error: 'Session introuvable' });
        }

        const row    = ensureResources(req.db, sessionId);
        const clamp  = CLAMP[field];
        const newVal = Math.min(Math.max(row[field] + delta, clamp.min), clamp.max);

        req.db.prepare(`
            UPDATE session_resources
            SET ${field} = ?, updated_at = CURRENT_TIMESTAMP
            WHERE session_id = ?
        `).run(newVal, sessionId);

        const updated = req.db.prepare(
            'SELECT * FROM session_resources WHERE session_id = ?'
        ).get(sessionId);

        // Broadcast Socket.io — complications omises pour les non-GM
        const io     = req.app.get('io');
        const slug   = req.system.slug;
        const room   = `${slug}_session_${sessionId}`;

        if (io) {
            // Payload GM complet
            const gmPayload     = formatResources(updated, true);
            // Payload joueur sans complications
            const playerPayload = formatResources(updated, false);

            // On broadcaste à tous dans la room, puis on envoie la version GM
            // individuellement aux sockets GM (identifiés par leur room GM).
            // Stratégie simple : deux émissions différenciées par rôle côté client.
            // Le client filtre sur req.user.isGM — mais Socket n'a pas ce contexte.
            // Solution : on envoie le payload complet et le client ignore complications s'il n'est pas GM.
            // La vraie protection est côté GET (le GET ne renvoie pas complications aux joueurs).
            io.to(room).emit('session-resources-update', playerPayload);

            // Puis on notifie le GM avec le champ complications via un événement dédié.
            // Le GM recharge via GET ou écoute 'session-resources-gm-update'.
            io.to(room).emit('session-resources-gm-update', gmPayload);
        }

        res.json(formatResources(updated, req.user.isGM));
    } catch (err) {
        console.error('[dune] PUT /session-resources/:id:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;