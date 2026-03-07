// src/client/src/systems/dune/gm/modals/EditCharacterModal.jsx
// Modale GM — modifier la détermination (courante + max) d'un personnage.
// Simple et ciblée : le GM ne devrait pas modifier les rangs depuis ici
// (l'édition complète passe par la fiche joueur ou une future modale dédiée).

import React, { useState } from 'react';

/**
 * @param {object}   props
 * @param {object}   props.character
 * @param {Function} props.onSave   - ({ determination, determinationMax }) => void
 * @param {Function} props.onClose
 */
const EditCharacterModal = ({ character, onSave, onClose }) => {
    const [det,    setDet]    = useState(character.determination    ?? 1);
    const [detMax, setDetMax] = useState(character.determinationMax ?? 3);

    const handleSave = () => {
        const safeMax = Math.max(1, detMax);
        const safeDet = Math.min(det, safeMax);
        onSave({ determination: safeDet, determinationMax: safeMax });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-xs rounded-xl shadow-2xl overflow-hidden"
                 style={{ background: 'var(--dune-surface)', border: '2px solid var(--dune-gold)' }}>

                <div className="px-4 py-3 font-bold text-sm"
                     style={{ background: 'var(--dune-dark)', color: 'var(--dune-gold)', borderBottom: '1px solid var(--dune-gold)' }}>
                    Détermination — {character.nom}
                </div>

                <div className="p-4 space-y-4">
                    {/* Détermination courante */}
                    <div>
                        <div className="dune-label mb-1">Valeur courante</div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setDet(d => Math.max(0, d - 1))}
                                    className="w-8 h-8 rounded font-bold"
                                    style={{ background: 'var(--dune-surface-alt)', color: 'var(--dune-text)' }}>−</button>
                            <span className="text-2xl font-bold w-10 text-center"
                                  style={{ color: 'var(--dune-gold)' }}>{det}</span>
                            <button onClick={() => setDet(d => Math.min(detMax, d + 1))}
                                    disabled={det >= detMax}
                                    className="w-8 h-8 rounded font-bold disabled:opacity-30"
                                    style={{ background: 'var(--dune-gold)', color: 'var(--dune-dark)' }}>+</button>
                        </div>
                    </div>

                    {/* Maximum */}
                    <div>
                        <div className="dune-label mb-1">Maximum</div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setDetMax(m => Math.max(1, m - 1))}
                                    className="w-8 h-8 rounded font-bold"
                                    style={{ background: 'var(--dune-surface-alt)', color: 'var(--dune-text)' }}>−</button>
                            <span className="text-2xl font-bold w-10 text-center"
                                  style={{ color: 'var(--dune-text)' }}>{detMax}</span>
                            <button onClick={() => setDetMax(m => m + 1)}
                                    className="w-8 h-8 rounded font-bold"
                                    style={{ background: 'var(--dune-surface-alt)', color: 'var(--dune-text)' }}>+</button>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={onClose} className="dune-btn-secondary flex-1 text-xs">Annuler</button>
                        <button onClick={handleSave} className="dune-btn-primary flex-1 text-xs">✓ Sauvegarder</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditCharacterModal;