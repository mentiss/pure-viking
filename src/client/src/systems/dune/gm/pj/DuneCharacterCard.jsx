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
 * @param {Function} props.onEditCharacter - () => void
 */
const DuneCharacterCard = ({ character, isOnline, onSendNote, onSendItem, onEditCharacter }) => {
    if (!character) return null;

    return (
        <div className="space-y-3">

            {/* ── BANNIÈRE IDENTITÉ ─────────────────────────────────────── */}
            <div className="grid gap-3" style={{ gridTemplateColumns: 'auto 1fr auto' }}>

                {/* Zone 1 : Avatar + nom + joueur + statut + badge */}
                <div className="flex gap-3 items-start" style={{ minWidth: 180 }}>
                    {character.avatar ? (
                        <img
                            src={character.avatar}
                            alt={character.nom}
                            className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                            style={{ border: '2px solid var(--dune-gold)' }}
                            onError={e => { e.target.style.display = 'none'; }}
                        />
                    ) : (
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 text-xl"
                            style={{ background: 'var(--dune-surface-alt)', border: '2px solid var(--dune-border)' }}
                        >
                            👤
                        </div>
                    )}
                    <div className="space-y-1 min-w-0">
                        {/* Prénom + Nom */}
                        <div className="flex flex-wrap items-baseline gap-1">
                            {character.prenom && (
                                <span className="font-bold text-sm" style={{ color: 'var(--dune-gold)' }}>
                                    {character.prenom}
                                </span>
                            )}
                            <span className="text-xs" style={{ color: 'var(--dune-text-muted)' }}>
                                {character.nom}
                            </span>
                            <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                                style={{
                                    background: isOnline ? 'var(--dune-success)' : 'var(--dune-surface-alt)',
                                    color:      isOnline ? 'white' : 'var(--dune-text-muted)',
                                }}
                            >
                                {isOnline ? '● en ligne' : '○ hors ligne'}
                            </span>
                        </div>
                        {/* Joueur + statut */}
                        <div className="text-xs" style={{ color: 'var(--dune-text-muted)' }}>
                            {character.playerName}
                            {character.statutSocial && <span> · {character.statutSocial}</span>}
                        </div>
                        {/* Motto */}
                        {character.motto && (
                            <div className="text-xs italic" style={{ color: 'var(--dune-ochre)' }}>
                                « {character.motto} »
                            </div>
                        )}
                    </div>
                </div>

                {/* Zone 2 : Stats physiques + description */}
                <div
                    className="flex flex-col justify-center gap-2 px-3"
                    style={{ borderLeft: '1px solid var(--dune-border)', borderRight: '1px solid var(--dune-border)' }}
                >
                    {(character.age || character.taille || character.poids || character.sexe) && (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                            {character.age && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px]" style={{ color: 'var(--dune-text-muted)', minWidth: 40 }}>Âge</span>
                                    <span className="text-xs font-semibold" style={{ color: 'var(--dune-sand)' }}>{character.age} ans</span>
                                </div>
                            )}
                            {character.taille && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px]" style={{ color: 'var(--dune-text-muted)', minWidth: 40 }}>Taille</span>
                                    <span className="text-xs font-semibold" style={{ color: 'var(--dune-sand)' }}>{character.taille} cm</span>
                                </div>
                            )}
                            {character.poids && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px]" style={{ color: 'var(--dune-text-muted)', minWidth: 40 }}>Poids</span>
                                    <span className="text-xs font-semibold" style={{ color: 'var(--dune-sand)' }}>{character.poids} kg</span>
                                </div>
                            )}
                            {character.sexe && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px]" style={{ color: 'var(--dune-text-muted)', minWidth: 40 }}>Sexe</span>
                                    <span className="text-xs font-semibold" style={{ color: 'var(--dune-sand)' }}>{character.sexe}</span>
                                </div>
                            )}
                        </div>
                    )}
                    {character.description && (
                        <div className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'var(--dune-text)' }}>
                            {character.description}
                        </div>
                    )}
                </div>

                {/* Zone 3 : Détermination */}
                <div className="flex flex-col items-center justify-center gap-1" style={{ minWidth: 90 }}>
                    <div className="dune-label text-center">Détermination</div>
                    <div className="text-2xl font-bold" style={{ color: 'var(--dune-gold)' }}>
                        {character.determination}
                    </div>
                    {character.determinationMax && character.determinationMax < 9999 && (
                        <div className="text-[10px]" style={{ color: 'var(--dune-text-muted)' }}>
                            / {character.determinationMax}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Principes ────────────────────────────────────────────── */}
            <div className="dune-card">
                <div className="dune-label dune-font mb-1">Principes</div>
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

            {/* ── Compétences ──────────────────────────────────────────── */}
            <div className="dune-card">
                <div className="dune-label dune-font mb-1">Competences</div>
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

            {/* ── Talents ──────────────────────────────────────────────── */}
            {character.talents?.length > 0 && (
                <div className="dune-card">
                    <div className="dune-label dune-font mb-1">Talents</div>
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

            {/* ── Atouts ───────────────────────────────────────────────── */}
            {character.items?.length > 0 && (
                <div className="dune-card">
                    <div className="dune-label dune-font mb-1">Atouts</div>
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