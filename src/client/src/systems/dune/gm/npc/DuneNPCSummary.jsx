// src/client/src/systems/dune/components/npc/DuneNPCSummary.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Résumé compact d'un PNJ Dune pour la carte bibliothèque.
// Affiche les rangs des 5 compétences sur une ligne.
//
// Props :
//   npc {object} — template NPC complet
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';

const PRIN_LABELS = {
    devoir:     'Dev',
    domination: 'Dom',
    foi:        'Foi',
    justice:    'Jus',
    verite:     'Vér',
};

const COMP_LABELS = {
    analyse:    'Ana',
    combat:     'Com',
    discipline: 'Dis',
    mobilite:   'Mob',
    rhetorique: 'Rhé',
};

const DuneNPCSummary = ({ npc }) => {
    const competences = npc.system_data?.competences ?? [];
    const principes = npc.system_data?.principes ?? [];

    if (competences.length === 0 && principes.length === 0) return <span className="text-muted">Aucune compétence ou principe</span>;

    return (
        <span className="flex gap-2 flex-wrap">
            {principes.map(c => (
                <span key={c.key}>
                    <span className="text-muted" title={c.maxime ?? c.maxime}>{PRIN_LABELS[c.key] ?? c.key}</span>
                    {' '}
                    <span className="font-semibold text-accent" title={c.maxime ?? c.maxime}>{c.rang}</span>
                </span>
            ))}
            <span className="text-muted">|</span>
            {competences.map(c => (
                <span key={c.key}>
                    <span className="text-muted" title={c.specialisation ?? c.specialisation}>{COMP_LABELS[c.key] ?? c.key}</span>
                    {' '}
                    <span className="font-semibold text-accent" title={c.specialisation ?? c.specialisation}>{c.rang}</span>
                    {c.specialisation && <span className="text-muted"> ★</span>}
                </span>
            ))}
        </span>
    );
};

export default DuneNPCSummary;