// src/client/src/systems/dune/gm/pj/DuneCharacterCard.jsx
// Fiche personnage en lecture côté GM.
// Affiche : identité, détermination, compétences, principes, talents, atouts.
// Actions GM : modifier détermination, envoyer note, envoyer atout.

import React from 'react';

const COMP_LABELS = {
    analyse: 'Analyse', combat: 'Combat', discipline: 'Discipline',
    mobilite: 'Mobilité', rhetorique: 'Rhétorique',
};
const PRINC_LABELS = {
    devoir: 'Devoir', domination: 'Domination', foi: 'Foi',
    justice: 'Justice', verite: 'Vérité',
};

/**
 * @param {object}   props
 * @param {object}   props.character
 * @param {boolean}  props.isOnline
 * @param {Function} props.onSendNote      - () => void
 * @param {Function} props.onSendItem      - () => void
 * @param {Function} props.onEditCharacter - () => void   (modif détermination)
 */
const DuneCharacterCard = ({ character, isOnline, onSendNote, onSendItem, onEditCharacter }) => {
    if (!character) return null;

    return (
        <div className="space-y-3">
            {/* ── En-tête ──────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="font-bold text-base" style={{ color: 'var(--dune-gold)' }}>
                        {character.avatar && (
                            <img
                                src={character.avatar}
                                alt={character.nom}
                                className="w-14 h-14 rounded-full object-cover"
                                style={{ border: '2px solid var(--dune-gold)' }}
                            />
                        )}
                        {character.nom}
                        <span
                            className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                            style={{
                                background: isOnline ? 'var(--dune-success)' : 'var(--dune-surface-alt)',
                                color:      isOnline ? 'white' : 'var(--dune-text-muted)',
                            }}
                        >
                            {isOnline ? '● en ligne' : '○ hors ligne'}
                        </span>
                    </div>
                    <div className="text-xs" style={{ color: 'var(--dune-text-muted)' }}>
                        {character.playerName}
                        {character.statutSocial ? ` · ${character.statutSocial}` : ''}
                    </div>
                </div>

                {/* Détermination */}
                <div className="text-right">
                    <div className="dune-label">Détermination</div>
                    <div className="text-lg font-bold" style={{ color: 'var(--dune-gold)' }}>
                        {character.determination}
                    </div>
                </div>
            </div>

            {/* ── Principes ────────────────────────────────────────── */}
            <div className="dune-card">
                <div className="dune-label mb-1">Principes</div>
                <div className="grid grid-cols-3 gap-1">
                    {(character.principes ?? []).map(p => (
                        <div key={p.key} className="text-center rounded p-1"
                             style={{ background: 'var(--dune-surface-alt)' }}>
                            <div className="text-[9px]" style={{ color: 'var(--dune-text-muted)' }}>
                                {PRINC_LABELS[p.key]}
                            </div>
                            <div className="font-bold text-sm" style={{ color: 'var(--dune-spice)' }}>
                                {p.rang}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Compétences ──────────────────────────────────────── */}
            <div className="dune-card">
                <div className="dune-label mb-1">Compétences</div>
                <div className="grid grid-cols-3 gap-1">
                    {(character.competences ?? []).map(c => (
                        <div key={c.key} className="text-center rounded p-1"
                             style={{ background: 'var(--dune-surface-alt)' }}>
                            <div className="text-[9px]" style={{ color: 'var(--dune-text-muted)' }}>
                                {COMP_LABELS[c.key]}
                            </div>
                            <div className="font-bold text-sm" style={{ color: 'var(--dune-gold)' }}>
                                {c.rang}
                            </div>
                            {c.specialisation?.trim() && (
                                <div className="text-[8px] truncate italic" style={{ color: 'var(--dune-sand)' }}>
                                    {c.specialisation}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Talents ──────────────────────────────────────────── */}
            {character.talents?.length > 0 && (
                <div className="dune-card">
                    <div className="dune-label mb-1">Talents</div>
                    <div className="space-y-1">
                        {character.talents.map((t, i) => (
                            <div key={i}>
                                <span className="text-xs font-bold" style={{ color: 'var(--dune-gold)' }}>
                                    {t.talentName}
                                </span>
                                {t.description && (
                                    <span className="text-xs ml-1" style={{ color: 'var(--dune-text-muted)' }}>
                                        — {t.description}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Atouts ───────────────────────────────────────────── */}
            {character.items?.length > 0 && (
                <div className="dune-card">
                    <div className="dune-label mb-1">Atouts</div>
                    <div className="space-y-1">
                        {character.items.map((item, i) => (
                            <div key={i} className="flex justify-between text-xs">
                                <span style={{ color: 'var(--dune-text)' }}>{item.nom}</span>
                                {item.quantite > 1 && (
                                    <span style={{ color: 'var(--dune-sand)' }}>×{item.quantite}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DuneCharacterCard;