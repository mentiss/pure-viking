// src/client/src/systems/deltagreen/components/sheet/sections/InjuriesSection.jsx
import React from 'react';

const InjuriesSection = ({ char, editMode, set, onPatchImmediate }) => (
    <div>
        <p className="dg-section-label text-base mb-3 border-b border-default pb-1">
            15. BLESSURES ET MALADIES
        </p>

        {editMode ? (
            <textarea
                className="dg-field-input w-full px-2 py-1 text-sm min-h-[6rem] resize-y"
                value={char.injuries ?? ''}
                onChange={e => set('injuries', e.target.value)}
                placeholder="Blessures et maladies en cours…"
            />
        ) : (
            <div className="text-sm font-mono whitespace-pre-wrap min-h-[4rem] bg-surface p-2 border border-default/30">
                {char.injuries || <span className="text-muted italic">Aucune blessure.</span>}
            </div>
        )}

        {/* Checkbox premiers secours — patch immédiat */}
        <label className="flex items-center gap-2 mt-3 cursor-pointer">
            <input
                type="checkbox"
                className="dg-checkbox"
                checked={!!char.firstAidApplied}
                onChange={e => onPatchImmediate({ firstAidApplied: e.target.checked })}
            />
            <span className="text-xs font-mono">
                Jet de Premiers secours appliqué depuis la dernière blessure ?{' '}
                {char.firstAidApplied && (
                    <span className="italic text-muted">
                        Oui : seuls la Médecine, la Chirurgie ou un repos prolongé aideront à se rétablir.
                    </span>
                )}
            </span>
        </label>
    </div>
);

export { InjuriesSection };

// ─────────────────────────────────────────────────────────────────────────────

// src/client/src/systems/deltagreen/components/sheet/sections/EquipmentSection.jsx
const EXPENSE_LABELS = {
    Incidental: 'Incident.',
    Standard:   'Standard',
    Unusual:    'Inhabituel',
    Major:      'Majeur',
    Extreme:    'Extrême',
};

const EquipmentSection = ({ char, editMode, setArr }) => {
    // Inventaire libre = items sans slot
    const items = (char.equipment ?? []).filter(e => !e.slot);

    const update = (id, field, value) => {
        setArr('equipment', char.equipment.map(e => e.id === id || (!e.id && e === char.equipment.find(x => !x.id)) ? { ...e, [field]: value } : e));
    };

    const add = () => {
        setArr('equipment', [...(char.equipment ?? []), {
            name: '', category: '', expense: 'Standard',
            isRestricted: false, restrictionNote: '',
            slot: null, quantity: 1, notes: '', jsonDetails: {},
        }]);
    };

    const remove = (index) => {
        const all = char.equipment ?? [];
        const freeItems = all.filter(e => !e.slot);
        const toRemove = freeItems[index];
        setArr('equipment', all.filter(e => e !== toRemove));
    };

    return (
        <div>
            <p className="dg-section-label text-base mb-3 border-b border-default pb-1">
                16. ARMURE ET MATÉRIEL
            </p>
            <p className="text-xs text-muted font-mono italic mb-2">
                Les protections individuelles réduisent les dégâts de toutes les attaques,
                à l'exception des Attaques précises et des jets de Létalité réussis.
            </p>

            {items.length === 0 && !editMode && (
                <p className="text-sm text-muted font-mono italic">Aucun équipement.</p>
            )}

            <div className="space-y-1">
                {items.map((item, i) => (
                    <div key={item.id ?? i} className="flex items-center gap-2 border-b border-default/20 py-1">
                        {editMode ? (
                            <>
                                <input className="dg-field-input flex-1 px-2 py-0.5 text-xs" placeholder="Nom"
                                       value={item.name ?? ''} onChange={e => update(item.id, 'name', e.target.value)} />
                                <input className="dg-field-input w-20 px-1 py-0.5 text-xs" placeholder="Catégorie"
                                       value={item.category ?? ''} onChange={e => update(item.id, 'category', e.target.value)} />
                                <select className="dg-field-input px-1 py-0.5 text-xs"
                                        value={item.expense ?? 'Standard'} onChange={e => update(item.id, 'expense', e.target.value)}>
                                    {Object.entries(EXPENSE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                                <input type="number" min={1} className="dg-field-input w-10 text-center text-xs px-1"
                                       value={item.quantity ?? 1} onChange={e => update(item.id, 'quantity', Number(e.target.value))} />
                                <button onClick={() => remove(i)} className="text-danger text-xs">✕</button>
                            </>
                        ) : (
                            <>
                                <span className="flex-1 text-xs font-mono">{item.name}</span>
                                <span className="text-xs text-muted font-mono">{EXPENSE_LABELS[item.expense] ?? item.expense}</span>
                                {item.quantity > 1 && <span className="text-xs text-muted font-mono">×{item.quantity}</span>}
                                {item.isRestricted && <span className="dg-stamp dg-stamp-red text-xs">R</span>}
                            </>
                        )}
                    </div>
                ))}
            </div>

            {editMode && (
                <button onClick={add}
                        className="mt-2 text-xs font-mono border border-default px-3 py-1 hover:border-accent hover:text-accent transition-colors">
                    + Ajouter un équipement
                </button>
            )}
        </div>
    );
};

export { EquipmentSection };

// ─────────────────────────────────────────────────────────────────────────────

// src/client/src/systems/deltagreen/components/sheet/sections/WeaponsSection.jsx
const SLOTS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

const WeaponsSection = ({ char, editMode, setArr, onRoll }) => {
    const allEquip = char.equipment ?? [];

    const getWeapon = (slot) => allEquip.find(e => e.slot === slot);

    const updateWeapon = (slot, field, value) => {
        const existing = getWeapon(slot);
        if (existing) {
            setArr('equipment', allEquip.map(e => e.slot === slot ? { ...e, [field]: value } : e));
        } else {
            setArr('equipment', [...allEquip, {
                name: '', category: 'weapon', expense: 'Standard',
                isRestricted: false, restrictionNote: '',
                slot, quantity: 1, notes: '',
                jsonDetails: { [field]: value },
            }]);
        }
    };

    const updateDetail = (slot, field, value) => {
        const existing = getWeapon(slot);
        if (existing) {
            setArr('equipment', allEquip.map(e =>
                e.slot === slot ? { ...e, jsonDetails: { ...(e.jsonDetails ?? {}), [field]: value } } : e
            ));
        }
    };

    const clearSlot = (slot) => {
        setArr('equipment', allEquip.filter(e => e.slot !== slot));
    };

    return (
        <div>
            <p className="dg-section-label text-base mb-3 border-b border-default pb-1">
                17. ARMES
            </p>

            {/* En-têtes */}
            <div className="grid grid-cols-[1.5rem_2fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-x-2 mb-1 text-center">
                <span/>
                <span className="dg-section-label text-left">Arme</span>
                <span className="dg-section-label">Comp. %</span>
                <span className="dg-section-label">Portée</span>
                <span className="dg-section-label">Dégâts</span>
                <span className="dg-section-label">Perfo.</span>
                <span className="dg-section-label">Létalité</span>
                <span className="dg-section-label">Munitions</span>
                <span/>
            </div>

            {SLOTS.map((slot) => {
                const w = getWeapon(slot);
                const d = w?.jsonDetails ?? {};

                return (
                    <div key={slot}
                         className="grid grid-cols-[1.5rem_2fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-x-2 border-b border-default/30 py-1 items-center">

                        {/* Label slot */}
                        <span className="text-xs text-muted font-mono">({slot})</span>

                        {/* Nom */}
                        {editMode ? (
                            <input className="dg-field-input px-1 py-0.5 text-xs"
                                   value={w?.name ?? ''} placeholder="—"
                                   onChange={e => updateWeapon(slot, 'name', e.target.value)} />
                        ) : (
                            <span className="text-xs font-mono">{w?.name || '—'}</span>
                        )}

                        {/* Compétence % */}
                        {editMode ? (
                            <input type="number" min={0} max={99}
                                   className="dg-field-input w-full text-center text-xs px-1"
                                   value={d.skillScore ?? ''} placeholder="0"
                                   onChange={e => updateDetail(slot, 'skillScore', Number(e.target.value))} />
                        ) : (
                            <span className="text-xs font-mono text-center">
                                {d.skillScore ? `${d.skillScore}%` : '—'}
                            </span>
                        )}

                        {/* Portée */}
                        {editMode ? (
                            <input className="dg-field-input px-1 py-0.5 text-xs text-center"
                                   value={d.baseRange ?? ''} placeholder="—"
                                   onChange={e => updateDetail(slot, 'baseRange', e.target.value)} />
                        ) : (
                            <span className="text-xs font-mono text-center">{d.baseRange || '—'}</span>
                        )}

                        {/* Dégâts */}
                        {editMode ? (
                            <input className="dg-field-input px-1 py-0.5 text-xs text-center"
                                   value={d.damage ?? ''} placeholder="1D6"
                                   onChange={e => updateDetail(slot, 'damage', e.target.value)} />
                        ) : (
                            <button
                                className="text-xs font-mono text-center hover:text-accent"
                                disabled={!d.damage}
                                onClick={() => d.damage && onRoll({
                                    diceType: d.damage?.replace(/^\d+/, '').toLowerCase() || 'd6',
                                    rollLabel: `Dégâts — ${w?.name ?? slot}`,
                                })}
                                title={d.damage ? `Lancer ${d.damage}` : ''}
                            >
                                {d.damage || '—'}
                            </button>
                        )}

                        {/* Perforant */}
                        {editMode ? (
                            <input type="checkbox" className="dg-checkbox mx-auto"
                                   checked={!!d.armorPiercing}
                                   onChange={e => updateDetail(slot, 'armorPiercing', e.target.checked)} />
                        ) : (
                            <span className="text-xs font-mono text-center">{d.armorPiercing ? 'Oui' : '—'}</span>
                        )}

                        {/* Létalité */}
                        {editMode ? (
                            <input type="number" min={0} max={99}
                                   className="dg-field-input px-1 py-0.5 text-xs text-center"
                                   value={d.lethality ?? ''} placeholder="—"
                                   onChange={e => updateDetail(slot, 'lethality', e.target.value)} />
                        ) : (
                            <span className="text-xs font-mono text-center">
                                {d.lethality ? `${d.lethality}%` : '—'}
                            </span>
                        )}

                        {/* Munitions */}
                        {editMode ? (
                            <input type="number" min={0}
                                   className="dg-field-input px-1 py-0.5 text-xs text-center"
                                   value={d.ammo ?? ''} placeholder="—"
                                   onChange={e => updateDetail(slot, 'ammo', e.target.value)} />
                        ) : (
                            <span className="text-xs font-mono text-center">{d.ammo ?? '—'}</span>
                        )}

                        {/* Supprimer */}
                        {editMode && w && (
                            <button onClick={() => clearSlot(slot)}
                                    className="text-danger text-xs">✕</button>
                        )}
                        {(!editMode || !w) && <span/>}
                    </div>
                );
            })}

            {/* Mains nues — toujours affiché */}
            <div className="grid grid-cols-[1.5rem_2fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-x-2 py-1 items-center text-muted">
                <span className="text-xs font-mono">(—)</span>
                <span className="text-xs font-mono italic">Mains nues</span>
                <span className="text-xs font-mono text-center">
                    {(char.skills ?? []).find(s => s.skillKey === 'combat_mains_nues')?.score ?? 40}%
                </span>
                <span className="text-xs font-mono text-center">—</span>
                <button
                    className="text-xs font-mono text-center hover:text-accent"
                    onClick={() => onRoll({ diceType: 'd4', rollLabel: 'Dégâts mains nues' })}>
                    1D4−1
                </button>
                <span className="text-xs font-mono text-center">—</span>
                <span className="text-xs font-mono text-center">—</span>
                <span className="text-xs font-mono text-center">—</span>
                <span/>
            </div>
        </div>
    );
};

export { WeaponsSection };

// ─────────────────────────────────────────────────────────────────────────────

// src/client/src/systems/deltagreen/components/sheet/sections/NotesSection.jsx
const NotesSection = ({ char, editMode, set }) => (
    <div className="">
        <div>
            <p className="dg-section-label text-base mb-2 border-b border-default pb-1">
                18. DÉTAILS PERSONNELS ET NOTES
            </p>
            {editMode ? (
                <textarea
                    className="dg-field-input w-full px-2 py-1 text-sm min-h-[8rem] resize-y"
                    value={char.personalNotes ?? ''}
                    onChange={e => set('personalNotes', e.target.value)}
                    placeholder="Détails personnels, notes libres…"
                />
            ) : (
                <div className="text-sm font-mono whitespace-pre-wrap min-h-[4rem] bg-surface p-2 border border-default/30">
                    {char.personalNotes || <span className="text-muted italic">—</span>}
                </div>
            )}
        </div>
        <hr className="dg-divider" />
        <div>
            <p className="dg-section-label text-base mb-2 border-b border-default pb-1">
                19. DÉVELOPPEMENTS AFFECTANT LE FOYER ET LA FAMILLE
            </p>
            {editMode ? (
                <textarea
                    className="dg-field-input w-full px-2 py-1 text-sm min-h-[8rem] resize-y"
                    value={char.familyDevelopments ?? ''}
                    onChange={e => set('familyDevelopments', e.target.value)}
                    placeholder="Développements familiaux…"
                />
            ) : (
                <div className="text-sm font-mono whitespace-pre-wrap min-h-[4rem] bg-surface p-2 border border-default/30">
                    {char.familyDevelopments || <span className="text-muted italic">—</span>}
                </div>
            )}
        </div>
    </div>
);

export { NotesSection };

// ─────────────────────────────────────────────────────────────────────────────

// src/client/src/systems/deltagreen/components/sheet/sections/SpecialTrainingSection.jsx
const SpecialTrainingSection = ({ char, editMode, set, onRoll }) => {
    const entries = char.specialTraining ?? [];

    const update = (index, field, value) => {
        const next = entries.map((e, i) => i === index ? { ...e, [field]: value } : e);
        set('specialTraining', next);
    };

    const add = () => set('specialTraining', [...entries, { intitule: '', carac_ou_competence: '' }]);
    const remove = (index) => set('specialTraining', entries.filter((_, i) => i !== index));

    const handleRoll = (entry) => {
        // Cherche le score dans les compétences ou caractéristiques du perso
        const CARAC_KEYS = { str: 1, con: 1, dex: 1, int: 1, pow: 1, cha: 1 };
        const key = entry.carac_ou_competence?.toLowerCase().replace(/\s+/g, '_');
        let score = 0;
        if (CARAC_KEYS[key]) {
            score = (char[key] ?? 10) * 5;
        } else {
            const skill = (char.skills ?? []).find(s => s.skillKey === key || s.specialty?.toLowerCase() === key);
            score = skill?.score ?? 0;
        }
        onRoll({ diceType: 'd100', targetScore: score, rollLabel: entry.intitule || entry.carac_ou_competence });
    };

    return (
        <div>
            <p className="dg-section-label text-base mb-3 border-b border-default pb-1">
                20. ENTRAÎNEMENT SPÉCIAL
            </p>

            <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-x-3 mb-1">
                <span/>
                <span className="dg-section-label">Intitulé</span>
                <span className="dg-section-label">Carac. ou compétence</span>
                <span/>
            </div>

            {entries.map((entry, i) => (
                <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto] gap-x-3 items-center border-b border-default/20 py-1">
                    <span className="text-xs text-muted font-mono">{i + 1}.</span>
                    {editMode ? (
                        <>
                            <input className="dg-field-input px-2 py-0.5 text-xs"
                                   value={entry.intitule ?? ''} placeholder="Intitulé"
                                   onChange={e => update(i, 'intitule', e.target.value)} />
                            <input className="dg-field-input px-2 py-0.5 text-xs"
                                   value={entry.carac_ou_competence ?? ''} placeholder="Ex: int, armes_feu"
                                   onChange={e => update(i, 'carac_ou_competence', e.target.value)} />
                            <button onClick={() => remove(i)} className="text-danger text-xs">✕</button>
                        </>
                    ) : (
                        <>
                            <span className="text-xs font-mono">{entry.intitule || '—'}</span>
                            <span className="text-xs font-mono text-muted">{entry.carac_ou_competence || '—'}</span>
                            <button
                                onClick={() => handleRoll(entry)}
                                className="text-xs font-mono border border-default/40 px-1.5 py-0.5 hover:border-accent hover:text-accent">
                                ⊕
                            </button>
                        </>
                    )}
                </div>
            ))}

            {entries.length === 0 && !editMode && (
                <p className="text-sm text-muted font-mono italic">Aucun entraînement spécial.</p>
            )}

            {editMode && (
                <button onClick={add}
                        className="mt-2 text-xs font-mono border border-default px-3 py-1 hover:border-accent hover:text-accent transition-colors">
                    + Ajouter
                </button>
            )}
        </div>
    );
};

export { SpecialTrainingSection };

// ─────────────────────────────────────────────────────────────────────────────
// Re-exports par défaut (pour les imports nommés dans Sheet.jsx)
export default InjuriesSection;