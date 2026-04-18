const express = require('express');
const router  = express.Router();

const { authenticate, requireOwnerOrGM, requireGM } = require('../../../middlewares/auth');
const { ensureUniqueCode }                           = require('../../../utils/characters');
const { loadFullCharacter, saveFullCharacter, computeReserveMax } = require('../characterController');
const { generateAccessUrl }                          = require('../config');

// ── GET / — Liste résumée, publique (sélection de personnage côté joueur) ─────

router.get('/', (req, res) => {
    try {
        const rows = req.db.prepare(`
            SELECT id, access_code, access_url, player_name, nom, prenom, avatar, updated_at
            FROM characters
            WHERE id != -1
            ORDER BY updated_at DESC
        `).all();

        res.json(rows.map(c => ({
            id:          c.id,
            accessCode:  c.access_code,
            accessUrl:   c.access_url,
            playerName:  c.player_name,
            nom:         c.nom,
            prenom:      c.prenom,
            avatar:      c.avatar,
            updatedAt:   c.updated_at,
        })));
    } catch (err) {
        console.error('[noctis] GET /characters:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /by-url/:url — Chargement par access_url (public) ─────────────────────

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
        console.error('[noctis] GET /by-url:', err);
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
        console.error('[noctis] GET /by-code:', err);
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
        console.error('[noctis] GET /:id/sessions:', err);
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
        console.error('[noctis] GET /:id:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── POST / — Création publique (wizard) ───────────────────────────────────────

router.post('/', (req, res) => {
    const {
        player_name, nom, prenom, sexe, age, taille, poids, activite, avatar,
        force        = 1, sante       = 1, athletisme  = 1,
        agilite      = 1, precision   = 1, technique   = 1,
        connaissance = 1, perception  = 1, volonte     = 1,
        persuasion   = 1, psychologie = 1, entregent   = 1,
        eclats_max   = 1, eclats_current = 1,
        specialties  = [],
        ombres       = [],
    } = req.body;

    if (!player_name || !nom || !prenom) {
        return res.status(400).json({ error: 'player_name, nom et prenom sont requis.' });
    }

    const charStats = {
        force, sante, athletisme,
        agilite, precision, technique,
        connaissance, perception, volonte,
        persuasion, psychologie, entregent,
    };

    const { reserve_effort_max, reserve_sangfroid_max } = computeReserveMax(charStats);

    const access_code = ensureUniqueCode('character', req);
    const access_url = generateAccessUrl();
    const db = req.db;

    console.log('[noctis] POST /characters body:', {
        player_name, nom, prenom, sexe, age, taille, poids, activite, avatar,
        force, sante, athletisme,
        agilite, precision, technique,
        connaissance, perception, volonte,
        persuasion, psychologie, entregent,
        eclats_max, eclats_current,
        specialties,
        ombres, reserve_effort_max, reserve_sangfroid_max, access_code, access_url
    });

    db.prepare('BEGIN').run();
    try {
        const result = req.db.prepare(`
            INSERT INTO characters (
                access_code, access_url, player_name,
                nom, prenom, sexe, age, taille, poids, activite, avatar,
                force, sante, athletisme,
                agilite, precision, technique,
                connaissance, perception, volonte,
                persuasion, psychologie, entregent,
                reserve_effort_max,    reserve_effort_current,
                reserve_sangfroid_max, reserve_sangfroid_current,
                eclats_max, eclats_current
            ) VALUES (
                         @access_code, @access_url, @player_name,
                         @nom, @prenom, @sexe, @age, @taille, @poids, @activite, @avatar,
                         @force, @sante, @athletisme,
                         @agilite, @precision, @technique,
                         @connaissance, @perception, @volonte,
                         @persuasion, @psychologie, @entregent,
                         @reserve_effort_max,    @reserve_effort_max,
                         @reserve_sangfroid_max, @reserve_sangfroid_max,
                         @eclats_max, @eclats_current
                     )
        `).run({
            access_code: access_code?.code,
            access_url, player_name, nom, prenom,
            sexe:     sexe     ?? null,
            age:      age      ?? null,
            taille:   taille   ?? null,
            poids:    poids    ?? null,
            activite: activite ?? '',
            avatar:   (avatar !== undefined && avatar) ? avatar : null,
            force, sante, athletisme,
            agilite, precision, technique,
            connaissance, perception, volonte,
            persuasion, psychologie, entregent,
            reserve_effort_max,
            reserve_sangfroid_max,
            eclats_max, eclats_current,
        });

        const newId = result.lastInsertRowid;

        const insSpecialty = req.db.prepare(`
            INSERT INTO character_specialties (character_id, name, type, niveau, notes)
            VALUES (?, ?, ?, ?, ?)
        `);
        for (const s of specialties) {
            insSpecialty.run(newId, s.name ?? '', s.type ?? 'normale', s.niveau ?? 'debutant', s.notes ?? '');
        }

        const insOmbre = req.db.prepare(`
            INSERT INTO character_ombres (character_id, type, description)
            VALUES (?, ?, ?)
        `);
        for (const o of ombres) {
            insOmbre.run(newId, o.type ?? 'dette', o.description ?? '');
        }

        req.db.prepare('COMMIT').run();

        res.status(201).json(loadFullCharacter(req.db, newId));
    } catch (err) {
        req.db.prepare('ROLLBACK').run();
        console.error('[noctis] POST /characters:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── PUT /:id — Sauvegarde complète (authentifié) ──────────────────────────────

router.put('/:id', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const id  = parseInt(req.params.id, 10);
        const row = req.db.prepare('SELECT id FROM characters WHERE id = ?').get(id);
        if (!row) return res.status(404).json({ error: 'Personnage introuvable.' });

        const updated = saveFullCharacter(req.db, id, req.body);

        const io = req.app.get('io');
        if (io) {
            const sessions = req.db.prepare(
                'SELECT session_id FROM session_characters WHERE character_id = ?'
            ).all(id);
            for (const { session_id } of sessions) {
                io.to(`noctis_session_${session_id}`)
                    .emit('character-full-update', { characterId: id, character: updated });
            }
        }

        res.json(updated);
    } catch (err) {
        console.error('[noctis] PUT /characters/:id:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── PATCH /:id — Mise à jour partielle (éclats, santé, réserves, selvarins) ───

router.patch('/:id', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);

        const playerAllowed = [
            'eclats_current',
            'sante_touche_current', 'sante_blesse_current', 'sante_tue_current',
            'reserve_effort_current', 'reserve_sangfroid_current',
            'selvarins_current', 'selvarins_month',
        ];
        const gmOnly = [
            'eclats_max',
            'sante_touche_max', 'sante_blesse_max', 'sante_tue_max',
            'reserve_effort_max', 'reserve_sangfroid_max',
            'is_fracture', 'xp_total', 'xp_spent',
        ];
        const allowed = [...playerAllowed, ...gmOnly];

        const fields = Object.keys(req.body).filter(k => allowed.includes(k));

        if (!req.user?.isGM) {
            const forbidden = fields.filter(k => gmOnly.includes(k));
            if (forbidden.length) {
                return res.status(403).json({ error: 'Champs réservés au GM.', fields: forbidden });
            }
        }

        if (!fields.length) {
            return res.status(400).json({ error: 'Aucun champ valide.' });
        }

        const setClause = fields.map(f => `${f} = @${f}`).join(', ');
        const params    = { id };
        for (const f of fields) params[f] = req.body[f];

        req.db.prepare(`
            UPDATE characters SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = @id
        `).run(params);

        const io = req.app.get('io');
        if (io) io.emit('character-updated', { characterId: id, slug: 'noctis' });

        res.json(req.db.prepare('SELECT * FROM characters WHERE id = ?').get(id));
    } catch (err) {
        console.error('[noctis] PATCH /characters/:id:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;