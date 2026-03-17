// src/client/src/systems/tecumah/components/InventoryTab.jsx
// Gestion de l'inventaire : liste + formulaire d'édition inline.
// ItemRow est un sous-composant interne — non exporté.

import React, { useState } from 'react';

// ── Constantes ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS = {
    weapon_ranged: '🔫',
    weapon_melee:  '🗡️',
    misc:          '📦',
};

const EMPTY_ITEM = {
    id: undefined, name: '', description: '', category: 'misc',
    quantity: 1, location: 'inventory',
    damage: 0, rangeShort: 0, rangeMedium: 0, rangeLong: 0, skillKey: '',
};

// ── ItemRow — sous-composant interne ──────────────────────────────────────────

const ItemRow = ({ item, onEdit, onRemove, onToggleEquip, readOnly }) => {
    const isWeapon = item.category !== 'misc';
    const isMelee  = isWeapon && !item.rangeShort;
    const equipped = item.location === 'equipped';

    return (
        <div
            className="flex items-center gap-2 py-2 px-3 rounded-lg mb-1"
            style={{
                background:  equipped ? 'var(--color-surface-alt)' : 'var(--color-surface)',
                border:      `1px solid ${equipped ? 'var(--color-accent)' : 'var(--color-border)'}`,
            }}
        >
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>
                {CATEGORY_LABELS[item.category] ?? '📦'}
            </span>

            <div className="flex-1 min-w-0">
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)' }}>
                    {item.name}
                    {item.quantity > 1 && (
                        <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>
                            {' '}×{item.quantity}
                        </span>
                    )}
                </div>
                {isWeapon && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {item.damage > 0 && <span>Dégâts : {item.damage} </span>}
                        {isMelee
                            ? <span>· CàC</span>
                            : <span>· {item.rangeShort}m / {item.rangeMedium}m / {item.rangeLong}m</span>
                        }
                    </div>
                )}
                {item.description && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                        {item.description}
                    </div>
                )}
            </div>

            {!readOnly && (
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Équiper / ranger (armes uniquement) */}
                    {isWeapon && (
                        <button
                            onClick={() => onToggleEquip(item)}
                            className="px-2 py-1 rounded text-xs"
                            style={{
                                background: equipped ? 'var(--color-surface)' : 'var(--color-accent)',
                                color:      equipped ? 'var(--color-text-muted)' : 'var(--color-bg)',
                                border:     '1px solid var(--color-border)',
                            }}
                        >
                            {equipped ? 'Ranger' : 'Équiper'}
                        </button>
                    )}
                    <button
                        onClick={() => onEdit(item)}
                        style={{ color: 'var(--color-accent)', fontSize: '0.9rem' }}
                        title="Modifier"
                    >
                        ✏️
                    </button>
                    <button
                        onClick={() => onRemove(item.id)}
                        style={{ color: 'var(--color-danger)', fontSize: '0.9rem' }}
                        title="Supprimer"
                    >
                        ✕
                    </button>
                </div>
            )}
        </div>
    );
};

// ── ItemForm — formulaire d'édition inline ────────────────────────────────────

const ItemForm = ({ item, onSave, onCancel }) => {
    const [draft, setDraft] = useState({ ...item });
    const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));

    const isWeapon  = draft.category !== 'misc';
    const isRanged  = draft.category === 'weapon_ranged';

    return (
        <div
            className="rounded-lg p-4 flex flex-col gap-3 mb-2"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
            <div className="grid grid-cols-2 gap-3">
                <Field label="Nom">
                    <input type="text" value={draft.name} onChange={e => set('name', e.target.value)} style={inputSt} className="rounded px-2 py-1 text-sm w-full" />
                </Field>
                <Field label="Catégorie">
                    <select value={draft.category} onChange={e => set('category', e.target.value)} style={inputSt} className="rounded px-2 py-1 text-sm w-full">
                        <option value="misc">Objet</option>
                        <option value="weapon_melee">Arme CàC</option>
                        <option value="weapon_ranged">Arme à distance</option>
                    </select>
                </Field>
            </div>

            <Field label="Description">
                <input type="text" value={draft.description} onChange={e => set('description', e.target.value)} placeholder="Optionnel" style={inputSt} className="rounded px-2 py-1 text-sm w-full" />
            </Field>

            <Field label="Quantité">
                <input type="number" min={1} value={draft.quantity} onChange={e => set('quantity', Number(e.target.value))} style={inputSt} className="rounded px-2 py-1 text-sm w-24" />
            </Field>

            {isWeapon && (
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Dégâts fixes">
                        <input type="number" min={0} value={draft.damage} onChange={e => set('damage', Number(e.target.value))} style={inputSt} className="rounded px-2 py-1 text-sm w-full" />
                    </Field>
                    {isRanged && (
                        <>
                            <Field label="Portée courte (m)">
                                <input type="number" min={0} value={draft.rangeShort} onChange={e => set('rangeShort', Number(e.target.value))} style={inputSt} className="rounded px-2 py-1 text-sm w-full" />
                            </Field>
                            <Field label="Portée moyenne (m)">
                                <input type="number" min={0} value={draft.rangeMedium} onChange={e => set('rangeMedium', Number(e.target.value))} style={inputSt} className="rounded px-2 py-1 text-sm w-full" />
                            </Field>
                            <Field label="Portée longue (m)">
                                <input type="number" min={0} value={draft.rangeLong} onChange={e => set('rangeLong', Number(e.target.value))} style={inputSt} className="rounded px-2 py-1 text-sm w-full" />
                            </Field>
                        </>
                    )}
                </div>
            )}

            <div className="flex gap-2 justify-end">
                <button onClick={onCancel} className="px-3 py-1 rounded text-sm" style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-muted)' }}>
                    Annuler
                </button>
                <button onClick={() => onSave(draft)} className="px-3 py-1 rounded text-sm" style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', fontWeight: 700 }}>
                    {item.id ? 'Mettre à jour' : 'Ajouter'}
                </button>
            </div>
        </div>
    );
};

// ── InventoryTab — composant exporté ─────────────────────────────────────────

/**
 * @param {{
 *   items:    object[],
 *   onChange: (items: object[]) => void,
 *   readOnly: boolean,
 * }} props
 */
const InventoryTab = ({ items = [], onChange, readOnly = false }) => {
    const [editingItem, setEditingItem] = useState(null);

    const save = (item) => {
        if (item.id) {
            onChange(items.map(i => i.id === item.id ? item : i));
        } else {
            // id temporaire côté client — remplacé par le vrai id après PUT
            onChange([...items, { ...item, id: `tmp_${Date.now()}` }]);
        }
        setEditingItem(null);
    };

    const remove      = (id)   => onChange(items.filter(i => i.id !== id));
    const toggleEquip = (item) => {
        const next = { ...item, location: item.location === 'equipped' ? 'inventory' : 'equipped' };
        onChange(items.map(i => i.id === item.id ? next : i));
    };

    const equipped  = items.filter(i => i.location === 'equipped');
    const inventory = items.filter(i => i.location !== 'equipped');

    return (
        <div className="flex flex-col gap-4">
            {equipped.length > 0 && (
                <section>
                    <SectionTitle>Équipé</SectionTitle>
                    {equipped.map(item => (
                        <ItemRow key={item.id} item={item} onEdit={setEditingItem} onRemove={remove} onToggleEquip={toggleEquip} readOnly={readOnly} />
                    ))}
                </section>
            )}

            {inventory.length > 0 && (
                <section>
                    <SectionTitle muted>Inventaire</SectionTitle>
                    {inventory.map(item => (
                        <ItemRow key={item.id} item={item} onEdit={setEditingItem} onRemove={remove} onToggleEquip={toggleEquip} readOnly={readOnly} />
                    ))}
                </section>
            )}

            {items.length === 0 && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: 24 }}>
                    Inventaire vide.
                </p>
            )}

            {!readOnly && (
                <button
                    onClick={() => setEditingItem({ ...EMPTY_ITEM })}
                    className="px-3 py-2 rounded text-sm"
                    style={{ background: 'var(--color-surface)', border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)' }}
                >
                    + Ajouter un objet
                </button>
            )}

            {editingItem && (
                <ItemForm
                    item={editingItem}
                    onSave={save}
                    onCancel={() => setEditingItem(null)}
                />
            )}
        </div>
    );
};

export default InventoryTab;

// ── Helpers internes ──────────────────────────────────────────────────────────

const Field = ({ label, children }) => (
    <label className="flex flex-col gap-1">
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{label}</span>
        {children}
    </label>
);

const SectionTitle = ({ children, muted }) => (
    <h4 style={{
        fontSize: '0.78rem', fontWeight: 700,
        color: muted ? 'var(--color-text-muted)' : 'var(--color-accent)',
        textTransform: 'uppercase', marginBottom: 8,
    }}>
        {children}
    </h4>
);

const inputSt = {
    background: 'var(--color-surface-alt)',
    border:     '1px solid var(--color-border)',
    color:      'var(--color-text)',
};