// src/server/systems/dune/socket/session-resources.js
// Handler Socket.io pour les ressources de session Dune.
// Enregistré automatiquement par le loader à chaque nouvelle connexion socket.
//
// Événements écoutés :
//   update-session-resources  { sessionId, field, delta }
//
// Événements émis vers la room :
//   session-resources-update      → tous (sans complications)
//   session-resources-gm-update   → tous (avec complications — le client GM filtre)

const SLUG = 'dune';

const ALLOWED = ['impulsions', 'menace', 'complications'];
const CLAMP   = {
    impulsions:    { min: 0, max: 6 },
    menace:        { min: 0, max: Infinity },
    complications: { min: 0, max: Infinity },
};

/**
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @param {import('better-sqlite3').Database} db
 */
module.exports = function register(io, socket, db) {

    socket.on('update-session-resources', ({ sessionId, field, delta } = {}) => {
        if (!sessionId || !ALLOWED.includes(field) || typeof delta !== 'number' || !Number.isInteger(delta)) {
            console.warn(`[${SLUG}/socket] update-session-resources: payload invalide`, { sessionId, field, delta });
            return;
        }

        try {
            // Initialise la ligne si absente
            db.prepare('INSERT OR IGNORE INTO session_resources (session_id) VALUES (?)').run(sessionId);

            const row    = db.prepare('SELECT * FROM session_resources WHERE session_id = ?').get(sessionId);
            const clamp  = CLAMP[field];
            const newVal = Math.min(Math.max(row[field] + delta, clamp.min), clamp.max);

            db.prepare(`
                UPDATE session_resources
                SET ${field} = ?, updated_at = CURRENT_TIMESTAMP
                WHERE session_id = ?
            `).run(newVal, sessionId);

            const updated = db.prepare('SELECT * FROM session_resources WHERE session_id = ?').get(sessionId);
            const room    = `${SLUG}_session_${sessionId}`;

            // Payload joueurs — complications exclues
            const playerPayload = {
                sessionId:  updated.session_id,
                impulsions: updated.impulsions,
                menace:     updated.menace,
                updatedAt:  updated.updated_at,
            };

            // Payload GM — complications incluses
            const gmPayload = { ...playerPayload, complications: updated.complications };

            io.to(room).emit('session-resources-update',    playerPayload);
            io.to(room).emit('session-resources-gm-update', gmPayload);

            console.log(`[${SLUG}/socket] session-resources [session:${sessionId}]: ${field} → ${newVal}`);
        } catch (err) {
            console.error(`[${SLUG}/socket] update-session-resources error:`, err);
        }
    });

};