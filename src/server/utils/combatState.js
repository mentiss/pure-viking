// combatState.js - Gestion état combat en mémoire (pas de DB)

let combatState = {
    active: false,
    round: 0,
    currentTurnIndex: -1,
    combatants: []
};

const getCombatState = () => combatState;

const setCombatState = (newState) => {
    combatState = { ...combatState, ...newState };
    return combatState;
};

const resetCombatState = () => {
    combatState = {
        active: false,
        round: 0,
        currentTurnIndex: -1,
        combatants: []
    };
    return combatState;
};

const addCombatant = (combatant) => {
    combatState.combatants.push({
        id: `${combatant.type}-${Date.now()}-${Math.random()}`,
        ...combatant,
        actionsRemaining: combatant.actionsMax,
        postureDefensive: false,
        postureDefensiveType: null,
        postureDefensiveValue: 0
    });
    return combatState;
};

const removeCombatant = (id) => {
    combatState.combatants = combatState.combatants.filter(c => c.id !== id);
    return combatState;
};

const updateCombatant = (id, updates) => {
    combatState.combatants = combatState.combatants.map(c => 
        c.id === id ? { ...c, ...updates } : c
    );
    return combatState;
};

const reorderCombatants = (newOrder) => {
    combatState.combatants = newOrder;
    return combatState;
};

const nextTurn = () => {
    if (combatState.combatants.length === 0) return combatState;
    
    const nextIndex = combatState.currentTurnIndex + 1;

    combatState.combatants = combatState.combatants.map(c => {
        if (!c.activeStates || c.activeStates.length === 0) return c;
        const isBerserkExpiring = c.activeStates.some(s => s.name === 'Berserk' && s.duration === 1);

        if (isBerserkExpiring) {
            const newFatigue = Math.min(9, (c.fatigue || 0) + 4);

            return {
                ...c,
                // On retire les bonus de stats
                actionsMax: Math.max(1, c.actionsMax - 2),
                actionsRemaining: Math.max(0, c.actionsRemaining - 2),
                // On applique le contrecoup
                fatigue: newFatigue,
                // On retire l'état de la liste
                activeStates: c.activeStates.filter(s => s.name !== 'Berserk'),
                hasJustExpired: true
            };
        }

        return {
            ...c,
            activeStates: c.activeStates
                .map(s => ({ ...s, duration: s.duration - 1 }))
                .filter(s => s.duration > 0) // Supprime l'état s'il tombe à 0
        };
    });

    if (nextIndex >= combatState.combatants.length) {
        // Nouveau round
        combatState.round += 1;
        combatState.currentTurnIndex = 0;
        
        // Reset actions pour tous
        combatState.combatants = combatState.combatants.map(c => ({
            ...c,
            actionsRemaining: c.actionsMax,
            postureDefensive: false,
            postureDefensiveType: null,
            postureDefensiveValue: 0
        }));
    } else {
        combatState.currentTurnIndex = nextIndex;
    }
    
    return combatState;
};

const startCombat = () => {
    // Trier par initiative décroissante
    combatState.combatants.sort((a, b) => b.initiative - a.initiative);
    combatState.active = true;
    combatState.round = 1;
    combatState.currentTurnIndex = 0;
    
    // Init actions
    combatState.combatants = combatState.combatants.map(c => ({
        ...c,
        actionsRemaining: c.actionsMax
    }));
    
    return combatState;
};

const endCombat = () => {
    return resetCombatState();
};

module.exports = {
    getCombatState,
    setCombatState,
    resetCombatState,
    addCombatant,
    removeCombatant,
    updateCombatant,
    reorderCombatants,
    nextTurn,
    startCombat,
    endCombat
};
