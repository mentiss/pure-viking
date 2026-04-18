// src/client/src/systems/deltagreen/components/sheet/sections/StatsSection.jsx
import React from 'react';

const CARACS = [
    // { key: 'str', label: 'Force (FOR)' },
    // { key: 'con', label: 'Constitution (CON)' },
    // { key: 'dex', label: 'Dextérité (DEX)' },
    // { key: 'int', label: 'Intelligence (INT)' },
    // { key: 'pow', label: 'Pouvoir (POU)' },
    // { key: 'cha', label: 'Charisme (CHA)' },
    // { key: 'str', label: 'FOR' },
    // { key: 'con', label: 'CON' },
    // { key: 'dex', label: 'DEX' },
    // { key: 'int', label: 'INT' },
    // { key: 'pow', label: 'POU' },
    // { key: 'cha', label: 'CHA' },
    { key: 'str', label: 'Force' },
    { key: 'con', label: 'Constitution' },
    { key: 'dex', label: 'Dextérité' },
    { key: 'int', label: 'Intelligence' },
    { key: 'pow', label: 'Pouvoir' },
    { key: 'cha', label: 'Charisme' },
];

const StatsSection = ({ char, editMode, set, onRoll }) => {
    const traits = char.distinctiveTraits ?? {};

    const handleRollCarac = (carac) => {
        const score    = char[carac.key] ?? 10;
        const target   = score * 5;
        onRoll({
            diceType:    'd100',
            targetScore: target,
            rollLabel:   `${carac.label} ×5`,
        });
    };

    const setTrait = (key, value) => {
        set('distinctiveTraits', { ...traits, [key]: value });
    };

    return (
        <div>
            <p className="dg-section-label text-base mb-3 border-b border-default pb-1">
                8. CARACTÉRISTIQUES
            </p>

            {/* En-têtes */}
            <div className="grid grid-cols-[30%_10%_10%_20%_auto] gap-x-3 mb-1 px-1">
                <span className="dg-section-label">Désignation</span>
                <span className="dg-section-label text-center">Score</span>
                <span className="dg-section-label text-center">×5</span>
                <span className="dg-section-label">Traits</span>
                <span className="dg-section-label">Jet</span>
            </div>

            <div className="space-y-1">
                {CARACS.map((carac) => {
                    const score  = char[carac.key] ?? 10;
                    const times5 = score * 5;

                    return (
                        <div key={carac.key}
                             className="grid grid-cols-[30%_10%_10%_20%_auto] gap-x-3 items-center border-b border-default/40 py-1 px-1">

                            {/* Nom */}
                            <span className="text-sm font-mono">{carac.label}</span>

                            {/* Score brut — visible en édition */}
                            <div className="text-center">
                                {editMode ? (
                                    <input
                                        type="number" min={1} max={20}
                                        className="dg-field-input w-12 text-center text-sm px-1"
                                        value={score}
                                        onChange={e => set(carac.key, Math.min(20, Math.max(1, Number(e.target.value))))}
                                    />
                                ) : (
                                    <span className="font-mono text-sm text-muted">{score}</span>
                                )}
                            </div>

                            {/* ×5 — affiché en lecture */}
                            <div className="text-center">
                                <span className="font-mono font-bold">{times5}%</span>
                            </div>

                            {/* Traits distinctifs */}
                            <div className={`${traits[carac.key] ? '' : 'text-center'}`}>
                                {editMode ? (
                                    <input
                                        className="dg-field-input w-full px-2 py-0.5 text-xs"
                                        value={traits[carac.key] ?? ''}
                                        onChange={e => setTrait(carac.key, e.target.value)}
                                        placeholder="Trait distinctif…"
                                    />
                                ) : (
                                    <span className={`text-xs font-mono text-muted italic`}>
                                        {traits[carac.key] || '—'}
                                    </span>
                                )}
                            </div>

                            {/* Bouton jet */}
                            <button
                                onClick={() => handleRollCarac(carac)}
                                className="text-xs font-mono border border-default px-2 py-0.5 hover:border-accent hover:text-accent transition-colors"
                                title={`Jet ${carac.label} (${times5}%)`}
                            >
                                D100
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StatsSection;