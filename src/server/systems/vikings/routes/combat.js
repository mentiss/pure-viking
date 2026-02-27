// src/server/systems/vikings/routes/combat.js
// Route combat spécifique au système Pure Vikings.
// Gère les tokens de blessure, la file d'attaques, les états de combat Vikings.
// Combat state en mémoire (singleton par processus).

const express = require('express');
const router = express.Router();
const combatState = require('../../../utils/combatState');

// File d'attaques en attente (en mémoire, propre à ce module)
let pendingAttacks = [];

// ─── Helper broadcast ────────────────────────────────────────────────────────

function broadcast(req, event, data) {
    const io = req.app.get('io');
    if (io) io.emit(event, data);
}

// ─── Routes ─────────────────────────────────────────────────────────────────

router.get('/', (req, res) => {
    res.json(combatState.getCombatState());
});

router.get('/pending-attacks', (req, res) => {
    res.json(pendingAttacks);
});

router.post('/start', (req, res) => {
    const state = combatState.startCombat();
    broadcast(req, 'combat-update', state);
    res.json(state);
});

router.post('/end', (req, res) => {
    const state = combatState.endCombat();
    broadcast(req, 'combat-update', state);
    res.json(state);
});

router.post('/next-turn', (req, res) => {
    const state = combatState.nextTurn();
    broadcast(req, 'combat-update', state);
    res.json(state);
});

router.post('/combatant', (req, res) => {
    const { combatant } = req.body;
    if (!combatant) return res.status(400).json({ error: 'Missing combatant data' });
    const state = combatState.addCombatant(combatant);
    broadcast(req, 'combat-update', state);
    res.json(state);
});

router.put('/combatant/:id', (req, res) => {
    const state = combatState.updateCombatant(req.params.id, req.body.updates);
    broadcast(req, 'combat-update', state);
    res.json(state);
});

router.delete('/combatant/:id', (req, res) => {
    const state = combatState.removeCombatant(req.params.id);
    broadcast(req, 'combat-update', state);
    res.json(state);
});

router.post('/reorder', (req, res) => {
    const { combatants } = req.body;
    if (!combatants || !Array.isArray(combatants))
        return res.status(400).json({ error: 'Invalid combatants array' });
    const state = combatState.reorderCombatants(combatants);
    broadcast(req, 'combat-update', state);
    res.json(state);
});

router.post('/action', (req, res) => {
    const { combatantId } = req.body;
    const current = combatState.getCombatState();
    const combatant = current.combatants.find(c => c.id === combatantId);
    if (!combatant) return res.status(404).json({ error: 'Combatant not found' });
    if (combatant.actionsRemaining <= 0) return res.status(400).json({ error: 'No actions remaining' });
    const state = combatState.updateCombatant(combatantId, { actionsRemaining: combatant.actionsRemaining - 1 });
    broadcast(req, 'combat-update', state);
    res.json(state);
});

router.post('/posture-defensive', (req, res) => {
    const { combatantId, type, value } = req.body;
    const current = combatState.getCombatState();
    const combatant = current.combatants.find(c => c.id === combatantId);
    if (!combatant) return res.status(404).json({ error: 'Combatant not found' });
    if (combatant.actionsRemaining <= 0) return res.status(400).json({ error: 'No actions remaining' });
    const state = combatState.updateCombatant(combatantId, {
        actionsRemaining: combatant.actionsRemaining - 1,
        postureDefensive: true,
        postureDefensiveType: type,
        postureDefensiveValue: value
    });
    broadcast(req, 'combat-update', state);
    res.json(state);
});

router.post('/submit-attack', (req, res) => {
    const { attack } = req.body;
    if (!attack) return res.status(400).json({ error: 'Missing attack data' });
    pendingAttacks.push(attack);
    broadcast(req, 'pending-attacks-update', pendingAttacks);
    res.json({ success: true, queueLength: pendingAttacks.length });
});

router.post('/validate-attack', (req, res) => {
    const { attackIndex, modifiedAttack } = req.body;
    if (attackIndex < 0 || attackIndex >= pendingAttacks.length)
        return res.status(400).json({ error: 'Invalid attack index' });

    const attack = modifiedAttack || pendingAttacks[attackIndex];
    const state = combatState.getCombatState();
    const target = state.combatants.find(c => c.id === attack.targetId);

    // Si joueur, mettre à jour les tokens en BDD (mécanique Vikings : tokens blessure)
    if (target?.type === 'player' && target.characterId) {
        try {
            const db = req.db;
            db.prepare('UPDATE characters SET tokens_blessure = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                .run((attack.targetBlessure || 0) + attack.damage, target.characterId);

            broadcast(req, 'character-light-update', {
                characterId: target.characterId,
                tokensBlessure: (attack.targetBlessure || 0) + attack.damage
            });
        } catch (error) {
            console.error('Error updating character DB after attack:', error);
        }
    }

    const newState = combatState.updateCombatant(attack.targetId, {
        blessure: (attack.targetBlessure || 0) + attack.damage
    });

    pendingAttacks.splice(attackIndex, 1);
    broadcast(req, 'combat-update', newState);
    broadcast(req, 'pending-attacks-update', pendingAttacks);
    res.json(newState);
});

router.post('/reject-attack', (req, res) => {
    const { attackIndex } = req.body;
    if (attackIndex < 0 || attackIndex >= pendingAttacks.length)
        return res.status(400).json({ error: 'Invalid attack index' });
    pendingAttacks.splice(attackIndex, 1);
    broadcast(req, 'pending-attacks-update', pendingAttacks);
    res.json({ success: true, queueLength: pendingAttacks.length });
});

module.exports = router;