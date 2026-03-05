// src/client/src/components/combat/CombatantRow.jsx
// Ligne générique d'un combattant dans la liste combat côté joueur.
//
// Affiche : indicateur de tour actif, nom, type, actions restantes,
// et le slot renderHealthDisplay injecté par le slug (santé, tokens, PV...).
//
// Ce composant ne lit jamais healthData directement.

import React from 'react';

const CombatantRow = ({
                          combatant,
                          isActive,       // boolean — c'est le tour de ce combattant
                          isMe,           // boolean — c'est le combattant du joueur local
                          renderHealthDisplay, // (combatant) => JSX  [slug] — peut être null
                      }) => {
    return (
        <div className={`flex items-center justify-between px-3 py-2 rounded border transition-colors ${
            isActive
                ? 'border-viking-bronze bg-viking-bronze/30 dark:bg-viking-bronze/20'
                : isMe
                    ? 'border-viking-leather/60 dark:border-viking-bronze/60 bg-white/60 dark:bg-gray-800/60'
                    : 'border-transparent bg-white/30 dark:bg-gray-800/30'
        }`}>
            {/* Indicateur de tour + nom */}
            <div className="flex items-center gap-2 min-w-0">
                <span className={`text-sm shrink-0 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                    ▶️
                </span>
                <div className="min-w-0">
                    <span className={`text-sm font-semibold truncate block ${
                        isMe
                            ? 'text-viking-bronze dark:text-viking-bronze'
                            : 'text-viking-brown dark:text-viking-parchment'
                    }`}>
                        {combatant.name}
                        {isMe && (
                            <span className="text-xs font-normal ml-1 opacity-70">(Vous)</span>
                        )}
                    </span>
                    {/* Type */}
                    <span className="text-xs text-viking-leather dark:text-viking-bronze">
                        {combatant.type === 'npc' ? 'PNJ' : 'Joueur'}
                    </span>
                </div>
            </div>

            {/* Slot santé slug + actions */}
            <div className="flex items-center gap-3 shrink-0">
                {/* Santé — rendu délégué au slug */}
                {renderHealthDisplay && (
                    <div className="text-xs">
                        {renderHealthDisplay(combatant)}
                    </div>
                )}

                {/* Actions restantes — champ générique, masqué si actionsMax = 0 */}
                {combatant.actionsMax > 0 && (
                    <div className="text-xs text-viking-leather dark:text-viking-bronze whitespace-nowrap">
                        {combatant.actionsRemaining}/{combatant.actionsMax} ⚡
                    </div>
                )}
            </div>
        </div>
    );
};

export default CombatantRow;