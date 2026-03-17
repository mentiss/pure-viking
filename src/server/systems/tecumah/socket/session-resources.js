// src/server/systems/tecumah/socket/session-resources.js
// Handler Socket.io pour les ressources de session Tecumah.
// Découvert et enregistré automatiquement par loader.js à chaque connexion socket.
//
// Événement écouté  : update-session-resources { sessionId, field, delta }
// Événement émis    : session-resources-update  { sessionId, complications }
//                     → broadcast vers toute la room (GM + joueurs)
//
// Seul champ géré : complications (pas d'impulsions ni menace dans Tecumah).
// Valeur clampée à ≥ 0 — pas de plafond (complication peut s'accumuler librement).

const { getDbForSystem }     = require('../../../db');
const { getConfigForSystem } = require('../../Loader');

const SLUG = 'tecumah';

/**
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
module.exports = function register(io, socket) {

    socket.on('update-session-resources', ({ sessionId, field, delta } = {}) => {
        // Validation du payload
        if (
            !sessionId ||
            field !== 'complications' ||
            typeof delta !== 'number' ||
            !Number.isInteger(delta)
        ) {
            console.warn(`[${SLUG}/socket] update-session-resources: payload invalide`, { sessionId, field, delta });
            return;
        }

        try {
            const db = getDbForSystem(getConfigForSystem(SLUG));

            // Initialise la ligne si absente (première complication de la session)
            db.prepare(
                'INSERT OR IGNORE INTO session_resources (session_id) VALUES (?)'
            ).run(sessionId);

            const row    = db.prepare(
                'SELECT complications FROM session_resources WHERE session_id = ?'
            ).get(sessionId);

            const newVal = Math.max(0, row.complications + delta);

            db.prepare(`
                UPDATE session_resources
                SET complications = ?, updated_at = CURRENT_TIMESTAMP
                WHERE session_id = ?
            `).run(newVal, sessionId);

            const room = `${SLUG}_session_${sessionId}`;

            // Broadcast à tous (GM + joueurs) — complications visibles de tous dans Tecumah
            io.to(room).emit('session-resources-update', {
                sessionId,
                complications: newVal,
            });

            console.log(`[${SLUG}/socket] session-resources [session:${sessionId}]: complications → ${newVal}`);
        } catch (err) {
            console.error(`[${SLUG}/socket] update-session-resources error:`, err);
        }
    });

};