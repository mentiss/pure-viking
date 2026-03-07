// src/client/src/systems/dune/components/DeterminationTracker.jsx
// Jauge de Détermination personnelle.
// Modifiable par le joueur (et par le GM via EditCharacterModal).
// Clampée entre 0 et determinationMax.

import React from 'react';

/**
 * @param {object}   props
 * @param {number}   props.determination
 * @param {number}   props.determinationMax
 * @param {boolean}  props.editMode
 * @param {Function} props.onChange     - ({ determination, determinationMax }) => void
 */
const DeterminationTracker = ({ determination, determinationMax, editMode, onChange }) => {
    const handleDelta = (delta) => {
        const next = Math.min(determinationMax, Math.max(0, determination + delta));
        onChange({ determination: next, determinationMax });
    };

    const handleMaxChange = (delta) => {
        const nextMax = Math.max(1, determinationMax + delta);
        const nextCur = Math.min(determination, nextMax);
        onChange({ determination: nextCur, determinationMax: nextMax });
    };

    return (
        <div className="dune-card text-center">
            <div className="dune-label mb-2">Détermination</div>

            {/* Pips */}
            <div className="flex justify-center gap-1.5 mb-2 flex-wrap">
                {Array.from({ length: determinationMax }).map((_, i) => (
                    <div
                        key={i}
                        className={`dune-pip ${i < determination ? 'filled' : 'empty'}`}
                        title={i < determination ? 'Utilisée' : 'Disponible'}
                    />
                ))}
            </div>

            {/* Contrôles courants */}
            <div className="flex items-center justify-center gap-2">
                <button
                    onClick={() => handleDelta(-1)}
                    disabled={determination <= 0}
                    className="w-7 h-7 rounded-full font-bold text-sm disabled:opacity-30 transition-opacity hover:opacity-80"
                    style={{ background: 'var(--dune-ochre)', color: 'var(--dune-parchment)' }}
                >−</button>
                <span className="text-base font-bold w-12 text-center" style={{ color: 'var(--dune-gold)' }}>
                    {determination} / {determinationMax}
                </span>
                <button
                    onClick={() => handleDelta(1)}
                    disabled={determination >= determinationMax}
                    className="w-7 h-7 rounded-full font-bold text-sm disabled:opacity-30 transition-opacity hover:opacity-80"
                    style={{ background: 'var(--dune-gold)', color: 'var(--dune-dark)' }}
                >+</button>
            </div>

            {/* Édition du max */}
            {editMode && (
                <div className="mt-2 flex items-center justify-center gap-1 text-xs" style={{ color: 'var(--dune-text-muted)' }}>
                    <span>Max :</span>
                    <button
                        onClick={() => handleMaxChange(-1)}
                        className="w-5 h-5 rounded text-xs font-bold"
                        style={{ background: 'var(--dune-surface-alt)', color: 'var(--dune-text)' }}
                    >−</button>
                    <span className="font-bold w-4 text-center" style={{ color: 'var(--dune-text)' }}>{determinationMax}</span>
                    <button
                        onClick={() => handleMaxChange(1)}
                        className="w-5 h-5 rounded text-xs font-bold"
                        style={{ background: 'var(--dune-surface-alt)', color: 'var(--dune-text)' }}
                    >+</button>
                </div>
            )}
        </div>
    );
};

export default DeterminationTracker;