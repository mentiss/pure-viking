// src/client/src/systems/dune/components/DuneHistoryEntry.jsx
// Rendu d'une entrée d'historique pour un jet Dune.
// Reçoit un objet roll depuis dice_history (roll_result et roll_definition parsés).

import React from 'react';

/**
 * @param {object} props.roll - Entrée dice_history (roll_result et roll_definition déjà parsés)
 */
const DuneHistoryEntry = ({ roll }) => {
    const r  = roll.roll_result   ?? {};
    const d  = roll.roll_definition ?? {};
    const results      = Array.isArray(r.results) ? r.results : [];
    const rang         = r.rang         ?? 0;
    const succes       = r.succes       ?? r.successes ?? 0;
    const difficulte   = r.difficulte   ?? 1;
    const complications= r.complications ?? 0;
    const reussite     = r.reussite     ?? (succes >= difficulte);
    const excedent     = Math.max(0, succes - difficulte);

    // Libellé du jet
    const jetLabel = r.label + ' (' + roll.notation + ')'
        || roll.notation
        || `${results.length}d20`;

    const getDieStyle = (value) => {
        if (value === 20)
            return { bg: 'var(--dune-red)',     color: 'white',               border: 'var(--dune-red)' };
        if ((value <= rang && r.hasSpec && r.selectedSpecialization) || value === 1)
            return { bg: 'var(--dune-gold)', color: 'var(--dune-text-muted)', border: 'var(--dune-border)' };
        if (value <= rang)
            return { bg: 'var(--dune-success)', color: 'var(--dune-dark)',   border: 'var(--dune-success)' };
        return { bg: 'var(--dune-surface-alt)', color: 'var(--dune-text-muted)', border: 'var(--dune-border)' };
    };

    return (
        <div className="px-3 py-2.5 space-y-2">
            {/* Libellé + résultat */}
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold truncate" style={{ color: 'var(--dune-text)' }}>
                    {r.label} <span className="text-muted font-regular" style={{ color: 'var(--dune-text-muted)' }}>({roll.notation})</span>
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded flex-shrink-0"
                      style={{
                          background: reussite ? 'var(--dune-success)' : 'var(--dune-red)',
                          color: reussite ? 'var(--dune-dark)' : 'white',
                      }}>
                    {reussite ? `✓ ${succes}/${difficulte}` : `✗ ${succes}/${difficulte}`}
                </span>
            </div>

            {/* Dés */}
            {results.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                    {results.map((v, i) => {
                        const s = getDieStyle(v);
                        return (
                            <div key={i}
                                 className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold border"
                                 style={{ background: s.bg, color: s.color, borderColor: s.border }}>
                                {v}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Détails supplémentaires */}
            <div className="flex gap-3 text-[10px]" style={{ color: 'var(--dune-text-muted)' }}>
                <span>Rang {rang}</span>
                {excedent > 0 && <span style={{ color: 'var(--dune-gold)' }}>+{excedent} excédent</span>}
                {complications > 0 && (
                    <span style={{ color: 'var(--dune-red)' }}>⚡ {complications} complication{complications > 1 ? 's' : ''}</span>
                )}
                {r.impulsionsDepensees > 0 && <span>💧 {r.impulsionsDepensees} imp.</span>}
                {r.menaceGeneree  > 0 && <span>☠ +{r.menaceGeneree} menace</span>}
                {r.useDetermination && <span style={{ color: 'var(--dune-gold)' }}>★ Détermination</span>}
            </div>
        </div>
    );
};

export default DuneHistoryEntry;