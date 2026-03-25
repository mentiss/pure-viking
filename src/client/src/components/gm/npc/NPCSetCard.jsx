// src/client/src/components/gm/npc/NPCSetCard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Carte compacte d'un set NPC dans la vue "sets".
//
// Props :
//   set        {object}   — set NPC (avec entry_count)
//   onView     {function}
//   onEdit     {function}
//   onCopy     {function}
//   onDelete   {function}
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';

const NPCSetCard = ({ set, onView, onEdit, onCopy, onDelete }) => {
    const isLinked = set.session_id != null;

    return (
        <div className={`bg-surface rounded-lg border flex flex-col gap-2 p-3 transition-colors ${isLinked ? 'border-accent' : 'border-base'}`}>

            {/* ── En-tête ───────────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-sm leading-tight text-base truncate">
                    {set.name}
                </h3>
                <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 font-semibold ${isLinked ? 'bg-accent text-base' : 'bg-surface-alt text-muted'}`}>
                    {isLinked ? '📌 Session' : '📂 Libre'}
                </span>
            </div>

            {/* ── Description ───────────────────────────────────────────── */}
            {set.description && (
                <p className="text-xs line-clamp-2 text-muted">
                    {set.description}
                </p>
            )}

            {/* ── Métadonnées ───────────────────────────────────────────── */}
            <p className="text-xs text-muted">
                {set.entry_count ?? 0} template{(set.entry_count ?? 0) !== 1 ? 's' : ''}
            </p>

            {/* ── Actions ───────────────────────────────────────────────── */}
            <div className="flex gap-1 mt-auto pt-1 border-t border-base">
                <button
                    onClick={onView}
                    className="flex-1 px-2 py-1 bg-surface-alt text-base rounded text-xs font-semibold hover:bg-surface transition-colors"
                    title="Voir le contenu du set"
                >
                    👁 Voir
                </button>
                <button
                    onClick={onEdit}
                    className="flex-1 px-2 py-1 bg-surface-alt text-base rounded text-xs font-semibold hover:bg-surface transition-colors"
                    title="Modifier ce set"
                >
                    ✏️ Éditer
                </button>
                <button
                    onClick={onCopy}
                    className="px-2 py-1 bg-surface-alt text-muted rounded text-xs font-semibold hover:bg-surface transition-colors"
                    title="Copier ce set"
                >
                    📋
                </button>
                <button
                    onClick={onDelete}
                    className="px-2 py-1 bg-surface-alt text-danger rounded text-xs font-semibold hover:bg-surface transition-colors"
                    title="Supprimer ce set"
                >
                    🗑
                </button>
            </div>
        </div>
    );
};

export default NPCSetCard;