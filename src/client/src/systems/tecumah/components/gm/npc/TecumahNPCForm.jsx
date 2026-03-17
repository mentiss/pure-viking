// src/client/src/systems/tecumah/components/TecumahNPCForm.jsx
// Formulaire slug-spécifique pour la création/édition de templates NPC.
// Injecté dans NPCModal générique via combatConfig.renderNPCForm.

import React from 'react';

/**
 * @param {{ formData: object, onChange: (field: string, value: any) => void }} props
 */
const TecumahNPCForm = ({ formData, onChange }) => {
    const attaques = formData.attaques ?? [];

    const updateAttaque = (index, field, value) => {
        const updated = attaques.map((a, i) =>
            i === index ? { ...a, [field]: value } : a
        );
        onChange('attaques', updated);
    };

    const addAttaque = () => {
        onChange('attaques', [...attaques, { name: '', pool: 3, damage: 5 }]);
    };

    const removeAttaque = (index) => {
        onChange('attaques', attaques.filter((_, i) => i !== index));
    };

    const field = (label, key, type = 'number', min) => (
        <div className="flex flex-col gap-1">
            <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{label}</label>
            <input
                type={type}
                min={min}
                value={formData[key] ?? ''}
                onChange={e => onChange(key, type === 'number' ? Number(e.target.value) : e.target.value)}
                className="rounded px-2 py-1 text-sm"
                style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            />
        </div>
    );

    return (
        <div className="flex flex-col gap-4">
            {/* Défenses */}
            <div>
                <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--color-text)' }}>
                    Défenses
                </p>
                <div className="grid grid-cols-3 gap-3">
                    {field('Naturelle', 'defense_naturelle', 'number', 0)}
                    {field('Active',    'defense_active',    'number', 0)}
                    {field('Totale',    'defense_totale',    'number', 0)}
                </div>
            </div>

            {/* Résistance */}
            <div className="grid grid-cols-2 gap-3">
                {field('Résistance fixe (RF)', 'resistance_fixe', 'number', 0)}
                {field('Actions / tour',       'actionsMax',      'number', 1)}
            </div>

            {/* Attaques */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text)' }}>Attaques</p>
                    <button
                        onClick={addAttaque}
                        className="text-xs px-2 py-1 rounded"
                        style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                    >
                        + Ajouter
                    </button>
                </div>
                {attaques.length === 0 && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Aucune attaque définie.</p>
                )}
                {attaques.map((atk, i) => (
                    <div key={i} className="flex gap-2 items-center mb-2">
                        <input
                            type="text"
                            placeholder="Nom"
                            value={atk.name ?? ''}
                            onChange={e => updateAttaque(i, 'name', e.target.value)}
                            className="flex-1 rounded px-2 py-1 text-sm"
                            style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                        />
                        <input
                            type="number" min={1} placeholder="Pool"
                            value={atk.pool ?? 3}
                            onChange={e => updateAttaque(i, 'pool', Number(e.target.value))}
                            className="w-16 rounded px-2 py-1 text-sm text-center"
                            style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                        />
                        <input
                            type="number" min={0} placeholder="Dégâts"
                            value={atk.damage ?? 5}
                            onChange={e => updateAttaque(i, 'damage', Number(e.target.value))}
                            className="w-16 rounded px-2 py-1 text-sm text-center"
                            style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                        />
                        <button
                            onClick={() => removeAttaque(i)}
                            style={{ color: 'var(--color-danger)', fontSize: '1rem', lineHeight: 1 }}
                        >✕</button>
                    </div>
                ))}
                {attaques.length > 0 && (
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                        Pool = dés entiers (pas de Wild Die pour les PNJ) · Dégâts = valeur fixe
                    </p>
                )}
            </div>
        </div>
    );
};

export default TecumahNPCForm;