// src/client/src/systems/dune/components/SkillRow.jsx
// Ligne d'une compétence Dune.
// Spécialisation : affichée et éditable uniquement si rang >= 6 (règle Dune).

import React from 'react';

const LABELS = {
    analyse:    'Analyse',
    combat:     'Combat',
    discipline: 'Discipline',
    mobilite:   'Mobilité',
    rhetorique: 'Rhétorique',
};

const SPEC_MIN_RANG = 6;

const SkillRow = ({ competence, editMode, onChange, onRoll }) => {
    const { key, rang, specialisation } = competence;
    const label    = LABELS[key] ?? key;
    const hasSpec  = specialisation?.trim() !== '';
    const canSpec  = rang >= SPEC_MIN_RANG;

    const handleRangChange = (delta) => {
        const next = Math.max(1, rang + delta);
        // Si on descend sous le seuil, effacer la spécialisation
        const spec = next < SPEC_MIN_RANG ? '' : competence.specialisation;
        onChange({ ...competence, rang: next, specialisation: spec });
    };

    return (
        <div className="flex flex-col gap-1 py-1.5 border-b last:border-0"
             style={{ borderColor: 'var(--dune-border)' }}>

            <div className="flex items-center gap-2">
                {/* Nom */}
                <div className="w-24 flex-shrink-0">
                    <span className="text-xs font-bold" style={{ color: 'var(--dune-text)' }}>{label}</span>
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
                            className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center"
                            style={{ background: 'var(--dune-surface-alt)', color: 'var(--dune-text)' }}
                        >+</button>
                        <span className="text-[10px] ml-1" style={{ color: 'var(--dune-text-muted)' }}>/ 12</span>
                    </div>
                ) : (
                    <span className="w-8 text-center text-sm font-bold" style={{ color: 'var(--dune-gold)' }}>
                        {rang}
                    </span>
                )}

                {/* Spécialisation — lecture seule */}
                {!editMode && (
                    <div className="flex items-center gap-1 ml-auto">
                        {hasSpec && canSpec && (
                            <span
                                className="text-[9px] px-1 rounded font-bold"
                                style={{ background: 'var(--dune-gold)', color: 'var(--dune-dark)' }}
                                title={specialisation}
                            >
                                SPEC
                            </span>
                        )}
                        <button
                            onClick={() => onRoll?.(competence)}
                            className="text-xs px-2 py-0.5 rounded font-semibold transition-opacity hover:opacity-80"
                            style={{ background: 'var(--dune-ochre)', color: 'var(--dune-parchment)' }}
                        >
                            🎲
                        </button>
                    </div>
                )}
            </div>

            {/* Spécialisation affichée sous le nom en lecture */}
            {!editMode && hasSpec && canSpec && (
                <div className="text-[10px] italic" style={{ color: 'var(--dune-gold)', paddingLeft: '6.5rem' }}>
                    ✦ {specialisation}
                </div>
            )}

            {/* Spécialisation éditable — uniquement si rang >= 6 */}
            {editMode && canSpec && (
                <input
                    type="text"
                    value={specialisation ?? ''}
                    onChange={e => onChange({ ...competence, specialisation: e.target.value })}
                    placeholder="Spécialisation (rang ≥ 6)…"
                    className="dune-input text-xs"
                />
            )}
            {editMode && !canSpec && (
                <div className="text-[10px] italic" style={{ color: 'var(--dune-text-muted)', paddingLeft: '0.25rem' }}>
                    Spécialisation disponible à rang 6
                </div>
            )}
        </div>
    );
};

export default SkillRow;