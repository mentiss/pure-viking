// src/server/systems/dune/routes/characters.js
// Routes personnages spécifiques au système Dune.
// Montée automatiquement sur /api/dune/characters par server.js.
//
// La création est PUBLIQUE (pas d'auth requise).
// generateAccessUrl est fournie par req.system.generateAccessUrl (config.js du slug).

const express = require('express');
const router  = express.Router();

const { authenticate, requireOwnerOrGM, requireGM } = require('../../../middlewares/auth');
const { ensureUniqueCode } = require('../../../utils/characters');
const { loadFullCharacter, saveFullCharacter } = require('../characterController');

// ── GET / — Liste résumée (GM uniquement) ────────────────────────────────────

router.get('/', (req, res) => {
    try {
        const rows = req.db.prepare(`
            SELECT id, access_code, access_url, player_name, nom, statut_social,
                   determination, determination_max, updated_at
            FROM characters
            WHERE id != -1
            ORDER BY updated_at DESC
        `).all();

        res.json(rows.map(c => ({
            id:           c.id,
            accessCode:   c.access_code,
            accessUrl:    c.access_url,
            playerName:   c.player_name,
            nom:          c.nom,
            statutSocial: c.statut_social,
            determination:    c.determination,
            determinationMax: c.determination_max,
            updatedAt:    c.updated_at,
        })));
    } catch (err) {
        console.error('[dune] GET /characters:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /by-url/:url — Chargement par access_url (public) ───────────────────

router.get('/by-url/:url', (req, res) => {
    try {
        const row = req.db.prepare(
            'SELECT id FROM characters WHERE access_url = ?'
        ).get(req.params.url);

        if (!row) return res.status(404).json({ error: 'Personnage introuvable' });

        req.db.prepare(
            'UPDATE characters SET last_accessed = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(row.id);

        res.json(loadFullCharacter(req.db, row.id));
    } catch (err) {
        console.error('[dune] GET /by-url:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /by-code/:code — Chargement par access_code (public) ────────────────

router.get('/by-code/:code', (req, res) => {
    try {
        const row = req.db.prepare(
            'SELECT id FROM characters WHERE access_code = ?'
        ).get(req.params.code.toUpperCase());

        if (!row) return res.status(404).json({ error: 'Code d\'accès invalide' });

        res.json(loadFullCharacter(req.db, row.id));
    } catch (err) {
        console.error('[dune] GET /by-code:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /:id/sessions — Sessions du personnage ───────────────────────────────

router.get('/:id/sessions', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const sessions = req.db.prepare(`
            SELECT gs.*, COUNT(sc2.character_id) AS character_count
            FROM game_sessions gs
            INNER JOIN session_characters sc  ON gs.id = sc.session_id
            LEFT  JOIN session_characters sc2 ON gs.id = sc2.session_id
            WHERE sc.character_id = ?
            GROUP BY gs.id
            ORDER BY gs.updated_at DESC
        `).all(req.params.id);

        res.json(sessions);
    } catch (err) {
        console.error('[dune] GET /:id/sessions:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /:id — Fiche complète ────────────────────────────────────────────────

router.get('/:id', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const char = loadFullCharacter(req.db, Number(req.params.id));
        if (!char) return res.status(404).json({ error: 'Personnage introuvable' });

        req.db.prepare(
            'UPDATE characters SET last_accessed = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(req.params.id);

        res.json(char);
    } catch (err) {
        console.error('[dune] GET /:id:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── POST / — Création (publique, sans auth) ──────────────────────────────────

router.post('/', (req, res) => {
    try {
        const { playerName, nom, statutSocial, description,
            determination, determinationMax,
            competences, principes, talents, items,
            accessCode: customCode } = req.body;

        if (!playerName?.trim()) {
            return res.status(400).json({ error: 'playerName est requis' });
        }
        if (!nom?.trim()) {
            return res.status(400).json({ error: 'nom est requis' });
        }

        // Résolution de generateAccessUrl depuis la config du slug
        const generateUrlFn = req.system?.generateAccessUrl;

        let code, url;

        if (customCode?.trim()) {
            // Code personnalisé fourni par le joueur
            code = customCode.trim().toUpperCase().substring(0, 6);
            // URL toujours générée automatiquement (unicité garantie)
            ({ url } = ensureUniqueCode('character', req.db, generateUrlFn));
            // On vérifie l'unicité du code custom
            const existing = req.db.prepare(
                'SELECT id FROM characters WHERE access_code = ?'
            ).get(code);
            if (existing) {
                // Pas bloquant — le code peut être partagé (usage GroupeViking-style)
                // On génère juste un code auto à la place
                ({ code, url } = ensureUniqueCode('character', req.db, generateUrlFn));
            }
        } else {
            ({ code, url } = ensureUniqueCode('character', req.db, generateUrlFn));
        }

        const result = req.db.prepare(`
            INSERT INTO characters (
                access_code, access_url, player_name, nom, statut_social, description,
                determination, determination_max
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            code, url,
            playerName.trim(),
            nom.trim(),
            statutSocial  ?? '',
            description   ?? '',
            determination    != null ? Number(determination)    : 1,
            determinationMax != null ? Number(determinationMax) : 1,
        );

        const charId = result.lastInsertRowid;

        // Persistance des relations (compétences en colonnes + talents/items)
        saveFullCharacter(req.db, charId, {
            competences, principes, talents, items,
        });

        res.status(201).json(loadFullCharacter(req.db, charId));
    } catch (err) {
        console.error('[dune] POST /characters:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── PUT /:id — Mise à jour complète ─────────────────────────────────────────

router.put('/:id', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!req.db.prepare('SELECT id FROM characters WHERE id = ?').get(id)) {
            return res.status(404).json({ error: 'Personnage introuvable' });
        }

        saveFullCharacter(req.db, id, req.body);
        const updated = loadFullCharacter(req.db, id);

        // Broadcast Socket.io si le personnage est dans une session active
        const io = req.app.get('io');
        if (io) {
            const sessions = req.db.prepare(
                'SELECT session_id FROM session_characters WHERE character_id = ?'
            ).all(id);
            for (const { session_id } of sessions) {
                io.to(`dune_session_${session_id}`).emit('character-update', updated);
            }
        }

        res.json(updated);
    } catch (err) {
        console.error('[dune] PUT /:id:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── DELETE /:id — Suppression (GM uniquement) ────────────────────────────────

router.delete('/:id', requireGM, (req, res) => {
    try {
        const id = Number(req.params.id);
        if (id === -1) return res.status(403).json({ error: 'Le compte GM ne peut pas être supprimé' });

        const row = req.db.prepare('SELECT id FROM characters WHERE id = ?').get(id);
        if (!row) return res.status(404).json({ error: 'Personnage introuvable' });

        req.db.prepare('DELETE FROM characters WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (err) {
        console.error('[dune] DELETE /:id:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /:id/send-item ─────────────────────────────────────────────────────
// Envoi d'un atout par le GM vers un joueur.
// Insère l'item dans character_items, émet gm-item-received via socket.

router.post('/:id/send-item', authenticate, requireGM, (req, res) => {
    try {
        const charId = parseInt(req.params.id);
        const { nom, description = '', quantite = 1 } = req.body;

        if (!nom?.trim()) {
            return res.status(400).json({ error: 'Le nom de l\'atout est requis' });
        }

        req.db.prepare(`
            INSERT INTO character_items (character_id, nom, description, quantite)
            VALUES (?, ?, ?, ?)
        `).run(charId, nom.trim(), description.trim(), Math.max(1, quantite));

        // Broadcast socket : le joueur recharge sa fiche
        const io = req.app.get('io');
        if (io) {
            io.emit('gm-item-received', {
                characterId: charId,
                item: { nom: nom.trim(), description: description.trim(), quantite },
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('[dune/send-item] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;