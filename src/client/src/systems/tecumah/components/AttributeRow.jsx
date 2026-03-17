// src/client/src/systems/tecumah/components/AttributeRow.jsx
// Ligne d'attribut : label + notation XD+Y + bouton jet.

import React from 'react';
import {pipsResidual, pipsToNotation, pipsToPool} from "../config.jsx";

/**
 * @param {{ attrKey, label, pips, character, editMode, onChangePips, onRoll }} props
 * onRoll({ attrKey, attrPips, compKey: null, compPips: 0, label })
 */
const AttributeRow = ({ attrKey, label, pips, editMode, onChangePips, onRoll, displayDice = true }) => {
    const notation = pipsToNotation(pips);
    const pool     = pipsToPool(pips);
    const residual = pipsResidual(pips);

    return (
        <div
            className="flex items-center justify-between py-2 px-3 rounded-lg mb-1"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
            <div className="flex items-center gap-3">
                <span className="tecumah-title-font" style={{ fontWeight: 700, color: 'var(--color-primary)', minWidth: 100 }}>
                    {label}
                </span>
                {editMode ? (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onChangePips(Math.max(3, pips - 1))}
                            className="w-6 h-6 rounded flex items-center justify-center text-sm"
                            style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }}
                        >−</button>
                        <span style={{ minWidth: 48, textAlign: 'center', fontWeight: 700 }}>{notation}</span>
                        <button
                            onClick={() => onChangePips(Math.min(36, pips + 1))}
                            className="w-6 h-6 rounded flex items-center justify-center text-sm"
                            style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }}
                        >+</button>
                    </div>
                ) : (
                    <span style={{ fontWeight: 700, color: 'var(--color-text)', minWidth: 48 }}>
                        {notation}
                    </span>
                )}
            </div>
            {!editMode && displayDice && (
                <button
                    onClick={() => onRoll({ attrKey, attrPips: pips, compKey: null, compPips: 0, label })}
                    className="px-2 py-1 rounded text-xs"
                    style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', fontWeight: 600 }}
                    title={`Lancer ${notation}`}
                >
                    🎲
                </button>
            )}
        </div>
    );
};

export default AttributeRow;