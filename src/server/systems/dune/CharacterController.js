// src/server/systems/dune/characterController.js
// Couche d'accès données pour le système Dune.
//
// Contrat :
//   loadFullCharacter(db, id) → objet complet avec compétences/principes reshapés en tableaux
//   saveFullCharacter(db, id, data) → persistance en transaction, reshape inverse

// ── Listes fixes ─────────────────────────────────────────────────────────────

const COMPETENCES = ['analyse', 'combat', 'discipline', 'mobilite', 'rhetorique'];
const PRINCIPES   = ['devoir', 'domination', 'foi', 'justice', 'verite'];

// ── Helpers de reshape ───────────────────────────────────────────────────────

/**
 * Transforme les colonnes plates en tableau de compétences.
 * @param {object} row - Ligne brute SQLite
 * @returns {Array<{ key, rang, specialisation }>}
 */
function _reshapeCompetences(row) {
    return COMPETENCES.map(key => ({
        key,
        rang:           row[`${key}_rang`]           ?? 4,
        specialisation: row[`${key}_specialisation`] ?? '',
    }));
}

/**
 * Transforme les colonnes plates en tableau de principes.
 * @param {object} row - Ligne brute SQLite
 * @returns {Array<{ key, rang, maxime }>}
 */
function _reshapePrincipes(row) {
    return PRINCIPES.map(key => ({
        key,
        rang:   row[`${key}_rang`]   ?? 4,
        maxime: row[`${key}_maxime`] ?? '',
    }));
}

/**
 * Transforme un tableau de compétences en colonnes pour UPDATE.
 * @param {Array<{ key, rang, specialisation }>} competences
 * @returns {object} colonnes SQLite
 */
function _flattenCompetences(competences = []) {
    const cols = {};
    for (const c of competences) {
        if (!COMPETENCES.includes(c.key)) continue;
        cols[`${c.key}_rang`]           = c.rang           ?? 4;
        cols[`${c.key}_specialisation`] = c.specialisation ?? '';
    }
    return cols;
}

/**
 * Transforme un tableau de principes en colonnes pour UPDATE.
 * Valide que rang ≤ 8 (contrainte de règle).
 * @param {Array<{ key, rang, maxime }>} principes
 * @returns {object} colonnes SQLite
 */
function _flattenPrincipes(principes = []) {
    const cols = {};
    for (const p of principes) {
        if (!PRINCIPES.includes(p.key)) continue;
        const rang = Math.min(Number(p.rang ?? 4), 8);
        cols[`${p.key}_rang`]   = rang;
        cols[`${p.key}_maxime`] = p.maxime ?? '';
    }
    return cols;
}

// ── API publique ─────────────────────────────────────────────────────────────

/**
 * Charge un personnage complet depuis la BDD.
 * Compétences et principes sont reshapés en tableaux.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {number|string} id
 * @returns {object|null}
 */
function loadFullCharacter(db, id) {
    const row = db.prepare('SELECT * FROM characters WHERE id = ?').get(id);
    if (!row) return null;

    const talents = db.prepare(
        'SELECT id, talent_name, description FROM character_talents WHERE character_id = ? ORDER BY id'
    ).all(id);

    const items = db.prepare(
        'SELECT id, nom, description, quantite FROM character_items WHERE character_id = ? ORDER BY id'
    ).all(id);

    return {
        id:          row.id,
        accessCode:  row.access_code,
        accessUrl:   row.access_url,
        playerName:  row.player_name,

        // Identité
        nom:          row.nom          ?? '',
        statutSocial: row.statut_social ?? '',
        description:  row.description   ?? '',

        // Détermination
        determination:    row.determination     ?? 1,
        determinationMax: row.determination_max ?? 1,

        // Tableaux reshapés
        competences: _reshapeCompetences(row),
        principes:   _reshapePrincipes(row),

        // Relations
        talents: talents.map(t => ({
            id:          t.id,
            talentName:  t.talent_name,
            description: t.description ?? '',
        })),
        items: items.map(i => ({
            id:          i.id,
            nom:         i.nom,
            description: i.description ?? '',
            quantite:    i.quantite     ?? 1,
        })),

        // Métadonnées
        createdAt:    row.created_at,
        updatedAt:    row.updated_at,
        lastAccessed: row.last_accessed,
    };
}

/**
 * Persiste un personnage complet en transaction.
 * Valide rang principes ≤ 8. Gère les tableaux talents et items.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {number|string} id
 * @param {object} data - Données envoyées par le client
 */
function saveFullCharacter(db, id, data) {
    const {
        playerName, nom, statutSocial, description,
        determination, determinationMax,
        competences, principes,
        talents, items,
    } = data;

    const competenceCols = _flattenCompetences(competences);
    const principeCols   = _flattenPrincipes(principes);

    db.prepare('BEGIN').run();
    try {
        // ── Mise à jour du personnage ──────────────────────────────────────
        db.prepare(`
            UPDATE characters SET
                player_name       = COALESCE(?, player_name),
                nom               = COALESCE(?, nom),
                statut_social     = COALESCE(?, statut_social),
                description       = COALESCE(?, description),
                determination     = COALESCE(?, determination),
                determination_max = COALESCE(?, determination_max),

                -- Compétences
                analyse_rang              = COALESCE(?, analyse_rang),
                analyse_specialisation    = COALESCE(?, analyse_specialisation),
                combat_rang               = COALESCE(?, combat_rang),
                combat_specialisation     = COALESCE(?, combat_specialisation),
                discipline_rang           = COALESCE(?, discipline_rang),
                discipline_specialisation = COALESCE(?, discipline_specialisation),
                mobilite_rang             = COALESCE(?, mobilite_rang),
                mobilite_specialisation   = COALESCE(?, mobilite_specialisation),
                rhetorique_rang           = COALESCE(?, rhetorique_rang),
                rhetorique_specialisation = COALESCE(?, rhetorique_specialisation),

                -- Principes
                devoir_rang       = COALESCE(?, devoir_rang),
                devoir_maxime     = COALESCE(?, devoir_maxime),
                domination_rang   = COALESCE(?, domination_rang),
                domination_maxime = COALESCE(?, domination_maxime),
                foi_rang          = COALESCE(?, foi_rang),
                foi_maxime        = COALESCE(?, foi_maxime),
                justice_rang      = COALESCE(?, justice_rang),
                justice_maxime    = COALESCE(?, justice_maxime),
                verite_rang       = COALESCE(?, verite_rang),
                verite_maxime     = COALESCE(?, verite_maxime),

                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            playerName    ?? null,
            nom           ?? null,
            statutSocial  ?? null,
            description   ?? null,
            determination    != null ? Number(determination)    : null,
            determinationMax != null ? Number(determinationMax) : null,

            competenceCols.analyse_rang              ?? null,
            competenceCols.analyse_specialisation    ?? null,
            competenceCols.combat_rang               ?? null,
            competenceCols.combat_specialisation     ?? null,
            competenceCols.discipline_rang           ?? null,
            competenceCols.discipline_specialisation ?? null,
            competenceCols.mobilite_rang             ?? null,
            competenceCols.mobilite_specialisation   ?? null,
            competenceCols.rhetorique_rang           ?? null,
            competenceCols.rhetorique_specialisation ?? null,

            principeCols.devoir_rang       ?? null,
            principeCols.devoir_maxime     ?? null,
            principeCols.domination_rang   ?? null,
            principeCols.domination_maxime ?? null,
            principeCols.foi_rang          ?? null,
            principeCols.foi_maxime        ?? null,
            principeCols.justice_rang      ?? null,
            principeCols.justice_maxime    ?? null,
            principeCols.verite_rang       ?? null,
            principeCols.verite_maxime     ?? null,

            id
        );

        // ── Talents : remplacement complet ────────────────────────────────
        if (Array.isArray(talents)) {
            db.prepare('DELETE FROM character_talents WHERE character_id = ?').run(id);
            const insertTalent = db.prepare(
                'INSERT INTO character_talents (character_id, talent_name, description) VALUES (?, ?, ?)'
            );
            for (const t of talents) {
                if (!t.talentName?.trim()) continue;
                insertTalent.run(id, t.talentName.trim(), t.description ?? '');
            }
        }

        // ── Items : remplacement complet ──────────────────────────────────
        if (Array.isArray(items)) {
            db.prepare('DELETE FROM character_items WHERE character_id = ?').run(id);
            const insertItem = db.prepare(
                'INSERT INTO character_items (character_id, nom, description, quantite) VALUES (?, ?, ?, ?)'
            );
            for (const item of items) {
                if (!item.nom?.trim()) continue;
                insertItem.run(id, item.nom.trim(), item.description ?? '', item.quantite ?? 1);
            }
        }
        db.prepare('COMMIT').run();
    } catch (err) {
        db.prepare('ROLLBACK').run();
        throw err;
    }
}

module.exports = { loadFullCharacter, saveFullCharacter, COMPETENCES, PRINCIPES };