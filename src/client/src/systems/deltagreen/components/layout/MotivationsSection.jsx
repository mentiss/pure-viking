// src/client/src/systems/deltagreen/components/sheet/sections/MotivationsSection.jsx
import React from 'react';

const MotivationsSection = ({ char, editMode, setArr }) => {
    const items = char.motivations ?? [];

    const update = (index, field, value) => {
        const next = items.map((m, i) => i === index ? { ...m, [field]: value } : m);
        setArr('motivations', next);
    };

    const add = (type) => {
        if (items.length >= 5) return;
        setArr('motivations', [...items, { text: '', type, position: items.length }]);
    };

    const remove = (index) => {
        setArr('motivations', items.filter((_, i) => i !== index)
            .map((m, i) => ({ ...m, position: i })));
    };

    return (
        <div>
            <p className="dg-section-label text-base mb-3 border-b border-default pb-1">
                13. MOTIVATIONS ET TROUBLES PSYCHIQUES
            </p>

            <div className="space-y-2">
                {items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                        {/* Badge type */}
                        <span className={[
                            'dg-tag mt-1 flex-shrink-0',
                            item.type === 'trouble'
                                ? 'bg-danger/10 text-danger border border-danger/30'
                                : 'bg-success/10 text-success border border-success/30',
                        ].join(' ')}>
                            {item.type === 'trouble' ? 'Trouble' : 'Motivation'}
                        </span>

                        {editMode ? (
                            <>
                                <input
                                    className="dg-field-input flex-1 px-2 py-0.5 text-sm"
                                    value={item.text ?? ''}
                                    onChange={e => update(i, 'text', e.target.value)}
                                    placeholder={item.type === 'trouble' ? 'Trouble psychique…' : 'Motivation…'}
                                />
                                <select
                                    className="dg-field-input px-1 py-0.5 text-xs"
                                    value={item.type}
                                    onChange={e => update(i, 'type', e.target.value)}
                                >
                                    <option value="motivation">Motivation</option>
                                    <option value="trouble">Trouble</option>
                                </select>
                                <button onClick={() => remove(i)}
                                        className="text-danger hover:opacity-80 text-sm mt-0.5">✕</button>
                            </>
                        ) : (
                            <p className="text-sm font-mono">{item.text || '—'}</p>
                        )}
                    </div>
                ))}

                {items.length === 0 && !editMode && (
                    <p className="text-sm text-muted font-mono italic">Aucune motivation enregistrée.</p>
                )}
            </div>

            {editMode && items.length < 5 && (
                <div className="flex gap-2 mt-3">
                    <button onClick={() => add('motivation')}
                            className="text-xs font-mono border border-success/40 text-success px-3 py-1 hover:bg-success/10">
                        + Motivation
                    </button>
                    <button onClick={() => add('trouble')}
                            className="text-xs font-mono border border-danger/40 text-danger px-3 py-1 hover:bg-danger/10">
                        + Trouble
                    </button>
                </div>
            )}
        </div>
    );
};

export default MotivationsSection;