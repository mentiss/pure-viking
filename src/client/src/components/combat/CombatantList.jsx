// src/client/src/components/combat/CombatantList.jsx
// Liste générique des combattants — affichage seul, pas d'interactions.
//
// Rend un CombatantRow par entrée dans combatState.combatants,
// dans l'ordre du tableau (déjà trié par initiative côté serveur).

import React from 'react';
import CombatantRow from './CombatantRow.jsx';

const CombatantList = ({
                           combatState,
                           myCharacterId,       // characterId du joueur local (pour isMe)
                           renderHealthDisplay, // (combatant) => JSX  [slug]
                       }) => {
    const { combatants = [], currentTurnIndex } = combatState;

    if (combatants.length === 0) {
        return (
            <div className="text-sm text-viking-leather dark:text-viking-bronze text-center py-4 italic">
                Aucun combattant.
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {combatants.map((combatant, index) => (
                <CombatantRow
                    key={combatant.id}
                    combatant={combatant}
                    isActive={index === currentTurnIndex}
                    isMe={combatant.type === 'player' && combatant.characterId === myCharacterId}
                    renderHealthDisplay={renderHealthDisplay}
                />
            ))}
        </div>
    );
};

export default CombatantList;