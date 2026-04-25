// ─── Valeurs dérivées ─────────────────────────────────────────────────────────

/**
 * Calcule les valeurs dérivées affichées en lecture seule sur la fiche.
 * Initiative, limite de corruption, malus blessure actif.
 */
function computeDerived(char) {
    return {
        initiative:        char.agilite + char.athletisme,
        limite_corruption: char.volonte  + char.sante,
        malus_blessure:    _malusBlessure(char),
    };
}

function _malusBlessure(char) {
    if (char.sante_tue_current   > 0) return -3;
    if (char.sante_blesse_current > 0) return -2;
    if (char.sante_touche_current > 0) return -1;
    return 0;
}

/**
 * Calcule les maximums théoriques des réserves à partir des caractéristiques.
 * Utilisé à la création pour initialiser reserve_effort_max / reserve_sangfroid_max.
 * En jeu, les max stockés font foi (ils peuvent être décrémentés par sacrifice).
 */
function computeReserveMax(char) {
    return {
        reserve_effort_max: char.force + char.sante + char.athletisme
            + char.agilite + char.precision + char.technique,
        reserve_sangfroid_max: char.connaissance + char.perception + char.volonte
            + char.persuasion  + char.psychologie + char.entregent,
    };
}

// ─── Chargement complet ───────────────────────────────────────────────────────

/**
 * Charge un personnage avec toutes ses données associées.
 * @param {Database} db
 * @param {number|string} id
 * @param {number|null} sessionId  — si fourni, charge la fiche de groupe de cette session
 */
function loadFullCharacter(db, id, sessionId = null) {
    const char = db.prepare('SELECT * FROM characters WHERE id = ?').get(id);
    if (!char) return null;

    const specialties = db.prepare(
        'SELECT * FROM character_specialties WHERE character_id = ? ORDER BY created_at'
    ).all(id);

    const ombres = db.prepare(
        'SELECT * FROM character_ombres WHERE character_id = ? ORDER BY created_at'
    ).all(id);

    const items = db.prepare(
        'SELECT * FROM character_items WHERE character_id = ? ORDER BY created_at'
    ).all(id);

    // Fiche de groupe : on charge par sessionId si dispo, sinon valeurs vides
    let groupReserve = null;
    if (sessionId) {
        groupReserve = db.prepare(
            'SELECT * FROM session_group_reserve WHERE session_id = ?'
        ).get(sessionId);
    }
    if (!groupReserve) {
        groupReserve = { current: 0, principes: '[]', interdits: '[]', regle_acces: 'libre', notes: '' };
    }

    // Désérialiser les champs JSON de la fiche de groupe
    groupReserve = _parseGroupReserve(groupReserve);

    return {
        ...char,
        // Alias camelCase pour le frontend
        accessCode: char.access_code,
        accessUrl:  char.access_url,
        // Données associées
        specialties,
        ombres,
        items,
        groupReserve,
        // Valeurs dérivées calculées
        ...computeDerived(char),
    };
}

// ─── Sauvegarde complète ──────────────────────────────────────────────────────

/**
 * Met à jour un personnage et ses données associées (spécialités, ombres, items).
 * La fiche de groupe est gérée par sa propre route.
 */
function saveFullCharacter(db, id, data) {
    const {
        specialties  = [],
        ombres       = [],
        items        = [],
        groupReserve,   // ignoré ici — route dédiée
        // Alias camelCase ignorés (le frontend peut les envoyer, on ne les stocke pas)
        accessCode, accessUrl,
        // Valeurs dérivées ignorées (recalculées)
        initiative, limite_corruption, malus_blessure,
        ...charData
    } = data;

    // Mise à jour des colonnes du personnage
    db.prepare(`
        UPDATE characters SET
            nom                       = @nom,
            prenom                    = @prenom,
            avatar                    = @avatar,
            sexe                      = @sexe,
            age                       = @age,
            taille                    = @taille,
            poids                     = @poids,
            description_physique      = @description_physique,
            activite                  = @activite,
            faction                   = @faction,
            annee_campagne            = @annee_campagne,
            force                     = @force,
            sante                     = @sante,
            athletisme                = @athletisme,
            agilite                   = @agilite,
            precision                 = @precision,
            technique                 = @technique,
            connaissance              = @connaissance,
            perception                = @perception,
            volonte                   = @volonte,
            persuasion                = @persuasion,
            psychologie               = @psychologie,
            entregent                 = @entregent,
            reserve_effort_max        = @reserve_effort_max,
            reserve_effort_current    = @reserve_effort_current,
            reserve_sangfroid_max     = @reserve_sangfroid_max,
            reserve_sangfroid_current = @reserve_sangfroid_current,
            sante_touche_max          = @sante_touche_max,
            sante_touche_current      = @sante_touche_current,
            sante_blesse_max          = @sante_blesse_max,
            sante_blesse_current      = @sante_blesse_current,
            sante_tue_max             = @sante_tue_max,
            sante_tue_current         = @sante_tue_current,
            eclats_max                = @eclats_max,
            eclats_current            = @eclats_current,
            is_fracture               = @is_fracture,
            xp_total                  = @xp_total,
            xp_spent                  = @xp_spent,
            selvarins_current         = @selvarins_current,
            selvarins_month           = @selvarins_month,
            notes                     = @notes,
            updated_at                = CURRENT_TIMESTAMP
        WHERE id = @id
    `).run({ ...charData, id });

    // Spécialités : delete + re-insert
    db.prepare('DELETE FROM character_specialties WHERE character_id = ?').run(id);
    const insSpecialty = db.prepare(`
        INSERT INTO character_specialties (character_id, name, type, niveau, is_dormant, notes)
        VALUES (@character_id, @name, @type, @niveau, @is_dormant, @notes)
    `);
    for (const s of specialties) {
        insSpecialty.run({
            character_id: id,
            name:       s.name       ?? '',
            type:       s.type       ?? 'normale',
            niveau:     s.niveau     ?? 'debutant',
            is_dormant: s.is_dormant ?? 0,
            notes:      s.notes      ?? '',
        });
    }

    // Ombres : delete + re-insert
    db.prepare('DELETE FROM character_ombres WHERE character_id = ?').run(id);
    const insOmbre = db.prepare(`
        INSERT INTO character_ombres (character_id, type, description, effect)
        VALUES (@character_id, @type, @description, @effect)
    `);
    for (const o of ombres) {
        insOmbre.run({
            character_id: id,
            type:        o.type        ?? 'dette',
            description: o.description ?? '',
            effect:      o.effect      ?? '',
        });
    }

    // Items : delete + re-insert
    db.prepare('DELETE FROM character_items WHERE character_id = ?').run(id);
    const insItem = db.prepare(`
        INSERT INTO character_items
            (character_id, name, description, category, quantity, location,
             damage_value, armor_value, price, notes)
        VALUES
            (@character_id, @name, @description, @category, @quantity, @location,
             @damage_value, @armor_value, @price, @notes)
    `);
    for (const it of items) {
        insItem.run({
            character_id: id,
            name:         it.name         ?? '',
            description:  it.description  ?? '',
            category:     it.category     ?? 'misc',
            quantity:     it.quantity      ?? 1,
            location:     it.location      ?? 'inventory',
            damage_value: it.damage_value  ?? 0,
            armor_value:  it.armor_value   ?? '',
            price:        it.price         ?? 0,
            notes:        it.notes         ?? '',
        });
    }

    return loadFullCharacter(db, id);
}

// ─── Helpers internes ─────────────────────────────────────────────────────────

function _parseGroupReserve(raw) {
    return {
        ...raw,
        principes: _parseJSON(raw.principes, []),
        interdits: _parseJSON(raw.interdits, []),
    };
}

function _parseJSON(str, fallback) {
    try { return JSON.parse(str); } catch { return fallback; }
}

module.exports = { loadFullCharacter, saveFullCharacter, computeReserveMax, computeDerived };