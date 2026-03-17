// src/client/src/systems/tecumah/components/SkillRow.jsx
// Ligne de compétence : label + notation calculée (attr+comp) + bouton jet.
// Une compétence à 0 pips s'affiche avec la notation de l'attribut seul.

import React from 'react';
import {pipsToNotation} from "../config.jsx";

/**
 * @param {{
 *   skillKey: string, label: string,
 *   attrPips: number, compPips: number,
 *   editMode: boolean,
 *   onChangeComp: (pips: number) => void,
 *   onRoll: (ctx: object) => void,
 * }} props
 */
const SkillRow = ({ skillKey, label, attrKey, attrPips, compPips, editMode, onChangeComp, onRoll, displayDice = true }) => {
    const totalPips  = attrPips + compPips;
    const notation   = compPips === 0 ? pipsToNotation(attrPips) : pipsToNotation(totalPips);
    const compNotation = compPips === 0 ? '—' : pipsToNotation(compPips);

    return (
        <div
            className="flex items-center justify-between py-1 px-3 rounded mb-0.5"
            style={{ background: compPips > 0 ? 'var(--color-surface-alt)' : 'transparent' }}
        >
            <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Indicateur compétence investie */}
                <div
                    style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: compPips > 0 ? 'var(--color-accent)' : 'var(--color-border)',
                        flexShrink: 0,
                    }}
                />
                <span
                    style={{
                        fontSize: '0.85rem',
                        color: compPips > 0 ? 'var(--color-text)' : 'var(--color-text-muted)',
                        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                    title={label}
                >
                    {label}
                </span>
            </div>

            <div className="flex items-center gap-2">
                {/* Valeur compétence seule */}
                <span
                    style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', minWidth: 32, textAlign: 'right' }}
                    title="Bonus compétence"
                >
                    {compNotation}
                </span>

                {/* Total attr+comp */}
                {editMode ? (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onChangeComp(Math.max(0, compPips - 1))}
                            className="w-5 h-5 rounded text-xs flex items-center justify-center"
                            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                        >−</button>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, minWidth: 40, textAlign: 'center' }}>
                            {notation}
                        </span>
                        <button
                            onClick={() => onChangeComp(Math.min(36, compPips + 1))}
                            className="w-5 h-5 rounded text-xs flex items-center justify-center"
                            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                        >+</button>
                    </div>
                ) : (
                    <>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', minWidth: 40, textAlign: 'right', color: 'var(--color-text)' }}>
                            {notation}
                        </span>
                        {displayDice && (
                            <button
                                onClick={() => onRoll({ attrKey, attrPips, compKey: skillKey, compPips, label })}
                                className="w-6 h-6 rounded text-xs flex items-center justify-center"
                                style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                                title={`Lancer ${notation}`}
                            >
                                🎲
                            </button>
                        )}

                    </>
                )}
            </div>
        </div>
    );
};

export default SkillRow;