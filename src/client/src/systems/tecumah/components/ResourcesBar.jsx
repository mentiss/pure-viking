// src/client/src/systems/tecumah/components/ResourcesBar.jsx
// Affichage des Points de Destin (PD) et Points de Personnage (PP).
// canEdit=true → boutons +/− (mode édition fiche).
// canEdit=false → lecture seule.

import React from 'react';

const ResourcesBar = ({ pointsDestin, pointsPersonnage, canEdit = false, onUpdatePD, onUpdatePP }) => (
    <div className="flex gap-4 items-center flex-wrap">
        <Resource
            label="PD"
            description="Points de Destinée"
            icon="✵"
            value={pointsDestin}
            canEdit={canEdit}
            onUpdate={onUpdatePD}
            accentVar="--color-accent"
        />
        <Resource
            label="PP"
            description="Points de Personnage"
            icon="▲"
            value={pointsPersonnage}
            canEdit={canEdit}
            onUpdate={onUpdatePP}
            accentVar="--color-secondary"
        />
    </div>
);

const Resource = ({ label, description, icon, value, canEdit, onUpdate, accentVar }) => (
    <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: `var(${accentVar})` }}>
            {icon} {label}
            <p style={{ fontWeight: 700, fontSize: '0.45rem', color: `var(--color-text-muted)` }}>
                {description}
            </p>
        </span>
        {canEdit ? (
            <div className="flex items-center gap-1">
                <Btn onClick={() => onUpdate(-1)}>−</Btn>
                <span style={{ fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{value}</span>
                <Btn onClick={() => onUpdate(+1)}>+</Btn>
            </div>
        ) : (
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{value}</span>
        )}
    </div>
);

const Btn = ({ onClick, children }) => (
    <button
        onClick={onClick}
        className="w-6 h-6 rounded flex items-center justify-center text-sm"
        style={{
            background: 'var(--color-surface-alt)',
            border:     '1px solid var(--color-border)',
            color:      'var(--color-text)',
        }}
    >
        {children}
    </button>
);

export default ResourcesBar;