// src/server/systems/deltagreen/CharacterController.js
// ─────────────────────────────────────────────────────────────────────────────
// Contrat :
//   loadFullCharacter(db, id) → objet complet ou null
//   saveFullCharacter(db, id, data) → objet complet mis à jour
//
// loadFullCharacter agrège :
//   - characters (toutes les colonnes plates)
//   - character_bonds
//   - character_motivations
//   - character_skills (base + spécialités)
//   - character_languages
//   - character_san_log
//   - character_equipment
//   JSON parsé : tags, special_training, distinctive_traits
//
// saveFullCharacter persiste en transaction atomique :
//   - UPDATE characters (colonnes plates)
//   - CRUD complet sur chaque sous-table (upsert par id + delete des absents)
// ─────────────────────────────────────────────────────────────────────────────

// ── Helpers CRUD sous-tables ──────────────────────────────────────────────────

/**
 * Synchronise une sous-table en CRUD complet.
 * Les entrées avec id existant sont mises à jour (upsert).
 * Les entrées sans id sont insérées.
 * Les entrées présentes en BDD mais absentes du tableau sont supprimées.
 *
 * @param {object}   db
 * @param {string}   table        - nom de la table
 * @param {number}   characterId
 * @param {Array}    incoming     - tableau d'objets depuis le client
 * @param {Function} upsertFn     - (db, characterId, item) → void, gère insert/update
 */
function _syncSubTable(db, table, characterId, incoming, upsertFn) {
    if (!Array.isArray(incoming)) return;

    const existingIds = db.prepare(
        `SELECT id FROM ${table} WHERE character_id = ?`
    ).all(characterId).map(r => r.id);

    const incomingIds = incoming.filter(i => i.id).map(i => i.id);

    // Supprimer les entrées disparues
    for (const eid of existingIds) {
        if (!incomingIds.includes(eid)) {
            db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(eid);
        }
    }

    // Upsert chaque entrée entrante
    for (const item of incoming) {
        upsertFn(db, characterId, item);
    }
}

// ── loadFullCharacter ─────────────────────────────────────────────────────────

/**
 * Charge un personnage complet depuis la BDD.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {number|string} id
 * @returns {object|null}
 */
function loadFullCharacter(db, id) {
    const row = db.prepare('SELECT * FROM characters WHERE id = ?').get(id);
    if (!row) return null;

    const bonds = db.prepare(
        'SELECT id, name, score, is_damaged, position FROM character_bonds WHERE character_id = ? ORDER BY position, id'
    ).all(id);

    const motivations = db.prepare(
        'SELECT id, text, type, position FROM character_motivations WHERE character_id = ? ORDER BY position, id'
    ).all(id);

    const skills = db.prepare(`
        SELECT id, skill_key, specialty, score, failed_check
        FROM character_skills
        WHERE character_id = ?
        ORDER BY skill_key, COALESCE(specialty, '')
    `).all(id);

    const languages = db.prepare(
        'SELECT id, name, score, failed_check FROM character_languages WHERE character_id = ? ORDER BY name'
    ).all(id);

    const sanLog = db.prepare(`
        SELECT id, session_id, situation_label, loss_success, loss_failure,
               loss_applied, san_before, san_after, notes, created_at
        FROM character_san_log
        WHERE character_id = ?
        ORDER BY created_at DESC
    `).all(id);

    const equipment = db.prepare(`
        SELECT id, name, category, expense, is_restricted, restriction_note,
               slot, quantity, notes, json_details
        FROM character_equipment
        WHERE character_id = ?
        ORDER BY slot NULLS LAST, created_at
    `).all(id);

    return {
        id:          row.id,
        accessCode:  row.access_code,
        accessUrl:   row.access_url,
        playerName:  row.player_name,
        avatar:      row.avatar ?? null,

        // Identité
        nom:                 row.nom                  ?? '',
        prenom:              row.prenom               ?? '',
        alias:               row.alias                ?? '',
        profession:          row.profession           ?? '',
        employer:            row.employer             ?? '',
        nationality:         row.nationality          ?? '',
        sexe:                row.sexe                 ?? '',
        age:                 row.age                  ?? null,
        birthDate:           row.birth_date           ?? '',
        education:           row.education            ?? '',
        physicalDescription: row.physical_description ?? '',

        // Caractéristiques
        str: row.str ?? 10,
        con: row.con ?? 10,
        dex: row.dex ?? 10,
        int: row.int ?? 10,
        pow: row.pow ?? 10,
        cha: row.cha ?? 10,

        // Attributs dérivés
        hpMax:      row.hp_max      ?? 10,
        hpCurrent:  row.hp_current  ?? 10,
        wpMax:      row.wp_max      ?? 10,
        wpCurrent:  row.wp_current  ?? 10,
        sanMax:     row.san_max     ?? 50,
        sanCurrent: row.san_current ?? 50,
        sr:         row.sr          ?? 40,

        // Accoutumance
        adaptedViolence:     !!row.adapted_violence,
        adaptedHelplessness: !!row.adapted_helplessness,

        // Contrôles GM (transmis au joueur — le front décide de l'affichage)
        degradationPalier: row.degradation_palier ?? 0,
        tags:              _parseJson(row.tags, []),

        // Santé physique
        firstAidApplied: !!row.first_aid_applied,
        injuries:         row.injuries          ?? '',

        // Remarques
        personalNotes:      row.personal_notes     ?? '',
        familyDevelopments: row.family_developments ?? '',

        // JSON structurés
        specialTraining:   _parseJson(row.special_training,  []),
        distinctiveTraits: _parseJson(row.distinctive_traits, {}),

        // Admin
        officerResponsible: row.officer_responsible ?? '',
        agentSignature:     row.agent_signature     ?? '',

        // Sous-tables
        bonds: bonds.map(b => ({
            id:        b.id,
            name:      b.name      ?? '',
            score:     b.score     ?? 0,
            isDamaged: !!b.is_damaged,
            position:  b.position  ?? 0,
        })),

        motivations: motivations.map(m => ({
            id:       m.id,
            text:     m.text     ?? '',
            type:     m.type     ?? 'motivation',
            position: m.position ?? 0,
        })),

        skills: skills.map(s => ({
            id:          s.id,
            skillKey:    s.skill_key,
            specialty:   s.specialty   ?? null,
            score:       s.score       ?? 0,
            failedCheck: !!s.failed_check,
        })),

        languages: languages.map(l => ({
            id:          l.id,
            name:        l.name        ?? '',
            score:       l.score       ?? 0,
            failedCheck: !!l.failed_check,
        })),

        sanLog: sanLog.map(e => ({
            id:             e.id,
            sessionId:      e.session_id      ?? null,
            situationLabel: e.situation_label ?? '',
            lossSuccess:    e.loss_success    ?? '0',
            lossFailure:    e.loss_failure    ?? '1',
            lossApplied:    e.loss_applied    ?? 0,
            sanBefore:      e.san_before      ?? 0,
            sanAfter:       e.san_after       ?? 0,
            notes:          e.notes           ?? '',
            createdAt:      e.created_at,
        })),

        equipment: equipment.map(e => ({
            id:              e.id,
            name:            e.name             ?? '',
            category:        e.category         ?? '',
            expense:         e.expense          ?? 'Standard',
            isRestricted:    !!e.is_restricted,
            restrictionNote: e.restriction_note ?? '',
            slot:            e.slot             ?? null,
            quantity:        e.quantity         ?? 1,
            notes:           e.notes            ?? '',
            jsonDetails:     _parseJson(e.json_details, {}),
        })),

        // Métadonnées
        createdAt:    row.created_at,
        updatedAt:    row.updated_at,
        lastAccessed: row.last_accessed,
    };
}

// ── saveFullCharacter ─────────────────────────────────────────────────────────

/**
 * Persiste un personnage complet en transaction atomique.
 * Seuls les champs présents dans `data` sont mis à jour (COALESCE).
 * Les sous-tables présentes dans `data` sont entièrement synchronisées.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {number|string} id
 * @param {object} data
 * @returns {object} personnage rechargé
 */
function saveFullCharacter(db, id, data) {
    db.prepare('BEGIN').run();
    try {

        // ── 1. Colonnes plates du personnage ──────────────────────────────────
        db.prepare(`
            UPDATE characters SET
                player_name          = COALESCE(@playerName,          player_name),
                avatar               = COALESCE(@avatar,              avatar),
                nom                  = COALESCE(@nom,                 nom),
                prenom               = COALESCE(@prenom,              prenom),
                alias                = COALESCE(@alias,               alias),
                profession           = COALESCE(@profession,          profession),
                employer             = COALESCE(@employer,            employer),
                nationality          = COALESCE(@nationality,         nationality),
                sexe                 = COALESCE(@sexe,                sexe),
                age                  = @age,
                birth_date           = COALESCE(@birthDate,           birth_date),
                education            = COALESCE(@education,           education),
                physical_description = COALESCE(@physicalDescription, physical_description),
                str                  = COALESCE(@str,                 str),
                con                  = COALESCE(@con,                 con),
                dex                  = COALESCE(@dex,                 dex),
                int                  = COALESCE(@int,                 int),
                pow                  = COALESCE(@pow,                 pow),
                cha                  = COALESCE(@cha,                 cha),
                hp_max               = COALESCE(@hpMax,               hp_max),
                hp_current           = COALESCE(@hpCurrent,           hp_current),
                wp_max               = COALESCE(@wpMax,               wp_max),
                wp_current           = COALESCE(@wpCurrent,           wp_current),
                san_max              = COALESCE(@sanMax,              san_max),
                san_current          = COALESCE(@sanCurrent,          san_current),
                sr                   = COALESCE(@sr,                  sr),
                adapted_violence     = COALESCE(@adaptedViolence,     adapted_violence),
                adapted_helplessness = COALESCE(@adaptedHelplessness, adapted_helplessness),
                degradation_palier   = COALESCE(@degradationPalier,   degradation_palier),
                tags                 = COALESCE(@tags,                tags),
                first_aid_applied    = COALESCE(@firstAidApplied,     first_aid_applied),
                injuries             = COALESCE(@injuries,            injuries),
                personal_notes       = COALESCE(@personalNotes,       personal_notes),
                family_developments  = COALESCE(@familyDevelopments,  family_developments),
                special_training     = COALESCE(@specialTraining,     special_training),
                distinctive_traits   = COALESCE(@distinctiveTraits,   distinctive_traits),
                officer_responsible  = COALESCE(@officerResponsible,  officer_responsible),
                agent_signature      = COALESCE(@agentSignature,      agent_signature),
                updated_at           = CURRENT_TIMESTAMP
            WHERE id = @id
        `).run({
            id,
            playerName:          data.playerName          ?? null,
            avatar:              data.avatar              ?? null,
            nom:                 data.nom                 ?? null,
            prenom:              data.prenom              ?? null,
            alias:               data.alias               ?? null,
            profession:          data.profession          ?? null,
            employer:            data.employer            ?? null,
            nationality:         data.nationality         ?? null,
            sexe:                data.sexe                ?? null,
            age:                 data.age                 ?? null,
            birthDate:           data.birthDate           ?? null,
            education:           data.education           ?? null,
            physicalDescription: data.physicalDescription ?? null,
            str:                 data.str                 ?? null,
            con:                 data.con                 ?? null,
            dex:                 data.dex                 ?? null,
            int:                 data.int                 ?? null,
            pow:                 data.pow                 ?? null,
            cha:                 data.cha                 ?? null,
            hpMax:               data.hpMax               ?? null,
            hpCurrent:           data.hpCurrent           ?? null,
            wpMax:               data.wpMax               ?? null,
            wpCurrent:           data.wpCurrent           ?? null,
            sanMax:              data.sanMax              ?? null,
            sanCurrent:          data.sanCurrent          ?? null,
            sr:                  data.sr                  ?? null,
            adaptedViolence:     data.adaptedViolence     != null ? (data.adaptedViolence ? 1 : 0) : null,
            adaptedHelplessness: data.adaptedHelplessness != null ? (data.adaptedHelplessness ? 1 : 0) : null,
            degradationPalier:   data.degradationPalier   ?? null,
            tags:                data.tags                != null ? JSON.stringify(data.tags) : null,
            firstAidApplied:     data.firstAidApplied     != null ? (data.firstAidApplied ? 1 : 0) : null,
            injuries:            data.injuries            ?? null,
            personalNotes:       data.personalNotes       ?? null,
            familyDevelopments:  data.familyDevelopments  ?? null,
            specialTraining:     data.specialTraining     != null ? JSON.stringify(data.specialTraining) : null,
            distinctiveTraits:   data.distinctiveTraits   != null ? JSON.stringify(data.distinctiveTraits) : null,
            officerResponsible:  data.officerResponsible  ?? null,
            agentSignature:      data.agentSignature      ?? null,
        });

        // ── 2. Attaches ───────────────────────────────────────────────────────
        _syncSubTable(db, 'character_bonds', id, data.bonds, (db, charId, b) => {
            if (b.id) {
                db.prepare(`
                    UPDATE character_bonds SET
                        name       = ?, score    = ?,
                        is_damaged = ?, position = ?
                    WHERE id = ? AND character_id = ?
                `).run(b.name ?? '', b.score ?? 0, b.isDamaged ? 1 : 0, b.position ?? 0, b.id, charId);
            } else {
                db.prepare(`
                    INSERT INTO character_bonds (character_id, name, score, is_damaged, position)
                    VALUES (?, ?, ?, ?, ?)
                `).run(charId, b.name ?? '', b.score ?? 0, b.isDamaged ? 1 : 0, b.position ?? 0);
            }
        });

        // ── 3. Motivations ────────────────────────────────────────────────────
        _syncSubTable(db, 'character_motivations', id, data.motivations, (db, charId, m) => {
            if (m.id) {
                db.prepare(`
                    UPDATE character_motivations SET text = ?, type = ?, position = ?
                    WHERE id = ? AND character_id = ?
                `).run(m.text ?? '', m.type ?? 'motivation', m.position ?? 0, m.id, charId);
            } else {
                db.prepare(`
                    INSERT INTO character_motivations (character_id, text, type, position)
                    VALUES (?, ?, ?, ?)
                `).run(charId, m.text ?? '', m.type ?? 'motivation', m.position ?? 0);
            }
        });

        // ── 4. Compétences ────────────────────────────────────────────────────
        // Upsert uniquement (pas de suppression — la liste de compétences est fixe)
        if (Array.isArray(data.skills)) {
            const upsert = db.prepare(`
                INSERT INTO character_skills (character_id, skill_key, specialty, score, failed_check)
                VALUES (@charId, @skillKey, @specialty, @score, @failedCheck)
                ON CONFLICT(character_id, skill_key, COALESCE(specialty, '')) DO UPDATE SET
                    score        = excluded.score,
                    failed_check = excluded.failed_check
            `);
            for (const s of data.skills) {
                upsert.run({
                    charId:      id,
                    skillKey:    s.skillKey,
                    specialty:   s.specialty   ?? null,
                    score:       s.score       ?? 0,
                    failedCheck: s.failedCheck ? 1 : 0,
                });
            }
        }

        // ── 5. Langues ────────────────────────────────────────────────────────
        _syncSubTable(db, 'character_languages', id, data.languages, (db, charId, l) => {
            if (l.id) {
                db.prepare(`
                    UPDATE character_languages SET name = ?, score = ?, failed_check = ?
                    WHERE id = ? AND character_id = ?
                `).run(l.name ?? '', l.score ?? 0, l.failedCheck ? 1 : 0, l.id, charId);
            } else {
                db.prepare(`
                    INSERT INTO character_languages (character_id, name, score, failed_check)
                    VALUES (?, ?, ?, ?)
                `).run(charId, l.name ?? '', l.score ?? 0, l.failedCheck ? 1 : 0);
            }
        });

        // ── 6. Équipement ─────────────────────────────────────────────────────
        _syncSubTable(db, 'character_equipment', id, data.equipment, (db, charId, e) => {
            const details = e.jsonDetails != null ? JSON.stringify(e.jsonDetails) : '{}';
            if (e.id) {
                db.prepare(`
                    UPDATE character_equipment SET
                        name             = ?, category    = ?, expense = ?,
                        is_restricted    = ?, restriction_note = ?,
                        slot             = ?, quantity    = ?,
                        notes            = ?, json_details = ?
                    WHERE id = ? AND character_id = ?
                `).run(
                    e.name ?? '', e.category ?? '', e.expense ?? 'Standard',
                    e.isRestricted ? 1 : 0, e.restrictionNote ?? '',
                    e.slot ?? null, e.quantity ?? 1,
                    e.notes ?? '', details,
                    e.id, charId
                );
            } else {
                db.prepare(`
                    INSERT INTO character_equipment
                        (character_id, name, category, expense, is_restricted, restriction_note,
                         slot, quantity, notes, json_details)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    charId, e.name ?? '', e.category ?? '', e.expense ?? 'Standard',
                    e.isRestricted ? 1 : 0, e.restrictionNote ?? '',
                    e.slot ?? null, e.quantity ?? 1, e.notes ?? '', details
                );
            }
        });

        db.prepare('COMMIT').run();
    } catch (err) {
        db.prepare('ROLLBACK').run();
        throw err;
    }

    return loadFullCharacter(db, id);
}

// ── Helpers privés ────────────────────────────────────────────────────────────

function _parseJson(value, fallback) {
    if (value == null) return fallback;
    try { return JSON.parse(value); } catch (_) { return fallback; }
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = { loadFullCharacter, saveFullCharacter };