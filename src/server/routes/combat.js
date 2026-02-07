// routes/combat.js - API gestion combat

const express = require('express');
const router = express.Router();
const combatState = require('../utils/combatState');

// File attaques en attente (en mémoire)
let pendingAttacks = [];

// GET /api/combat - Récupérer état combat
router.get('/', (req, res) => {
    res.json(combatState.getCombatState());
});

// GET /api/combat/pending-attacks - Récupérer attaques en attente
router.get('/pending-attacks', (req, res) => {
    res.json(pendingAttacks);
});

// POST /api/combat/submit-attack - Soumettre attaque pour validation MJ
router.post('/submit-attack', (req, res) => {
    const { attack } = req.body;
    
    if (!attack) {
        return res.status(400).json({ error: 'Missing attack data' });
    }
    
    pendingAttacks.push(attack);
    
    // Broadcast aux MJs
    const io = req.app.get('io');
    if (io) {
        io.emit('pending-attacks-update', pendingAttacks);
    }
    
    res.json({ success: true, queueLength: pendingAttacks.length });
});

// POST /api/combat/validate-attack - Valider et appliquer attaque
router.post('/validate-attack', (req, res) => {
    const { attackIndex, modifiedAttack } = req.body;
    
    if (attackIndex < 0 || attackIndex >= pendingAttacks.length) {
        return res.status(400).json({ error: 'Invalid attack index' });
    }
    
    const attack = modifiedAttack || pendingAttacks[attackIndex];
    
    // Trouver la cible pour savoir si c'est un joueur
    const state = combatState.getCombatState();
    const target = state.combatants.find(c => c.id === attack.targetId);
    
    // Si joueur, update DB aussi
    if (target && target.type === 'player' && target.characterId) {
        try {
            const db = require('../utils/db').getDb();
            const charData = db.prepare('SELECT data FROM characters WHERE id = ?').get(target.characterId);
            
            if (charData) {
                const fullChar = JSON.parse(charData.data);
                fullChar.tokensBlessure = (attack.targetBlessure || 0) + attack.damage;
                
                db.prepare('UPDATE characters SET data = ? WHERE id = ?').run(
                    JSON.stringify(fullChar),
                    target.characterId
                );
                
                // Broadcast update fiche au client
                const io = req.app.get('io');
                if (io) {
                    io.emit('character-update', {
                        characterId: target.characterId,
                        updates: {
                            tokensBlessure: fullChar.tokensBlessure
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error updating character DB:', error);
        }
    }
    
    // Appliquer dégâts à la cible dans combat state
    const newState = combatState.updateCombatant(attack.targetId, {
        blessure: (attack.targetBlessure || 0) + attack.damage
    });
    
    // Retirer de la file
    pendingAttacks.splice(attackIndex, 1);
    
    // Broadcast
    const io = req.app.get('io');
    if (io) {
        io.emit('combat-update', newState);
        io.emit('pending-attacks-update', pendingAttacks);
    }
    
    res.json(newState);
});

// POST /api/combat/reject-attack - Rejeter attaque
router.post('/reject-attack', (req, res) => {
    const { attackIndex } = req.body;
    
    if (attackIndex < 0 || attackIndex >= pendingAttacks.length) {
        return res.status(400).json({ error: 'Invalid attack index' });
    }
    
    pendingAttacks.splice(attackIndex, 1);
    
    const io = req.app.get('io');
    if (io) {
        io.emit('pending-attacks-update', pendingAttacks);
    }
    
    res.json({ success: true, queueLength: pendingAttacks.length });
});

// POST /api/combat/start - Démarrer combat
router.post('/start', (req, res) => {
    const state = combatState.startCombat();
    
    // Broadcast via WebSocket
    const io = req.app.get('io');
    if (io) {
        io.emit('combat-update', state);
    }
    
    res.json(state);
});

// POST /api/combat/end - Terminer combat
router.post('/end', (req, res) => {
    const state = combatState.endCombat();
    
    const io = req.app.get('io');
    if (io) {
        io.emit('combat-update', state);
    }
    
    res.json(state);
});

// POST /api/combat/next-turn - Tour suivant
router.post('/next-turn', (req, res) => {
    const state = combatState.nextTurn();
    
    const io = req.app.get('io');
    if (io) {
        io.emit('combat-update', state);
    }
    
    res.json(state);
});

// POST /api/combat/combatant - Ajouter combattant
router.post('/combatant', (req, res) => {
    const { combatant } = req.body;
    
    if (!combatant) {
        return res.status(400).json({ error: 'Missing combatant data' });
    }
    
    const state = combatState.addCombatant(combatant);
    
    const io = req.app.get('io');
    if (io) {
        io.emit('combat-update', state);
    }
    
    res.json(state);
});

// PUT /api/combat/combatant/:id - Mettre à jour combattant
router.put('/combatant/:id', (req, res) => {
    const { updates } = req.body;
    const state = combatState.updateCombatant(req.params.id, updates);
    
    const io = req.app.get('io');
    if (io) {
        io.emit('combat-update', state);
    }
    
    res.json(state);
});

// DELETE /api/combat/combatant/:id - Supprimer combattant
router.delete('/combatant/:id', (req, res) => {
    const state = combatState.removeCombatant(req.params.id);
    
    const io = req.app.get('io');
    if (io) {
        io.emit('combat-update', state);
    }
    
    res.json(state);
});

// POST /api/combat/reorder - Réorganiser ordre combattants
router.post('/reorder', (req, res) => {
    const { combatants } = req.body;
    
    if (!combatants || !Array.isArray(combatants)) {
        return res.status(400).json({ error: 'Invalid combatants array' });
    }
    
    const state = combatState.reorderCombatants(combatants);
    
    const io = req.app.get('io');
    if (io) {
        io.emit('combat-update', state);
    }
    
    res.json(state);
});

// POST /api/combat/action - Utiliser une action
router.post('/action', (req, res) => {
    const { combatantId, actionType } = req.body;
    
    const currentState = combatState.getCombatState();
    const combatant = currentState.combatants.find(c => c.id === combatantId);
    
    if (!combatant) {
        return res.status(404).json({ error: 'Combatant not found' });
    }
    
    if (combatant.actionsRemaining <= 0) {
        return res.status(400).json({ error: 'No actions remaining' });
    }
    
    // Décrémenter action
    const state = combatState.updateCombatant(combatantId, {
        actionsRemaining: combatant.actionsRemaining - 1
    });
    
    const io = req.app.get('io');
    if (io) {
        io.emit('combat-update', state);
    }
    
    res.json(state);
});

// POST /api/combat/posture-defensive - Activer posture défensive
router.post('/posture-defensive', (req, res) => {
    const { combatantId, type, value } = req.body;
    
    const currentState = combatState.getCombatState();
    const combatant = currentState.combatants.find(c => c.id === combatantId);
    
    if (!combatant) {
        return res.status(404).json({ error: 'Combatant not found' });
    }
    
    if (combatant.actionsRemaining <= 0) {
        return res.status(400).json({ error: 'No actions remaining' });
    }
    
    const state = combatState.updateCombatant(combatantId, {
        actionsRemaining: combatant.actionsRemaining - 1,
        postureDefensive: true,
        postureDefensiveType: type,
        postureDefensiveValue: value
    });
    
    const io = req.app.get('io');
    if (io) {
        io.emit('combat-update', state);
    }
    
    res.json(state);
});

module.exports = router;
