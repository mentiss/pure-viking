// src/client/src/systems/vikings/components/TokensDisplay.jsx
// Affichage compact des tokens blessure dans CombatantRow et CombatPanel.
// Lit exclusivement depuis combatant.healthData (opaque).

import React from 'react';

const TokensDisplay = ({ combatant }) => {
    const hd      = combatant.healthData ?? {};
    const current = hd.tokensBlessure ?? 0;
    const max     = hd.blessureMax    ?? 5;

    return (
        <span className="flex gap-0.5 items-center" title={`${current}/${max} blessures`}>
            {Array.from({ length: max }).map((_, i) => (
                <span
                    key={i}
                    className={`text-xs leading-none ${
                        i < current ? 'text-viking-danger' : 'text-gray-300 dark:text-gray-600'
                    }`}
                >
                    ■
                </span>
            ))}
        </span>
    );
};

export default TokensDisplay;