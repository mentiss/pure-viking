// src/server/utils/combatState.js
// Gestionnaire d'état combat en mémoire, isolé par slug.
//
// Principe : une Map keyed par slug. Chaque slug a son propre état indépendant.
// Dans les faits l'app sera utilisée par une table à la fois, mais l'isolation
// est triviale et évite tout bug de cross-contamination entre slugs.
//
// La structure d'un combattant est générique :
//   { id, name, type, characterId, initiative, actionsRemaining, actionsMax,
//     activeStates, healthData, turnData }
//
// healthData et turnData sont opaques : le serveur ne les inspecte jamais.
// Toute logique métier (Berserk, posture, tokens...) est gérée côté client slug.

'use strict';

const { randomUUID } = require('crypto');

// ─── Structure initiale d'un état combat ────────────────────────────────────

function _emptyState() {
    return {
        active:           false,
        round:            0,
        currentTurnIndex: -1,
        combatants:       [],
        pendingAttacks:   [],
    };
}

// ─── Map des états par slug ──────────────────────────────────────────────────

const _states = new Map(); // slug → combatState

function _get(slug) {
    if (!_states.has(slug)) {
        _states.set(slug, _emptyState());
    }
    return _states.get(slug);
}

// ─── API publique ────────────────────────────────────────────────────────────

/**
 * Retourne l'état combat complet d'un slug.
 */
function getState(slug) {
    return _get(slug);
}

/**
 * Met à jour des champs de premier niveau de l'état d'un slug.
 * Usage interne — préférer les helpers spécialisés.
 */
function setState(slug, updates) {
    const state = _get(slug);
    Object.assign(state, updates);
    return state;
}

/**
 * Remet l'état d'un slug à zéro (fin de combat).
 */
function resetState(slug) {
    _states.set(slug, _emptyState());
    return _states.get(slug);
}

// ─── Combattants ─────────────────────────────────────────────────────────────

/**
 * Ajoute un combattant.
 * Le client slug est responsable de fournir healthData et turnData
 * déjà construits — le serveur les stocke de manière opaque.
 */
function addCombatant(slug, combatant) {
    const state = _get(slug);
    state.combatants.push({
        name:             combatant.name             ?? 'Inconnu',
        type:             combatant.type             ?? 'npc',
        characterId:      combatant.characterId      ?? null,
        initiative:       combatant.initiative       ?? 0,
        actionsMax:       combatant.actionsMax        ?? 1,
        activeStates:     combatant.activeStates      ?? [],
        healthData:       combatant.healthData        ?? {},
        turnData:         combatant.turnData          ?? {},
        // Champs supplémentaires libres transmis par le slug (ex: initiativeRoll)
        ...combatant,
        id:               randomUUID(),
        actionsRemaining: combatant.actionsMax        ?? 1,  // init = max
    });
    return state;
}

/**
 * Retire un combattant.
 */
function removeCombatant(slug, id) {
    const state = _get(slug);
    state.combatants = state.combatants.filter(c => c.id !== id);
    return state;
}

/**
 * Met à jour des champs d'un combattant (merge shallow).
 * Utilisé pour healthData, activeStates, actionsRemaining...
 */
function updateCombatant(slug, id, updates) {
    const state = _get(slug);
    state.combatants = state.combatants.map(c =>
        c.id === id ? { ...c, ...updates } : c
    );
    return state;
}

/**
 * Réordonne la liste complète des combattants.
 * Appelé après drag & drop GM ou reroll initiative.
 */
function reorderCombatants(slug, newOrder) {
    const state = _get(slug);
    state.combatants = newOrder;
    return state;
}

/**
 * Remplace les activeStates de tous les combattants en bloc.
 * Appelé par le client après onStateNewRound (logique slug).
 * Seul activeStates est remplacé — healthData et turnData sont préservés.
 */
function syncStates(slug, combatants) {
    const state = _get(slug);
    state.combatants = state.combatants.map(c => {
        const updated = combatants.find(u => u.id === c.id);
        if (!updated) return c;
        const { id: _id, ...rest } = updated; // ne pas écraser l'id serveur
        return { ...c, ...rest };
    });
    return state;
}

// ─── Flow combat ─────────────────────────────────────────────────────────────

/**
 * Démarre le combat : trie par initiative, active, round = 1.
 * Reset actionsRemaining de chaque combattant à actionsMax.
 */
function startCombat(slug) {
    const state = _get(slug);
    state.combatants.sort((a, b) => b.initiative - a.initiative);
    state.active           = true;
    state.round            = 1;
    state.currentTurnIndex = 0;
    state.combatants = state.combatants.map(c => ({
        ...c,
        actionsRemaining: c.actionsMax,
    }));
    return state;
}

/**
 * Termine le combat : remet l'état à zéro.
 */
function endCombat(slug) {
    return resetState(slug);
}

/**
 * Passe au tour suivant.
 *
 * Générique pur — aucune logique métier slug :
 *   - Incrémente currentTurnIndex
 *   - Si fin de liste → nouveau round, retour à l'index 0, reset actionsRemaining
 *
 * La logique d'expiration des états (Berserk, posture...) est déléguée au client
 * via combatConfig.onStateNewRound, puis renvoyée via POST /sync-states.
 */
function nextTurn(slug) {
    const state = _get(slug);
    if (state.combatants.length === 0) return state;

    const next = state.currentTurnIndex + 1;

    if (next >= state.combatants.length) {
        // Nouveau round
        state.round            += 1;
        state.currentTurnIndex  = 0;
        // Reset générique des actions
        state.combatants = state.combatants.map(c => ({
            ...c,
            actionsRemaining: c.actionsMax,
        }));
    } else {
        state.currentTurnIndex = next;
    }

    return state;
}

// ─── File des attaques en attente ─────────────────────────────────────────────

/**
 * Ajoute une attaque dans la file du slug.
 * Un id uuid est généré si l'attaque n'en a pas.
 */
function addPendingAttack(slug, attack) {
    const state = _get(slug);
    state.pendingAttacks.push({
        id: randomUUID(),
        ...attack,
    });
    return state;
}

/**
 * Retire une attaque de la file par son id.
 */
function removePendingAttack(slug, attackId) {
    const state = _get(slug);
    state.pendingAttacks = state.pendingAttacks.filter(a => a.id !== attackId);
    return state;
}

/**
 * Met à jour une attaque en file (ex: ajout defenseResult).
 */
function updatePendingAttack(slug, attackId, updates) {
    const state = _get(slug);
    state.pendingAttacks = state.pendingAttacks.map(a =>
        a.id === attackId ? { ...a, ...updates } : a
    );
    return state;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
    getState,
    setState,
    resetState,
    addCombatant,
    removeCombatant,
    updateCombatant,
    reorderCombatants,
    syncStates,
    startCombat,
    endCombat,
    nextTurn,
    addPendingAttack,
    removePendingAttack,
    updatePendingAttack,
};