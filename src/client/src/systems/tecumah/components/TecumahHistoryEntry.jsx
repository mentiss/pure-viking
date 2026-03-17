// src/client/src/systems/tecumah/components/TecumahHistoryEntry.jsx
// Rendu d'une entrée d'historique de jet Tecumah Gulch.
// Appelé par DiceHistoryPage via tecumahConfig.dice.renderHistoryEntry.
//
// Affiche : label (attribut + compétence), pool de base (XD+Y),
// dés normaux, Wild Die, total, succès/échec vs ND, ressource dépensée.

import React from 'react';
import { pipsToNotation, BLESSURE_LABELS } from '../config.jsx';
import DieFace from "./DieFace.jsx";

const TecumahHistoryEntry = ({ entry }) => {
    // Parsing défensif — le serveur envoie roll_result ou result_json
    let result = null;
    try {
        const raw = entry.result_json ?? entry.roll_result;
        result = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
        return (
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                {entry.label ?? entry.roll_type ?? '?'}
            </div>
        );
    }

    if (!result) return null;

    const {
        normalValues    = [],
        normalSum       = 0,
        wildValues      = [],
        wildSum         = 0,
        wildInitial,
        wildExploded,
        isComplication,
        residualPips    = 0,
        bonusResultat   = 0,
        total,
        difficulte,
        reussite,
        depense,
        ppCount         = 0,
        attrPipsTotal,  // pool de base stocké par beforeRoll
        isNPC,
        label,
    } = result;

    // ── Cas NPC — rendu compact ───────────────────────────────────────────────
    if (isNPC) {
        return (
            <div style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                    {entry.label ?? entry.character_name ?? 'NPC'}
                </span>
                <span style={{ color: 'var(--color-text-muted)', marginLeft: 8 }}>
                    [{normalValues.join(', ')}]
                </span>
                {' → '}
                <strong style={{
                    color: reussite === true  ? 'var(--color-success)'
                        : reussite === false ? 'var(--color-danger)'
                            : 'var(--color-text)',
                }}>
                    {total}
                </strong>
                {difficulte != null && (
                    <span style={{ color: reussite ? 'var(--color-success)' : 'var(--color-danger)', marginLeft: 4 }}>
                        {reussite ? '✓' : '✗'} ND {difficulte}
                    </span>
                )}
            </div>
        );
    }

    const poolNotation = attrPipsTotal ? pipsToNotation(attrPipsTotal) : null;
    const labelSt = { fontSize: '0.8rem', color: 'var(--color-text-muted)' };

    return (
        <div className="pl-2" style={{ fontSize: '0.82rem', lineHeight: 1.7, color: 'var(--color-text)' }}>

            {/* ── Ligne 1 : label + pool de base + ressource ─────────────── */}
            <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontWeight: 700 }}>
                    {label ?? entry.roll_type ?? '?'}
                </span>

                {poolNotation && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                        pool {poolNotation}
                    </span>
                )}

                {depense === 'pd' && (
                    <Badge bg="var(--color-accent)" color="var(--color-bg)">PD ×2</Badge>
                )}
                {depense === 'pp' && ppCount > 0 && (
                    <Badge bg="var(--color-secondary)" color="#fff">PP −{ppCount}</Badge>
                )}
                {isComplication && (
                    <Badge bg="var(--color-danger)" color="#fff">⚡ Complication</Badge>
                )}
            </div>

            {/* ── Ligne 2 : dés ──────────────────────────────────────────── */}
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                {normalValues.length > 0 && (
                    <div>
                        <p style={labelSt}>Dés normaux</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {normalValues.map((v, i) => <DieFace key={i} value={v} />)}
                            <span style={{ alignSelf: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>= {normalSum}</span>
                        </div>
                    </div>
                )}

                <div>
                    <p style={{ ...labelSt, color: '#B8860B', fontWeight: 600 }}>
                        Wild Die {wildExploded ? '💥 (explosion !)' : ''}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1 items-center">
                        {wildValues.map((v, i) => <DieFace key={i} value={v} gold wildInitial={i === 0 ? wildInitial : undefined} />)}
                        <span style={{ color: '#B8860B', fontSize: '0.85rem', fontWeight: 600 }}>= {wildSum}</span>
                    </div>
                </div>
            </div>

            {/* ── Ligne 3 : total ────────────────────────────────────────── */}
            <div className="flex items-center gap-3">
                <span style={{
                    fontWeight: 700,
                    fontSize:   '0.95rem',
                    color: reussite === true  ? 'var(--color-success)'
                        : reussite === false ? 'var(--color-danger)'
                            : 'var(--color-text)',
                }}>
                    = {wildSum+normalSum}
                    {(wildSum+normalSum) !== total && (
                        <>
                        {residualPips > 0 && (
                            <span> +{residualPips}pip</span>
                        )}
                            {bonusResultat !== 0 && (
                                <span style={{ color: bonusResultat > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                    {bonusResultat > 0 ? ` +${bonusResultat}` : ` ${bonusResultat}`}
                                </span>
                        )} = {total}
                        </>
                    )}
                </span>
                {difficulte != null && (
                    <span style={{
                        fontSize: '0.78rem',
                        color: reussite ? 'var(--color-success)' : 'var(--color-danger)',
                    }}>
                        {reussite ? '✓ Succès' : '✗ Échec'} (ND {difficulte})
                    </span>
                )}
            </div>
        </div>
    );
};

// ── Sous-composant interne ────────────────────────────────────────────────────

const Badge = ({ children, bg, color }) => (
    <span style={{
        fontSize: '0.68rem', fontWeight: 700,
        background: bg, color,
        borderRadius: 4, padding: '1px 5px',
    }}>
        {children}
    </span>
);

export default TecumahHistoryEntry;