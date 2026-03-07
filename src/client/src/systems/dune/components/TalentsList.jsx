// src/client/src/systems/dune/components/TalentsList.jsx
// Liste des talents du personnage.
// En lecture : nom + description.
// En édition : ajout / suppression. Pas de liste officielle ici (future data.js).

import React, { useState } from 'react';

/**
 * @param {object}   props
 * @param {Array}    props.talents   - [{ id?, talentName, description }]
 * @param {boolean}  props.editMode
 * @param {Function} props.onChange  - (updatedTalents: Array) => void
 */
const TalentsList = ({ talents = [], editMode, onChange }) => {
    const [newName, setNewName]  = useState('');
    const [newDesc, setNewDesc]  = useState('');

    const handleAdd = () => {
        if (!newName.trim()) return;
        onChange([...talents, { talentName: newName.trim(), description: newDesc.trim() }]);
        setNewName('');
        setNewDesc('');
    };

    const handleRemove = (idx) => {
        onChange(talents.filter((_, i) => i !== idx));
    };

    const handleEdit = (idx, field, value) => {
        onChange(talents.map((t, i) => i === idx ? { ...t, [field]: value } : t));
    };

    return (
        <div className="dune-card">
            <div className="dune-label mb-2">Talents</div>

            {talents.length === 0 && !editMode && (
                <p className="text-xs italic" style={{ color: 'var(--dune-text-muted)' }}>Aucun talent.</p>
            )}

            <div className="space-y-2">
                {talents.map((t, idx) => (
                    <div key={idx} className="rounded p-2" style={{ background: 'var(--dune-surface-alt)' }}>
                        {editMode ? (
                            <div className="space-y-1">
                                <div className="flex gap-1">
                                    <input
                                        value={t.talentName}
                                        onChange={e => handleEdit(idx, 'talentName', e.target.value)}
                                        className="dune-input text-xs font-bold flex-1"
                                        placeholder="Nom du talent"
                                    />
                                    <button
                                        onClick={() => handleRemove(idx)}
                                        className="text-xs px-2 rounded"
                                        style={{ background: 'var(--dune-red)', color: 'white' }}
                                    >✕</button>
                                </div>
                                <textarea
                                    value={t.description}
                                    onChange={e => handleEdit(idx, 'description', e.target.value)}
                                    className="dune-input text-xs"
                                    rows={2}
                                    placeholder="Description…"
                                />
                            </div>
                        ) : (
                            <>
                                <div className="text-xs font-bold" style={{ color: 'var(--dune-gold)' }}>{t.talentName}</div>
                                {t.description && (
                                    <div className="text-xs mt-0.5" style={{ color: 'var(--dune-text-muted)' }}>{t.description}</div>
                                )}
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* Ajout */}
            {editMode && (
                <div className="mt-2 space-y-1 border-t pt-2" style={{ borderColor: 'var(--dune-border)' }}>
                    <input
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        className="dune-input text-xs"
                        placeholder="Nom du nouveau talent…"
                    />
                    <textarea
                        value={newDesc}
                        onChange={e => setNewDesc(e.target.value)}
                        className="dune-input text-xs"
                        rows={2}
                        placeholder="Description…"
                    />
                    <button
                        onClick={handleAdd}
                        disabled={!newName.trim()}
                        className="dune-btn-primary text-xs w-full disabled:opacity-40"
                    >
                        + Ajouter un talent
                    </button>
                </div>
            )}
        </div>
    );
};

export default TalentsList;