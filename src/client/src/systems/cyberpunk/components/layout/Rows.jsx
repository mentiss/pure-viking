// Ligne directive
import {Tag, TagAdder} from "./TagManager.jsx";
import {CYBERWARE_ALL, ITEM_AND_CYBERWARE_CATEGORY_LABEL, ITEMS_ALL} from "../../config.jsx";
import {useState} from "react";

export const DirectiveRow = ({ directive, editMode, onChange }) => (
    <div
        className="flex items-start gap-2 rounded-lg px-3 py-2"
        style={{
            background: directive.completed ? 'rgba(32,192,96,0.08)' : 'var(--color-surface-alt)',
            border:     `1px solid ${directive.completed ? 'var(--color-success)' : 'var(--color-border)'}`,
        }}
    >
        <input
            type="checkbox"
            checked={!!directive.completed}
            onChange={e => onChange({ completed: e.target.checked })}
            className="mt-0.5 flex-shrink-0"
            style={{ accentColor: 'var(--color-success)' }}
        />
        {editMode ? (
            <input
                type="text"
                value={directive.text ?? ''}
                onChange={e => onChange({ text: e.target.value })}
                placeholder="Directive…"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--color-text)' }}
            />
        ) : (
            <span
                className="text-sm flex-1"
                style={{
                    color:          directive.completed ? 'var(--color-success)' : 'var(--color-text)',
                    textDecoration: directive.completed ? 'line-through' : 'none',
                }}
            >
                {directive.text || '—'}
                {directive.blankValue && (
                    <span className="ml-1 font-semibold" style={{ color: 'var(--color-primary)' }}>
                        {directive.blankValue}
                    </span>
                )}
            </span>
        )}
    </div>
);

// Ligne relation avec score de lien et tags
export const RelationRow = ({ relation, editMode, onChange, onRemove, onRemoveTag, onAddTag, toggleTagAdder = true, }) => {
    const score = relation.link_score ?? 1;
    const scoreColor = score > 0
        ? 'var(--color-success)'
        : score < 0 ? 'var(--color-danger)' : 'var(--color-text-muted)';

    return (
        <div
            className="rounded-lg p-3 flex flex-col gap-2"
            style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }}
        >
            <div className="flex items-center gap-2">
                {/* Score de lien */}
                <div
                    className="font-mono font-bold text-sm w-8 text-center shrink-0"
                    style={{ color: scoreColor }}
                >
                    {score > 0 ? `+${score}` : score}
                </div>

                {editMode ? (
                    <>
                        <input
                            type="text"
                            value={relation.name ?? ''}
                            onChange={e => onChange({ name: e.target.value })}
                            placeholder="Nom de la relation…"
                            className="flex-1 bg-transparent text-sm font-semibold outline-none"
                            style={{ color: 'var(--color-text)' }}
                        />
                        <input
                            type="number"
                            min="-3" max="3"
                            value={score}
                            onChange={e => onChange({ link_score: parseInt(e.target.value) || 0 })}
                            className="w-12 text-center rounded px-1 py-0.5 text-xs font-mono"
                            style={{
                                background: 'var(--color-surface)',
                                border:     '1px solid var(--color-border)',
                                color:      scoreColor,
                            }}
                        />
                        {/* ← Bouton supprimer ajouté */}
                        <button
                            onClick={onRemove}
                            title="Supprimer cette relation"
                            className="w-6 h-6 rounded flex items-center justify-center text-xs flex-shrink-0"
                            style={{ color: 'var(--color-danger)', background: 'var(--color-surface)', border: '1px solid var(--color-danger)', cursor: 'pointer' }}
                        >
                            ✕
                        </button>
                    </>
                ) : (
                    <span className="font-semibold text-sm flex-1" style={{ color: 'var(--color-text)' }}>
                        {relation.name || 'Relation'}
                    </span>
                )}
            </div>

            {(editMode || relation.description) && (
                editMode ? (
                    <input
                        type="text"
                        value={relation.description ?? ''}
                        onChange={e => onChange({ description: e.target.value })}
                        placeholder="Description courte…"
                        className="bg-transparent text-xs outline-none w-full"
                        style={{ color: 'var(--color-text-muted)' }}
                    />
                ) : (
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {relation.description}
                    </p>
                )
            )}

            {(relation.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {(relation.tags ?? []).map((tag, i) => (
                        <Tag key={i} tag={tag} editMode={editMode} onRemove={() => onRemoveTag(i)} alwaysRemovable={true} />
                    ))}
                </div>
            )}
            {(editMode || toggleTagAdder) && <TagAdder onAdd={onAddTag} compact existingTags={relation.tags ?? []} entityType="relation" />}
        </div>
    );
};

// Ligne cyberware avec tags
export const CyberwareRow = ({ item, editMode, onChange, onRemove, onRemoveTag, onAddTag, tagsEditable= false, removable= false, toggleTagAdder = false, }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const nameValue = item.name ?? '';

    // Suggestions filtrées en temps réel
    const suggestions = dropdownOpen && nameValue.length > 0
        ? CYBERWARE_ALL.filter(cw =>
            cw.name.toLowerCase().includes(nameValue.toLowerCase())
        )
        : [];

    // Placeholder dynamique du champ option_text selon le cyberware reconnu
    const matchedCw      = CYBERWARE_ALL.find(cw => cw.name === nameValue);
    const optionPlaceholder = matchedCw?.optionHint ?? 'Option choisie…';

    const handleSelect = (cw) => {
        onChange({
            name: cw.name,
            tags: cw.tags.map(t => ({ tag_text: t.text, tag_variant: t.variant })),
        });
        setDropdownOpen(false);
    };

    return (
        <div
            className="rounded-lg p-3 flex flex-col gap-2"
            style={{
                background: 'var(--color-surface-alt)',
                border:     '1px solid var(--color-border)',
            }}
        >
            <div className="flex items-start gap-2">
                <span className="text-base shrink-0" style={{ color: 'var(--color-primary)' }}>⬡</span>

                <div className="flex-1 min-w-0">
                    {editMode ? (
                        <div style={{ position: 'relative' }}>
                            {/* Backdrop — ferme le dropdown au clic extérieur */}
                            {dropdownOpen && suggestions.length > 0 && (
                                <div
                                    style={{ position: 'fixed', inset: 0, zIndex: 9 }}
                                    onClick={() => setDropdownOpen(false)}
                                />
                            )}

                            <input
                                type="text"
                                value={nameValue}
                                onChange={e => {
                                    onChange({ name: e.target.value });
                                    setDropdownOpen(true);
                                }}
                                onFocus={() => setDropdownOpen(true)}
                                onKeyDown={e => e.key === 'Escape' && setDropdownOpen(false)}
                                placeholder="Nom de l'implant…"
                                className="bg-transparent text-sm font-semibold outline-none w-full"
                                style={{ color: 'var(--color-text)' }}
                            />

                            {/* Dropdown suggestions */}
                            {dropdownOpen && suggestions.length > 0 && (
                                <div
                                    style={{
                                        position:    'absolute',
                                        top:         'calc(100% + 4px)',
                                        left:        0,
                                        right:       0,
                                        zIndex:      10,
                                        background:  'var(--color-surface)',
                                        border:      '1px solid var(--color-border)',
                                        borderRadius:'8px',
                                        overflow:    'hidden',
                                        boxShadow:   '0 4px 20px rgba(0,0,0,0.5)',
                                        maxHeight:   '220px',
                                        overflowY:   'auto',
                                    }}
                                >
                                    {suggestions.map(cw => (
                                        <button
                                            key={cw.name}
                                            onMouseDown={e => e.preventDefault()} // évite blur avant click
                                            onClick={() => handleSelect(cw)}
                                            className="w-full text-left px-3 py-2 flex flex-col gap-0.5 transition-colors"
                                            style={{
                                                background:   'transparent',
                                                border:       'none',
                                                borderBottom: '1px solid var(--color-border)',
                                                cursor:       'pointer',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-alt)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                                                {cw.name}
                                            </span>
                                            {cw.optionHint && (
                                                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                                    {cw.optionHint}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{item.name}</span>
                    )}

                    {/* Champ option_text */}
                    {(editMode || item.option_text) && (
                        editMode ? (
                            <input
                                type="text"
                                value={item.option_text ?? ''}
                                onChange={e => onChange({ option_text: e.target.value })}
                                placeholder={optionPlaceholder}
                                className="bg-transparent text-xs outline-none w-full mt-0.5"
                                style={{ color: 'var(--color-text-muted)' }}
                            />
                        ) : (
                            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.option_text}</p>
                        )
                    )}
                </div>

                {(editMode || removable) && (
                    <button onClick={onRemove} className="text-xs shrink-0" style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        ✕
                    </button>
                )}
            </div>

            {/* Tags */}
            {(item.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {(item.tags ?? []).map((tag, i) => (
                        <Tag key={i} tag={tag} editMode={editMode || tagsEditable} onRemove={() => onRemoveTag(i)} />
                    ))}
                </div>
            )}

            {(editMode || toggleTagAdder) && <TagAdder onAdd={onAddTag} compact entityType="cyberware" />}
        </div>
    );
};

export const ItemRow = ({ item, editMode, onChange, onRemove, onRemoveTag, onAddTag, tagsEditable= false, removable= false, toggleTagAdder = false,}) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const nameValue = item.name ?? '';

    // Suggestions filtrées + groupées par catégorie
    const filtered = dropdownOpen && nameValue.length > 0
        ? ITEMS_ALL.filter(it => it.name.toLowerCase().includes(nameValue.toLowerCase()))
        : [];

    const grouped = filtered.reduce((acc, it) => {
        (acc[it.category] ??= []).push(it);
        return acc;
    }, {});

    const handleSelect = (it) => {
        onChange({
            name: it.name,
            tags: it.tags.map(t => ({ tag_text: t.text, tag_variant: t.variant })),
        });
        setDropdownOpen(false);
    };

    const handleQuantity = (delta) => {
        const current = item.quantity ?? 1;
        const next    = current + delta;
        if (next < 1) { onRemove(); return; }
        onChange({ quantity: next });
    };

    return (
        <div
            className="rounded-lg p-3 flex flex-col gap-2"
            style={{
                background: 'var(--color-surface-alt)',
                border:     '1px solid var(--color-border)',
            }}
        >
            <div className="flex items-center gap-2">

                {/* Nom — autocomplete en edit, texte en lecture */}
                {editMode ? (
                    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                        {dropdownOpen && Object.keys(grouped).length > 0 && (
                            <div
                                style={{ position: 'fixed', inset: 0, zIndex: 9 }}
                                onClick={() => setDropdownOpen(false)}
                            />
                        )}
                        <input
                            type="text"
                            value={nameValue}
                            onChange={e => { onChange({ name: e.target.value }); setDropdownOpen(true); }}
                            onFocus={() => setDropdownOpen(true)}
                            onKeyDown={e => e.key === 'Escape' && setDropdownOpen(false)}
                            placeholder="Objet…"
                            className="bg-transparent text-sm font-semibold outline-none w-full"
                            style={{ color: 'var(--color-text)' }}
                        />
                        {dropdownOpen && Object.keys(grouped).length > 0 && (
                            <div
                                style={{
                                    position:     'absolute',
                                    top:          'calc(100% + 4px)',
                                    left:         0,
                                    right:        0,
                                    zIndex:       10,
                                    background:   'var(--color-surface)',
                                    border:       '1px solid var(--color-border)',
                                    borderRadius: '8px',
                                    overflow:     'hidden',
                                    boxShadow:    '0 4px 20px rgba(0,0,0,0.5)',
                                    maxHeight:    '280px',
                                    overflowY:    'auto',
                                }}
                            >
                                {Object.entries(grouped).map(([cat, items]) => (
                                    <div key={cat}>
                                        {/* En-tête de catégorie */}
                                        <div
                                            className="px-3 py-1 text-[10px] cp-font-ui uppercase tracking-widest"
                                            style={{
                                                color:      'var(--color-text-muted)',
                                                background: 'var(--color-surface-alt)',
                                                borderBottom: '1px solid var(--color-border)',
                                            }}
                                        >
                                            {ITEM_AND_CYBERWARE_CATEGORY_LABEL[cat] ?? cat}
                                        </div>
                                        {items.map(it => (
                                            <button
                                                key={it.name}
                                                onMouseDown={e => e.preventDefault()}
                                                onClick={() => handleSelect(it)}
                                                className="w-full text-left px-3 py-2 flex flex-col gap-0.5 transition-colors"
                                                style={{
                                                    background:   'transparent',
                                                    border:       'none',
                                                    borderBottom: '1px solid var(--color-border)',
                                                    cursor:       'pointer',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-alt)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                                                    {it.name}
                                                </span>
                                                {it.tags.length > 0 && (
                                                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                                        {it.tags.map(t => t.text).join(' ')}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <span className="flex-1 text-sm" style={{ color: 'var(--color-text)' }}>{item.name}</span>
                )}

                {/* Contrôles quantité — toujours visibles */}
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={() => handleQuantity(-1)}
                        className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center"
                        style={{
                            background: 'var(--color-surface)',
                            border:     '1px solid var(--color-border)',
                            color:      'var(--color-text-muted)',
                            cursor:     'pointer',
                        }}
                    >
                        −
                    </button>
                    <span
                        className="font-mono text-xs w-5 text-center"
                        style={{ color: 'var(--color-text)' }}
                    >
                        {item.quantity ?? 1}
                    </span>
                    <button
                        onClick={() => handleQuantity(+1)}
                        className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center"
                        style={{
                            background: 'var(--color-surface)',
                            border:     '1px solid var(--color-border)',
                            color:      'var(--color-text-muted)',
                            cursor:     'pointer',
                        }}
                    >
                        +
                    </button>
                </div>

                {/* Suppression — edit mode seulement */}
                {(editMode || removable) && (
                    <button
                        onClick={onRemove}
                        className="text-xs flex-shrink-0"
                        style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Tags */}
            {(item.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {(item.tags ?? []).map((tag, i) => (
                        <Tag key={i} tag={tag} editMode={editMode || tagsEditable} onRemove={() => onRemoveTag(i)} />
                    ))}
                </div>
            )}

            {(editMode || toggleTagAdder) && <TagAdder onAdd={onAddTag} compact entityType="item" />}
        </div>
    );
};

export const QuickAddItem = ({ onAdd }) => {
    const [query,        setQuery]        = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const filtered = dropdownOpen && query.length > 0
        ? ITEMS_ALL.filter(it => it.name.toLowerCase().includes(query.toLowerCase()))
        : [];

    const grouped = filtered.reduce((acc, it) => {
        (acc[it.category] ??= []).push(it);
        return acc;
    }, {});

    const handleSelect = (it) => {
        onAdd({
            name:        it.name,
            quantity:    1,
            description: '',
            tags:        it.tags.map(t => ({ tag_text: t.text, tag_variant: t.variant })),
        });
        setQuery('');
        setDropdownOpen(false);
    };

    const handleCustom = () => {
        const trimmed = query.trim();
        if (!trimmed) return;
        onAdd({ name: trimmed, quantity: 1, description: '', tags: [] });
        setQuery('');
        setDropdownOpen(false);
    };

    return (
        <div style={{ position: 'relative' }}>
            {dropdownOpen && (
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 9 }}
                    onClick={() => setDropdownOpen(false)}
                />
            )}
            <div
                className="flex gap-2 items-center rounded-lg px-3 py-2"
                style={{
                    background: 'var(--color-surface-alt)',
                    border:     '1px dashed var(--color-border)',
                }}
            >
                <span style={{ color: 'var(--color-primary)', flexShrink: 0 }}>+</span>
                <input
                    type="text"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setDropdownOpen(true); }}
                    onFocus={() => setDropdownOpen(true)}
                    onKeyDown={e => {
                        if (e.key === 'Escape') { setDropdownOpen(false); setQuery(''); }
                        if (e.key === 'Enter')  handleCustom();
                    }}
                    placeholder="Rechercher ou saisir un objet…"
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: 'var(--color-text)' }}
                />
                {query.trim() && (
                    <button
                        onMouseDown={e => e.preventDefault()}
                        onClick={handleCustom}
                        className="text-xs px-2 py-0.5 rounded flex-shrink-0"
                        style={{
                            background: 'var(--color-primary)',
                            color:      'var(--color-bg)',
                            border:     'none',
                            cursor:     'pointer',
                        }}
                    >
                        Ajouter
                    </button>
                )}
            </div>

            {dropdownOpen && Object.keys(grouped).length > 0 && (
                <div
                    style={{
                        position:     'absolute',
                        bottom:       'calc(100% + 4px)',
                        left:         0,
                        right:        0,
                        zIndex:       10,
                        background:   'var(--color-surface)',
                        border:       '1px solid var(--color-border)',
                        borderRadius: '8px',
                        overflow:     'hidden',
                        boxShadow:    '0 -4px 20px rgba(0,0,0,0.5)',
                        maxHeight:    '280px',
                        overflowY:    'auto',
                    }}
                >
                    {Object.entries(grouped).map(([cat, items]) => (
                        <div key={cat}>
                            <div
                                className="px-3 py-1 text-[10px] cp-font-ui uppercase tracking-widest"
                                style={{
                                    color:        'var(--color-text-muted)',
                                    background:   'var(--color-surface-alt)',
                                    borderBottom: '1px solid var(--color-border)',
                                }}
                            >
                                {ITEM_AND_CYBERWARE_CATEGORY_LABEL[cat] ?? cat}
                            </div>
                            {items.map(it => (
                                <button
                                    key={it.name}
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => handleSelect(it)}
                                    className="w-full text-left px-3 py-2 flex flex-col gap-0.5"
                                    style={{
                                        background:   'transparent',
                                        border:       'none',
                                        borderBottom: '1px solid var(--color-border)',
                                        cursor:       'pointer',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-alt)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                                        {it.name}
                                    </span>
                                    {it.tags.length > 0 && (
                                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                            {it.tags.map(t => t.text).join(' ')}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

