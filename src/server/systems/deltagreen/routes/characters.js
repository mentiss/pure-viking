// src/server/systems/deltagreen/routes/characters.js
// ─────────────────────────────────────────────────────────────────────────────
// Routes personnages spécifiques au slug Delta Green.
// Montées automatiquement sur /api/deltagreen/characters par loader.js.
//
// Création publique (pas d'auth).
// Lecture par URL ou code : publique.
// Écriture : auth requise (propriétaire ou GM).
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router  = express.Router();

const { authenticate, requireOwnerOrGM } = require('../../../middlewares/auth');
const { ensureUniqueCode }               = require('../../../utils/characters');
const { loadFullCharacter, saveFullCharacter } = require('../CharacterController');
const { generateAccessUrl }             = require('../config');

// ── GET / — Liste résumée ─────────────────────────────────────────────────────
// Publique — utilisée pour la sélection de personnage.

router.get('/', (req, res) => {
    try {
        const rows = req.db.prepare(`
            SELECT id, access_code, access_url, player_name,
                   nom, alias, profession, avatar, updated_at
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
            alias:       c.alias,
            profession:  c.profession,
            avatar:      c.avatar,
            updatedAt:   c.updated_at,
        })));
    } catch (err) {
        console.error('[deltagreen] GET /characters:', err);
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
        console.error('[deltagreen] GET /by-url:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /by-code/:code — Chargement par access_code (public, login) ──────────

router.get('/by-code/:code', (req, res) => {
    try {
        const row = req.db.prepare(
            'SELECT id FROM characters WHERE access_code = ?'
        ).get(req.params.code.toUpperCase());

        if (!row) return res.status(404).json({ error: 'Personnage introuvable' });

        res.json(loadFullCharacter(req.db, row.id));
    } catch (err) {
        console.error('[deltagreen] GET /by-code:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /:id — Chargement complet par id (auth requise) ───────────────────────

router.get('/:id', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const char = loadFullCharacter(req.db, req.params.id);
        if (!char) return res.status(404).json({ error: 'Personnage introuvable' });
        res.json(char);
    } catch (err) {
        console.error('[deltagreen] GET /:id:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /:id/sessions — Sessions du personnage (auth requise) ─────────────────

router.get('/:id/sessions', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const sessions = req.db.prepare(`
            SELECT gs.id, gs.name, gs.date, gs.updated_at
            FROM game_sessions gs
            JOIN session_characters sc ON sc.session_id = gs.id
            WHERE sc.character_id = ?
            ORDER BY gs.updated_at DESC
        `).all(req.params.id);

        res.json(sessions);
    } catch (err) {
        console.error('[deltagreen] GET /:id/sessions:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── POST / — Création de personnage (public, wizard) ─────────────────────────

router.post('/', (req, res) => {
    try {
        const db = req.db;
        const {
            playerName,
            nom, prenom, alias, profession, employer, nationality, sexe, age,
            str, con, dex, int: int_, pow, cha,
            hpMax, hpCurrent, wpMax, wpCurrent, sanMax, sanCurrent, sr,
            bonds, motivations, skills, languages,
        } = req.body;

        const { code, url } = ensureUniqueCode('character', req);

        // Insertion minimale — on obtient l'id avant les sous-tables
        const result = db.prepare(`
            INSERT INTO characters (
                player_name, access_code, access_url,
                nom, prenom, alias, profession, employer, nationality, sexe, age,
                str, con, dex, int, pow, cha,
                hp_max, hp_current, wp_max, wp_current, san_max, san_current, sr
            ) VALUES (
                @playerName, @code, @url,
                @nom, @prenom, @alias, @profession, @employer, @nationality, @sexe, @age,
                @str, @con, @dex, @int, @pow, @cha,
                @hpMax, @hpCurrent, @wpMax, @wpCurrent, @sanMax, @sanCurrent, @sr
            )
        `).run({
            playerName: playerName ?? '',
            code, url,
            nom:         nom         ?? '',
            prenom:      prenom       ?? '',
            alias:       alias        ?? '',
            profession:  profession   ?? '',
            employer:    employer     ?? '',
            nationality: nationality  ?? '',
            sexe:        sexe         ?? '',
            age:         age          ?? null,
            str: str ?? 10, con: con ?? 10, dex: dex ?? 10,
            int: int_ ?? 10, pow: pow ?? 10, cha: cha ?? 10,
            hpMax:      hpMax      ?? 10,
            hpCurrent:  hpCurrent  ?? 10,
            wpMax:      wpMax      ?? 10,
            wpCurrent:  wpCurrent  ?? 10,
            sanMax:     sanMax     ?? 50,
            sanCurrent: sanCurrent ?? 50,
            sr:         sr         ?? 40,
        });

        const newId = result.lastInsertRowid;

        // Persister les sous-tables via saveFullCharacter
        saveFullCharacter(db, newId, {
            bonds:       Array.isArray(bonds)       ? bonds       : [],
            motivations: Array.isArray(motivations) ? motivations : [],
            skills:      Array.isArray(skills)      ? skills      : [],
            languages:   Array.isArray(languages)   ? languages   : [],
        });

        const created = loadFullCharacter(db, newId);
        res.status(201).json(created);
    } catch (err) {
        console.error('[deltagreen] POST /characters:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── PUT /:id — Mise à jour complète (auth requise) ────────────────────────────

router.put('/:id', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const id  = parseInt(req.params.id, 10);
        const updated = saveFullCharacter(req.db, id, req.body);
        if (!updated) return res.status(404).json({ error: 'Personnage introuvable' });

        const io = req.app.get('io');
        if (io) {
            const sessions = req.db.prepare(
                'SELECT session_id FROM session_characters WHERE character_id = ?'
            ).all(id);
            for (const { session_id } of sessions) {
                io.to(`deltagreen_session_${session_id}`)
                    .emit('character-full-update', { characterId: id, character: updated });
            }
        }

        res.json(updated);
    } catch (err) {
        console.error('[deltagreen] PUT /:id:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── POST /:id/san-loss — Appliquer une perte de SAN ──────────────────────────
// Déduit loss_applied de san_current, recalcule sr, insère dans le log.

router.post('/:id/san-loss', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const db = req.db;
        const charId = req.params.id;

        const {
            situationLabel, lossSuccess, lossFailure,
            lossApplied, sessionId,
        } = req.body;

        const char = db.prepare(
            'SELECT san_current, pow FROM characters WHERE id = ?'
        ).get(charId);

        if (!char) return res.status(404).json({ error: 'Personnage introuvable' });

        const sanBefore = char.san_current;
        const sanAfter  = Math.max(0, sanBefore - (lossApplied ?? 0));
        const newSr     = sanAfter - (char.pow ?? 10);

        db.prepare('BEGIN').run();
        try {
            // Mettre à jour san_current et sr
            db.prepare(`
                UPDATE characters SET san_current = ?, sr = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(sanAfter, newSr, charId);

            // Insérer l'entrée dans le log
            const logRow = db.prepare(`
                INSERT INTO character_san_log
                    (character_id, session_id, situation_label, loss_success, loss_failure,
                     loss_applied, san_before, san_after)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                charId,
                sessionId ?? null,
                situationLabel ?? '',
                lossSuccess ?? '0',
                lossFailure ?? '1',
                lossApplied ?? 0,
                sanBefore,
                sanAfter
            );

            db.prepare('COMMIT').run();

            res.json({
                sanCurrent: sanAfter,
                sr:         newSr,
                logEntry: {
                    id:             logRow.lastInsertRowid,
                    situationLabel: situationLabel ?? '',
                    lossSuccess:    lossSuccess    ?? '0',
                    lossFailure:    lossFailure    ?? '1',
                    lossApplied:    lossApplied    ?? 0,
                    sanBefore,
                    sanAfter,
                },
            });
        } catch (err) {
            db.prepare('ROLLBACK').run();
            throw err;
        }
    } catch (err) {
        console.error('[deltagreen] POST /:id/san-loss:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── POST /:id/evolve — Évolution post-session ─────────────────────────────────
// Les jets D4 sont effectués côté client (diceEngine).
// Le client envoie les résultats : { results: [{ skillId, languageId?, gain }] }
// Le serveur applique les gains et décoche toutes les cases.

router.post('/:id/evolve', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const db     = req.db;
        const charId = req.params.id;
        const { results } = req.body; // [{ skillId?, languageId?, gain }]

        if (!Array.isArray(results)) {
            return res.status(400).json({ error: 'results doit être un tableau' });
        }

        db.prepare('BEGIN').run();
        try {
            for (const entry of results) {
                const gain = Math.max(0, entry.gain ?? 0);
                if (entry.skillId) {
                    db.prepare(`
                        UPDATE character_skills
                        SET score = MIN(99, score + ?), failed_check = 0
                        WHERE id = ? AND character_id = ?
                    `).run(gain, entry.skillId, charId);
                } else if (entry.languageId) {
                    db.prepare(`
                        UPDATE character_languages
                        SET score = MIN(99, score + ?), failed_check = 0
                        WHERE id = ? AND character_id = ?
                    `).run(gain, entry.languageId, charId);
                }
            }

            // Décochage sécurité — s'assure qu'aucune case ne reste cochée
            db.prepare(
                'UPDATE character_skills   SET failed_check = 0 WHERE character_id = ?'
            ).run(charId);
            db.prepare(
                'UPDATE character_languages SET failed_check = 0 WHERE character_id = ?'
            ).run(charId);

            db.prepare('COMMIT').run();

            res.json(loadFullCharacter(db, charId));
        } catch (err) {
            db.prepare('ROLLBACK').run();
            throw err;
        }
    } catch (err) {
        console.error('[deltagreen] POST /:id/evolve:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;