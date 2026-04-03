// src/client/src/systems/cyberpunk/components/TagManager.jsx
// Tag narratif + TagAdder avec suggestions contextuelles par entityType.

import React, {useCallback, useEffect, useState} from 'react';
import {TAG_SUGGESTIONS_BY_TYPE, TAG_VARIANT_CLASS} from "../../config.jsx";
import {useParams} from "react-router-dom";
import {useAuth} from "../../../../context/AuthContext.jsx";
import {useSocket} from "../../../../context/SocketContext.jsx";
import {useFetch} from "../../../../hooks/useFetch.js";
import {useSession} from "../../../../context/SessionContext.jsx";

// ── Suggestions par entité ────────────────────────────────────────────────────

// ── Tag ───────────────────────────────────────────────────────────────────────

/**
 * @param {{ id, tag_text, tag_variant }} tag
 * @param {function}  onRemove
 * @param {boolean}   editMode
 * @param {boolean}   alwaysRemovable  — affiche le ✕ sans condition de editMode
 */
export const Tag = ({ tag, onRemove, editMode, alwaysRemovable = false }) => {
    return (
        <span className={`cp-tag ${TAG_VARIANT_CLASS[tag.tag_variant] ?? 'cp-tag-neutral'}`}>
        {tag.tag_text}
            {(editMode || alwaysRemovable) && (
                <button
                    onClick={() => onRemove()}
                    className="ml-1 opacity-60 hover:opacity-100 text-xs leading-none"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                    ✕
                </button>
            )}
    </span>
    );
};

// ── TagAdder ──────────────────────────────────────────────────────────────────

/**
 * @param {function(text, variant)} onAdd
 * @param {'character'|'cyberware'|'relation'|'item'} entityType
 * @param {Array}   existingTags  — pour enrichir l'autocomplete
 * @param {boolean} compact
 */
export const TagAdder = ({ onAdd, compact = false, existingTags = [], entityType = 'character' }) => {
    const [text,         setText]         = useState('');
    const [variant,      setVariant]      = useState('neutral');
    const [showSuggest,  setShowSuggest]  = useState(false);

    const baseSuggestions = TAG_SUGGESTIONS_BY_TYPE[entityType] ?? TAG_SUGGESTIONS_BY_TYPE.character;

    // Autocomplete : union des tags de base + tags déjà utilisés sur le perso
    const allSuggestions = React.useMemo(() => {
        const fromExisting = existingTags.map(t => ({ text: t.tag_text, variant: t.tag_variant ?? 'neutral' }));
        const merged = [...baseSuggestions];
        for (const t of fromExisting) {
            if (!merged.some(s => s.text === t.text)) merged.push(t);
        }
        return merged;
    }, [existingTags]);

    const filtered = text.trim()
        ? allSuggestions.filter(s => s.text.toLowerCase().includes(text.toLowerCase()))
        : allSuggestions;

    const handleAdd = (overrideText, overrideVariant) => {
        const t = overrideText ?? text.trim();
        const v = overrideVariant ?? variant;
        if (!t) return;
        onAdd(t, v);
        setText('');
        setShowSuggest(false);
    };

    const variantColors = {
        positive: 'var(--cp-tag-positive-text)',
        negative: 'var(--cp-tag-negative-text)',
        neutral:  'var(--cp-tag-neutral-text)',
    };

    return (
        <div className="flex flex-col gap-1.5 relative">
            <div className="flex items-center gap-1.5">
                {/* Sélecteur variant */}
                <div className="flex gap-1 shrink-0">
                    {Object.entries({ positive: '✦', negative: '✕', neutral: '◈' }).map(([v, icon]) => (
                        <button
                            key={v}
                            onClick={() => setVariant(v)}
                            className="w-5 h-5 rounded text-xs flex items-center justify-center"
                            style={{
                                background: variant === v ? variantColors[v] : 'var(--color-surface)',
                                color:      variant === v ? 'var(--color-bg)' : variantColors[v],
                                border:     `1px solid ${variantColors[v]}`,
                                cursor:     'pointer',
                            }}
                        >
                            {icon}
                        </button>
                    ))}
                </div>
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={text}
                        onChange={e => { setText(e.target.value); setShowSuggest(true); }}
                        onFocus={() => setShowSuggest(true)}
                        onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                        placeholder={compact ? 'Tag…' : 'Ajouter un tag…'}
                        className="w-full rounded px-2 py-0.5 text-xs outline-none"
                        style={{
                            background: 'var(--color-surface)',
                            border:     '1px solid var(--color-border)',
                            color:      'var(--color-text)',
                        }}
                    />
                    {/* Dropdown suggestions */}
                    {showSuggest && filtered.length > 0 && (
                        <div
                            className="absolute left-0 right-0 top-full mt-1 rounded-lg overflow-hidden z-20 shadow-xl"
                            style={{
                                background: 'var(--color-surface)',
                                border:     '1px solid var(--color-border)',
                                maxHeight:  '140px',
                                overflowY:  'auto',
                            }}
                        >
                            {filtered.map((s, i) => (
                                <button
                                    key={i}
                                    onMouseDown={() => handleAdd(s.text, s.variant)}
                                    className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-surface-alt transition-colors"
                                    style={{ color: 'var(--color-text)', cursor: 'pointer', border: 'none', background: 'none' }}
                                >
                                    <span
                                        className="w-2 h-2 rounded-full flex-shrink-0"
                                        style={{
                                            background: s.variant === 'positive'
                                                ? 'var(--cp-tag-positive-text)'
                                                : s.variant === 'negative'
                                                    ? 'var(--cp-tag-negative-text)'
                                                    : 'var(--cp-tag-neutral-text)',
                                        }}
                                    />
                                    {s.text}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <button
                    onMouseDown={() => handleAdd()}
                    className="text-xs px-2 py-0.5 rounded flex-shrink-0"
                    style={{ background: 'var(--color-primary)', color: 'var(--color-bg)', cursor: 'pointer' }}
                >
                    +
                </button>
            </div>
        </div>
    );
};
