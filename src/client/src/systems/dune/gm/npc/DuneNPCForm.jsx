// src/client/src/systems/dune/components/npc/DuneNPCForm.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Formulaire PNJ Dune — miroir de la structure personnage.
// 5 compétences (rang + spécialisation) + 5 principes (rang max 8 + maxime).
//
// Props :
//   slugForm {object}   — état du formulaire (competences[], principes[])
//   onChange {function} — (field, value) => void
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';

const COMPETENCES = [
    { key: 'analyse',    label: 'Analyse'    },
    { key: 'combat',     label: 'Combat'     },
    { key: 'discipline', label: 'Discipline' },
    { key: 'mobilite',   label: 'Mobilité'   },
    { key: 'rhetorique', label: 'Rhétorique' },
];

const PRINCIPES = [
    { key: 'devoir',     label: 'Devoir'     },
    { key: 'domination', label: 'Domination' },
    { key: 'foi',        label: 'Foi'        },
    { key: 'justice',    label: 'Justice'    },
    { key: 'verite',     label: 'Vérité'     },
];

const MAX_PRINCIPE_RANG    = 8;
const MAX_COMPETENCE_RANG  = 12;
const SEUIL_SPECIALISATION = 6;

const DuneNPCForm = ({ slugForm, onChange }) => {
    const current_competences = slugForm.competences ?? COMPETENCES.map(c => ({ key: c.key, rang: 4, specialisation: '' }));
    const current_principes   = slugForm.principes   ?? PRINCIPES.map(p => ({ key: p.key, rang: 4, maxime: '' }));

    const updateComp = (idx, field, value) => {
        const updated = current_competences.map((c, i) =>
            i === idx ? { ...c, [field]: field === 'rang' ? Math.max(1, Math.min(MAX_COMPETENCE_RANG, parseInt(value) || 1)) : value } : c
        );
        onChange('competences', updated);
    };

    const updatePrincipe = (idx, field, value) => {
        const updated = current_principes.map((p, i) =>
            i === idx ? { ...p, [field]: field === 'rang' ? Math.max(1, Math.min(MAX_PRINCIPE_RANG, parseInt(value) || 1)) : value } : p
        );
        onChange('principes', updated);
    };

    return (
        <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-x-2">
                {/* ── Principes ─────────────────────────────────────────────── */}
                <div>
                    <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wide">
                        Principes <span className="font-normal normal-case">(rang max {MAX_PRINCIPE_RANG})</span>
                    </p>
                    <div className="flex flex-col gap-2">
                        {PRINCIPES.map(({ key, label }, idx) => {
                            const principe = current_principes[idx] ?? { rang: 4, maxime: '' };
                            if(slugForm.principes === null || slugForm.principes === undefined) {
                                updatePrincipe(idx, 'rang', principe.rang);
                            }
                            return (
                                <div key={key} className="p-2 rounded-lg border border-base bg-surface">
                                    <div className="flex items-center gap-3">
                                        <span className="flex-1 text-sm font-semibold text-base">{label}</span>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => updatePrincipe(idx, 'rang', principe.rang - 1)}
                                                disabled={principe.rang <= 1}
                                                className="w-6 h-6 rounded text-sm font-bold bg-surface-alt text-base disabled:opacity-30"
                                            >−</button>
                                            <span className="w-6 text-center text-sm font-bold text-accent">
                                                {principe.rang}
                                            </span>
                                            <button
                                                onClick={() => updatePrincipe(idx, 'rang', principe.rang + 1)}
                                                disabled={principe.rang >= MAX_PRINCIPE_RANG}
                                                className="w-6 h-6 rounded text-sm font-bold bg-surface-alt text-base disabled:opacity-30"
                                            >+</button>
                                        </div>
                                    </div>
                                    {principe.rang >= SEUIL_SPECIALISATION && (
                                        <input
                                            type="text"
                                            placeholder="Maxime…"
                                            value={principe.maxime}
                                            onChange={e => updatePrincipe(idx, 'maxime', e.target.value)}
                                            className="mt-1.5 w-full px-2 py-1 rounded border border-base bg-surface-alt text-base text-xs"
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Compétences ───────────────────────────────────────────── */}
                <div>
                    <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wide">
                        Compétences
                    </p>
                    <div className="flex flex-col gap-2">
                        {COMPETENCES.map(({ key, label }, idx) => {
                            const comp = current_competences[idx] ?? { rang: 4, specialisation: '' };
                            if(slugForm.competences === null || slugForm.competences === undefined) {
                                updateComp(idx, 'rang', comp.rang);
                            }
                            return (
                                <div key={key} className="p-2 rounded-lg border border-base bg-surface">
                                    <div className="flex items-center gap-3">
                                        <span className="flex-1 text-sm font-semibold text-base">{label}</span>
                                        {/* Contrôle rang */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => updateComp(idx, 'rang', comp.rang - 1)}
                                                disabled={comp.rang <= 1}
                                                className="w-6 h-6 rounded text-sm font-bold bg-surface-alt text-base disabled:opacity-30"
                                            >−</button>
                                            <span className="w-6 text-center text-sm font-bold text-accent">
                                            {comp.rang}
                                        </span>
                                            <button
                                                onClick={() => updateComp(idx, 'rang', comp.rang + 1)}
                                                disabled={comp.rang >= MAX_COMPETENCE_RANG}
                                                className="w-6 h-6 rounded text-sm font-bold bg-surface-alt text-base disabled:opacity-30"
                                            >+</button>
                                        </div>
                                    </div>
                                    {/* Spécialisation — disponible à partir du seuil */}
                                    {comp.rang >= SEUIL_SPECIALISATION && (
                                        <input
                                            type="text"
                                            placeholder={`Spécialisation en ${label.toLowerCase()}…`}
                                            value={comp.specialisation}
                                            onChange={e => updateComp(idx, 'specialisation', e.target.value)}
                                            className="mt-1.5 w-full px-2 py-1 rounded border border-base bg-surface-alt text-base text-xs"
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DuneNPCForm;