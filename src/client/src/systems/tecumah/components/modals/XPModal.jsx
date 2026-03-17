// src/client/src/systems/tecumah/components/XPModal.jsx
// Modale de dépense de PP (Points de Personnage) pour les améliorations.
// Flux : sélection cible → affichage coût → validation → PUT character.

import React, { useState, useMemo } from 'react';

const TABS = [
    { id: 'skills',      label: 'Compétences' },
    { id: 'attrs',       label: 'Attributs'   },
    { id: 'backgrounds', label: 'Backgrounds' },
];

/**
 * @param {{
 *   character: object,
 *   onUpdate: (char: object) => void,
 *   onClose: () => void,
 * }} props
 */
const XPModal = ({ character, onUpdate, onClose }) => {
    const [tab,        setTab]       = useState('skills');
    const [pending,    setPending]   = useState(null); // { type, key, label, cost, newPips?, newNiveau? }
    const [confirming, setConfirming] = useState(false);

    const pp = character.points_personnage ?? 0;

    // ── Helpers ──────────────────────────────────────────────────────────────

    const canAfford = (cost) => cost != null && pp >= cost;

    const confirm = () => {
        if (!pending || !canAfford(pending.cost)) return;

        const updated = { ...character, points_personnage: pp - pending.cost };

        if (pending.type === 'skill_new' || pending.type === 'skill_pip') {
            updated[pending.key] = pending.newPips;
        } else if (pending.type === 'attr_pip') {
            updated[pending.key] = pending.newPips;
        } else if (pending.type === 'background') {
            updated.backgrounds = character.backgrounds.map(b =>
                b.type === pending.key ? { ...b, niveau: pending.newNiveau } : b
            );
        }

        onUpdate(updated);
        onClose();
    };

    // ── Onglet Compétences ────────────────────────────────────────────────────

    const SkillsTab = () => (
        <div className="flex flex-col gap-1">
            {SKILLS.map(skill => {
                const compPips  = character[skill.key] ?? 0;
                const attrPips  = character[skill.attr] ?? 6;
                const totalPips = attrPips + compPips;

                // Coût selon situation
                let action, cost, newPips;
                if (compPips === 0) {
                    // Déblocage à 1D
                    action  = 'Débloquer (1D)';
                    cost    = getCost('new_skill');
                    newPips = 3;
                } else {
                    // +1 pip
                    action  = '+1 pip';
                    cost    = getCost('skill_pip', compPips);
                    newPips = compPips + 1;
                }

                const affordable = canAfford(cost);

                return (
                    <div
                        key={skill.key}
                        className="flex items-center justify-between py-2 px-3 rounded"
                        style={{ background: 'var(--color-surface)', marginBottom: 2 }}
                    >
                        <div>
                            <span style={{ fontSize: '0.875rem', color: 'var(--color-text)' }}>{skill.label}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: 8 }}>
                                {pipsToNotation(totalPips)}
                                {compPips > 0 && ` (comp: ${pipsToNotation(compPips)})`}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span style={{ fontSize: '0.8rem', color: affordable ? 'var(--color-text)' : 'var(--color-danger)' }}>
                                {cost} PP
                            </span>
                            <button
                                disabled={!affordable || newPips > 36}
                                onClick={() => setPending({ type: compPips === 0 ? 'skill_new' : 'skill_pip', key: skill.key, label: skill.label, cost, newPips })}
                                className="px-2 py-1 rounded text-xs"
                                style={{
                                    background: affordable ? 'var(--color-accent)' : 'var(--color-border)',
                                    color: affordable ? 'var(--color-bg)' : 'var(--color-text-muted)',
                                    cursor: affordable ? 'pointer' : 'not-allowed',
                                }}
                            >
                                {action}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    // ── Onglet Attributs ──────────────────────────────────────────────────────

    const AttrsTab = () => (
        <div className="flex flex-col gap-1">
            {ATTRIBUTS.map(attrKey => {
                const pips    = character[attrKey] ?? 6;
                const cost    = getCost('attr_pip', pips);
                const newPips = pips + 1;
                const affordable = canAfford(cost);

                return (
                    <div
                        key={attrKey}
                        className="flex items-center justify-between py-2 px-3 rounded"
                        style={{ background: 'var(--color-surface)', marginBottom: 2 }}
                    >
                        <div>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                                {ATTRIBUT_LABELS[attrKey]}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: 8 }}>
                                {pipsToNotation(pips)} → {pipsToNotation(newPips)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span style={{ fontSize: '0.8rem', color: affordable ? 'var(--color-text)' : 'var(--color-danger)' }}>
                                {cost} PP
                            </span>
                            <button
                                disabled={!affordable || newPips > 36}
                                onClick={() => setPending({ type: 'attr_pip', key: attrKey, label: ATTRIBUT_LABELS[attrKey], cost, newPips })}
                                className="px-2 py-1 rounded text-xs"
                                style={{
                                    background: affordable ? 'var(--color-accent)' : 'var(--color-border)',
                                    color: affordable ? 'var(--color-bg)' : 'var(--color-text-muted)',
                                    cursor: affordable ? 'pointer' : 'not-allowed',
                                }}
                            >
                                +1 pip
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    // ── Onglet Backgrounds ────────────────────────────────────────────────────

    const BackgroundsTab = () => (
        <div className="flex flex-col gap-1">
            {(character.backgrounds ?? []).map((bg, i) => {
                const def      = BACKGROUNDS_BY_ID[bg.type];
                if (!def) return null;
                const cost     = getCost('background', 0, bg.niveau, def.maxNiveau);
                const newNiv   = (bg.niveau ?? 1) + 1;
                const affordable = canAfford(cost);
                const atMax    = (bg.niveau ?? 1) >= def.maxNiveau;

                return (
                    <div
                        key={i}
                        className="flex items-center justify-between py-2 px-3 rounded"
                        style={{ background: 'var(--color-surface)', marginBottom: 2 }}
                    >
                        <div>
                            <span style={{ fontSize: '0.875rem', color: 'var(--color-text)' }}>{def.name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: 8 }}>
                                Niv. {bg.niveau} {!atMax && `→ Niv. ${newNiv}`}
                            </span>
                        </div>
                        {atMax ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Max</span>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span style={{ fontSize: '0.8rem', color: affordable ? 'var(--color-text)' : 'var(--color-danger)' }}>
                                    {cost} PP
                                </span>
                                <button
                                    disabled={!affordable}
                                    onClick={() => setPending({ type: 'background', key: bg.type, label: `${def.name} Niv.${newNiv}`, cost, newNiveau: newNiv })}
                                    className="px-2 py-1 rounded text-xs"
                                    style={{
                                        background: affordable ? 'var(--color-accent)' : 'var(--color-border)',
                                        color: affordable ? 'var(--color-bg)' : 'var(--color-text-muted)',
                                        cursor: affordable ? 'pointer' : 'not-allowed',
                                    }}
                                >
                                    +1 niveau
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}
            {(character.backgrounds ?? []).length === 0 && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                    Aucun background enregistré.
                </p>
            )}
        </div>
    );

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
                style={{ background: 'var(--color-bg)', border: '2px solid var(--color-border)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <div>
                        <h2 style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '1.1rem' }}>
                            Dépenser des PP
                        </h2>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            PP disponibles : <strong style={{ color: 'var(--color-text)' }}>{pp}</strong>
                        </p>
                    </div>
                    <button onClick={onClose} style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem' }}>✕</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b" style={{ borderColor: 'var(--color-border)' }}>
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => { setTab(t.id); setPending(null); }}
                            className="flex-1 py-2 text-sm"
                            style={{
                                fontWeight: tab === t.id ? 700 : 400,
                                color:      tab === t.id ? 'var(--color-accent)' : 'var(--color-text-muted)',
                                borderBottom: tab === t.id ? '2px solid var(--color-accent)' : 'none',
                            }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Contenu */}
                <div className="overflow-y-auto flex-1 p-4">
                    {tab === 'skills'      && <SkillsTab />}
                    {tab === 'attrs'       && <AttrsTab />}
                    {tab === 'backgrounds' && <BackgroundsTab />}
                </div>

                {/* Confirmation */}
                {pending && (
                    <div
                        className="px-5 py-4 flex items-center justify-between gap-3"
                        style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
                    >
                        <div>
                            <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)' }}>
                                {pending.label}
                            </p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                Coût : {pending.cost} PP (reste : {pp - pending.cost})
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPending(null)}
                                className="px-3 py-2 rounded text-sm"
                                style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-muted)' }}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={confirm}
                                disabled={!canAfford(pending.cost)}
                                className="px-4 py-2 rounded text-sm"
                                style={{
                                    background: canAfford(pending.cost) ? 'var(--color-accent)' : 'var(--color-border)',
                                    color:      canAfford(pending.cost) ? 'var(--color-bg)' : 'var(--color-text-muted)',
                                    fontWeight: 700,
                                }}
                            >
                                Confirmer
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default XPModal;