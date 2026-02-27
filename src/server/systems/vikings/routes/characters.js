// src/server/systems/vikings/routes/characters.js
// Route characters spécifique au système Pure Vikings.
// Connaît la structure complète d'un personnage Vikings (caracs, SAGA, runes...).

const express = require('express');
const router = express.Router();
const { authenticate, requireOwnerOrGM, requireGM } = require('../../../middlewares/auth');
const { ensureUniqueCode, generateAccessUrl } = require('../../../utils/characters');
const { loadFullCharacter, saveFullCharacter } = require('../characterController');

// GET / - Liste tous les personnages
router.get('/', (req, res) => {
    try {
        const characters = req.db.prepare(`
            SELECT id, access_code, access_url, player_name, prenom, surnom,
                   avatar, age, sexe, saga_actuelle, saga_totale,
                   tokens_blessure, tokens_fatigue
            FROM characters ORDER BY updated_at DESC
        `).all();

        res.json(characters.map(c => ({
            id: c.id,
            accessCode: c.access_code,
            accessUrl: c.access_url,
            playerName: c.player_name,
            name: `${c.prenom}${c.surnom ? ' "' + c.surnom + '"' : ''}`,
            avatar: c.avatar,
            age: c.age,
            sexe: c.sexe,
            sagaActuelle: c.saga_actuelle,
            sagaTotale: c.saga_totale,
            tokensBlessure: c.tokens_blessure,
            tokensFatigue: c.tokens_fatigue
        })));
    } catch (error) {
        console.error('Error fetching characters:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /by-url/:url
router.get('/by-url/:url', (req, res) => {
    try {
        const char = req.db.prepare('SELECT id FROM characters WHERE access_url = ?').get(req.params.url);
        if (!char) return res.status(404).json({ error: 'Character not found' });
        req.db.prepare('UPDATE characters SET last_accessed = CURRENT_TIMESTAMP WHERE id = ?').run(char.id);
        res.json(loadFullCharacter(req.db, char.id));
    } catch (error) {
        console.error('Error fetching character by URL:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /by-code/:code
router.get('/by-code/:code', (req, res) => {
    try {
        const char = req.db.prepare('SELECT id FROM characters WHERE access_code = ?').get(req.params.code.toUpperCase());
        if (!char) return res.status(404).json({ error: 'Character not found' });
        res.json(loadFullCharacter(req.db, char.id));
    } catch (error) {
        console.error('Error fetching character by code:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /:id/sessions
router.get('/:id/sessions', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const sessions = req.db.prepare(`
            SELECT gs.*, COUNT(sc2.character_id) AS character_count
            FROM game_sessions gs
            INNER JOIN session_characters sc ON gs.id = sc.session_id
            LEFT JOIN session_characters sc2 ON gs.id = sc2.session_id
            WHERE sc.character_id = ?
            GROUP BY gs.id
            ORDER BY gs.updated_at DESC
        `).all(req.params.id);
        res.json(sessions);
    } catch (error) {
        console.error('Error fetching character sessions:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /:id
router.get('/:id', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const char = loadFullCharacter(req.db, req.params.id);
        if (!char) return res.status(404).json({ error: 'Character not found' });
        req.db.prepare('UPDATE characters SET last_accessed = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
        res.json(char);
    } catch (error) {
        console.error('Error fetching character:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST / - Créer un personnage
router.post('/', (req, res) => {
    try {
        const {
            playerName, prenom, surnom, nomParent, sexe, age, taille, poids, activite, avatar,
            force, agilite, perception, intelligence, charisme, chance,
            armure, actionsDisponibles, seuilCombat,
            sagaActuelle, sagaTotale, tokensBlessure, tokensFatigue,
            skills, traits, runes, items, accessCode
        } = req.body;

        if (!playerName || !prenom) return res.status(400).json({ error: 'playerName and prenom are required' });

        let code, finalUrl;
        if (accessCode?.trim()) {
            code = accessCode.toUpperCase().substring(0, 6);
            finalUrl = generateAccessUrl();
        } else {
            ({ code, url: finalUrl } = ensureUniqueCode('character', req.db));
        }

        let attempts = 0;
        while (req.db.prepare('SELECT id FROM characters WHERE access_url = ?').get(finalUrl) && attempts < 10) {
            finalUrl = generateAccessUrl();
            attempts++;
        }
        if (attempts >= 10) return res.status(500).json({ error: 'Could not generate unique URL' });

        const result = req.db.prepare(`
            INSERT INTO characters (
                access_code, access_url,
                player_name, prenom, surnom, nom_parent, sexe, age, taille, poids, activite, avatar,
                force, agilite, perception, intelligence, charisme, chance,
                armure, actions_disponibles, seuil_combat,
                saga_actuelle, saga_totale, tokens_blessure, tokens_fatigue
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            code, finalUrl,
            playerName, prenom, surnom || null, nomParent || null, sexe,
            age, taille || null, poids || null, activite || null, avatar || null,
            force || 2, agilite || 2, perception || 2, intelligence || 2, charisme || 2, chance || 2,
            armure || 0, actionsDisponibles || 1, seuilCombat || 1,
            sagaActuelle || 3, sagaTotale || 3, tokensBlessure || 0, tokensFatigue || 0
        );

        const characterId = result.lastInsertRowid;
        // Sauvegarder les relations (skills, traits, runes, items)
        saveFullCharacter(req.db, characterId, { skills, traits, runes, items });

        res.status(201).json(loadFullCharacter(req.db, characterId));
    } catch (error) {
        console.error('Error creating character:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /:id - Mettre à jour un personnage
router.put('/:id', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const db = req.db;
        if (!db.prepare('SELECT id FROM characters WHERE id = ?').get(req.params.id))
            return res.status(404).json({ error: 'Character not found' });

        if (req.body.accessUrl) {
            const existing = db.prepare('SELECT id FROM characters WHERE access_url = ? AND id != ?')
                .get(req.body.accessUrl, req.params.id);
            if (existing) return res.status(400).json({ error: 'Cette URL est déjà utilisée par un autre personnage' });
        }

        saveFullCharacter(db, req.params.id, req.body);
        const updated = loadFullCharacter(db, req.params.id);
        const system = req.system.slug;

        const io = req.app.get('io');
        if (io) {
            try {
                const sessions = db.prepare('SELECT session_id FROM session_characters WHERE character_id = ?').all(req.params.id);
                if (sessions.length > 0) {
                    const payload = { characterId: parseInt(req.params.id), character: updated };
                    sessions.forEach(s => io.to(`${system}_session_${s.session_id}`).emit('character-full-update', payload));
                }
            } catch (err) {
                console.error('Error broadcasting character-full-update:', err);
            }
            io.emit('character-light-update', {
                characterId: parseInt(req.params.id),
                tokensBlessure: updated.tokensBlessure,
                tokensFatigue: updated.tokensFatigue,
                sagaActuelle: updated.sagaActuelle
            });
        }

        res.json(updated);
    } catch (error) {
        console.error('Error updating character:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /:id
router.delete('/:id', authenticate, requireGM, (req, res) => {
    try {
        const result = req.db.prepare('DELETE FROM characters WHERE id = ?').run(req.params.id);
        if (result.changes === 0) return res.status(404).json({ error: 'Character not found' });
        res.json({ deleted: true, id: parseInt(req.params.id) });
    } catch (error) {
        console.error('Error deleting character:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;