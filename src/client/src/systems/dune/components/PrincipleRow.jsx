// src/client/src/systems/dune/components/PrincipleRow.jsx
// Ligne d'un principe Dune.
// Rang plafonné à 8. Maxime = texte libre RP, disponible uniquement rang >= 6.
// En affichage : maxime sur toute la largeur sous le rang.

import React from 'react';

const LABELS = {
    devoir:     'Devoir',
    domination: 'Domination',
    foi:        'Foi',
    justice:    'Justice',
    verite:     'Vérité',
};

const MAX_RANG   = 8;
const MAXIME_MIN = 6;

const PrincipleRow = ({ principe, editMode, onChange, onRoll }) => {
    const { key, rang, maxime } = principe;
    const label    = LABELS[key] ?? key;
    const canMaxime = rang >= MAXIME_MIN;

    const handleRangChange = (delta) => {
        const next = Math.min(MAX_RANG, Math.max(1, rang + delta));
        // Effacer la maxime si on redescend sous le seuil
        const m = next < MAXIME_MIN ? '' : maxime;
        onChange({ ...principe, rang: next, maxime: m });
    };

    return (
        <div className="flex flex-col gap-1 py-1.5 border-b last:border-0"
             style={{ borderColor: 'var(--dune-border)' }}>

            {/* Ligne principale : nom · rang · jet */}
            <div className="flex items-center gap-2">
                {/* Nom */}
                <div className="w-24 flex-shrink-0">
                    <span className="text-xs font-bold" style={{ color: 'var(--dune-text)' }}>
                        {label}
                        {rang === MAX_RANG && (
                            <span className="ml-1 text-[9px] font-bold" style={{ color: 'var(--dune-gold)' }}>★</span>
                        )}
                    </span>
                </div>

                {/* Rang */}
                {editMode ? (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handleRangChange(-1)}
                            disabled={rang <= 1}
                            className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center disabled:opacity-40"
                            style={{ background: 'var(--dune-surface-alt)', color: 'var(--dune-text)' }}
                        >−</button>
                        <span className="w-6 text-center text-sm font-bold" style={{ color: 'var(--dune-gold)' }}>
                            {rang}
                        </span>
                        <button
                            onClick={() => handleRangChange(1)}
                            disabled={rang >= MAX_RANG}
                            className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center disabled:opacity-40"
                            style={{ background: 'var(--dune-surface-alt)', color: 'var(--dune-text)' }}
                        >+</button>
                        <span className="text-[10px] ml-1" style={{ color: 'var(--dune-text-muted)' }}>/ {MAX_RANG}</span>
                    </div>
                ) : (
                    <span className="w-8 text-center text-sm font-bold" style={{ color: 'var(--dune-gold)' }}>
                        {rang}
                    </span>
                )}

                {/* Bouton jet (lecture seule) */}
                {!editMode && (
                    <button
                        onClick={() => onRoll?.(principe)}
                        className="ml-auto text-xs px-2 py-0.5 rounded font-semibold transition-opacity hover:opacity-80"
                        style={{ background: 'var(--dune-ochre)', color: 'var(--dune-parchment)' }}
                    >
                        🎲
                    </button>
                )}
            </div>

            {/* Maxime — lecture : pleine largeur */}
            {!editMode && canMaxime && maxime?.trim() && (
                <div className="text-[10px] italic w-full" style={{ color: 'var(--dune-text-muted)' }}>
                    « {maxime} »
                </div>
            )}

            {/* Maxime — édition : gated rang >= 6 */}
            {editMode && canMaxime && (
                <input
                    type="text"
                    value={maxime ?? ''}
                    onChange={e => onChange({ ...principe, maxime: e.target.value })}
                    placeholder="Maxime (rang ≥ 6)…"
                    className="dune-input text-xs"
                />
            )}
            {editMode && !canMaxime && (
                <div className="text-[10px] italic" style={{ color: 'var(--dune-text-muted)', paddingLeft: '0.25rem' }}>
                    Maxime disponible à rang 6
                </div>
            )}
        </div>
    );
};

export default PrincipleRow;