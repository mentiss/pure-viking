// src/server/routes/journal.js
// Route générique journal personnage (notes + messages GM).
// Partagée par tous les systèmes.
// Utilise req.db et req.system.slug pour les rooms Socket.

const express = require('express');
const router = express.Router();
const { authenticate, requireOwnerOrGM, requireGM } = require('../middlewares/auth');

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatEntry(e) {
    return {
        id: e.id,
        characterId: e.character_id,
        sessionId: e.session_id,
        sessionName: e.session_name || null,
        type: e.type,
        title: e.title,
        body: e.body,
        metadata: e.metadata ? JSON.parse(e.metadata) : null,
        isRead: !!e.is_read,
        createdAt: e.created_at,
        updatedAt: e.updated_at
    };
}

function loadEntry(db, entryId) {
    return db.prepare(`
        SELECT cj.*, gs.name as session_name
        FROM character_journal cj
                 LEFT JOIN game_sessions gs ON cj.session_id = gs.id
        WHERE cj.id = ?
    `).get(entryId);
}

// ─── Routes ─────────────────────────────────────────────────────────────────

// ─── Routes GM (déclarées AVANT /:characterId pour éviter collision) ────────

router.post('/gm-send', authenticate, requireGM, (req, res) => {
    try {
        const { targetCharacterIds, sessionId, title, body, metadata, toastAnimation = 'default' } = req.body;
        const db = req.db;
        const system = req.system.slug;

        if (!targetCharacterIds?.length) return res.status(400).json({ error: 'No target characters specified' });
        if (!title && !body)             return res.status(400).json({ error: 'Title or body is required' });

        const createdEntries = [];
        const insertStmt = db.prepare(`
            INSERT INTO character_journal (character_id, session_id, type, title, body, metadata, is_read)
            VALUES (?, ?, 'gm_message', ?, ?, ?, 0)
        `);

        for (const charId of targetCharacterIds) {
            if (!db.prepare('SELECT id FROM characters WHERE id = ?').get(charId)) continue;
            const result = insertStmt.run(charId, sessionId || null, title || null, body || null, metadata ? JSON.stringify(metadata) : null);
            const entry = loadEntry(db, result.lastInsertRowid);
            if (entry) createdEntries.push(formatEntry(entry));
        }

        const io = req.app.get('io');
        if (io && createdEntries.length > 0) {
            for (const entry of createdEntries) {
                const payload = { characterId: entry.characterId, entry, toastAnimation };
                const room = sessionId ? `${system}_session_${sessionId}` : null;
                room ? io.to(room).emit('gm-message-received', payload) : io.emit('gm-message-received', payload);
            }
        }

        res.status(201).json({ sent: createdEntries.length, entries: createdEntries });
    } catch (error) {
        console.error('Error sending GM message:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/gm-send-item', authenticate, requireGM, (req, res) => {
    try {
        const { targetCharacterId, sessionId, item, note, toastAnimation = 'default' } = req.body;
        const db = req.db;
        const system = req.system.slug;

        if (!targetCharacterId) return res.status(400).json({ error: 'Target character is required' });
        if (!item?.name)        return res.status(400).json({ error: 'Item data is required' });
        if (!db.prepare('SELECT id FROM characters WHERE id = ?').get(targetCharacterId))
            return res.status(404).json({ error: 'Character not found' });

        const itemResult = db.prepare(`
            INSERT INTO character_items (character_id, name, category, quantity, location, notes,
                                         weapon_type, damage, range, armor_value, requirements, custom_item)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            targetCharacterId, item.name, item.category || 'item',
            item.quantity || 1, item.location || 'bag', note || null,
            item.weaponType || null, item.damage || null, item.range || null,
            item.armorValue || 0,
            item.requirements ? JSON.stringify(item.requirements) : '{}',
            0
        );

        const formattedItem = { id: itemResult.lastInsertRowid, ...item };

        const journalResult = db.prepare(`
            INSERT INTO character_journal (character_id, session_id, type, title, body, metadata, is_read)
            VALUES (?, ?, 'gm_item', ?, ?, ?, 0)
        `).run(
            targetCharacterId, sessionId || null,
            `Objet reçu : ${item.name}`, note || null,
            JSON.stringify({ item: formattedItem })
        );

        const journalEntry = formatEntry(loadEntry(db, journalResult.lastInsertRowid));

        const io = req.app.get('io');
        if (io) {
            const payload = { characterId: targetCharacterId, item: formattedItem, journalEntry, toastAnimation };
            const room = sessionId ? `${system}_session_${sessionId}` : null;
            room ? io.to(room).emit('gm-item-received', payload) : io.emit('gm-item-received', payload);
        }

        res.status(201).json({ item: formattedItem, journalEntry });
    } catch (error) {
        console.error('Error sending GM item:', error);
        res.status(500).json({ error: error.message });
    }
});

// ─── Routes CRUD (/:characterId en dernier pour ne pas capturer les routes statiques) ───

router.get('/:characterId', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const { characterId } = req.params;
        const { sessionId, type } = req.query;
        let query = `
            SELECT cj.*, gs.name as session_name
            FROM character_journal cj
            LEFT JOIN game_sessions gs ON cj.session_id = gs.id
            WHERE cj.character_id = ?
        `;
        const params = [characterId];
        if (sessionId) { query += ' AND cj.session_id = ?'; params.push(sessionId); }
        if (type)      { query += ' AND cj.type = ?';       params.push(type); }
        query += ' ORDER BY cj.updated_at DESC';

        res.json(req.db.prepare(query).all(...params).map(formatEntry));
    } catch (error) {
        console.error('Error fetching journal:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/:characterId', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const { characterId } = req.params;
        const { sessionId, type = 'note', title, body, metadata } = req.body;
        const db = req.db;

        if (!db.prepare('SELECT id FROM characters WHERE id = ?').get(characterId))
            return res.status(404).json({ error: 'Character not found' });
        if (sessionId && !db.prepare('SELECT id FROM game_sessions WHERE id = ?').get(sessionId))
            return res.status(404).json({ error: 'Session not found' });

        const result = db.prepare(`
            INSERT INTO character_journal (character_id, session_id, type, title, body, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(characterId, sessionId || null, type, title || null, body || null, metadata ? JSON.stringify(metadata) : null);

        res.status(201).json(formatEntry(loadEntry(db, result.lastInsertRowid)));
    } catch (error) {
        console.error('Error creating journal entry:', error);
        res.status(500).json({ error: error.message });
    }
});

router.put('/:characterId/:entryId', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const { characterId, entryId } = req.params;
        const { title, body, isRead } = req.body;
        const db = req.db;

        if (!db.prepare('SELECT id FROM character_journal WHERE id = ? AND character_id = ?').get(entryId, characterId))
            return res.status(404).json({ error: 'Journal entry not found' });

        const updates = [];
        const params = [];
        if (title  !== undefined) { updates.push('title = ?');   params.push(title); }
        if (body   !== undefined) { updates.push('body = ?');    params.push(body); }
        if (isRead !== undefined) { updates.push('is_read = ?'); params.push(isRead ? 1 : 0); }
        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(entryId, characterId);
        db.prepare(`UPDATE character_journal SET ${updates.join(', ')} WHERE id = ? AND character_id = ?`).run(...params);

        res.json(formatEntry(loadEntry(db, entryId)));
    } catch (error) {
        console.error('Error updating journal entry:', error);
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:characterId/:entryId', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const result = req.db.prepare(
            'DELETE FROM character_journal WHERE id = ? AND character_id = ?'
        ).run(req.params.entryId, req.params.characterId);

        if (result.changes === 0) return res.status(404).json({ error: 'Journal entry not found' });
        res.json({ deleted: true, id: parseInt(req.params.entryId) });
    } catch (error) {
        console.error('Error deleting journal entry:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;