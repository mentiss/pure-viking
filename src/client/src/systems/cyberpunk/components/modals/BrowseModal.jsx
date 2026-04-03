import {useMemo, useState} from "react";
import {ITEM_AND_CYBERWARE_CATEGORY_LABEL, TAG_VARIANT_CLASS} from "../../config.jsx";

const BrowseModal = ({ title, items, groupKey, onAdd, onClose }) => {
    const [query,    setQuery]    = useState('');
    const [category, setCategory] = useState(null); // null = tous
    const [added,    setAdded]    = useState(new Set());

    // Catégories disponibles dans la liste fournie
    const categories = useMemo(() => {
        const seen = new Set();
        const result = [];
        for (const it of items) {
            const cat = it.category ?? it.type ?? null;
            if (cat && !seen.has(cat)) { seen.add(cat); result.push(cat); }
        }
        return result;
    }, [items]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return items.filter(it => {
            const matchCat  = !category || (it.category ?? it.type) === category;
            const matchText = !q
                || it.name.toLowerCase().includes(q)
                || (it.description ?? '').toLowerCase().includes(q);
            return matchCat && matchText;
        });
    }, [items, query, category]);

    const grouped = useMemo(() => {
        if (!groupKey) return null;
        return filtered.reduce((acc, it) => {
            (acc[it[groupKey]] ??= []).push(it);
            return acc;
        }, {});
    }, [filtered, groupKey]);

    const handleAdd = (item) => {
        onAdd(item);
        setAdded(prev => new Set(prev).add(item.name));
        setTimeout(() => setAdded(prev => {
            const next = new Set(prev);
            next.delete(item.name);
            return next;
        }), 1500);
    };

    const renderItem = (item) => (
        <div
            key={item.name}
            className="flex items-start gap-3 px-4 py-3 transition-colors"
            style={{ borderBottom: '1px solid var(--color-border)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-alt)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
            <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                    {item.name}
                </span>
                {item.description && (
                    <span className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                        {item.description}
                    </span>
                )}
                {item.optionHint && (
                    <span className="text-xs italic" style={{ color: 'var(--color-accent)' }}>
                        {item.optionHint}
                    </span>
                )}
                {item.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                        {item.tags.map((t, i) => (
                            <span key={i} className={`cp-tag ${TAG_VARIANT_CLASS[t.variant] ?? 'cp-tag-neutral'}`}>
                                {t.text}
                            </span>
                        ))}
                    </div>
                )}
            </div>
            <button
                onClick={() => handleAdd(item)}
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-all"
                style={{
                    background: added.has(item.name) ? 'var(--color-success)' : 'var(--color-surface-alt)',
                    border:     `1px solid ${added.has(item.name) ? 'var(--color-success)' : 'var(--color-border)'}`,
                    color:      added.has(item.name) ? 'var(--color-bg)' : 'var(--color-primary)',
                    cursor:     'pointer',
                    transition: 'all 0.2s',
                }}
                title="Ajouter"
            >
                {added.has(item.name) ? '✓' : '+'}
            </button>
        </div>
    );

    return (
        <>
            <div
                className="fixed inset-0 z-40"
                style={{ background: 'rgba(0,0,0,0.7)' }}
                onClick={onClose}
            />
            <div
                className="fixed inset-x-4 top-16 bottom-8 z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl"
                style={{
                    background: 'var(--color-surface)',
                    border:     '1px solid var(--color-border)',
                    maxWidth:   '640px',
                    margin:     '0 auto',
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-5 py-4 shrink-0"
                    style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-alt)' }}
                >
                    <h2 className="text-sm font-bold cp-font-ui uppercase tracking-widest"
                        style={{ color: 'var(--color-primary)' }}>
                        ⊞ {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                    >
                        ✕
                    </button>
                </div>

                {/* Recherche */}
                <div
                    className="px-4 pt-3 pb-2 shrink-0"
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Rechercher…"
                        autoFocus
                        className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                        style={{
                            background: 'var(--color-surface-alt)',
                            border:     '1px solid var(--color-border)',
                            color:      'var(--color-text)',
                        }}
                    />

                    {/* Filtres catégorie */}
                    {categories.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2 pb-1">
                            <button
                                onClick={() => setCategory(null)}
                                className="text-xs px-2.5 py-1 rounded-full transition-all"
                                style={{
                                    background: !category ? 'var(--color-primary)' : 'var(--color-surface-alt)',
                                    border:     `1px solid ${!category ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                    color:      !category ? 'var(--color-bg)' : 'var(--color-text-muted)',
                                    cursor:     'pointer',
                                }}
                            >
                                Tous
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setCategory(prev => prev === cat ? null : cat)}
                                    className="text-xs px-2.5 py-1 rounded-full transition-all"
                                    style={{
                                        background: category === cat ? 'var(--color-primary)' : 'var(--color-surface-alt)',
                                        border:     `1px solid ${category === cat ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                        color:      category === cat ? 'var(--color-bg)' : 'var(--color-text-muted)',
                                        cursor:     'pointer',
                                    }}
                                >
                                    {ITEM_AND_CYBERWARE_CATEGORY_LABEL[cat] ?? cat}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Liste scrollable */}
                <div className="flex-1 overflow-y-auto cp-scroll">
                    {filtered.length === 0 && (
                        <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
                            Aucun résultat.
                        </p>
                    )}
                    {grouped
                        ? Object.entries(grouped).map(([cat, catItems]) => (
                            <div key={cat}>
                                <div
                                    className="px-4 py-1.5 text-[10px] cp-font-ui uppercase tracking-widest sticky top-0"
                                    style={{
                                        color:        'var(--color-text-muted)',
                                        background:   'var(--color-surface)',
                                        borderBottom: '1px solid var(--color-border)',
                                    }}
                                >
                                    {ITEM_AND_CYBERWARE_CATEGORY_LABEL[cat] ?? cat}
                                </div>
                                {catItems.map(renderItem)}
                            </div>
                        ))
                        : filtered.map(renderItem)
                    }
                </div>
            </div>
        </>
    );
};

export default BrowseModal;