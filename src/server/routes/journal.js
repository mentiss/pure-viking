// routes/journal.js - API journal personnage (notes joueur + messages GM)
const express = require('express');
const router = express.Router();
const { getDb } = require('../utils/db');
const { authenticate, requireOwnerOrGM, requireGM} = require('../middlewares/auth');


// POST /api/journal/gm-send - Envoyer un message du GM aux joueurs
router.post('/gm-send', authenticate, requireGM, (req, res) => {
    try {
        const db = getDb();
        const { targetCharacterIds, sessionId, title, body, metadata, toastAnimation = 'default' } = req.body;

        if (!targetCharacterIds || !targetCharacterIds.length) {
            return res.status(400).json({ error: 'No target characters specified' });
        }

        if (!title && !body) {
            return res.status(400).json({ error: 'Title or body is required' });
        }

        const createdEntries = [];

        const insertStmt = db.prepare(`
            INSERT INTO character_journal (character_id, session_id, type, title, body, metadata, is_read)
            VALUES (?, ?, 'gm_message', ?, ?, ?, 0)
        `);

        const selectStmt = db.prepare(`
            SELECT cj.*, gs.name as session_name
            FROM character_journal cj
            LEFT JOIN game_sessions gs ON cj.session_id = gs.id
            WHERE cj.id = ?
        `);

        // Créer une entrée pour chaque destinataire
        for (const charId of targetCharacterIds) {
            // Vérifier que le personnage existe
            const character = db.prepare('SELECT id FROM characters WHERE id = ?').get(charId);
            if (!character) continue;

            const result = insertStmt.run(
                charId,
                sessionId || null,
                title || null,
                body || null,
                metadata ? JSON.stringify(metadata) : null
            );

            const entry = selectStmt.get(result.lastInsertRowid);
            if (entry) {
                createdEntries.push({
                    id: entry.id,
                    characterId: entry.character_id,
                    sessionId: entry.session_id,
                    sessionName: entry.session_name,
                    type: entry.type,
                    title: entry.title,
                    body: entry.body,
                    metadata: entry.metadata ? JSON.parse(entry.metadata) : null,
                    isRead: false,
                    createdAt: entry.created_at,
                    updatedAt: entry.updated_at
                });
            }
        }

        // Broadcast via Socket.IO
        const io = req.app.get('io');
        if (io && createdEntries.length > 0) {
            for (const entry of createdEntries) {
                // Émettre dans la session room pour que le bon joueur reçoive
                if (sessionId) {
                    io.to(`session-${sessionId}`).emit('gm-message-received', {
                        characterId: entry.characterId,
                        entry,
                        toastAnimation
                    });
                } else {
                    // Broadcast global si pas de session
                    io.emit('gm-message-received', {
                        characterId: entry.characterId,
                        entry,
                        toastAnimation
                    });
                }
            }
        }

        res.status(201).json({
            sent: createdEntries.length,
            entries: createdEntries
        });
    } catch (error) {
        console.error('Error sending GM message:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/gm-send-item', authenticate, requireGM, (req, res) => {
    try {
        const db = getDb();
        const {
            targetCharacterId,
            sessionId,
            item,
            note,
            toastAnimation = 'default'
        } = req.body;

        if (!targetCharacterId) {
            return res.status(400).json({ error: 'Target character is required' });
        }

        if (!item || !item.name) {
            return res.status(400).json({ error: 'Item data is required' });
        }

        // Vérifier que le personnage existe
        const character = db.prepare('SELECT id FROM characters WHERE id = ?').get(targetCharacterId);
        if (!character) {
            return res.status(404).json({ error: 'Character not found' });
        }

        // 1. Insérer l'item dans l'inventaire du joueur
        const itemResult = db.prepare(`
            INSERT INTO character_items (
                character_id, name, category, quantity, location, notes,
                weapon_type, damage, range, armor_value, requirements, custom_item
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            targetCharacterId,
            item.name.trim(),
            item.category || 'item',
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

        const createdItem = db.prepare('SELECT * FROM character_items WHERE id = ?').get(itemResult.lastInsertRowid);
        const formattedItem = {
            id: createdItem.id,
            characterId: createdItem.character_id,
            name: createdItem.name,
            category: createdItem.category,
            quantity: createdItem.quantity,
            location: createdItem.location,
            notes: createdItem.notes,
            weaponType: createdItem.weapon_type,
            damage: createdItem.damage,
            range: createdItem.range,
            armorValue: createdItem.armor_value,
            requirements: createdItem.requirements ? JSON.parse(createdItem.requirements) : {},
            customItem: !!createdItem.custom_item
        };

        // 2. Créer une entrée journal gm_item
        const categoryLabels = { weapon: 'Arme', armor: 'Armure', item: 'Objet' };
        const categoryLabel = categoryLabels[item.category] || 'Objet';

        const journalResult = db.prepare(`
            INSERT INTO character_journal (character_id, session_id, type, title, body, metadata, is_read)
            VALUES (?, ?, 'gm_item', ?, ?, ?, 0)
        `).run(
            targetCharacterId,
            sessionId || null,
            `${categoryLabel} reçu : ${item.name}`,
            note || `Le MJ vous a donné : ${item.name}`,
            JSON.stringify({ itemId: createdItem.id, itemData: formattedItem })
        );

        const journalEntry = db.prepare(`
            SELECT cj.*, gs.name as session_name
            FROM character_journal cj
            LEFT JOIN game_sessions gs ON cj.session_id = gs.id
            WHERE cj.id = ?
        `).get(journalResult.lastInsertRowid);

        const formattedEntry = {
            id: journalEntry.id,
            characterId: journalEntry.character_id,
            sessionId: journalEntry.session_id,
            sessionName: journalEntry.session_name,
            type: journalEntry.type,
            title: journalEntry.title,
            body: journalEntry.body,
            metadata: journalEntry.metadata ? JSON.parse(journalEntry.metadata) : null,
            isRead: false,
            createdAt: journalEntry.created_at,
            updatedAt: journalEntry.updated_at
        };

        // 3. Broadcast via Socket.IO
        const io = req.app.get('io');
        if (io) {
            const payload = {
                characterId: targetCharacterId,
                item: formattedItem,
                journalEntry: formattedEntry,
                toastAnimation
            };

            if (sessionId) {
                io.to(`session-${sessionId}`).emit('gm-item-received', payload);
            } else {
                io.emit('gm-item-received', payload);
            }
        }

        console.log(`🎁 GM sent item "${item.name}" to character ${targetCharacterId}`);

        res.status(201).json({
            item: formattedItem,
            journalEntry: formattedEntry
        });
    } catch (error) {
        console.error('Error sending GM item:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/journal/:characterId - Liste des entrées du journal
// Query params: ?sessionId=X, ?type=note
router.get('/:characterId', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const db = getDb();
        const { characterId } = req.params;
        const { sessionId, type } = req.query;

        let query = `
            SELECT 
                cj.*,
                gs.name as session_name
            FROM character_journal cj
            LEFT JOIN game_sessions gs ON cj.session_id = gs.id
            WHERE cj.character_id = ?
        `;
        const params = [characterId];

        if (sessionId) {
            query += ' AND cj.session_id = ?';
            params.push(sessionId);
        }

        if (type) {
            query += ' AND cj.type = ?';
            params.push(type);
        }

        query += ' ORDER BY cj.updated_at DESC';

        const entries = db.prepare(query).all(...params);

        res.json(entries.map(e => ({
            id: e.id,
            characterId: e.character_id,
            sessionId: e.session_id,
            sessionName: e.session_name,
            type: e.type,
            title: e.title,
            body: e.body,
            metadata: e.metadata ? JSON.parse(e.metadata) : null,
            isRead: !!e.is_read,
            createdAt: e.created_at,
            updatedAt: e.updated_at
        })));
    } catch (error) {
        console.error('Error fetching journal:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/journal/:characterId - Créer une entrée
router.post('/:characterId', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const db = getDb();
        const { characterId } = req.params;
        const { sessionId, type = 'note', title, body, metadata } = req.body;

        // Vérifier que le personnage existe
        const character = db.prepare('SELECT id FROM characters WHERE id = ?').get(characterId);
        if (!character) {
            return res.status(404).json({ error: 'Character not found' });
        }

        // Vérifier que la session existe si fournie
        if (sessionId) {
            const session = db.prepare('SELECT id FROM game_sessions WHERE id = ?').get(sessionId);
            if (!session) {
                return res.status(404).json({ error: 'Session not found' });
            }
        }

        const result = db.prepare(`
            INSERT INTO character_journal (character_id, session_id, type, title, body, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            characterId,
            sessionId || null,
            type,
            title || null,
            body || null,
            metadata ? JSON.stringify(metadata) : null
        );

        // Recharger avec session_name
        const entry = db.prepare(`
            SELECT cj.*, gs.name as session_name
            FROM character_journal cj
            LEFT JOIN game_sessions gs ON cj.session_id = gs.id
            WHERE cj.id = ?
        `).get(result.lastInsertRowid);

        res.status(201).json({
            id: entry.id,
            characterId: entry.character_id,
            sessionId: entry.session_id,
            sessionName: entry.session_name,
            type: entry.type,
            title: entry.title,
            body: entry.body,
            metadata: entry.metadata ? JSON.parse(entry.metadata) : null,
            isRead: !!entry.is_read,
            createdAt: entry.created_at,
            updatedAt: entry.updated_at
        });
    } catch (error) {
        console.error('Error creating journal entry:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/journal/:characterId/:entryId - Modifier une entrée
router.put('/:characterId/:entryId', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const db = getDb();
        const { characterId, entryId } = req.params;
        const { title, body, isRead } = req.body;

        // Vérifier que l'entrée existe et appartient au personnage
        const entry = db.prepare(
            'SELECT * FROM character_journal WHERE id = ? AND character_id = ?'
        ).get(entryId, characterId);

        if (!entry) {
            return res.status(404).json({ error: 'Journal entry not found' });
        }

        // Construire l'update dynamiquement
        const updates = [];
        const params = [];

        if (title !== undefined) {
            updates.push('title = ?');
            params.push(title);
        }
        if (body !== undefined) {
            updates.push('body = ?');
            params.push(body);
        }
        if (isRead !== undefined) {
            updates.push('is_read = ?');
            params.push(isRead ? 1 : 0);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(entryId, characterId);

        db.prepare(`
            UPDATE character_journal 
            SET ${updates.join(', ')}
            WHERE id = ? AND character_id = ?
        `).run(...params);

        // Recharger
        const updated = db.prepare(`
            SELECT cj.*, gs.name as session_name
            FROM character_journal cj
            LEFT JOIN game_sessions gs ON cj.session_id = gs.id
            WHERE cj.id = ?
        `).get(entryId);

        res.json({
            id: updated.id,
            characterId: updated.character_id,
            sessionId: updated.session_id,
            sessionName: updated.session_name,
            type: updated.type,
            title: updated.title,
            body: updated.body,
            metadata: updated.metadata ? JSON.parse(updated.metadata) : null,
            isRead: !!updated.is_read,
            createdAt: updated.created_at,
            updatedAt: updated.updated_at
        });
    } catch (error) {
        console.error('Error updating journal entry:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/journal/:characterId/:entryId - Supprimer une entrée
router.delete('/:characterId/:entryId', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const db = getDb();
        const { characterId, entryId } = req.params;

        const result = db.prepare(
            'DELETE FROM character_journal WHERE id = ? AND character_id = ?'
        ).run(entryId, characterId);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Journal entry not found' });
        }

        res.json({ deleted: true, id: parseInt(entryId) });
    } catch (error) {
        console.error('Error deleting journal entry:', error);
        res.status(500).json({ error: error.message });
    }
});


module.exports = router;