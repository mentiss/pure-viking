// routes/characters.js - API des personnages (STRUCTURE RELATIONNELLE)
const {authenticate, requireOwnerOrGM, requireGM} = require('../middlewares/auth');
const express = require('express');
const router = express.Router();
const { getDb, ensureUniqueCode } = require('../utils/db');
const {loadFullCharacter, generateAccessUrl, saveFullCharacter} = require("../utils/characters");

// GET /api/characters - Liste tous les personnages
router.get('/', (req, res) => {
    try {
        const db = getDb();
        const characters = db.prepare('SELECT id, access_code, access_url, player_name, prenom, surnom, avatar, age, sexe, saga_actuelle, saga_totale, tokens_blessure, tokens_fatigue FROM characters ORDER BY updated_at DESC').all();
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


router.get('/:id/sessions', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const db = getDb();

        // Récupérer les sessions auxquelles le personnage appartient
        const sessions = db.prepare(`
            SELECT gs.*, COUNT(sc2.character_id) as character_count
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

// GET /api/characters/:id - Récupérer un personnage par ID
router.get('/:id', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const db = getDb();
        const char = loadFullCharacter(db, req.params.id);
        
        if (!char) {
            return res.status(404).json({ error: 'Character not found' });
        }
        
        // Mettre à jour last_accessed
        db.prepare('UPDATE characters SET last_accessed = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
        
        res.json(char);
    } catch (error) {
        console.error('Error fetching character:', error);
        res.status(500).json({ error: error.message });
    }
});


router.get('/by-url/:url', (req, res) => {
    try {
        const db = getDb();
        const char = db.prepare('SELECT id FROM characters WHERE access_url = ?').get(req.params.url);

        if (!char) {
            return res.status(404).json({ error: 'Character not found' });
        }

        const full = loadFullCharacter(db, char.id);
        db.prepare('UPDATE characters SET last_accessed = CURRENT_TIMESTAMP WHERE id = ?').run(char.id);

        res.json(full);
    } catch (error) {
        console.error('Error fetching character by URL:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/characters - Créer un personnage
router.post('/', (req, res) => {
    try {
        const { playerName, prenom, surnom, nomParent, sexe, age, taille, poids, activite,
                avatar,
                force, agilite, perception, intelligence, charisme, chance,
                armure, actionsDisponibles, seuilCombat,
                sagaActuelle, sagaTotale, tokensBlessure, tokensFatigue,
                skills, traits, runes, items, accessCode } = req.body;
        
        if (!playerName || !prenom) {
            return res.status(400).json({ error: 'playerName and prenom are required' });
        }
        
        const db = getDb();
        
        // Si code custom fourni, l'utiliser (peut être dupliqué)
        // Sinon générer auto
        let code, url;
        if (accessCode && accessCode.trim()) {
            code = accessCode.toUpperCase().substring(0, 6);
            url = generateAccessUrl();
        } else {
            const generated = ensureUniqueCode('character');
            code = generated.code;
            url = generated.url;
        }
        
        // Vérifier unicité URL (boucle jusqu'à trouver URL unique)
        let finalUrl = url;
        let attempts = 0;
        while (db.prepare('SELECT id FROM characters WHERE access_url = ?').get(finalUrl) && attempts < 10) {
            finalUrl = generateAccessUrl();
            attempts++;
        }
        
        if (attempts >= 10) {
            return res.status(500).json({ error: 'Could not generate unique URL' });
        }
        
        // Insérer personnage principal
        const result = db.prepare(`
            INSERT INTO characters (
                access_code, access_url,
                player_name, prenom, surnom, nom_parent, sexe, age, taille, poids, activite, avatar,
                force, agilite, perception, intelligence, charisme, chance,
                armure, actions_disponibles, seuil_combat,
                saga_actuelle, saga_totale,
                tokens_blessure, tokens_fatigue
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            code, finalUrl,
            playerName, prenom, surnom, nomParent, sexe, age, taille, poids, activite, avatar || null,
            force || 2, agilite || 2, perception || 2, intelligence || 2, charisme || 2, chance || 2,
            armure || 0, actionsDisponibles || 1, seuilCombat || 1,
            sagaActuelle || 3, sagaTotale || 3,
            tokensBlessure || 0, tokensFatigue || 0
        );
        
        const characterId = result.lastInsertRowid;
        
        // Insérer compétences
        const insertSkill = db.prepare('INSERT INTO character_skills (character_id, skill_name, specialization, level, current_points) VALUES (?, ?, ?, ?, ?)');
        for (const skill of skills || []) {
            insertSkill.run(characterId, skill.name, skill.specialization || null, skill.level, skill.currentPoints || skill.level);
        }
        
        // Insérer traits
        const insertTrait = db.prepare('INSERT INTO character_traits (character_id, trait_name) VALUES (?, ?)');
        for (const trait of traits || []) {
            insertTrait.run(characterId, trait.name);
        }
        
        // Insérer runes
        const insertRune = db.prepare('INSERT INTO character_runes (character_id, rune_name, level) VALUES (?, ?, ?)');
        for (const rune of runes || []) {
            insertRune.run(characterId, rune.name, rune.level || 1);
        }
        
        // Insérer items
        const insertItem = db.prepare(`
            INSERT INTO character_items (
                character_id, name, category, quantity, location, notes,
                weapon_type, damage, range, armor_value, requirements, custom_item
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const item of items || []) {
            insertItem.run(
                characterId,
                item.name,
                item.category,
                item.quantity || 1,
                item.location || 'bag',
                item.notes || null,
                item.weaponType || null,
                item.damage || null,
                item.range || null,
                item.armorValue || 0,
                item.requirements ? JSON.stringify(item.requirements) : '{}',
                item.customItem ? 1 : 0
            );
        }
        
        const full = loadFullCharacter(db, characterId);
        res.status(201).json(full);
    } catch (error) {
        console.error('Error creating character:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/characters/:id - Mettre à jour un personnage
router.put('/:id', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const db = getDb();
        
        // Vérifier existence
        const exists = db.prepare('SELECT id FROM characters WHERE id = ?').get(req.params.id);
        if (!exists) {
            return res.status(404).json({ error: 'Character not found' });
        }
        
        // Si access_url est modifié, vérifier unicité
        if (req.body.accessUrl) {
            const existingUrl = db.prepare(
                'SELECT id FROM characters WHERE access_url = ? AND id != ?'
            ).get(req.body.accessUrl, req.params.id);
            
            if (existingUrl) {
                return res.status(400).json({ 
                    error: 'Cette URL est déjà utilisée par un autre personnage' 
                });
            }
        }
        
        // Note: access_code PEUT être dupliqué (pour partage groupe)
        
        saveFullCharacter(db, req.params.id, req.body);
        const updated = loadFullCharacter(db, req.params.id);
        
        // Broadcast update si blessure/fatigue changés
        if ('tokensBlessure' in req.body || 'tokensFatigue' in req.body) {
            const io = req.app.get('io');
            if (io) {
                io.emit('character-update', {
                    characterId: req.params.id,
                    updates: {
                        tokensBlessure: updated.tokensBlessure,
                        tokensFatigue: updated.tokensFatigue
                    }
                });
            }
        }
        
        res.json(updated);
    } catch (error) {
        console.error('Error updating character:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/characters/:id - Supprimer un personnage
router.delete('/:id', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const db = getDb();
        const result = db.prepare('DELETE FROM characters WHERE id = ?').run(req.params.id);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Character not found' });
        }
        
        res.json({ deleted: true, id: parseInt(req.params.id) });
    } catch (error) {
        console.error('Error deleting character:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
