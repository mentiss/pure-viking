// src/client/src/systems/dune/gm/modals/EditCharacterModal.jsx
// Modale GM — modifier la détermination d'un personnage.
// Simple compteur +/− sans gestion du max (fixé à la création, pas modifiable ici).

import React, { useState } from 'react';

const EditCharacterModal = ({ character, onSave, onClose }) => {
    const [det, setDet] = useState(character.determination ?? 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-xs rounded-xl shadow-2xl overflow-hidden"
                 style={{ background: 'var(--dune-surface)', border: '2px solid var(--dune-gold)' }}>

                {/* En-tête */}
                <div className="px-4 py-3 font-bold text-sm"
                     style={{ background: 'var(--dune-dark)', color: 'var(--dune-gold)', borderBottom: '1px solid var(--dune-gold)' }}>
                    🎯 Détermination — {character.nom}
                </div>

                <div className="p-6 space-y-6">
                    {/* Compteur */}
                    <div className="flex items-center justify-center gap-6">
                        <button
                            onClick={() => setDet(d => Math.max(0, d - 1))}
                            className="w-10 h-10 rounded-lg font-bold text-xl transition-colors"
                            style={{ background: 'var(--dune-surface-alt)', color: 'var(--dune-text)' }}
                        >
                            −
                        </button>
                        <span className="text-3xl font-bold tabular-nums w-12 text-center"
                              style={{ color: 'var(--dune-gold)' }}>
                            {det}
                        </span>
                        <button
                            onClick={() => setDet(d => d + 1)}
                            className="w-10 h-10 rounded-lg font-bold text-xl transition-colors"
                            style={{ background: 'var(--dune-gold)', color: 'var(--dune-dark)' }}
                        >
                            +
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button onClick={onClose} className="dune-btn-secondary flex-1 text-xs">
                            Annuler
                        </button>
                        <button
                            onClick={() => onSave({ determination: det })}
                            className="dune-btn-primary flex-1 text-xs"
                        >
                            Sauvegarder
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditCharacterModal;