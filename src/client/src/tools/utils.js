// utils.js - Fonctions utilitaires

// Stockage local
import {COMPETENCES} from "./data.js";

export const saveCharacter = (character) => {
    localStorage.setItem('pureVikingsCharacter', JSON.stringify(character));
};

export const loadCharacter = () => {
    const saved = localStorage.getItem('pureVikingsCharacter');
    return saved ? JSON.parse(saved) : null;
};

export const deleteCharacter = () => {
    localStorage.removeItem('pureVikingsCharacter');
};

// Gestion du thème
export const saveTheme = (isDark) => {
    localStorage.setItem('pureVikingsTheme', isDark ? 'dark' : 'light');
};

export const loadTheme = () => {
    return localStorage.getItem('pureVikingsTheme') === 'dark';
};

// Calculs de jeu
export const getExplosionThreshold = (level) => {
    if (level <= 2) return [10];
    if (level <= 4) return [9, 10];
    return [8, 9, 10];
};

export const getSuccessThreshold = (level) => {
    if (level === 0 || level === 1) return 7;
    if (level === 2) return 6;
    if (level === 3 || level === 4) return 5;
    return 4;
};

export const getBestCharacteristic = (character, skill) => {
    const comp = COMPETENCES.find(c => c.name === skill.name);
    if (!comp) return { name: 'force', level: 2 };
    
    const val1 = character[comp.caracs[0]] || 2;
    const val2 = character[comp.caracs[1]] || 2;
    
    return val1 >= val2 
        ? { name: comp.caracs[0], level: val1 }
        : { name: comp.caracs[1], level: val2 };
};

export const getBlessureMalus = (tokens) => {
    if (tokens === 0 || tokens === 1) return 0; // Premier gratuit
    if (tokens === 5) return 4; // KO, pas de jet
    return tokens - 1;
};

export const getFatigueMalus = (tokens) => {
    if (tokens === 0 || tokens === 1) return 0; // Index 0 gratuit
    if (tokens === 2) return 1; // +1
    if (tokens === 3 || tokens === 4) return 2; // +2
    if (tokens === 5 || tokens === 6) return 3; // +3
    if (tokens === 7 || tokens === 8) return 4; // +4
    return 5; // 9 = +5 (épuisé)
};

// Système de dés
export const rollDice = (count, explosionThreshold) => {
    const results = [];
    let currentRoll = [];
    
    for (let i = 0; i < count; i++) {
        currentRoll.push(Math.floor(Math.random() * 10) + 1);
    }
    results.push(...currentRoll);
    
    while (true) {
        const explosions = currentRoll.filter(r => explosionThreshold.includes(r));
        if (explosions.length === 0) break;
        
        currentRoll = explosions.map(() => Math.floor(Math.random() * 10) + 1);
        results.push(...currentRoll);
    }
    
    return results;
};

export const countSuccesses = (diceResults, threshold) => {
    return diceResults.filter(d => d >= threshold).length;
};

// Validation
export const canSelectTrait = (character, trait, maxTraits = 4) => {
    const isSelected = character.traits.some(t => t.name === trait.name);
    
    // Vérifier la limite max
    if (character.traits.length >= maxTraits && !isSelected) {
        return false;
    }

    // Vérifier les incompatibilités
    for (const incomp of trait.incompatible) {
        if (character.traits.some(t => t.name === incomp)) {
            return false;
        }
    }
    if( trait?.requirements != null) {
        // Vérifier les prérequis
        for (const [stat, required] of Object.entries(trait.requirements)) {
            if (character[stat] < required) {
                return false;
            }
        }
    }

    return true;
};

// Formatage
export const formatFullName = (character) => {
    const base = character.prenom;
    const surname = character.surnom ? ` "${character.surnom}"` : '';
    const parentType = character.sexe === 'homme' ? 'fils' : 'fille';
    const parent = ` ${parentType} de ${character.nomParent}`;
    return base + surname + parent;
};

export const formatExplosion = (level) => {
    const threshold = getExplosionThreshold(level);
    return threshold.join(', ');
};

// Compétences qui peuvent être prises plusieurs fois avec spécialisations différentes
export const SPECIALIZABLE_SKILLS = [
    "Combat CàC armé",
    "Combat à distance",
    "Langue orale",
    "Langue écrite"
];

export const isSpecializableSkill = (skillName) => {
    return SPECIALIZABLE_SKILLS.includes(skillName);
};

export const getSkillExamples = (skillName) => {
    const examples = {
        "Combat CàC armé": "Hache, Épée, Lance, Masse, Marteau",
        "Combat à distance": "Arc, Javelot, Fronde, Hache de jet",
        "Langue orale": "Norse, Latin, Anglais, Gaélique, Finnois",
        "Langue écrite": "Runes (Futhark), Latin"
    };
    return examples[skillName] || "";
};

// Format d'affichage d'une compétence avec spécialisation
export const formatSkillName = (skill) => {
    if (!skill) return '';
    const base = skill.name;
    const spec = skill.specialization ? ` (${skill.specialization})` : '';
    return base + spec;
};


/**
 * Lance un pool de dés et retourne :
 * - `rolls` : tableau plat de tous les résultats (identique à rollDice, pour compatibilité)
 * - `sequence` : tableau de vagues pour l'animation
 *
 * Exemple avec pool=3, explosionThresholds=[9,10], résultat [8,10,7] :
 * sequence = [
 *   { wave: 0, dice: [8, 10, 7] },
 *   { wave: 1, dice: [3] }         // explosion du 10 → 3, stop
 * ]
 *
 * @param {number} count - Nombre de dés initiaux
 * @param {number[]} explosionThreshold - Valeurs qui déclenchent une explosion
 * @returns {{ rolls: number[], sequence: { wave: number, dice: number[] }[] }}
 */
export const rollDiceWithSequence = (count, explosionThreshold) => {
    const sequence = [];
    const allRolls = [];
    let waveIndex = 0;

    // Wave initiale
    let currentWaveDice = [];
    for (let i = 0; i < count; i++) {
        currentWaveDice.push(Math.floor(Math.random() * 10) + 1);
    }
    sequence.push({ wave: waveIndex, dice: [...currentWaveDice] });
    allRolls.push(...currentWaveDice);

    // Waves d'explosion
    while (true) {
        const explosions = currentWaveDice.filter(r => explosionThreshold.includes(r));
        if (explosions.length === 0) break;

        waveIndex++;
        // Chaque dé qui a explosé génère exactement 1 nouveau dé
        currentWaveDice = explosions.map(() => Math.floor(Math.random() * 10) + 1);
        sequence.push({ wave: waveIndex, dice: [...currentWaveDice] });
        allRolls.push(...currentWaveDice);
    }

    return { rolls: allRolls, sequence };
};