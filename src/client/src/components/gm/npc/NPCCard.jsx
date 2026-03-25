// src/client/src/components/gm/npc/NPCCard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Carte compacte d'un template NPC dans la bibliothèque.
//
// Props :
//   npc              {object}   — template NPC complet
//   renderNPCSummary {function} — (npc) => ReactNode  (optionnel)
//   onView           {function}
//   onEdit           {function}
//   onDelete         {function}
//   onAddToSet       {function} — (npc) => void  (optionnel)
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';

const NPCCard = ({ npc, renderNPCSummary, onView, onEdit, onDelete, onAddToSet }) => (
    <div className="bg-surface border border-base rounded-lg flex flex-col gap-2 p-3 transition-colors">

        {/* ── Nom ───────────────────────────────────────────────────────── */}
        <h3 className="font-bold text-sm leading-tight text-base truncate" title={npc.name}>
            {npc.name}
        </h3>

        {/* ── Description courte ────────────────────────────────────────── */}
        {npc.description && (
            <p className="text-xs line-clamp-2 text-muted">
                {npc.description}
            </p>
        )}

        {/* ── Résumé délégué au slug ────────────────────────────────────── */}
        {renderNPCSummary && (
            <div className="text-xs text-muted">
                {renderNPCSummary(npc)}
            </div>
        )}

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="flex gap-1 mt-auto pt-1 border-t border-base">
            <button
                onClick={onView}
                className="flex-1 px-2 py-1 bg-surface-alt text-base rounded text-xs font-semibold hover:bg-accent transition-colors"
                title="Voir le détail"
            >
                👁 Détail
            </button>
            <button
                onClick={onEdit}
                className="flex-1 px-2 py-1 bg-surface-alt text-base rounded text-xs font-semibold hover:bg-surface transition-colors"
                title="Modifier ce template"
            >
                ✏️ Éditer
            </button>
            {onAddToSet && (
                <button
                    onClick={() => onAddToSet(npc)}
                    className="px-2 py-1 bg-surface-alt text-accent rounded text-xs font-semibold hover:bg-surface transition-colors"
                    title="Ajouter à un set"
                >
                    ➕
                </button>
            )}
            <button
                onClick={onDelete}
                className="px-2 py-1 bg-surface-alt text-danger rounded text-xs font-semibold hover:bg-surface transition-colors"
                title="Supprimer ce template"
            >
                🗑
            </button>
        </div>
    </div>
);

export default NPCCard;