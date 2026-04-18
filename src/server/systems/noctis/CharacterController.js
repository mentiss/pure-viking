'use strict';

// ─── Valeurs dérivées ────────────────────────────────────────────────────────

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

// Calcule les max de réserves à partir des caractéristiques
function computeReserveMax(char) {
    return {
        reserve_effort_max:   char.force + char.sante + char.athletisme
            + char.agilite + char.precision + char.technique,
        reserve_sangfroid_max: char.connaissance + char.perception + char.volonte
            + char.persuasion  + char.psychologie + char.entregent,
    };
}

// ─── Chargement complet ──────────────────────────────────────────────────────

function loadFullCharacter(db, id) {
    const char = db.prepare('SELECT * FROM characters WHERE id = ?').get(id);
    if (!char) return null;

    const specialties  = db.prepare(
        'SELECT * FROM character_specialties WHERE character_id = ? ORDER BY created_at'
    ).all(id);

    const ombres = db.prepare(
        'SELECT * FROM character_ombres WHERE character_id = ? ORDER BY created_at'
    ).all(id);

    const items = db.prepare(
        'SELECT * FROM character_items WHERE character_id = ? ORDER BY created_at'
    ).all(id);

    const groupReserve = db.prepare('SELECT * FROM group_reserve WHERE id = 1').get()
        ?? { current: 0, cap: 12 };

    return {
        ...char,
        accessCode: char.access_code,
        accessUrl: char.access_url,
        specialties,
        ombres,
        items,
        groupReserve,
        ...computeDerived(char),
    };
}

// ─── Sauvegarde complète ─────────────────────────────────────────────────────

function saveFullCharacter(db, id, data) {
    const {
        specialties = [],
        ombres      = [],
        items       = [],
        groupReserve,   // non modifié ici — route dédiée
        ...charData
    } = data;

    // — Colonnes personnage —
    db.prepare(`
        UPDATE characters SET
            nom                       = @nom,
            prenom                    = @prenom,
            avatar                    = @avatar,
            sexe                      = @sexe,
            age                       = @age,
            taille                    = @taille,
            poids                     = @poids,
            activite                  = @activite,
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

    // — Spécialités : delete + re-insert —
    const delSpecialties = db.prepare(
        'DELETE FROM character_specialties WHERE character_id = ?'
    );
    const insSpecialty = db.prepare(`
        INSERT INTO character_specialties (character_id, name, type, niveau, notes)
        VALUES (@character_id, @name, @type, @niveau, @notes)
    `);
    const syncSpecialties = db.transaction((rows) => {
        delSpecialties.run(id);
        for (const s of rows) {
            insSpecialty.run({
                character_id: id,
                name:  s.name  ?? '',
                type:  s.type  ?? 'normale',
                niveau: s.niveau ?? 'debutant',
                notes: s.notes ?? '',
            });
        }
    });
    syncSpecialties(specialties);

    // — Ombres : delete + re-insert —
    const delOmbres = db.prepare(
        'DELETE FROM character_ombres WHERE character_id = ?'
    );
    const insOmbre = db.prepare(`
        INSERT INTO character_ombres (character_id, type, description)
        VALUES (@character_id, @type, @description)
    `);
    const syncOmbres = db.transaction((rows) => {
        delOmbres.run(id);
        for (const o of rows) {
            insOmbre.run({
                character_id: id,
                type:        o.type        ?? 'dette',
                description: o.description ?? '',
            });
        }
    });
    syncOmbres(ombres);

    // — Items : delete + re-insert —
    const delItems = db.prepare(
        'DELETE FROM character_items WHERE character_id = ?'
    );
    const insItem = db.prepare(`
        INSERT INTO character_items
            (character_id, name, description, category, quantity, location,
             damage_value, armor_value, price, notes)
        VALUES
            (@character_id, @name, @description, @category, @quantity, @location,
             @damage_value, @armor_value, @price, @notes)
    `);
    const syncItems = db.transaction((rows) => {
        delItems.run(id);
        for (const it of rows) {
            insItem.run({
                character_id: id,
                name:         it.name         ?? '',
                description:  it.description  ?? '',
                category:     it.category      ?? 'misc',
                quantity:     it.quantity      ?? 1,
                location:     it.location      ?? 'inventory',
                damage_value: it.damage_value  ?? 0,
                armor_value:  it.armor_value   ?? '',
                price:        it.price         ?? 0,
                notes:        it.notes         ?? '',
            });
        }
    });
    syncItems(items);

    return loadFullCharacter(db, id);
}

module.exports = { loadFullCharacter, saveFullCharacter, computeReserveMax, computeDerived };