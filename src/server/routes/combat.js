// src/server/routes/combat.js
// Route combat générique — montée sous /api/:slug/combat par le systemResolver.
//
// Principes :
//   - Ne connaît aucune règle métier slug.
//   - Ne touche jamais la BDD personnage — c'est le callback onDamage côté client GM.
//   - healthData/turnData/activeStates sont stockés et retransmis de manière opaque.
//   - pendingAttacks isolés par slug via combatState Map.
//   - validate-attack : met à jour healthData du combattant + retire de la file.
//     La persistance BDD est faite en amont par le client GM (onDamage).
//   - trigger-defense / defense-response : infrastructure opportunité de défense.
//     combat-defense-opportunity est broadcasté avec targetCombatantId —
//     le client défenseur filtre côté useDefenseOpportunity.

'use strict';

const express = require('express');
const router  = express.Router();
const cs      = require('../utils/combatState');

// ─── Helper broadcast ────────────────────────────────────────────────────────

function broadcast(req, event, data) {
    const io = req.app.get('io');
    if (io) io.emit(event, data);
}

// Raccourci : slug injecté par systemResolver
function slug(req) {
    return req.system.slug;
}

// ─── État & file ─────────────────────────────────────────────────────────────

// GET / — état courant (combat + pendingAttacks)
router.get('/', (req, res) => {
    res.json(cs.getState(slug(req)));
});

// GET /pending-attacks — file d'attaques uniquement
router.get('/pending-attacks', (req, res) => {
    res.json(cs.getState(slug(req)).pendingAttacks);
});

// ─── Flow combat ─────────────────────────────────────────────────────────────

// POST /start
router.post('/start', (req, res) => {
    const state = cs.startCombat(slug(req));
    broadcast(req, 'combat-update', state);
    res.json(state);
});

// POST /end
router.post('/end', (req, res) => {
    const state = cs.endCombat(slug(req));
    broadcast(req, 'combat-update', state);
    res.json(state);
});

// POST /next-turn
// Le serveur incrémente tour/round et broadcast.
// Le client reçoit combat-update, applique onStateNewRound(combatants),
// puis POST /sync-states pour mettre à jour les activeStates.
router.post('/next-turn', (req, res) => {
    const state = cs.nextTurn(slug(req));
    broadcast(req, 'combat-update', state);
    res.json(state);
});

// ─── Combattants ─────────────────────────────────────────────────────────────

// POST /combatant
router.post('/combatant', (req, res) => {
    const { combatant } = req.body;
    if (!combatant) return res.status(400).json({ error: 'Missing combatant data' });
    const state = cs.addCombatant(slug(req), combatant);
    broadcast(req, 'combat-update', state);
    res.json(state);
});

// PUT /combatant/:id
// Mise à jour champs libres : activeStates, healthData, turnData, actionsRemaining...
router.put('/combatant/:id', (req, res) => {
    const { updates } = req.body;
    if (!updates) return res.status(400).json({ error: 'Missing updates' });
    const state = cs.updateCombatant(slug(req), req.params.id, updates);
    broadcast(req, 'combat-update', state);
    res.json(state);
});

// DELETE /combatant/:id
router.delete('/combatant/:id', (req, res) => {
    const state = cs.removeCombatant(slug(req), req.params.id);
    broadcast(req, 'combat-update', state);
    res.json(state);
});

// POST /reorder — réordonne après drag & drop GM ou reroll initiative
router.post('/reorder', (req, res) => {
    const { combatants } = req.body;
    if (!combatants || !Array.isArray(combatants))
        return res.status(400).json({ error: 'Invalid combatants array' });
    const state = cs.reorderCombatants(slug(req), combatants);
    broadcast(req, 'combat-update', state);
    res.json(state);
});

// POST /action — décrémente actionsRemaining (burn d'action générique)
// Appelé par useAttackFlow et par le bouton "Autre action"
router.post('/action', (req, res) => {
    const { combatantId } = req.body;
    if (!combatantId) return res.status(400).json({ error: 'Missing combatantId' });

    const state   = cs.getState(slug(req));
    const combatant = state.combatants.find(c => c.id === combatantId);
    if (!combatant)                    return res.status(404).json({ error: 'Combatant not found' });
    if (combatant.actionsRemaining <= 0) return res.status(400).json({ error: 'No actions remaining' });

    const updated = cs.updateCombatant(slug(req), combatantId, {
        actionsRemaining: combatant.actionsRemaining - 1,
    });
    broadcast(req, 'combat-update', updated);
    res.json(updated);
});

// POST /sync-states — remplace activeStates en bloc après onStateNewRound client
// Body : { combatants: [{ id, activeStates }] }
router.post('/sync-states', (req, res) => {
    const { combatants } = req.body;
    if (!combatants || !Array.isArray(combatants))
        return res.status(400).json({ error: 'Invalid combatants array' });
    const state = cs.syncStates(slug(req), combatants);
    broadcast(req, 'combat-update', state);
    res.json(state);
});

// ─── File d'attaques ─────────────────────────────────────────────────────────

// POST /submit-attack
// Body : { attack: { attackerId, attackerName, targetId, targetName, weapon, damage, rollResult } }
router.post('/submit-attack', (req, res) => {
    const { attack } = req.body;
    if (!attack) return res.status(400).json({ error: 'Missing attack data' });
    const state = cs.addPendingAttack(slug(req), attack);
    broadcast(req, 'combat-update', state);
    res.json({ success: true, queueLength: state.pendingAttacks.length });
});

// POST /validate-attack
// Le client GM a déjà exécuté onDamage (persistance BDD via route characters).
// Ici : mise à jour healthData du combattant + retrait de la file + broadcast.
// Body : { attackId, targetId, newHealthData }
router.post('/validate-attack', (req, res) => {
    const { attackId, targetId, newHealthData } = req.body;
    if (!attackId) return res.status(400).json({ error: 'Missing attackId' });

    const s = slug(req);
    const state = cs.getState(s);
    const attack = state.pendingAttacks.find(a => a.id === attackId);
    if (!attack) return res.status(404).json({ error: 'Attack not found in queue' });

    // Mettre à jour healthData de la cible si fourni
    if (targetId && newHealthData !== undefined) {
        cs.updateCombatant(s, targetId, { healthData: newHealthData });
    }

    const updated = cs.removePendingAttack(s, attackId);
    broadcast(req, 'combat-update', updated);
    res.json(updated);
});

// POST /reject-attack
// Body : { attackId }
router.post('/reject-attack', (req, res) => {
    const { attackId } = req.body;
    if (!attackId) return res.status(400).json({ error: 'Missing attackId' });

    const state = cs.getState(slug(req));
    const exists = state.pendingAttacks.some(a => a.id === attackId);
    if (!exists) return res.status(404).json({ error: 'Attack not found in queue' });

    const updated = cs.removePendingAttack(slug(req), attackId);
    broadcast(req, 'combat-update', updated);
    res.json({ success: true });
});

// ─── Opportunité de défense ───────────────────────────────────────────────────

// POST /trigger-defense — GM déclenche l'opportunité vers le défenseur
// Body : { attackId }
// Broadcast combat-defense-opportunity avec targetCombatantId :
// le client défenseur filtre via useDefenseOpportunity (vérifie que
// l'event le concerne en comparant targetCombatantId à son propre combatant.id)
router.post('/trigger-defense', (req, res) => {
    const { attackId } = req.body;
    if (!attackId) return res.status(400).json({ error: 'Missing attackId' });

    const state  = cs.getState(slug(req));
    const attack = state.pendingAttacks.find(a => a.id === attackId);
    if (!attack) return res.status(404).json({ error: 'Attack not found in queue' });

    const io = req.app.get('io');
    if (io) {
        io.emit('combat-defense-opportunity', {
            attackId,
            attackData:        attack,
            targetCombatantId: attack.targetId,
        });
    }

    res.json({ success: true });
});

// POST /defense-response — défenseur soumet son résultat (ou abandon = null)
// Body : { attackId, defenseResult }
// Met à jour la pendingAttack, broadcast combat-update pour que le GM voie le résultat
router.post('/defense-response', (req, res) => {
    const { attackId, defenseResult } = req.body;
    if (!attackId) return res.status(400).json({ error: 'Missing attackId' });

    const s = slug(req);
    const state = cs.getState(s);
    const exists = state.pendingAttacks.some(a => a.id === attackId);
    if (!exists) return res.status(404).json({ error: 'Attack not found in queue' });

    const updated = cs.updatePendingAttack(s, attackId, {
        defenseResult,
        defenseResolved: true,
    });
    broadcast(req, 'combat-update', updated);
    res.json({ success: true });
});

module.exports = router;