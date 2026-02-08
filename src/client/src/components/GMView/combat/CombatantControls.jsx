// components/gm/combat/CombatControls.jsx - Contrôles de combat (start, next turn, end)
import React from 'react';

const CombatControls = ({
                            combatState,
                            onStartCombat,
                            onNextTurn,
                            onEndCombat,
                            canStartCombat
                        }) => {
    const currentCombatant = combatState.combatants[combatState.currentTurnIndex];

    if (!combatState.active) {
        return (
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-lg border-2 border-viking-bronze p-4 mb-4">
                <button
                    onClick={onStartCombat}
                    disabled={!canStartCombat}
                    className="w-full px-6 py-3 bg-viking-bronze text-viking-brown rounded-lg font-bold text-lg hover:bg-viking-leather disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    ⚔️ Démarrer le Combat
                </button>
                {!canStartCombat && (
                    <p className="text-sm text-viking-danger mt-2 text-center">
                        Ajoutez au moins un combattant pour démarrer
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-viking-brown rounded-lg shadow-lg border-2 border-viking-bronze p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <div className="text-2xl font-bold text-viking-brown dark:text-viking-parchment">
                        ⚔️ Combat en cours
                    </div>
                    <div className="text-sm text-viking-leather dark:text-viking-bronze">
                        Tour {combatState.round}
                    </div>
                </div>

                <button
                    onClick={onEndCombat}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
                >
                    🛑 Terminer le combat
                </button>
            </div>

            {currentCombatant && (
                <div className="bg-viking-bronze/20 rounded-lg p-3 mb-4">
                    <div className="text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-1">
                        Tour de :
                    </div>
                    <div className="text-xl font-bold text-viking-bronze">
                        {currentCombatant.name}
                    </div>
                    <div className="text-sm text-viking-leather dark:text-viking-bronze">
                        Actions restantes : {currentCombatant.actionsRemaining}/{currentCombatant.actionsMax}
                    </div>
                </div>
            )}

            <button
                onClick={onNextTurn}
                className="w-full px-6 py-3 bg-viking-bronze text-viking-brown rounded-lg font-bold text-lg hover:bg-viking-leather"
            >
                ➡️ Tour suivant
            </button>
        </div>
    );
};

export default CombatControls;