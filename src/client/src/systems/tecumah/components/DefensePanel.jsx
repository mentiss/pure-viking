// src/client/src/systems/tecumah/components/DefensePanel.jsx
// Affichage en lecture seule des valeurs de défense et de résistance.
// Toutes les valeurs sont calculées à la volée depuis les pips — jamais stockées.

import React from 'react';
import {
    getDefenseNaturelle,
    getDefenseTotale,
    getResistanceFixe,
    getDegatsNaturels,
    pipsToNotation,
} from '../config.jsx';

const DefensePanel = ({ character }) => {
    const {
        agilite      = 6, vigueur    = 6,
        comp_esquive = 0, comp_puissance = 0,
    } = character;

    const esquivePips    = agilite + comp_esquive;
    const defNaturelle   = getDefenseNaturelle(esquivePips);
    // Défense active = valeur en pips de l'esquive (affichée en notation XD)
    const defActive      = pipsToNotation(esquivePips);
    const defTotale      = getDefenseTotale(esquivePips);
    const resistance     = getResistanceFixe(vigueur);
    const degatsNaturels = getDegatsNaturels(vigueur, comp_puissance);

    return (
        <div className="flex flex-wrap gap-2">
            <Stat label="Déf. Naturelle"   value={defNaturelle}       title="ND de base (sans action de défense)" />
            <Stat label="Déf. Active"      value={defActive}          title="ND si Défense Active — coûte 1 action" />
            <Stat label="Déf. Totale"      value={defTotale}          title="ND si Défense Totale — épuise le tour" />
            <Stat label="Résistance fixe"  value={resistance}         title="Seuil de blessure = Vigueur en pips" />
            <Stat label="Dég. naturels"    value={`+${degatsNaturels}`} title="Bonus dégâts CàC = ceil(dés Vigueur+Puissance / 2)" />
        </div>
    );
};

const Stat = ({ label, value, title }) => (
    <div
        className="flex flex-col items-center px-3 py-2 rounded-lg"
        style={{
            background: 'var(--color-surface)',
            border:     '1px solid var(--color-border)',
            minWidth:   80,
        }}
        title={title}
    >
        <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: 2 }}>
            {label}
        </span>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)' }}>
            {value}
        </span>
    </div>
);

export default DefensePanel;