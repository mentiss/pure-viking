// src/server/routes/shared/dice.js
// Route générique historique des jets de dés.
// Partagée par tous les systèmes via systemResolver (req.db, req.system).
//
// Supporte deux formats de payload :
//   - Format générique (nouveaux systèmes) : { notation, roll_definition, roll_result, ... }
//   - Format legacy Vikings               : { pool, threshold, results, successes, ... }
// Les deux peuvent coexister dans le même payload pour Vikings.

const express = require('express');
const router  = express.Router();

// ─── POST /roll ──────────────────────────────────────────────────────────────
// Enregistre un jet de dés et le diffuse via Socket.io.

router.post('/roll', (req, res) => {
    try {
        const {
            // Identité
            character_id,
            character_name,
            session_id,

            // ── Format générique ──────────────────────────────────────────
            notation,
            roll_definition,   // JSON string ou objet
            roll_result,       // JSON string ou objet

            // ── Format legacy Vikings ─────────────────────────────────────
            roll_type,
            roll_target,
            pool,
            threshold,
            results,           // array des dés bruts
            successes,
            saga_spent    = 0,
            saga_recovered = 0,
        } = req.body;

        // Validation minimale : il faut au moins l'un des deux formats
        const hasGenericFormat = notation && roll_result;
        const hasLegacyFormat  = roll_type && results !== undefined && successes !== undefined;

        if (!hasGenericFormat && !hasLegacyFormat) {
            return res.status(400).json({
                error: 'Payload invalide : fournir (notation + roll_result) ou (roll_type + results + successes)'
            });
        }

        // Sérialiser les JSON si fournis comme objets
        const rollDefinitionStr = roll_definition
            ? (typeof roll_definition === 'string' ? roll_definition : JSON.stringify(roll_definition))
            : null;

        const rollResultStr = roll_result
            ? (typeof roll_result === 'string' ? roll_result : JSON.stringify(roll_result))
            : null;

        const resultsStr = results
            ? (typeof results === 'string' ? results : JSON.stringify(results))
            : null;

        // Insertion en base
        const stmt = req.db.prepare(`
            INSERT INTO dice_history (
                character_id, session_id,
                notation, roll_definition, roll_result,
                roll_type, roll_target, pool, threshold, results,
                successes, saga_spent, saga_recovered
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const dbResult = stmt.run(
            character_id   || null,
            session_id     || null,
            notation       || null,
            rollDefinitionStr,
            rollResultStr,
            roll_type      || null,
            roll_target    || null,
            pool           ?? null,
            threshold      ?? null,
            resultsStr,
            successes      ?? null,
            saga_spent,
            saga_recovered
        );

        // Payload de diffusion Socket.io
        // On restitue les JSON parsés pour les clients
        const rollData = {
            id:             dbResult.lastInsertRowid,
            character_id,
            character_name: character_name || 'Anonyme',
            session_id,

            // Générique
            notation:        notation    || null,
            roll_definition: roll_definition ? (typeof roll_definition === 'string' ? JSON.parse(roll_definition) : roll_definition) : null,
            roll_result:     roll_result     ? (typeof roll_result     === 'string' ? JSON.parse(roll_result)     : roll_result)     : null,

            // Legacy
            roll_type,
            roll_target,
            pool,
            threshold,
            results: results ? (typeof results === 'string' ? JSON.parse(results) : results) : null,
            successes,
            saga_spent,
            saga_recovered,

            created_at: new Date().toISOString()
        };

        // Diffusion Socket.io dans la room de session
        const io = req.app.get('io');
        if (io) {
            const room = session_id
                ? `${req.system.slug}_session_${session_id}`
                : null;
            room
                ? io.to(room).emit('dice-roll', rollData)
                : io.emit('dice-roll', rollData);
        }

        res.status(201).json(rollData);

    } catch (error) {
        console.error('[dice/roll] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ─── GET /history ─────────────────────────────────────────────────────────────
// Historique global (session ou global selon sessionId query param).

router.get('/history', (req, res) => {
    try {
        const limit     = Math.min(parseInt(req.query.limit) || 100, 500);
        const { sessionId } = req.query;

        let query = `
            SELECT
                dh.*,
                c.prenom || COALESCE(' "' || c.surnom || '"', '') AS character_name
            FROM dice_history dh
            LEFT JOIN characters c ON dh.character_id = c.id
        `;
        const params = [];

        if (sessionId) {
            query  += ' WHERE dh.session_id = ?';
            params.push(sessionId);
        }
        query += ' ORDER BY dh.created_at DESC LIMIT ?';
        params.push(limit);

        const rows = req.db.prepare(query).all(...params);
        res.json(rows.map(_parseHistoryRow));

    } catch (error) {
        console.error('[dice/history] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ─── GET /history/:characterId ────────────────────────────────────────────────
// Historique d'un personnage spécifique.

router.get('/history/:characterId', (req, res) => {
    try {
        const limit     = Math.min(parseInt(req.query.limit) || 50, 200);
        const { sessionId } = req.query;

        let query  = 'SELECT * FROM dice_history WHERE character_id = ?';
        const params = [req.params.characterId];

        if (sessionId) {
            query  += ' AND session_id = ?';
            params.push(sessionId);
        }
        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);

        const rows = req.db.prepare(query).all(...params);
        res.json(rows.map(_parseHistoryRow));

    } catch (error) {
        console.error('[dice/history/:characterId] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ─── DELETE /history/:id ──────────────────────────────────────────────────────
// Supprime un jet de l'historique.

router.delete('/history/:id', (req, res) => {
    try {
        req.db.prepare('DELETE FROM dice_history WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('[dice/history DELETE] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ─── DELETE /history/session/:sessionId ───────────────────────────────────────
// Purge tout l'historique d'une session.

router.delete('/history/session/:sessionId', (req, res) => {
    try {
        req.db.prepare('DELETE FROM dice_history WHERE session_id = ?').run(req.params.sessionId);
        res.json({ success: true });
    } catch (error) {
        console.error('[dice/history/session DELETE] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ─── DELETE /history ──────────────────────────────────────────────────────────
// Purge tout l'historique (admin / GM).

router.delete('/history', (req, res) => {
    try {
        req.db.prepare('DELETE FROM dice_history').run();
        res.json({ success: true });
    } catch (error) {
        console.error('[dice/history DELETE all] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ─── Helpers privés ───────────────────────────────────────────────────────────

/**
 * Parse les colonnes JSON d'une ligne dice_history retournée par SQLite.
 * Gère les deux formats (générique + legacy) sans erreur si JSON invalide.
 */
function _parseHistoryRow(row) {
    return {
        ...row,
        // Générique
        roll_definition: _safeJsonParse(row.roll_definition),
        roll_result:     _safeJsonParse(row.roll_result),
        // Legacy
        results:         _safeJsonParse(row.results),
    };
}

function _safeJsonParse(str) {
    if (!str) return null;
    try { return JSON.parse(str); }
    catch { return str; } // retourne la string brute si parsing échoue
}

module.exports = router;