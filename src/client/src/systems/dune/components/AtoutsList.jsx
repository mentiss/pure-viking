// src/client/src/systems/dune/components/AtoutsList.jsx
// Inventaire libre des atouts du personnage.
// Nom + description + quantité.
// Pattern identique au InventoryTab Vikings, adapté au thème Dune.

import React, { useState } from 'react';

const EMPTY_ITEM = { nom: '', description: '', quantite: 1 };

/**
 * @param {object}   props
 * @param {Array}    props.items     - [{ id?, nom, description, quantite }]
 * @param {boolean}  props.editMode
 * @param {Function} props.onChange  - (updatedItems: Array) => void
 */
const AtoutsList = ({ items = [], editMode, onChange }) => {
    const [newItem, setNewItem] = useState({ ...EMPTY_ITEM });

    const handleAdd = () => {
        if (!newItem.nom.trim()) return;
        onChange([...items, { ...newItem, nom: newItem.nom.trim(), quantite: Math.max(1, newItem.quantite) }]);
        setNewItem({ ...EMPTY_ITEM });
    };

    const handleRemove = (idx) => onChange(items.filter((_, i) => i !== idx));

    const handleEdit = (idx, field, value) => {
        onChange(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
    };

    return (
        <div className="dune-card">
            <div className="dune-label mb-2">Atouts</div>

            {items.length === 0 && !editMode && (
                <p className="text-xs italic" style={{ color: 'var(--dune-text-muted)' }}>Aucun atout.</p>
            )}

            <div className="space-y-2">
                {items.map((item, idx) => (
                    <div key={idx} className="rounded p-2" style={{ background: 'var(--dune-surface-alt)' }}>
                        {editMode ? (
                            <div className="space-y-1">
                                <div className="flex gap-1 items-center group">
                                    <input
                                        value={item.nom}
                                        onChange={e => handleEdit(idx, 'nom', e.target.value)}
                                        className="dune-input text-xs font-bold flex-1 min-w-0"
                                        placeholder="Nom de l'atout"
                                    />
                                    <input
                                        type="number"
                                        min={1}
                                        value={item.quantite}
                                        onChange={e => handleEdit(idx, 'quantite', parseInt(e.target.value) || 1)}
                                        className="dune-input text-xs"
                                        style={{ width: '3.5rem', flexShrink: 0 }}
                                    />
                                    <button
                                        onClick={() => handleRemove(idx)}
                                        className="opacity-45 group-hover:opacity-100 transition-opacity text-xs w-5 h-5 rounded flex items-center justify-center"
                                        style={{ background: 'var(--dune-red)', color: 'white' }}
                                    >✕</button>
                                </div>
                                <textarea
                                    value={item.description}
                                    onChange={e => handleEdit(idx, 'description', e.target.value)}
                                    className="dune-input text-xs"
                                    rows={2}
                                    placeholder="Description…"
                                />
                            </div>
                        ) : (
                            <div className="flex justify-between items-start gap-2 group">
                                <div>
                                    <div className="text-xs font-bold" style={{ color: 'var(--dune-gold)' }}>{item.nom}</div>
                                    {item.description && (
                                        <div className="text-xs mt-0.5" style={{ color: 'var(--dune-text-muted)' }}>{item.description}</div>
                                    )}
                                </div>
                                {item.quantite > 1 && (
                                    <span className="text-xs font-bold flex-shrink-0" style={{ color: 'var(--dune-sand)' }}>
                                        ×{item.quantite}
                                    </span>
                                )}
                                <button
                                    onClick={() => handleRemove(idx)}
                                    className="opacity-45 group-hover:opacity-100 transition-opacity text-xs w-5 h-5 rounded flex items-center justify-center"
                                    style={{ background: 'var(--dune-red)', color: 'white' }}
                                    title="Supprimer"
                                >✕</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {editMode && (
                <div className="mt-2 space-y-1 border-t pt-2" style={{ borderColor: 'var(--dune-border)' }}>
                    <div className="flex gap-1">
                        <input
                            value={newItem.nom}
                            onChange={e => setNewItem(p => ({ ...p, nom: e.target.value }))}
                            className="dune-input text-xs flex-1 min-w-0"
                            placeholder="Nom de l'atout…"
                        />
                        <input
                            type="number"
                            min={1}
                            value={newItem.quantite}
                            onChange={e => setNewItem(p => ({ ...p, quantite: parseInt(e.target.value) || 1 }))}
                            className="dune-input text-xs"
                            style={{ width: '3.5rem', flexShrink: 0 }}
                        />
                    </div>
                    <textarea
                        value={newItem.description}
                        onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))}
                        className="dune-input text-xs"
                        rows={2}
                        placeholder="Description…"
                    />
                    <button
                        onClick={handleAdd}
                        disabled={!newItem.nom.trim()}
                        className="dune-btn-primary text-xs w-full disabled:opacity-40"
                    >
                        + Ajouter un atout
                    </button>
                </div>
            )}
        </div>
    );
};

export default AtoutsList;