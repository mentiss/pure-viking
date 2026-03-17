// src/server/systems/tecumah/routes/characters.js
// Routes personnages spécifiques au système Tecumah Gulch.
// Montée automatiquement sur /api/tecumah/characters par loader.js.
//
// La création est PUBLIQUE (pas d'authentification requise).

const express = require('express');
const router  = express.Router();

const { authenticate, requireOwnerOrGM, requireGM } = require('../../../middlewares/auth');
const { ensureUniqueCode } = require('../../../utils/characters');
const { loadFullCharacter, saveFullCharacter } = require('../CharacterController');
const { generateAccessUrl } = require('../config');

// ── GET / — Liste résumée (GM uniquement) ─────────────────────────────────────

router.get('/', authenticate, requireGM, (req, res) => {
    try {
        const rows = req.db.prepare(`
            SELECT id, access_code, access_url, player_name, nom, prenom,
                   blessure_niveau, points_destin, points_personnage, updated_at
            FROM characters
            WHERE id != -1
            ORDER BY updated_at DESC
        `).all();

        res.json(rows.map(c => ({
            id:               c.id,
            accessCode:       c.access_code,
            accessUrl:        c.access_url,
            playerName:       c.player_name,
            nom:              c.nom,
            prenom:           c.prenom,
            blessureNiveau:   c.blessure_niveau,
            pointsDestin:     c.points_destin,
            pointsPersonnage: c.points_personnage,
            updatedAt:        c.updated_at,
        })));
    } catch (err) {
        console.error('[tecumah] GET /characters:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /by-url/:url — Chargement par access_url (public) ────────────────────

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
        console.error('[tecumah] GET /by-url:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /by-code/:code — Chargement par access_code (public, pour login) ──────

router.get('/by-code/:code', (req, res) => {
    try {
        const row = req.db.prepare(
            'SELECT id FROM characters WHERE access_code = ?'
        ).get(req.params.code.toUpperCase());

        if (!row) return res.status(404).json({ error: 'Code invalide' });

        res.json(loadFullCharacter(req.db, row.id));
    } catch (err) {
        console.error('[tecumah] GET /by-code:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /:id/sessions — Sessions du personnage ────────────────────────────────
// ⚠️ Déclarée AVANT GET /:id pour éviter la collision de route

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
        console.error('[tecumah] GET /:id/sessions:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /:id — Fiche complète (authentifié) ───────────────────────────────────

router.get('/:id', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const char = loadFullCharacter(req.db, req.params.id);
        if (!char) return res.status(404).json({ error: 'Personnage introuvable' });

        req.db.prepare(
            'UPDATE characters SET last_accessed = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(req.params.id);

        res.json(char);
    } catch (err) {
        console.error('[tecumah] GET /:id:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── POST / — Création publique ─────────────────────────────────────────────────

router.post('/', (req, res) => {
    try {
        const {
            playerName, nom, prenom, age, taille, sexe, description,
            agilite, vigueur, coordination, perception, charisme, savoir,
            backgrounds, items,
            points_destin,
            ...compData
        } = req.body;

        if (!playerName?.trim()) {
            return res.status(400).json({ error: 'playerName est requis' });
        }

        const { code, url } = ensureUniqueCode('character', req);

        const result = req.db.prepare(`
            INSERT INTO characters (
                access_code, access_url, player_name,
                nom, prenom, age, taille, sexe, description,
                agilite, vigueur, coordination, perception, charisme, savoir,
                points_destin
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            code, url, playerName.trim(),
            nom          ?? '',
            prenom       ?? '',
            age          ?? null,
            taille       ?? '',
            sexe         ?? '',
            description  ?? '',
            agilite      ?? 3,
            vigueur      ?? 3,
            coordination ?? 3,
            perception   ?? 3,
            charisme     ?? 3,
            savoir       ?? 3,
            points_destin ?? 3,
        );

        const charId = result.lastInsertRowid;

        saveFullCharacter(req.db, charId, {
            ...compData,
            backgrounds: backgrounds ?? [],
            items:       items       ?? [],
        });

        res.status(201).json(loadFullCharacter(req.db, charId));
    } catch (err) {
        console.error('[tecumah] POST /characters:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── PUT /:id — Mise à jour complète ───────────────────────────────────────────

router.put('/:id', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!req.db.prepare('SELECT id FROM characters WHERE id = ?').get(id)) {
            return res.status(404).json({ error: 'Personnage introuvable' });
        }

        saveFullCharacter(req.db, id, req.body);
        const updated = loadFullCharacter(req.db, id);

        // Broadcast Socket.io
        const io = req.app.get('io');
        if (io) {
            const sessions = req.db.prepare(
                'SELECT session_id FROM session_characters WHERE character_id = ?'
            ).all(id);
            for (const { session_id } of sessions) {
                io.to(`tecumah_session_${session_id}`).emit('character-full-update', {
                    characterId: id,
                    character:   updated,
                });
            }
        }

        res.json(updated);
    } catch (err) {
        console.error('[tecumah] PUT /:id:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── DELETE /:id — Suppression (GM uniquement) ─────────────────────────────────

router.delete('/:id', authenticate, requireGM, (req, res) => {
    try {
        const id = Number(req.params.id);
        if (id === -1) return res.status(403).json({ error: 'Le compte GM ne peut pas être supprimé' });

        if (!req.db.prepare('SELECT id FROM characters WHERE id = ?').get(id)) {
            return res.status(404).json({ error: 'Personnage introuvable' });
        }

        req.db.prepare('DELETE FROM characters WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (err) {
        console.error('[tecumah] DELETE /:id:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── POST /:id/send-item — Envoi d'un item par le GM vers un joueur ─────────────
// Insère l'item dans character_items et émet gm-item-received via socket.
// L'item Tecumah a des champs spécifiques (damage, range, skill_key).

router.post('/:id/send-item', authenticate, requireGM, (req, res) => {
    try {
        const charId = Number(req.params.id);
        const {
            name, description = '', category = 'misc', quantity = 1,
            damage = 0, rangeShort = 0, rangeMedium = 0, rangeLong = 0, skillKey = '',
        } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ error: 'Le nom de l\'item est requis' });
        }

        if (!req.db.prepare('SELECT id FROM characters WHERE id = ?').get(charId)) {
            return res.status(404).json({ error: 'Personnage introuvable' });
        }

        const result = req.db.prepare(`
            INSERT INTO character_items
                (character_id, name, description, category, quantity, location,
                 damage, range_short, range_medium, range_long, skill_key)
            VALUES (?, ?, ?, ?, ?, 'inventory', ?, ?, ?, ?, ?)
        `).run(
            charId, name.trim(), description.trim(), category,
            Math.max(1, quantity),
            damage, rangeShort, rangeMedium, rangeLong, skillKey,
        );

        const item = {
            id:          result.lastInsertRowid,
            name:        name.trim(),
            description: description.trim(),
            category,
            quantity:    Math.max(1, quantity),
            location:    'inventory',
            damage, rangeShort, rangeMedium, rangeLong, skillKey,
        };

        // Broadcast socket — le joueur recharge sa fiche
        const io = req.app.get('io');
        if (io) {
            const sessions = req.db.prepare(
                'SELECT session_id FROM session_characters WHERE character_id = ?'
            ).all(charId);
            for (const { session_id } of sessions) {
                io.to(`tecumah_session_${session_id}`).emit('gm-item-received', {
                    characterId: charId,
                    item,
                });
            }
        }

        res.status(201).json({ success: true, item });
    } catch (err) {
        console.error('[tecumah] POST /:id/send-item:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;