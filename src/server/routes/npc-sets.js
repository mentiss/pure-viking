// src/server/routes/npc-sets.js
// Route générique CRUD pour les sets de NPC.
// Partagée par tous les systèmes via systemResolver (req.db, req.system).
//
// Un set = collection nommée de templates NPC, optionnellement liée à une session.
//
// Endpoints :
//   GET    /              — liste tous les sets (filtre ?session_id=X ou ?free=1)
//   GET    /:id           — un set complet avec ses entrées + templates résolus
//   POST   /              — créer un set
//   PUT    /:id           — modifier nom/description/session d'un set
//   DELETE /:id           — supprimer un set (cascade sur les entrées)
//   POST   /:id/copy      — copier un set (body: { session_id?, name? })
//   POST   /:id/entries   — ajouter un template au set (body: { template_id, quantity })
//   PUT    /:id/entries/:entryId   — modifier la quantité d'une entrée
//   DELETE /:id/entries/:entryId   — retirer une entrée du set

const express = require('express');
const router  = express.Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse les champs JSON d'un template brut BDD.
 */
function parseTemplate(row) {
    if (!row) return null;
    return {
        ...row,
        combat_stats: _parseJson(row.combat_stats, {}),
        system_data:  _parseJson(row.system_data,  {}),
    };
}

function _parseJson(value, fallback) {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch { return fallback; }
}

/**
 * Charge un set avec ses entrées et templates résolus.
 * Retourne null si introuvable.
 */
function loadSetWithEntries(db, setId) {
    const set = db.prepare('SELECT * FROM npc_sets WHERE id = ?').get(setId);
    if (!set) return null;

    const entries = db.prepare(`
        SELECT
            e.id          AS entry_id,
            e.template_id,
            e.quantity,
            t.name,
            t.description,
            t.combat_stats,
            t.system_data
        FROM npc_set_entries e
        JOIN npc_templates   t ON t.id = e.template_id
        WHERE e.set_id = ?
        ORDER BY t.name ASC
    `).all(setId);

    return {
        ...set,
        entries: entries.map(e => ({
            entry_id:    e.entry_id,
            quantity:    e.quantity,
            template: parseTemplate({
                id:          e.template_id,
                name:        e.name,
                description: e.description,
                combat_stats: e.combat_stats,
                system_data:  e.system_data,
            }),
        })),
    };
}

// ─── GET / — Liste des sets ───────────────────────────────────────────────────
// Paramètres de filtre (optionnels) :
//   ?session_id=X  — sets liés à cette session
//   ?free=1        — sets sans session (session_id IS NULL)
//   (aucun)        — tous les sets

router.get('/', (req, res) => {
    try {
        let sql    = 'SELECT * FROM npc_sets';
        const args = [];

        if (req.query.session_id) {
            sql += ' WHERE session_id = ?';
            args.push(Number(req.query.session_id));
        } else if (req.query.free === '1') {
            sql += ' WHERE session_id IS NULL';
        }

        sql += ' ORDER BY updated_at DESC';

        const rows = req.db.prepare(sql).all(...args);

        // Ajouter le compte d'entrées sans charger les templates
        const withCount = rows.map(set => {
            const count = req.db.prepare(
                'SELECT COUNT(*) AS n FROM npc_set_entries WHERE set_id = ?'
            ).get(set.id);
            return { ...set, entry_count: count.n };
        });

        res.json(withCount);
    } catch (err) {
        console.error('[npc-sets] GET / error:', err);
        res.status(500).json({ error: 'Erreur lors de la récupération des sets' });
    }
});

// ─── GET /:id — Un set complet ────────────────────────────────────────────────

router.get('/:id', (req, res) => {
    try {
        const set = loadSetWithEntries(req.db, req.params.id);
        if (!set) return res.status(404).json({ error: 'Set introuvable' });
        res.json(set);
    } catch (err) {
        console.error('[npc-sets] GET /:id error:', err);
        res.status(500).json({ error: 'Erreur lors de la récupération du set' });
    }
});

// ─── POST / — Créer un set ────────────────────────────────────────────────────

router.post('/', (req, res) => {
    try {
        const { name, description, session_id } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Le nom est obligatoire' });
        }

        const result = req.db.prepare(`
            INSERT INTO npc_sets (name, description, session_id)
            VALUES (?, ?, ?)
        `).run(
            name.trim(),
            description ?? null,
            session_id  ?? null,
        );

        const created = loadSetWithEntries(req.db, result.lastInsertRowid);
        res.status(201).json(created);
    } catch (err) {
        console.error('[npc-sets] POST / error:', err);
        res.status(500).json({ error: 'Erreur lors de la création du set' });
    }
});

// ─── PUT /:id — Modifier un set ───────────────────────────────────────────────

router.put('/:id', (req, res) => {
    try {
        const { name, description, session_id } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Le nom est obligatoire' });
        }

        const existing = req.db.prepare('SELECT id FROM npc_sets WHERE id = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Set introuvable' });

        req.db.prepare(`
            UPDATE npc_sets
            SET name = ?, description = ?, session_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            name.trim(),
            description ?? null,
            session_id  ?? null,
            req.params.id,
        );

        const updated = loadSetWithEntries(req.db, req.params.id);
        res.json(updated);
    } catch (err) {
        console.error('[npc-sets] PUT /:id error:', err);
        res.status(500).json({ error: 'Erreur lors de la mise à jour du set' });
    }
});

// ─── DELETE /:id — Supprimer un set ──────────────────────────────────────────
// Les entrées sont supprimées automatiquement via ON DELETE CASCADE.

router.delete('/:id', (req, res) => {
    try {
        const existing = req.db.prepare('SELECT id FROM npc_sets WHERE id = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Set introuvable' });

        req.db.prepare('DELETE FROM npc_sets WHERE id = ?').run(req.params.id);
        res.json({ success: true, id: parseInt(req.params.id) });
    } catch (err) {
        console.error('[npc-sets] DELETE /:id error:', err);
        res.status(500).json({ error: 'Erreur lors de la suppression du set' });
    }
});

// ─── POST /:id/copy — Copier un set ──────────────────────────────────────────
// Duplique le set et toutes ses entrées.
// Body optionnel : { name, session_id }
//   - name       : nouveau nom (défaut : "Copie de <nom>")
//   - session_id : rattacher la copie à une session (null = libre)

router.post('/:id/copy', (req, res) => {
    try {
        const source = loadSetWithEntries(req.db, req.params.id);
        if (!source) return res.status(404).json({ error: 'Set source introuvable' });

        const newName      = req.body.name       ?? `Copie de ${source.name}`;
        const newSessionId = req.body.session_id !== undefined
            ? (req.body.session_id ?? null)
            : null;

        // Transaction : créer le set + dupliquer les entrées
        const copySet = req.db.transaction(() => {
            const result = req.db.prepare(`
                INSERT INTO npc_sets (name, description, session_id)
                VALUES (?, ?, ?)
            `).run(newName.trim(), source.description ?? null, newSessionId);

            const newSetId = result.lastInsertRowid;

            for (const entry of source.entries) {
                req.db.prepare(`
                    INSERT INTO npc_set_entries (set_id, template_id, quantity)
                    VALUES (?, ?, ?)
                `).run(newSetId, entry.template.id, entry.quantity);
            }

            return newSetId;
        });

        const newSetId = copySet();
        const created  = loadSetWithEntries(req.db, newSetId);
        res.status(201).json(created);
    } catch (err) {
        console.error('[npc-sets] POST /:id/copy error:', err);
        res.status(500).json({ error: 'Erreur lors de la copie du set' });
    }
});

// ─── POST /:id/entries — Ajouter un template au set ──────────────────────────
// Body : { template_id, quantity }

router.post('/:id/entries', (req, res) => {
    try {
        const { template_id, quantity = 1 } = req.body;

        if (!template_id) {
            return res.status(400).json({ error: 'template_id est obligatoire' });
        }

        // Vérifier que le set existe
        const set = req.db.prepare('SELECT id FROM npc_sets WHERE id = ?').get(req.params.id);
        if (!set) return res.status(404).json({ error: 'Set introuvable' });

        // Vérifier que le template existe
        const tpl = req.db.prepare('SELECT id FROM npc_templates WHERE id = ?').get(template_id);
        if (!tpl) return res.status(404).json({ error: 'Template introuvable' });

        // Vérifier si déjà présent — si oui, incrémenter la quantité
        const existing = req.db.prepare(
            'SELECT id, quantity FROM npc_set_entries WHERE set_id = ? AND template_id = ?'
        ).get(req.params.id, template_id);

        if (existing) {
            const newQty = existing.quantity + Math.max(1, parseInt(quantity));
            req.db.prepare(
                'UPDATE npc_set_entries SET quantity = ? WHERE id = ?'
            ).run(newQty, existing.id);
        } else {
            req.db.prepare(
                'INSERT INTO npc_set_entries (set_id, template_id, quantity) VALUES (?, ?, ?)'
            ).run(req.params.id, template_id, Math.max(1, parseInt(quantity)));
        }

        // Touch updated_at du set
        req.db.prepare(
            'UPDATE npc_sets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(req.params.id);

        const updated = loadSetWithEntries(req.db, req.params.id);
        res.json(updated);
    } catch (err) {
        console.error('[npc-sets] POST /:id/entries error:', err);
        res.status(500).json({ error: "Erreur lors de l'ajout de l'entrée" });
    }
});

// ─── PUT /:id/entries/:entryId — Modifier la quantité d'une entrée ────────────

router.put('/:id/entries/:entryId', (req, res) => {
    try {
        const { quantity } = req.body;
        const qty = parseInt(quantity);

        if (!qty || qty < 1) {
            return res.status(400).json({ error: 'La quantité doit être ≥ 1' });
        }

        const entry = req.db.prepare(
            'SELECT id FROM npc_set_entries WHERE id = ? AND set_id = ?'
        ).get(req.params.entryId, req.params.id);
        if (!entry) return res.status(404).json({ error: 'Entrée introuvable' });

        req.db.prepare(
            'UPDATE npc_set_entries SET quantity = ? WHERE id = ?'
        ).run(qty, req.params.entryId);

        req.db.prepare(
            'UPDATE npc_sets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(req.params.id);

        const updated = loadSetWithEntries(req.db, req.params.id);
        res.json(updated);
    } catch (err) {
        console.error('[npc-sets] PUT /:id/entries/:entryId error:', err);
        res.status(500).json({ error: "Erreur lors de la mise à jour de l'entrée" });
    }
});

// ─── DELETE /:id/entries/:entryId — Retirer une entrée ───────────────────────

router.delete('/:id/entries/:entryId', (req, res) => {
    try {
        const entry = req.db.prepare(
            'SELECT id FROM npc_set_entries WHERE id = ? AND set_id = ?'
        ).get(req.params.entryId, req.params.id);
        if (!entry) return res.status(404).json({ error: 'Entrée introuvable' });

        req.db.prepare('DELETE FROM npc_set_entries WHERE id = ?').run(req.params.entryId);

        req.db.prepare(
            'UPDATE npc_sets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(req.params.id);

        const updated = loadSetWithEntries(req.db, req.params.id);
        res.json(updated);
    } catch (err) {
        console.error('[npc-sets] DELETE /:id/entries/:entryId error:', err);
        res.status(500).json({ error: "Erreur lors de la suppression de l'entrée" });
    }
});

module.exports = router;