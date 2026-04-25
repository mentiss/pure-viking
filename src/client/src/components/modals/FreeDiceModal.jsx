// src/client/src/components/modals/FreeDiceModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Modale de lancer de dés libre — agnostique à tout slug.
// Supporte les combinaisons multi-types + modificateur.
//
// Props :
//   characterId?   {number}   — pour persist historique
//   characterName? {string}   — pour persist historique
//   sessionId?     {number}   — pour persist historique
//   isGM?          {boolean}  — affiche la case "Jet public" (défaut : false)
//   defaultLabel?  {string}   — label par défaut (défaut : "Jet libre")
//   onClose        {function}
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback } from 'react';
import { roll }      from '../../tools/diceEngine.js';
import { useSystem } from '../../hooks/useSystem.js';
import { useFetch }  from '../../hooks/useFetch.js';

// ── Constantes ────────────────────────────────────────────────────────────────

const DICE_TYPES = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];

const INITIAL_COUNTS = Object.fromEntries(DICE_TYPES.map(d => [d, 0]));


// ── Hook animation — fusionne tous les types en un seul groupe/wave ───────────
const buildFreeDiceAnimSeq = (raw, ctx) => {
    const { counts } = ctx.systemData;
    const activeDiceTypes = DICE_TYPES.filter(d => counts[d] > 0);

    const diceTypeParts = [];
    const diceValues    = [];

    activeDiceTypes.forEach((dType, idx) => {
        const count = counts[dType];
        const group = raw.groups[idx]; // même ordre que la notation construite

        if (dType === 'd100') {
            // Chaque d100 → 1d100 (dizaines) + 1d10 (unités)
            group.values.forEach(v => {
                diceTypeParts.push('1d100+1d10');
                diceValues.push(
                    v === 100 ? 0 : Math.floor(v / 10) * 10,
                    v % 10
                );
            });
        } else {
            diceTypeParts.push(`${count}${dType}`);
            diceValues.push(...group.values);
        }
    });

    if (diceTypeParts.length === 0) return null;

    return {
        mode: 'single',
        groups: [{
            id:       'free-roll',
            diceType: diceTypeParts.join('+'), // ex: "2d6+1d100+1d10+1d8"
            color:    'default',
            label:    ctx.label || 'Jet libre',
            waves:    [{ dice: diceValues }],  // toutes les valeurs en une seule wave
        }],
    };
};

// ── SVG des dés — niveau module ───────────────────────────────────────────────

const DieSVG = ({ type, active }) => {
    const color = active
        ? 'var(--color-accent)'
        : 'var(--color-text-muted)';

    const shapes = {
        d4: (
            <polygon
                points="24,4 44,40 4,40"
                fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round"
            />
        ),
        d6: (
            <rect
                x="6" y="6" width="36" height="36" rx="4"
                fill="none" stroke={color} strokeWidth="2"
            />
        ),
        d8: (
            <polygon
                points="24,4 44,24 24,44 4,24"
                fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round"
            />
        ),
        d10: (
            <polygon
                points="24,4 42,18 36,40 12,40 6,18"
                fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round"
            />
        ),
        d12: (
            <polygon
                points="24,4 40,13 44,30 32,44 16,44 4,30 8,13"
                fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round"
            />
        ),
        d20: (
            <>
                <polygon
                    points="24,2 42,13 42,35 24,46 6,35 6,13"
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"
                />
                <polygon
                    points="24,2 42,13 6,13"
                    fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" opacity="0.7"
                />
                <line x1="24" y1="2"  x2="24" y2="46" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
                <line x1="6"  y1="13" x2="42" y2="35" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
                <line x1="42" y1="13" x2="6"  y2="35" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
            </>
        ),
        d100: (
            <>
                <circle cx="24" cy="24" r="20" fill="none" stroke={color} strokeWidth="2" />
                <text x="24" y="29" textAnchor="middle"
                      fontSize="11" fill={color} fontFamily="monospace" fontWeight="bold">
                    %
                </text>
            </>
        ),
    };

    return (
        <svg viewBox="0 0 48 48" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
            {shapes[type]}
        </svg>
    );
};

// ── Sous-composant compteur de dé — niveau module ─────────────────────────────

const DieCounter = ({ type, count, onChange }) => {
    const active = count > 0;
    return (
        <div className="flex flex-col items-center gap-1">
            {/* Icône cliquable → ajoute 1 */}
            <button
                onClick={() => onChange(count + 1)}
                className="transition-opacity hover:opacity-80"
                title={`Ajouter un ${type}`}
            >
                <DieSVG type={type} active={active} />
            </button>

            {/* Label */}
            <span
                className="text-[10px] font-mono font-bold"
                style={{ color: active ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
            >
                {type.toUpperCase()}
            </span>

            {/* Contrôles count */}
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onChange(Math.max(0, count - 1))}
                    disabled={count === 0}
                    className="w-5 h-5 text-xs font-bold border border-default flex items-center justify-center
                               hover:border-danger hover:text-danger disabled:opacity-30 disabled:cursor-not-allowed
                               transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                >−</button>

                <span
                    className="w-5 text-center text-xs font-mono font-bold tabular-nums"
                    style={{ color: active ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
                >
                    {count}
                </span>

                <button
                    onClick={() => onChange(count + 1)}
                    className="w-5 h-5 text-xs font-bold border border-default flex items-center justify-center
                               hover:border-success hover:text-success transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                >+</button>
            </div>
        </div>
    );
};

// ── Composant principal ───────────────────────────────────────────────────────

const FreeDiceModal = ({
                           characterId   = null,
                           characterName = null,
                           sessionId     = null,
                           isGM          = false,
                           defaultLabel  = 'Jet libre',
                           onClose,
                       }) => {
    const { apiBase }   = useSystem();
    const fetchWithAuth = useFetch();

    // ── État ──────────────────────────────────────────────────────────────────
    const [counts,    setCounts]    = useState({ ...INITIAL_COUNTS });
    const [modifier,  setModifier]  = useState(0);
    const [label,     setLabel]     = useState('');
    const [isPublic,  setIsPublic]  = useState(false);
    const [result,    setResult]    = useState(null);  // null | { groups, modifier, total, label }
    const [rolling,   setRolling]   = useState(false);
    const [error,     setError]     = useState('');

    const hasContext = !!apiBase;
    const totalDice  = Object.values(counts).reduce((s, n) => s + n, 0);
    const canRoll    = totalDice > 0 && !rolling;

    // ── Construction notation ─────────────────────────────────────────────────
    // Un groupe par type de dé présent → array de notations
    // Le modificateur est ajouté au dernier groupe
    const buildNotation = useCallback(() => {
        const parts = DICE_TYPES
            .filter(d => counts[d] > 0)
            .map(d => `${counts[d]}${d}`);

        if (parts.length === 0) return null;

        if (modifier !== 0) {
            // Ajoute le modificateur au dernier groupe
            const last = parts[parts.length - 1];
            parts[parts.length - 1] = modifier > 0
                ? `${last}+${modifier}`
                : `${last}${modifier}`;
        }

        return parts.length === 1 ? parts[0] : parts;
    }, [counts, modifier]);

    // ── Lancement ─────────────────────────────────────────────────────────────
    const handleRoll = useCallback(async (keepConfig = false) => {
        if (!canRoll && !keepConfig) return;
        setRolling(true);
        setError('');

        const notation = buildNotation();
        if (!notation) { setRolling(false); return; }

        const effectiveLabel = label.trim() || defaultLabel;
        console.log(`hasContext: ${hasContext}`);
        const shouldPersist  = hasContext && (!isGM || isPublic);

        const ctx = {
            apiBase,
            fetchFn:       fetchWithAuth,
            characterId,
            characterName,
            sessionId: sessionId?.id ?? sessionId ?? null,
            rollType:      'free_roll',
            label:         effectiveLabel,
            persistHistory: shouldPersist,
            systemData:    { counts: { ...counts }, modifier, label: effectiveLabel },
        };

        try {
            const raw = await roll(notation, ctx, {buildAnimationSequence: buildFreeDiceAnimSeq,});
            // Calcul du total global : somme des totaux de chaque groupe + modifier
            // (le modifier est déjà dans le dernier groupe via la notation,
            //  donc on prend la somme brute des groupes)
            const diceTotal = raw.groups.reduce((s, g) => s + g.total, 0);

            setResult({
                groups:   raw.groups,
                modifier,
                total:    diceTotal,
                label:    effectiveLabel,
                notation: Array.isArray(notation) ? notation : [notation],
            });
        } catch (err) {
            setError(err?.message ?? 'Erreur lors du lancer.');
        } finally {
            setRolling(false);
        }
    }, [
        canRoll, buildNotation, label, defaultLabel, hasContext,
        isGM, isPublic, apiBase, fetchWithAuth, characterId,
        characterName, sessionId, counts, modifier,
    ]);

    // Relancer — même config, on repasse directement par handleRoll
    const handleReroll = useCallback(() => {
        setResult(null);
        // Petit timeout pour laisser le state se vider avant de relancer
        setTimeout(() => handleRoll(true), 0);
    }, [handleRoll]);

    // ── Helpers affichage résultat ────────────────────────────────────────────
    // Infère le type de dé depuis la notation d'un groupe ("2d6+3" → "D6")
    const inferLabel = (notation) => {
        const m = notation?.match(/d(\d+)/i);
        return m ? `D${m[1]}` : notation;
    };

    // Extrait les valeurs brutes de dés uniquement (sans modificateur)
    // Le group.values contient déjà les faces des dés, pas le modificateur
    const getDiceValues = (group) => group.values ?? [];

    // ── Rendu ─────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div
                className="rounded-lg shadow-2xl w-full max-w-md flex flex-col"
                style={{
                    background: 'var(--color-surface)',
                    border:     '1px solid var(--color-border)',
                    fontFamily: 'var(--font-mono, monospace)',
                    maxHeight:  '90vh',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* ── Header ───────────────────────────────────────────────── */}
                <div
                    className="flex items-center justify-between px-5 py-4 shrink-0"
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                    <h2
                        className="text-sm font-bold uppercase tracking-widest"
                        style={{ color: 'var(--color-primary)' }}
                    >
                        🎲 Lanceur de dés
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-lg leading-none hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--color-text-muted)' }}
                    >✕</button>
                </div>

                <div className="flex-1 overflow-y-auto">

                    {/* ── État : COMPOSE ────────────────────────────────────── */}
                    {!result && (
                        <div className="px-5 py-4 space-y-5">

                            {/* Grille de dés */}
                            <div className="grid grid-cols-4 gap-3 justify-items-center">
                                {DICE_TYPES.map(type => (
                                    <DieCounter
                                        key={type}
                                        type={type}
                                        count={counts[type]}
                                        onChange={n => setCounts(prev => ({ ...prev, [type]: n }))}
                                    />
                                ))}
                                {/* Bouton reset — 8e cellule */}
                                <div className="flex flex-col items-center justify-end pb-1">
                                    <button
                                        onClick={() => { setCounts({ ...INITIAL_COUNTS }); setModifier(0); }}
                                        className="text-[10px] font-mono border border-default px-2 py-1
                                                   hover:border-danger hover:text-danger transition-colors"
                                        style={{ color: 'var(--color-text-muted)' }}
                                        title="Réinitialiser"
                                    >Reset</button>
                                </div>
                            </div>

                            {/* Modificateur */}
                            <div>
                                <label
                                    className="block text-[10px] font-mono uppercase tracking-widest mb-1.5"
                                    style={{ color: 'var(--color-text-muted)' }}
                                >
                                    Modificateur
                                </label>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setModifier(m => m - 1)}
                                        className="w-8 h-8 border border-default font-mono font-bold
                                                   hover:border-danger hover:text-danger transition-colors"
                                        style={{ color: 'var(--color-text-muted)' }}
                                    >−</button>
                                    <input
                                        type="number"
                                        value={modifier}
                                        onChange={e => setModifier(Number(e.target.value))}
                                        className="w-16 text-center font-mono font-bold text-sm border px-2 py-1.5 rounded"
                                        style={{
                                            background:   'var(--color-surface-alt)',
                                            border:       '1px solid var(--color-border)',
                                            color:        modifier > 0
                                                ? 'var(--color-success)'
                                                : modifier < 0
                                                    ? 'var(--color-danger)'
                                                    : 'var(--color-text)',
                                        }}
                                    />
                                    <button
                                        onClick={() => setModifier(m => m + 1)}
                                        className="w-8 h-8 border border-default font-mono font-bold
                                                   hover:border-success hover:text-success transition-colors"
                                        style={{ color: 'var(--color-text-muted)' }}
                                    >+</button>

                                    {modifier !== 0 && (
                                        <button
                                            onClick={() => setModifier(0)}
                                            className="text-[10px] font-mono ml-1"
                                            style={{ color: 'var(--color-text-muted)' }}
                                        >↺ 0</button>
                                    )}
                                </div>
                            </div>

                            {/* Label */}
                            <div>
                                <label
                                    className="block text-[10px] font-mono uppercase tracking-widest mb-1.5"
                                    style={{ color: 'var(--color-text-muted)' }}
                                >
                                    Label <span className="normal-case">(optionnel)</span>
                                </label>
                                <input
                                    type="text"
                                    value={label}
                                    onChange={e => setLabel(e.target.value)}
                                    placeholder={defaultLabel}
                                    className="w-full px-3 py-1.5 text-sm border rounded"
                                    style={{
                                        background: 'var(--color-surface-alt)',
                                        border:     '1px solid var(--color-border)',
                                        color:      'var(--color-text)',
                                    }}
                                />
                            </div>

                            {/* Case "Jet public" — GM uniquement */}
                            {isGM && (
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isPublic}
                                        onChange={e => setIsPublic(e.target.checked)}
                                        className="w-4 h-4 cursor-pointer"
                                        style={{ accentColor: 'var(--color-primary)' }}
                                    />
                                    <span
                                        className="text-xs font-mono"
                                        style={{ color: 'var(--color-text-muted)' }}
                                    >
                                        Jet public <span className="opacity-60">(visible dans l'historique)</span>
                                    </span>
                                </label>
                            )}

                            {/* Résumé notation */}
                            {totalDice > 0 && (
                                <p
                                    className="text-xs font-mono text-center"
                                    style={{ color: 'var(--color-text-muted)' }}
                                >
                                    {DICE_TYPES
                                        .filter(d => counts[d] > 0)
                                        .map(d => `${counts[d]}${d.toUpperCase()}`)
                                        .join(' + ')
                                    }
                                    {modifier !== 0 && (
                                        <span style={{ color: modifier > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                            {modifier > 0 ? ` +${modifier}` : ` ${modifier}`}
                                        </span>
                                    )}
                                </p>
                            )}

                            {error && (
                                <p className="text-xs font-mono text-center"
                                   style={{ color: 'var(--color-danger)' }}>
                                    ⚠ {error}
                                </p>
                            )}
                        </div>
                    )}

                    {/* ── État : RESULT ─────────────────────────────────────── */}
                    {result && (
                        <div className="px-5 py-4 space-y-4">
                            {/* Label du jet */}
                            <p
                                className="text-xs font-mono uppercase tracking-widest text-center"
                                style={{ color: 'var(--color-text-muted)' }}
                            >
                                {result.label}
                            </p>

                            {/* Détail par groupe */}
                            <div className="space-y-2">
                                {result.groups.map((group, i) => {
                                    const diceVals = getDiceValues(group);
                                    const dLabel   = inferLabel(group.notation);
                                    // Total du groupe sans le modificateur (on l'affiche séparément)
                                    // group.total inclut le modificateur si présent dans la notation
                                    // On affiche les faces brutes
                                    const faceSum  = diceVals.reduce((s, v) => s + v, 0);

                                    return (
                                        <div
                                            key={i}
                                            className="flex items-center gap-3 py-1.5 border-b"
                                            style={{ borderColor: 'var(--color-border)' }}
                                        >
                                            <span
                                                className="text-[10px] font-mono w-12 shrink-0"
                                                style={{ color: 'var(--color-text-muted)' }}
                                            >
                                                {dLabel}
                                            </span>
                                            <div className="flex flex-wrap gap-1.5 flex-1">
                                                {diceVals.map((v, j) => (
                                                    <span
                                                        key={j}
                                                        className="w-8 h-8 flex items-center justify-center text-sm font-mono font-bold border rounded"
                                                        style={{
                                                            background: 'var(--color-surface-alt)',
                                                            border:     '1px solid var(--color-border)',
                                                            color:      'var(--color-text)',
                                                        }}
                                                    >{v}</span>
                                                ))}
                                            </div>
                                            <span
                                                className="text-xs font-mono tabular-nums shrink-0"
                                                style={{ color: 'var(--color-text-muted)' }}
                                            >{faceSum}</span>
                                        </div>
                                    );
                                })}

                                {/* Ligne modificateur si présent */}
                                {result.modifier !== 0 && (
                                    <div
                                        className="flex items-center justify-between py-1.5 border-b"
                                        style={{ borderColor: 'var(--color-border)' }}
                                    >
                                        <span
                                            className="text-[10px] font-mono"
                                            style={{ color: 'var(--color-text-muted)' }}
                                        >Modificateur</span>
                                        <span
                                            className="text-xs font-mono font-bold tabular-nums"
                                            style={{
                                                color: result.modifier > 0
                                                    ? 'var(--color-success)'
                                                    : 'var(--color-danger)',
                                            }}
                                        >
                                            {result.modifier > 0 ? `+${result.modifier}` : result.modifier}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Total */}
                            <div className="text-center pt-1">
                                <p
                                    className="text-[10px] font-mono uppercase tracking-widest mb-1"
                                    style={{ color: 'var(--color-text-muted)' }}
                                >Total</p>
                                <p
                                    className="text-5xl font-black font-mono tabular-nums"
                                    style={{ color: 'var(--color-primary)' }}
                                >
                                    {result.total}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Footer actions ────────────────────────────────────────── */}
                <div
                    className="shrink-0 px-5 py-4 flex gap-2"
                    style={{ borderTop: '1px solid var(--color-border)' }}
                >
                    {!result ? (
                        <>
                            <button
                                onClick={onClose}
                                className="flex-1 py-2.5 text-sm font-mono border rounded transition-colors"
                                style={{
                                    border:  '1px solid var(--color-border)',
                                    color:   'var(--color-text-muted)',
                                    background: 'transparent',
                                }}
                            >Annuler</button>
                            <button
                                onClick={() => handleRoll(false)}
                                disabled={!canRoll}
                                className="flex-2 px-6 py-2.5 text-sm font-bold uppercase tracking-wide rounded transition-all"
                                style={{
                                    flex:       2,
                                    background: canRoll ? 'var(--color-primary)' : 'var(--color-border)',
                                    color:      canRoll ? 'var(--color-bg, #fff)' : 'var(--color-text-muted)',
                                    border:     'none',
                                    cursor:     canRoll ? 'pointer' : 'not-allowed',
                                }}
                            >
                                {rolling ? 'Lancer…' : 'Lancer'}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setResult(null)}
                                className="flex-1 py-2.5 text-sm font-mono border rounded transition-colors"
                                style={{
                                    border:     '1px solid var(--color-border)',
                                    color:      'var(--color-text-muted)',
                                    background: 'transparent',
                                }}
                            >Modifier</button>
                            <button
                                onClick={handleReroll}
                                disabled={rolling}
                                className="flex-1 py-2.5 text-sm font-mono border rounded transition-colors"
                                style={{
                                    border:     '1px solid var(--color-border)',
                                    color:      'var(--color-accent)',
                                    background: 'transparent',
                                }}
                            >Relancer</button>
                            <button
                                onClick={onClose}
                                className="flex-1 py-2.5 text-sm font-bold uppercase tracking-wide rounded"
                                style={{
                                    background: 'var(--color-primary)',
                                    color:      'var(--color-bg, #fff)',
                                    border:     'none',
                                }}
                            >Fermer</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FreeDiceModal;