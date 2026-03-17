// src/client/src/systems/tecumah/components/HealthDisplay.jsx
// Composant unique de gestion/affichage du niveau de blessure.
//
// mode="track" (défaut) — fiche joueur : 6 boutons cliquables
// mode="badge"          — liste combat  : label compact coloré
//
// Les couleurs viennent exclusivement des variables CSS --color-health-N
// définies dans theme.css. Aucune couleur en dur ici.

import React from 'react';
import { BLESSURE_LABELS } from '../config.jsx';

// Noms de variable CSS pour chaque niveau — définis dans theme.css
const healthVar = (niveau) => `var(--color-health-${Math.min(5, Math.max(0, niveau))})`;

// ── Mode track — boutons cliquables ──────────────────────────────────────────

const HealthTrack = ({ niveau = 0, onChange }) => (
    <div className="flex flex-wrap gap-1">
        {BLESSURE_LABELS.map((label, i) => {
            const active = i === niveau;
            return (
                <button
                    key={i}
                    onClick={() => onChange(i)}
                    className={`
                        px-2 py-1 rounded text-xs transition-colors border-[1.5px]  
                        ${active
                            ? `bg-health-${i} text-white border-health-${i} font-bold`
                            : `bg-surface text-muted border-border font-normal`
                        }                      
                    `}
                >
                    {label}
                </button>
            );
        })}
    </div>
);

// ── Mode badge — label compact (liste combat) ─────────────────────────────────

const HealthBadge = ({ niveau = 0 }) => (
    <span className={`text-health-${niveau}`} style={{ fontWeight: 600, fontSize: '0.85rem' }}>
        {BLESSURE_LABELS[niveau] ?? '?'}
    </span>
);

// ── Export principal ──────────────────────────────────────────────────────────

/**
 * @param {{
 *   niveau:   number,          // 0–5
 *   mode?:    'track'|'badge', // défaut : 'track'
 *   onChange?: (n: number) => void  // requis en mode track
 *   combatant?: object         // accepté en mode badge pour compatibilité combat
 * }} props
 */
const HealthDisplay = ({ niveau, combatant, mode = 'track', onChange }) => {
    // Compatibilité avec l'appel depuis config.combat.renderHealthDisplay(combatant)
    const resolvedNiveau = niveau ?? combatant?.healthData?.blessure_niveau ?? 0;

    if (mode === 'badge') return <HealthBadge niveau={resolvedNiveau} />;
    return <HealthTrack niveau={resolvedNiveau} onChange={onChange} />;
};

export default HealthDisplay;