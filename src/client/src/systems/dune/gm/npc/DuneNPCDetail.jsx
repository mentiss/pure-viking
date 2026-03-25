// src/client/src/systems/dune/components/npc/DuneNPCDetail.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Fiche détail d'un PNJ Dune : compétences + principes.
// Miroir de la structure personnage joueur.
//
// Props :
//   npc         {object}         — template NPC complet
//   GMDiceModal {Component|null} — transmis par TabNPC (usage futur)
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';

const COMPETENCE_LABELS = {
    analyse:    'Analyse',
    combat:     'Combat',
    discipline: 'Discipline',
    mobilite:   'Mobilité',
    rhetorique: 'Rhétorique',
};

const PRINCIPE_LABELS = {
    devoir:     'Devoir',
    domination: 'Domination',
    foi:        'Foi',
    justice:    'Justice',
    verite:     'Vérité',
};

const DuneNPCDetail = ({ npc }) => {
    const competences = npc.system_data?.competences ?? [];
    const principes   = npc.system_data?.principes   ?? [];

    return (
        <div className="flex flex-col gap-4">

            {/* ── Compétences ───────────────────────────────────────────── */}
            <div>
                <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wide">
                    Compétences
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {competences.map(c => (
                        <div
                            key={c.key}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-alt"
                        >
                            <span className="flex-1 text-sm text-base">
                                {COMPETENCE_LABELS[c.key] ?? c.key}
                                {c.specialisation && (
                                    <p className="text-xs text-muted italic">
                                        {c.specialisation}
                                    </p>
                                )}
                            </span>

                            <span className="text-lg font-bold text-accent">
                                {c.specialisation && (<span>★</span>)} {c.rang}
                            </span>

                        </div>
                    ))}
                </div>
            </div>

            {/* ── Principes ─────────────────────────────────────────────── */}
            <div>
                <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wide">
                    Principes
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {principes.map(p => (
                        <div
                            key={p.key}
                            className="flex items-start gap-3 px-3 py-2 rounded-lg bg-surface-alt"
                        >
                            <span className="flex-1 text-sm text-base">
                                {PRINCIPE_LABELS[p.key] ?? p.key}
                                {p.maxime && (
                                    <p className="text-xs text-muted italic">
                                        "{p.maxime}"
                                    </p>
                                )}
                            </span>
                            <span className="text-lg font-bold text-accent shrink-0">{p.rang}</span>

                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DuneNPCDetail;