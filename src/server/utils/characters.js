// Helper: Charger personnage complet avec toutes les relations

function loadFullCharacter(db, characterId) {
    const char = db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId);
    if (!char) return null;

    // Charger compétences
    const skills = db.prepare('SELECT skill_name as name, specialization, level, current_points as currentPoints FROM character_skills WHERE character_id = ?').all(characterId);

    // Charger traits
    const traits = db.prepare('SELECT trait_name as name FROM character_traits WHERE character_id = ?').all(characterId);

    // Charger runes
    const runes = db.prepare('SELECT rune_name as name, level FROM character_runes WHERE character_id = ?').all(characterId);

    // Charger items
    const itemsRaw = db.prepare('SELECT * FROM character_items WHERE character_id = ?').all(characterId);
    const items = itemsRaw.map(item => ({
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

// Helper: Sauvegarder personnage complet
function saveFullCharacter(db, id, data) {
    const {
        playerName, prenom, surnom, nomParent, sexe, age, taille, poids, activite,
        force, agilite, perception, intelligence, charisme, chance,
        armure, actionsDisponibles, seuilCombat,
        sagaActuelle, sagaTotale, tokensBlessure, tokensFatigue,
        skills, traits, runes, items
    } = data;

    // Update personnage principal
    db.prepare(`
        UPDATE characters SET
            player_name = ?, prenom = ?, surnom = ?, nom_parent = ?, sexe = ?,
            age = ?, taille = ?, poids = ?, activite = ?,
            force = ?, agilite = ?, perception = ?, intelligence = ?, charisme = ?, chance = ?,
            armure = ?, actions_disponibles = ?, seuil_combat = ?,
            saga_actuelle = ?, saga_totale = ?,
            tokens_blessure = ?, tokens_fatigue = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(
        playerName, prenom, surnom, nomParent, sexe,
        age, taille, poids, activite,
        force, agilite, perception, intelligence, charisme, chance,
        armure, actionsDisponibles, seuilCombat,
        sagaActuelle, sagaTotale,
        tokensBlessure, tokensFatigue,
        id
    );

    // Supprimer et recréer les compétences
    db.prepare('DELETE FROM character_skills WHERE character_id = ?').run(id);
    const insertSkill = db.prepare('INSERT INTO character_skills (character_id, skill_name, specialization, level, current_points) VALUES (?, ?, ?, ?, ?)');
    for (const skill of skills) {
        insertSkill.run(id, skill.name, skill.specialization || null, skill.level, skill.currentPoints);
    }

    // Supprimer et recréer les traits
    db.prepare('DELETE FROM character_traits WHERE character_id = ?').run(id);
    const insertTrait = db.prepare('INSERT INTO character_traits (character_id, trait_name) VALUES (?, ?)');
    for (const trait of traits) {
        insertTrait.run(id, trait.name);
    }

    // Supprimer et recréer les runes
    db.prepare('DELETE FROM character_runes WHERE character_id = ?').run(id);
    const insertRune = db.prepare('INSERT INTO character_runes (character_id, rune_name, level) VALUES (?, ?, ?)');
    for (const rune of runes || []) {
        insertRune.run(id, rune.name, rune.level);
    }

    // Supprimer et recréer les items
    db.prepare('DELETE FROM character_items WHERE character_id = ?').run(id);
    const insertItem = db.prepare(`
        INSERT INTO character_items (
            character_id, name, category, quantity, location, notes,
            weapon_type, damage, range, armor_value, requirements, custom_item
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of items || []) {
        insertItem.run(
            id,
            item.name,
            item.category,
            item.quantity || 1,
            item.location || 'bag',
            item.notes || null,
            item.weaponType || null,
            item.damage || null,
            item.range || null,
            item.armorValue || 0,
            item.requirements ? JSON.stringify(item.requirements) : '{}',
            item.customItem ? 1 : 0
        );
    }
}

// Générer un code d'accès unique (6 caractères)
function generateAccessCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Pas de O, 0, I, 1 pour éviter confusion
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Générer une URL unique (slug)
function generateAccessUrl() {
    const adjectives = ['brave', 'fierce', 'wise', 'swift', 'strong', 'cunning', 'bold', 'mighty'];
    const nouns = ['warrior', 'raider', 'skald', 'jarl', 'berserker', 'shield', 'axe', 'raven'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 9999);
    return `${adj}-${noun}-${num}`;
}

module.exports = {loadFullCharacter, saveFullCharacter, generateAccessCode, generateAccessUrl};