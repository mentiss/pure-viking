// src/client/src/systems/deltagreen/components/layout/DiceEntryHistory.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Rendu d'une entrée d'historique de dés pour Delta Green.
// Injecté via config.dice.renderHistoryEntry.
//
// entry.roll_result peut contenir :
//   dg_skill / dg_carac / dg_san :
//     { value, targetScore, success, critical, fumble, rollLabel, successes }
//   dg_damage :
//     { value, diceType, rollLabel, successes }
//   dg_san_loss :
//     { value, diceType, rollLabel, successes }
//   dg_evolve :
//     { value, rollLabel, successes }
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Composant ─────────────────────────────────────────────────────────────────

const DiceEntryHistory = ({ roll }) => {
    // Compatibilité : le composant peut recevoir { roll } ou directement l'entry
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
    const rollLabel   = result.rollLabel   ?? entry?.notation ?? '';

    return (
        <div
            className="px-3 py-2 space-y-1.5"
            style={{ fontFamily: 'var(--dg-font-body, "Courier New", monospace)' }}
        >
            {/* ── En-tête : type + label ───────────────────────────────── */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5 min-w-0">
                    {/* Type de jet */}
                    <span
                        className="text-[10px] font-mono uppercase tracking-widest"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        {typeLabel}
                    </span>
                    {/* Label de la compétence / situation */}
                    {rollLabel && (
                        <span
                            className="text-xs font-mono font-bold truncate"
                            style={{ color: 'var(--color-text)' }}
                        >
                            {rollLabel}
                        </span>
                    )}
                </div>

                {/* Résultat outcome pill */}
                {isPercent && success !== null && (
                    <div
                        className="flex-shrink-0 px-2 py-0.5 text-[10px] font-mono font-black uppercase tracking-wider border"
                        style={{
                            borderColor: critical ? 'var(--color-success)'
                                : fumble    ? 'var(--color-danger)'
                                    : success   ? 'var(--color-success)'
                                        :             'var(--color-danger)',
                            color:       critical ? 'var(--color-success)'
                                : fumble    ? 'var(--color-danger)'
                                    : success   ? 'var(--color-success)'
                                        :             'var(--color-danger)',
                            background:  critical ? 'color-mix(in srgb, var(--color-success) 10%, transparent)'
                                : fumble    ? 'color-mix(in srgb, var(--color-danger) 10%, transparent)'
                                    : success   ? 'color-mix(in srgb, var(--color-success) 8%, transparent)'
                                        :             'color-mix(in srgb, var(--color-danger) 8%, transparent)',
                        }}
                    >
                        {critical ? 'CRITIQUE'
                            : fumble  ? 'FUMBLE'
                                : success ? 'SUCCÈS'
                                    :           'ÉCHEC'}
                    </div>
                )}
            </div>

            {/* ── Corps : valeur + cible ───────────────────────────────── */}
            <div className="flex items-center gap-3">
                {/* Dé affiché */}
                {value !== null && (
                    <div
                        className="inline-flex items-center justify-center min-w-[2.5rem] h-9 px-2 font-mono font-black text-lg border"
                        style={{
                            background:  'var(--color-surface-alt)',
                            borderColor: isPercent && success !== null
                                ? (success ? 'var(--color-success)' : 'var(--color-danger)')
                                : 'var(--color-border)',
                            color:       isPercent && success !== null
                                ? (success ? 'var(--color-success)' : 'var(--color-danger)')
                                : 'var(--color-text)',
                        }}
                    >
                        {value}
                    </div>
                )}

                {/* Cible pour les jets percentile */}
                {isPercent && targetScore !== null && (
                    <span
                        className="text-xs font-mono"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        vs <span
                        className="font-bold"
                        style={{ color: 'var(--color-text)' }}
                    >{targetScore}%</span>
                    </span>
                )}

                {/* Dé type pour dommages */}
                {!isPercent && result.diceType && (
                    <span
                        className="text-[10px] font-mono uppercase"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        {result.diceType.toUpperCase()}
                    </span>
                )}

                {/* Gain d'évolution */}
                {rollType === 'dg_evolve' && value !== null && (
                    <span
                        className="text-xs font-mono"
                        style={{ color: 'var(--color-success)' }}
                    >
                        +{value}%
                    </span>
                )}
            </div>
        </div>
    );
};

export default DiceEntryHistory;