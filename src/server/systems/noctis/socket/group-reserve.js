/**
 * Handler socket pour la réserve de groupe Noctis.
 * Gère les mises à jour temps réel sessionnées via session_group_reserve.
 *
 * Événements entrants :
 *   noctis:group-reserve-get   { sessionId }  → émet l'état courant au demandeur
 *   noctis:group-reserve-patch { sessionId, delta?, current? } → broadcast à la room
 *
 * Événement sortant :
 *   noctis:group-reserve-update { ...groupReserve } → broadcasté à noctis_session_${sessionId}
 */
module.exports = function register(io, socket) {

        // ── Demande de l'état courant ─────────────────────────────────────────
        socket.on('noctis:group-reserve-get', ({ sessionId } = {}) => {
            if (!sessionId) return;
            const db = socket.db;
            if (!db) return;

            const raw = db.prepare(
                'SELECT * FROM session_group_reserve WHERE session_id = ?'
            ).get(sessionId);

            if (!raw) {
                // Session sans fiche groupe — on renvoie les valeurs par défaut
                socket.emit('noctis:group-reserve-update', {
                    session_id:  sessionId,
                    current:     0,
                    principes:   [],
                    interdits:   [],
                    regle_acces: 'libre',
                    notes:       '',
                });
                return;
            }

            socket.emit('noctis:group-reserve-update', _parse(raw));
        });

        // ── Patch de la valeur courante ───────────────────────────────────────
        // Utilisé pour les dépenses directes (1D par jet, règle inchangée)
        socket.on('noctis:group-reserve-patch', ({ sessionId, delta, current } = {}) => {
            if (!sessionId) return;
            const db = socket.db;
            if (!db) return;

            const raw = db.prepare(
                'SELECT * FROM session_group_reserve WHERE session_id = ?'
            ).get(sessionId);

            if (!raw) return; // session inconnue — rien à faire

            let newCurrent = raw.current;
            if (typeof delta   === 'number') newCurrent = Math.max(0, raw.current + delta);
            if (typeof current === 'number') newCurrent = Math.max(0, current);

            db.prepare(`
                UPDATE session_group_reserve
                SET current = ?, updated_at = CURRENT_TIMESTAMP
                WHERE session_id = ?
            `).run(newCurrent, sessionId);

            const updated = _parse(
                db.prepare('SELECT * FROM session_group_reserve WHERE session_id = ?').get(sessionId)
            );

            // Broadcast à toute la room de session
            io.to(`noctis_session_${sessionId}`)
                .emit('noctis:group-reserve-update', updated);
        });
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function _parse(raw) {
    return {
        ...raw,
        principes: _parseJSON(raw.principes, []),
        interdits: _parseJSON(raw.interdits, []),
    };
}

function _parseJSON(str, fallback) {
    try { return JSON.parse(str); } catch { return fallback; }
}