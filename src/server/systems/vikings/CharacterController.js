// src/server/systems/vikings/characterController.js
// Lecture/écriture complète d'un personnage Pure Vikings.
// Gère toutes les tables spécifiques : character_skills, character_traits,
// character_runes (spécifique Vikings), character_items.

function loadFullCharacter(db, characterId) {
    const char = db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId);
    if (!char) return null;

    const skills = db.prepare(`
        SELECT skill_name AS name, specialization, level, current_points AS currentPoints
        FROM character_skills WHERE character_id = ?
    `).all(characterId);

    const traits = db.prepare(`
        SELECT trait_name AS name FROM character_traits WHERE character_id = ?
    `).all(characterId);

    const runes = db.prepare(`
        SELECT rune_name AS name, level FROM character_runes WHERE character_id = ?
    `).all(characterId);

    const items = db.prepare('SELECT * FROM character_items WHERE character_id = ?').all(characterId).map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        location: item.location,
        notes: item.notes,
        weaponType: item.weapon_type,
        damage: item.damage,
        range: item.range,
        armorValue: item.armor_value,
        requirements: item.requirements ? JSON.parse(item.requirements) : {},
        customItem: item.custom_item === 1
    }));

    return {
        id: char.id,
        accessCode: char.access_code,
        accessUrl: char.access_url,
        playerName: char.player_name,
        prenom: char.prenom,
        surnom: char.surnom,
        nomParent: char.nom_parent,
        sexe: char.sexe,
        age: char.age,
        taille: char.taille,
        poids: char.poids,
        activite: char.activite,
        avatar: char.avatar,
        force: char.force,
        agilite: char.agilite,
        perception: char.perception,
        intelligence: char.intelligence,
        charisme: char.charisme,
        chance: char.chance,
        armure: char.armure,
        actionsDisponibles: char.actions_disponibles,
        seuilCombat: char.seuil_combat,
        sagaActuelle: char.saga_actuelle,
        sagaTotale: char.saga_totale,
        tokensBlessure: char.tokens_blessure,
        tokensFatigue: char.tokens_fatigue,
        skills,
        traits,
        runes,
        items,
        createdAt: char.created_at,
        updatedAt: char.updated_at
    };
}

function saveFullCharacter(db, id, data) {
    const {
        playerName, prenom, surnom, nomParent, sexe, age, taille, poids, activite, avatar,
        force, agilite, perception, intelligence, charisme, chance,
        armure, actionsDisponibles, seuilCombat,
        sagaActuelle, sagaTotale, tokensBlessure, tokensFatigue,
        skills, traits, runes, items
    } = data;

    if (playerName !== undefined) {
        db.prepare(`
            UPDATE characters SET
                                  player_name = ?, prenom = ?, surnom = ?, nom_parent = ?, sexe = ?,
                                  age = ?, taille = ?, poids = ?, activite = ?,
                                  force = ?, agilite = ?, perception = ?, intelligence = ?, charisme = ?, chance = ?,
                                  armure = ?, actions_disponibles = ?, seuil_combat = ?,
                                  saga_actuelle = ?, saga_totale = ?,
                                  tokens_blessure = ?, tokens_fatigue = ?,
                                  avatar = ?,
                                  updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            playerName, prenom, surnom || null, nomParent || null, sexe,
            age, taille || null, poids || null, activite || null,
            force, agilite, perception, intelligence, charisme, chance,
            armure || 0, actionsDisponibles || 1, seuilCombat || 1,
            sagaActuelle, sagaTotale, tokensBlessure, tokensFatigue,
            avatar || null, id
        );
    }

    if (skills !== undefined) {
        db.prepare('DELETE FROM character_skills WHERE character_id = ?').run(id);
        const stmt = db.prepare('INSERT INTO character_skills (character_id, skill_name, specialization, level, current_points) VALUES (?, ?, ?, ?, ?)');
        for (const s of skills || []) stmt.run(id, s.name, s.specialization || null, s.level, s.currentPoints || 0);
    }

    if (traits !== undefined) {
        db.prepare('DELETE FROM character_traits WHERE character_id = ?').run(id);
        const stmt = db.prepare('INSERT INTO character_traits (character_id, trait_name) VALUES (?, ?)');
        for (const t of traits || []) stmt.run(id, t.name);
    }

    if (runes !== undefined) {
        db.prepare('DELETE FROM character_runes WHERE character_id = ?').run(id);
        const stmt = db.prepare('INSERT INTO character_runes (character_id, rune_name, level) VALUES (?, ?, ?)');
        for (const r of runes || []) stmt.run(id, r.name, r.level || 1);
    }

    if (items !== undefined) {
        db.prepare('DELETE FROM character_items WHERE character_id = ?').run(id);
        const stmt = db.prepare(`
            INSERT INTO character_items (character_id, name, category, quantity, location, notes,
                                         weapon_type, damage, range, armor_value, requirements, custom_item)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const item of items || []) {
            stmt.run(id, item.name, item.category, item.quantity || 1, item.location || 'bag',
                item.notes || null, item.weaponType || null, item.damage || null, item.range || null,
                item.armorValue || 0, item.requirements ? JSON.stringify(item.requirements) : '{}',
                item.customItem ? 1 : 0);
        }
    }
}

module.exports = { loadFullCharacter, saveFullCharacter };