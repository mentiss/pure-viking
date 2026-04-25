// src/client/src/systems/deltagreen/components/layout/DiceEntryHistory.jsx

import React from 'react';

const ROLL_TYPE_LABELS = {
    dg_skill:    'Compétence',
    dg_carac:    'Caractéristique',
    dg_language: 'Langue',
    dg_san:      'Jet de SAN',
    dg_san_loss: 'Perte SAN',
    dg_damage:   'Dommages',
    dg_evolve:   'Évolution',
};

const isPercentileRoll = (rollType) =>
    ['dg_skill', 'dg_carac', 'dg_language', 'dg_san'].includes(rollType);

const DiceEntryHistory = ({ roll }) => {
    const entry  = roll?.roll ?? roll;
    const result = (() => {
        const raw = entry?.roll_result;
        if (!raw) return {};
        if (typeof raw === 'string') {
            try { return JSON.parse(raw); } catch { return {}; }
        }
        return raw;
    })();

    const rollType  = entry?.roll_type ?? '';
    const typeLabel = ROLL_TYPE_LABELS[rollType] ?? rollType ?? 'Jet';
    const isPercent = isPercentileRoll(rollType);

    const value       = result.value       ?? null;
    const targetScore = result.targetScore ?? null;
    const success     = result.success     ?? null;
    const critical    = result.critical    ?? false;
    const fumble      = result.fumble      ?? false;
    const rollLabel   = result.rollLabel   ?? entry?.notation ?? '—';
    const modifier    = result.modifier    ?? 0;

    // ── Couleurs et labels selon le résultat ──────────────────────────────────
    const getResultStyle = () => {
        if (critical && success) return {
            bg:      'rgba(180, 140, 0, 0.12)',
            border:  '#b8860b',
            color:   '#b8860b',
            label:   '★ CRITIQUE',
        };
        if (fumble) return {
            bg:      'rgba(139, 0, 0, 0.12)',
            border:  '#8b0000',
            color:   '#8b0000',
            label:   '✕ FUMBLE',
        };
        if (success) return {
            bg:      'rgba(26, 94, 42, 0.08)',
            border:  'var(--color-success)',
            color:   'var(--color-success)',
            label:   'SUCCÈS',
        };
        if (success === false) return {
            bg:      'rgba(192, 57, 43, 0.08)',
            border:  'var(--color-danger)',
            color:   'var(--color-danger)',
            label:   'ÉCHEC',
        };
        return null;
    };

    const resultStyle = isPercent ? getResultStyle() : null;

    return (
        <div
            className="px-3 py-2 font-mono"
            style={{
                background:   resultStyle?.bg ?? 'transparent',
                borderLeft:   resultStyle ? `3px solid ${resultStyle.border}` : '3px solid transparent',
                transition:   'background 0.2s',
            }}
        >
            {/* Ligne principale */}
            <div className="flex items-center gap-2 flex-wrap">
                {/* Type */}
                <span className="text-[10px] text-muted uppercase tracking-wider shrink-0">
                    {typeLabel}
                </span>

                {/* Label du jet */}
                <span className="text-xs font-bold truncate flex-1">
                    {rollLabel}
                </span>

                {/* Valeur du dé */}
                {value !== null && (
                    <span
                        className="text-base font-black tabular-nums shrink-0"
                        style={{ color: resultStyle?.color ?? 'var(--color-text)' }}
                    >
                        {value}
                    </span>
                )}

                {/* Badge résultat */}
                {resultStyle && (
                    <span
                        className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 shrink-0"
                        style={{
                            color:      resultStyle.color,
                            border:     `1px solid ${resultStyle.border}`,
                            background: resultStyle.bg,
                        }}
                    >
                        {resultStyle.label}
                    </span>
                )}
            </div>

            {/* Ligne secondaire — cible + modificateur */}
            {isPercent && targetScore !== null && (
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted">
                        vs <span className="font-bold" style={{ color: 'var(--color-text)' }}>
                            {targetScore}%
                        </span>
                        {modifier !== 0 && (
                            <span style={{ color: modifier > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                {' '}({modifier > 0 ? '+' : ''}{modifier})
                            </span>
                        )}
                    </span>

                    {/* Mention règle pour critique/fumble */}
                    {critical && success && (
                        <span className="text-[9px] italic" style={{ color: '#b8860b' }}>
                            Dégâts ×2 en combat
                        </span>
                    )}
                    {fumble && (
                        <span className="text-[9px] italic" style={{ color: '#8b0000' }}>
                            Conséquences catastrophiques
                        </span>
                    )}
                </div>
            )}

            {/* Dommages */}
            {!isPercent && value !== null && (
                <div className="text-[10px] text-muted mt-0.5">
                    {result.diceType?.toUpperCase() ?? ''}
                </div>
            )}
        </div>
    );
};

export default DiceEntryHistory;