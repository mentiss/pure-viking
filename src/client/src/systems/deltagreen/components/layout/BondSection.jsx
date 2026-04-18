// src/client/src/systems/deltagreen/components/sheet/sections/BondsSection.jsx
import React from 'react';

const MAX_BONDS = 4;

const BondsSection = ({ char, editMode, setArr, onPatchImmediate }) => {
    const bonds = char.bonds ?? [];

    const update = (index, field, value) => {
        const next = bonds.map((b, i) => i === index ? { ...b, [field]: value } : b);
        // isDamaged est un patch immédiat (cochable hors édition)
        if (field === 'isDamaged') {
            onPatchImmediate({ bonds: next });
        } else {
            setArr('bonds', next);
        }
    };

    const add = () => {
        if (bonds.length >= MAX_BONDS) return;
        setArr('bonds', [...bonds, {
            name:      '',
            score:     char.cha ?? 10,
            isDamaged: false,
            position:  bonds.length,
        }]);
    };

    const remove = (index) => {
        setArr('bonds', bonds.filter((_, i) => i !== index)
            .map((b, i) => ({ ...b, position: i })));
    };

    return (
        <div>
            <p className="dg-section-label text-base mb-3 border-b border-default pb-1">
                12. ATTACHES
            </p>

            <div className="space-y-2">
                {bonds.map((bond, i) => (
                    <div key={bond.id ?? i}
                         className={[
                             'flex items-center gap-3 border-b border-default/40 pb-2',
                             bond.isDamaged ? 'dg-bond-damaged' : '',
                         ].join(' ')}>

                        {/* Case endommagée — cochable même hors édition */}
                        <input
                            type="checkbox"
                            className="dg-checkbox flex-shrink-0"
                            checked={!!bond.isDamaged}
                            onChange={e => update(i, 'isDamaged', e.target.checked)}
                            title="Attache endommagée"
                        />

                        {/* Nom */}
                        {editMode ? (
                            <input
                                className={[
                                    'dg-field-input flex-1 px-2 py-0.5 text-sm dg-field-label',
                                    bond.isDamaged ? 'line-through opacity-50' : '',
                                ].join(' ')}
                                value={bond.name ?? ''}
                                onChange={e => update(i, 'name', e.target.value)}
                                placeholder="Nom de l'Attache…"
                            />
                        ) : (
                            <span className={[
                                'flex-1 text-sm font-mono dg-field-label',
                                bond.isDamaged ? 'line-through opacity-50 text-muted' : '',
                            ].join(' ')}>
                                {bond.name || '—'}
                            </span>
                        )}

                        {/* Score */}
                        {editMode ? (
                            <input
                                type="number" min={0} max={99}
                                className="dg-field-input w-14 text-center text-sm px-1"
                                value={bond.score ?? 0}
                                onChange={e => update(i, 'score', Number(e.target.value))}
                            />
                        ) : (
                            <span className={[
                                'font-mono font-bold w-8 text-center',
                                bond.isDamaged ? 'text-danger' : '',
                            ].join(' ')}>
                                {bond.score ?? 0}
                            </span>
                        )}

                        {/* Supprimer */}
                        {editMode && (
                            <button onClick={() => remove(i)}
                                    className="text-danger hover:opacity-80 text-sm flex-shrink-0">✕</button>
                        )}
                    </div>
                ))}

                {bonds.length === 0 && (
                    <p className="text-sm text-muted font-mono italic">Aucune Attache.</p>
                )}
            </div>

            {editMode && bonds.length < MAX_BONDS && (
                <button
                    onClick={add}
                    className="mt-3 text-xs font-mono border border-default px-3 py-1 hover:border-accent hover:text-accent transition-colors"
                >
                    + Ajouter une Attache
                </button>
            )}

            <p className="text-xs text-muted font-mono mt-2 italic">
                Quand une Attache est endommagée, cochez sa case jusqu'à fin de la prochaine scène privée.
            </p>
        </div>
    );
};

export default BondsSection;