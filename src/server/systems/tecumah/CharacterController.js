// src/server/systems/tecumah/characterController.js
// Couche d'accès données pour le système Tecumah Gulch.
//
// Contrat :
//   loadFullCharacter(db, id) → objet complet (colonnes plates + backgrounds[] + items[])
//   saveFullCharacter(db, id, data) → persistance en transaction, CRUD propre sur backgrounds/items

// ── Liste des colonnes attributs et compétences ───────────────────────────────
// Utilisée pour construire dynamiquement la clause UPDATE sans risque d'injection.

const ATTRIBUTS = [
    'agilite', 'vigueur', 'coordination', 'perception', 'charisme', 'savoir',
];

const COMPETENCES = [
    // Agilité
    'comp_acrobatie', 'comp_armes_blanches', 'comp_discretion', 'comp_esquive',
    'comp_contorsion', 'comp_lutte', 'comp_equitation', 'comp_escalade',
    'comp_saut', 'comp_lasso', 'comp_rodeo',
    // Vigueur
    'comp_course', 'comp_nage', 'comp_puissance', 'comp_endurance',
    // Coordination
    'comp_pistolet', 'comp_fusil', 'comp_arc', 'comp_artillerie',
    'comp_prestidigitation', 'comp_crochetage', 'comp_arme_de_jet',
    'comp_lancer', 'comp_bricolage',
    // Perception
    'comp_recherche', 'comp_enquete', 'comp_intuition', 'comp_observation',
    'comp_camouflage', 'comp_jeux', 'comp_survie', 'comp_chariots', 'comp_pister',
    // Charisme
    'comp_charme', 'comp_negocier', 'comp_commander', 'comp_escroquerie',
    'comp_persuasion', 'comp_volonte', 'comp_dressage', 'comp_deguisement',
    'comp_intimider', 'comp_comedie',
    // Savoir
    'comp_langues', 'comp_geographie', 'comp_evaluer', 'comp_medecine',
    'comp_academique', 'comp_lois', 'comp_falsification', 'comp_ingenierie',
    'comp_business', 'comp_botanique', 'comp_cultures_indiennes', 'comp_demolition',
];

// ── loadFullCharacter ─────────────────────────────────────────────────────────

/**
 * Charge un personnage complet depuis la BDD.
 * Les backgrounds et items sont retournés sous forme de tableaux.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {number|string} id
 * @returns {object|null}
 */
function loadFullCharacter(db, id) {
    const row = db.prepare('SELECT * FROM characters WHERE id = ?').get(id);
    if (!row) return null;

    const backgrounds = db.prepare(
        'SELECT id, type, niveau, notes FROM character_backgrounds WHERE character_id = ? ORDER BY id'
    ).all(id);

    const items = db.prepare(`
        SELECT id, name, description, category, quantity, location,
               damage, range_short, range_medium, range_long, skill_key
        FROM character_items
        WHERE character_id = ?
        ORDER BY id
    `).all(id);

    return {
        id:          row.id,
        accessCode:  row.access_code,
        accessUrl:   row.access_url,
        playerName:  row.player_name,
        avatar:      row.avatar ?? null,

        // Identité
        nom:         row.nom         ?? '',
        prenom:      row.prenom      ?? '',
        age:         row.age         ?? null,
        taille:      row.taille      ?? '',
        sexe:        row.sexe        ?? '',
        description: row.description ?? '',

        // Attributs (pips)
        agilite:     row.agilite     ?? 6,
        vigueur:     row.vigueur     ?? 6,
        coordination: row.coordination ?? 6,
        perception:  row.perception  ?? 6,
        charisme:    row.charisme    ?? 6,
        savoir:      row.savoir      ?? 6,

        // Compétences Agilité (pips, 0 = non investie)
        comp_acrobatie:      row.comp_acrobatie      ?? 0,
        comp_armes_blanches: row.comp_armes_blanches ?? 0,
        comp_discretion:     row.comp_discretion     ?? 0,
        comp_esquive:        row.comp_esquive        ?? 0,
        comp_contorsion:     row.comp_contorsion     ?? 0,
        comp_lutte:          row.comp_lutte          ?? 0,
        comp_equitation:     row.comp_equitation     ?? 0,
        comp_escalade:       row.comp_escalade       ?? 0,
        comp_saut:           row.comp_saut           ?? 0,
        comp_lasso:          row.comp_lasso          ?? 0,
        comp_rodeo:          row.comp_rodeo          ?? 0,

        // Compétences Vigueur
        comp_course:    row.comp_course    ?? 0,
        comp_nage:      row.comp_nage      ?? 0,
        comp_puissance: row.comp_puissance ?? 0,
        comp_endurance: row.comp_endurance ?? 0,

        // Compétences Coordination
        comp_pistolet:         row.comp_pistolet         ?? 0,
        comp_fusil:            row.comp_fusil            ?? 0,
        comp_arc:              row.comp_arc              ?? 0,
        comp_artillerie:       row.comp_artillerie       ?? 0,
        comp_prestidigitation: row.comp_prestidigitation ?? 0,
        comp_crochetage:       row.comp_crochetage       ?? 0,
        comp_arme_de_jet:      row.comp_arme_de_jet      ?? 0,
        comp_lancer:           row.comp_lancer           ?? 0,
        comp_bricolage:        row.comp_bricolage        ?? 0,

        // Compétences Perception
        comp_recherche:   row.comp_recherche   ?? 0,
        comp_enquete:     row.comp_enquete     ?? 0,
        comp_intuition:   row.comp_intuition   ?? 0,
        comp_observation: row.comp_observation ?? 0,
        comp_camouflage:  row.comp_camouflage  ?? 0,
        comp_jeux:        row.comp_jeux        ?? 0,
        comp_survie:      row.comp_survie      ?? 0,
        comp_chariots:    row.comp_chariots    ?? 0,
        comp_pister:      row.comp_pister      ?? 0,

        // Compétences Charisme
        comp_charme:      row.comp_charme      ?? 0,
        comp_negocier:    row.comp_negocier    ?? 0,
        comp_commander:   row.comp_commander   ?? 0,
        comp_escroquerie: row.comp_escroquerie ?? 0,
        comp_persuasion:  row.comp_persuasion  ?? 0,
        comp_volonte:     row.comp_volonte     ?? 0,
        comp_dressage:    row.comp_dressage    ?? 0,
        comp_deguisement: row.comp_deguisement ?? 0,
        comp_intimider:   row.comp_intimider   ?? 0,
        comp_comedie:     row.comp_comedie     ?? 0,

        // Compétences Savoir
        comp_langues:            row.comp_langues            ?? 0,
        comp_geographie:         row.comp_geographie         ?? 0,
        comp_evaluer:            row.comp_evaluer            ?? 0,
        comp_medecine:           row.comp_medecine           ?? 0,
        comp_academique:         row.comp_academique         ?? 0,
        comp_lois:               row.comp_lois               ?? 0,
        comp_falsification:      row.comp_falsification      ?? 0,
        comp_ingenierie:         row.comp_ingenierie         ?? 0,
        comp_business:           row.comp_business           ?? 0,
        comp_botanique:          row.comp_botanique          ?? 0,
        comp_cultures_indiennes: row.comp_cultures_indiennes ?? 0,
        comp_demolition:         row.comp_demolition         ?? 0,

        // Santé
        blessure_niveau: row.blessure_niveau ?? 0,

        // Ressources
        points_destin:    row.points_destin    ?? 3,
        points_personnage: row.points_personnage ?? 0,

        // Relations
        backgrounds: backgrounds.map(b => ({
            id:     b.id,
            type:   b.type,
            niveau: b.niveau,
            notes:  b.notes ?? '',
        })),
        items: items.map(i => ({
            id:          i.id,
            name:        i.name,
            description: i.description ?? '',
            category:    i.category    ?? 'misc',
            quantity:    i.quantity    ?? 1,
            location:    i.location    ?? 'inventory',
            damage:      i.damage      ?? 0,
            rangeShort:  i.range_short  ?? 0,
            rangeMedium: i.range_medium ?? 0,
            rangeLong:   i.range_long   ?? 0,
            skillKey:    i.skill_key   ?? '',
        })),

        // Métadonnées
        createdAt:    row.created_at,
        updatedAt:    row.updated_at,
        lastAccessed: row.last_accessed,
    };
}

// ── saveFullCharacter ─────────────────────────────────────────────────────────

/**
 * Persiste un personnage complet en transaction.
 * CRUD propre sur backgrounds et items (update si id existant, insert si nouveau, delete si disparu).
 *
 * @param {import('better-sqlite3').Database} db
 * @param {number|string} id
 * @param {object} data - Données envoyées par le client
 */
function saveFullCharacter(db, id, data) {
    const {
        playerName, nom, prenom, age, taille, sexe, description, avatar,
        blessure_niveau, points_destin, points_personnage,
        backgrounds, items,
        // Attributs
        agilite, vigueur, coordination, perception, charisme, savoir,
        // Toutes les compétences extraites dynamiquement
        ...rest
    } = data;

    // Extraire les compétences du rest (uniquement les clés connues)
    const compCols = {};
    for (const key of COMPETENCES) {
        if (key in data) compCols[key] = data[key];
    }
    const attrCols = {};
    for (const key of ATTRIBUTS) {
        if (key in data) attrCols[key] = data[key];
    }

    db.prepare('BEGIN').run();
    try {
        // ── Mise à jour du personnage ──────────────────────────────────────

        // Construire les SET dynamiques pour attributs + compétences
        const allCols = { ...attrCols, ...compCols };
        const setClauses = Object.keys(allCols).map(k => `${k} = @${k}`).join(', ');

        db.prepare(`
            UPDATE characters SET
                player_name       = COALESCE(@playerName, player_name),
                nom               = COALESCE(@nom, nom),
                prenom            = COALESCE(@prenom, prenom),
                age               = @age,
                taille            = COALESCE(@taille, taille),
                sexe              = COALESCE(@sexe, sexe),
                description       = COALESCE(@description, description),
                avatar            = COALESCE(@avatar, avatar),
                blessure_niveau   = COALESCE(@blessure_niveau, blessure_niveau),
                points_destin     = COALESCE(@points_destin, points_destin),
                points_personnage = COALESCE(@points_personnage, points_personnage),
                access_code       = COALESCE(@accessCode, access_code),
                ${setClauses ? setClauses + ',' : ''}
                updated_at        = CURRENT_TIMESTAMP
            WHERE id = @id
        `).run({
            playerName:        playerName        ?? null,
            nom:               nom               ?? null,
            prenom:            prenom            ?? null,
            age:               age               ?? null,
            taille:            taille            ?? null,
            sexe:              sexe              ?? null,
            description:       description       ?? null,
            avatar:            avatar            ?? null,
            blessure_niveau:   blessure_niveau   ?? null,
            points_destin:     points_destin     ?? null,
            points_personnage: points_personnage ?? null,
            accessCode:        data.accessCode   ?? null,
            ...allCols,
            id: Number(id),
        });

        // ── CRUD propre sur les backgrounds ───────────────────────────────
        if (Array.isArray(backgrounds)) {
            const existingIds = new Set(
                db.prepare('SELECT id FROM character_backgrounds WHERE character_id = ?')
                    .all(id).map(r => r.id)
            );

            const incomingIds = new Set();
            const upsertBg = db.prepare(`
                INSERT INTO character_backgrounds (character_id, type, niveau, notes)
                VALUES (?, ?, ?, ?)
            `);
            const updateBg = db.prepare(`
                UPDATE character_backgrounds SET type = ?, niveau = ?, notes = ? WHERE id = ?
            `);

            for (const bg of backgrounds) {
                if (bg.id && existingIds.has(bg.id)) {
                    // Update
                    updateBg.run(bg.type, bg.niveau ?? 1, bg.notes ?? '', bg.id);
                    incomingIds.add(bg.id);
                } else {
                    // Insert (nouveau ou id inconnu)
                    const res = upsertBg.run(id, bg.type, bg.niveau ?? 1, bg.notes ?? '');
                    incomingIds.add(res.lastInsertRowid);
                }
            }

            // Supprimer les backgrounds disparus
            for (const existId of existingIds) {
                if (!incomingIds.has(existId)) {
                    db.prepare('DELETE FROM character_backgrounds WHERE id = ?').run(existId);
                }
            }
        }

        // ── CRUD propre sur les items ──────────────────────────────────────
        if (Array.isArray(items)) {
            const existingIds = new Set(
                db.prepare('SELECT id FROM character_items WHERE character_id = ?')
                    .all(id).map(r => r.id)
            );

            const incomingIds = new Set();
            const insertItem = db.prepare(`
                INSERT INTO character_items
                    (character_id, name, description, category, quantity, location,
                     damage, range_short, range_medium, range_long, skill_key)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const updateItem = db.prepare(`
                UPDATE character_items SET
                    name = ?, description = ?, category = ?, quantity = ?, location = ?,
                    damage = ?, range_short = ?, range_medium = ?, range_long = ?, skill_key = ?
                WHERE id = ?
            `);

            for (const item of items) {
                const vals = [
                    item.name        ?? '',
                    item.description ?? '',
                    item.category    ?? 'misc',
                    item.quantity    ?? 1,
                    item.location    ?? 'inventory',
                    item.damage      ?? 0,
                    item.rangeShort  ?? item.range_short  ?? 0,
                    item.rangeMedium ?? item.range_medium ?? 0,
                    item.rangeLong   ?? item.range_long   ?? 0,
                    item.skillKey    ?? item.skill_key    ?? '',
                ];

                if (item.id && existingIds.has(item.id)) {
                    updateItem.run(...vals, item.id);
                    incomingIds.add(item.id);
                } else {
                    const res = insertItem.run(id, ...vals);
                    incomingIds.add(res.lastInsertRowid);
                }
            }

            // Supprimer les items disparus
            for (const existId of existingIds) {
                if (!incomingIds.has(existId)) {
                    db.prepare('DELETE FROM character_items WHERE id = ?').run(existId);
                }
            }
        }

        db.prepare('COMMIT').run();
    } catch (err) {
        db.prepare('ROLLBACK').run();
        throw err;
    }
}

module.exports = { loadFullCharacter, saveFullCharacter, ATTRIBUTS, COMPETENCES };