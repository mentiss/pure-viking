// src/client/src/systems/tecumah/components/modals/TecumahDiceModal.jsx
// Modale de jet de dés joueur — D6 System + Wild Die.
// Neutre : accepte des valeurs initiales optionnelles (préremplissage depuis
// la fiche ou le combat), mais n'a aucune connaissance du contexte appelant.
//
// Étape 1 — Sélection attribut / compétence + difficulté
// Étape 2 — Modificateurs (malus blessure, bonus dés, ressource, bonus résultat)
// Étape 3 — Résultat

import React, { useState, useCallback } from 'react';
import { roll, RollError }   from '../../../../tools/diceEngine.js';
import { useSocket }         from '../../../../context/SocketContext.jsx';
import { useFetch }          from '../../../../hooks/useFetch.js';
import { useSystem }         from '../../../../hooks/useSystem.js';
import tecumahConfig, {
    ATTRIBUTS, ATTRIBUT_LABELS, SKILLS_BY_ATTR, SKILLS,
    DIFFICULTY_LEVELS,
    pipsToNotation, pipsToPool, pipsResidual, getBlessureMalus, BLESSURE_LABELS,
} from '../../config.jsx';
import DieFace from "../DieFace.jsx";

const MAX_PP = 3;

// ─────────────────────────────────────────────────────────────────────────────

const TecumahDiceModal = ({
                              character,
                              onCharacterUpdate,
                              onClose,
                              activeGMSession,
                              // Préremplissage optionnel — pas de logique métier associée
                              initialAttrKey    = null,
                              initialCompKey    = null,
                              initialDifficulte = null,
                          }) => {
    const { apiBase }   = useSystem();
    const fetchWithAuth = useFetch();
    const socket        = useSocket();

    const [step, setStep]     = useState(1);
    const [rolling, setRolling] = useState(false);
    const [result,  setResult]  = useState(null);

    // ── Étape 1 ───────────────────────────────────────────────────────────────
    const [attrKey,    setAttrKey]    = useState(initialAttrKey);
    const [compKey,    setCompKey]    = useState(initialCompKey);
    const [difficulte, setDifficulte] = useState(initialDifficulte);

    // ── Étape 2 ───────────────────────────────────────────────────────────────
    const [bonusDice,     setBonusDice]     = useState(0);
    const [bonusResultat, setBonusResultat] = useState(0);
    const [depense,       setDepense]       = useState(null); // null | 'pp' | 'pd'
    const [ppCount,       setPpCount]       = useState(1);

    // ── Calculs dérivés ───────────────────────────────────────────────────────

    const attrPips       = attrKey ? (character[attrKey] ?? 3) : 0;
    const compPips       = compKey ? (character[compKey] ?? 0) : 0;
    const basePips       = attrPips + compPips;
    const basePool       = pipsToPool(basePips);
    const residual       = pipsResidual(basePips);
    const blessureMalus  = getBlessureMalus(character.blessure_niveau ?? 0);

    const ppDispo = character.points_personnage ?? 0;
    const pdDispo = character.points_destin     ?? 0;

    let poolFinal = Math.max(0, basePool + bonusDice - blessureMalus);
    if (depense === 'pp') poolFinal += ppCount;
    if (depense === 'pd') poolFinal  = poolFinal * 2;
    poolFinal = Math.max(1, poolFinal);

    // ── Jet ───────────────────────────────────────────────────────────────────

    const handleRoll = useCallback(async () => {
        if (rolling || !attrKey) return;
        setRolling(true);

        const ctx = {
            apiBase,
            fetchFn:       fetchWithAuth,
            characterId:   character.id,
            characterName: character.prenom ?? character.nom,
            sessionId:     activeGMSession ?? null,
            rollType:      'tecumah_skill',
            label:         compKey
                ? `${ATTRIBUT_LABELS[attrKey]} + ${SKILLS?.find?.(s => s.key === compKey)?.label ?? compKey}`
                : ATTRIBUT_LABELS[attrKey],
            systemData: {
                label:         compKey
                    ? `${ATTRIBUT_LABELS[attrKey]} + ${SKILLS?.find?.(s => s.key === compKey)?.label ?? compKey}`
                    : ATTRIBUT_LABELS[attrKey],
                attrPips,
                compPips,
                bonusDice:     bonusDice ?? 0,
                malusBlessure: blessureMalus,
                bonusResultat: bonusResultat ?? 0,
                depense,
                ppCount:       depense === 'pp' ? Math.min(ppCount, MAX_PP) : 0,
                difficulte,
            },
        };

        try {
            const enriched = tecumahConfig.dice.beforeRoll(ctx);
            const notation = tecumahConfig.dice.buildNotation(enriched);
            const res      = await roll(notation, enriched, tecumahConfig.dice);
            setResult(res);
            setStep(3);

            // Déduction ressources
            if (depense === 'pp') {
                onCharacterUpdate({ ...character, points_personnage: Math.max(0, ppDispo - ppCount) });
            }
            if (depense === 'pd') {
                onCharacterUpdate({ ...character, points_destin: Math.max(0, pdDispo - 1) });
            }

            // Complication → socket
            if (res.isComplication && socket && activeGMSession) {
                socket.emit('update-session-resources', {
                    sessionId: activeGMSession,
                    field:     'complications',
                    delta:     1,
                });
            }
        } catch (err) {
            console.error('[TecumahDiceModal]', err);
        } finally {
            setRolling(false);
        }
    }, [rolling, attrKey, compKey, attrPips, compPips, bonusDice, bonusResultat,
        blessureMalus, depense, ppCount, difficulte, character, activeGMSession,
        apiBase, fetchWithAuth, socket, onCharacterUpdate, ppDispo, pdDispo]);

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={e => { if (e.target === e.currentTarget && step !== 3) onClose(); }}
        >
            <div
                className="rounded-xl shadow-2xl w-full max-w-2xl flex flex-col"
                style={{ background: 'var(--color-bg)', border: '2px solid var(--color-border)', maxHeight: '90vh' }}
            >
                {/* Indicateur étape */}
                <div className="flex justify-center gap-2 pt-4 px-5">
                    {[1, 2, 3].map(s => (
                        <div key={s} style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: step === s ? 'var(--color-accent)' : 'var(--color-border)',
                        }} />
                    ))}
                </div>

                <div className="overflow-y-auto flex-1">
                    {step === 1 && (
                        <Step1
                            character={character}
                            attrKey={attrKey}
                            compKey={compKey}
                            onAttrKey={k => { setAttrKey(k); setCompKey(null); }}
                            onCompKey={setCompKey}
                            poolLabel={attrKey ? pipsToNotation(basePips) : '—'}
                            onClose={onClose}
                            onNext={() => setStep(2)}
                        />
                    )}

                    {step === 2 && (
                        <Step2
                            character={character}
                            poolFinal={poolFinal}
                            residual={residual}
                            blessureMalus={blessureMalus}
                            bonusDice={bonusDice}
                            bonusResultat={bonusResultat}
                            depense={depense}
                            ppCount={ppCount}
                            ppDispo={ppDispo}
                            pdDispo={pdDispo}
                            difficulte={difficulte}
                            onDifficulte={setDifficulte}
                            onBonusDice={setBonusDice}
                            onBonusResultat={setBonusResultat}
                            onDepense={d => { setDepense(d); if (d !== 'pp') setPpCount(1); }}
                            onPpCount={setPpCount}
                            rolling={rolling}
                            onBack={() => setStep(1)}
                            onRoll={handleRoll}
                        />
                    )}

                    {step === 3 && result && (
                        <Step3 result={result} onClose={onClose} />
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Étape 1 — Sélection ─────────────────────────────────────────────────────

const Step1 = ({ character, attrKey, compKey, onAttrKey, onCompKey, poolLabel, onClose, onNext }) => (
    <div className="flex flex-col gap-4 p-5">
        <h2 style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '1.1rem' }}>Jet de dés</h2>

        {/* Attributs + compétences — même structure que la fiche */}
        <div>
            <p style={labelSt}>Attribut &amp; Compétence</p>
            <div className="grid grid-cols-2 gap-0.5 mt-1 rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
                {ATTRIBUTS.map(a => {
                    const ap         = character[a] ?? 3;
                    const attrActive = attrKey === a && !compKey;
                    return (
                        <div key={a}>
                            {/* Ligne attribut */}
                            <button
                                onClick={() => onAttrKey(a)}
                                className="w-full text-left px-3 py-1.5 flex justify-between items-center"
                                style={{
                                    background: attrActive ? 'var(--color-primary)' : 'var(--color-surface)',
                                    color:      attrActive ? '#fff' : 'var(--color-primary)',
                                    fontWeight: 700, fontSize: '0.82rem',
                                }}
                            >
                                <span>{ATTRIBUT_LABELS[a]}</span>
                                <span style={{ fontWeight: 400, opacity: 0.8 }}>{pipsToNotation(ap)}</span>
                            </button>

                            {/* Compétences de l'attribut */}
                            {(SKILLS_BY_ATTR[a] ?? []).map(skill => {
                                const cp     = character[skill.key] ?? 0;
                                const total  = ap + cp;
                                const active = attrKey === a && compKey === skill.key;
                                if(cp > 0)
                                return (
                                    <button
                                        key={skill.key}
                                        onClick={() => { onAttrKey(a); onCompKey(skill.key); }}
                                        className="w-full text-left pl-6 pr-3 py-1 flex justify-between items-center"
                                        style={{
                                            background: active ? 'var(--color-surface-alt)' : 'transparent',
                                            color:      cp > 0 ? 'var(--color-text)' : 'var(--color-text-muted)',
                                            fontSize:   '0.8rem',
                                            fontWeight: active ? 700 : 400,
                                        }}
                                    >
                                        <span>{skill.label}</span>
                                        {cp > 0 && (
                                            <span style={{ color: 'var(--color-accent)', fontSize: '0.75rem' }}>
                                                {pipsToNotation(total)}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Pool */}
        {attrKey && (
            <div className="rounded-lg px-4 py-2 text-center" style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Pool de base</p>
                <p style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--color-primary)' }}>{poolLabel}</p>
            </div>
        )}

        <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2 rounded text-sm" style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)' }}>
                Annuler
            </button>
            <button
                onClick={onNext}
                disabled={!attrKey}
                className="flex-1 py-2 rounded text-sm font-semibold"
                style={{ background: attrKey ? 'var(--color-primary)' : 'var(--color-border)', color: attrKey ? '#fff' : 'var(--color-text-muted)' }}
            >
                Suivant →
            </button>
        </div>
    </div>
);

// ─── Étape 2 — Modificateurs ─────────────────────────────────────────────────

const Step2 = ({
                   character, poolFinal, residual, blessureMalus,
                   bonusDice, bonusResultat, depense, ppCount, ppDispo, pdDispo, difficulte,
                   onDifficulte, onBonusDice, onBonusResultat, onDepense, onPpCount,
                   rolling, onBack, onRoll,
               }) => (
    <div className="flex flex-col gap-4 p-5">
        <h2 style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '1.1rem' }}>Modificateurs</h2>

        {/* Malus blessure */}
        {blessureMalus > 0 && (
            <div className="px-3 py-2 rounded" style={{ background: 'rgba(139,0,0,0.1)', border: '1px solid var(--color-danger)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-danger)' }}>
                    ⚠️ Malus blessure : −{blessureMalus}D ({BLESSURE_LABELS[character.blessure_niveau ?? 0]})
                </span>
            </div>
        )}

        {/* Bonus/Malus dés */}
        <div>
            <p style={labelSt}>Bonus / Malus dés</p>
            <SpinInput value={bonusDice} onChange={onBonusDice} signed />
        </div>

        {/* Dépense ressource */}
        <div>
            <p style={labelSt}>Ressource (PP et PD sont exclusifs)</p>
            <div className="flex gap-2 mt-1">
                {[
                    { id: null, label: 'Aucun' },
                    { id: 'pp', label: `PP (+1D/PP max 3) · dispo : ${ppDispo}` },
                    { id: 'pd', label: `PD (×2 pool) · dispo : ${pdDispo}`     },
                ].map(opt => (
                    <button
                        key={String(opt.id)}
                        onClick={() => onDepense(opt.id)}
                        disabled={(opt.id === 'pp' && ppDispo < 1) || (opt.id === 'pd' && pdDispo < 1)}
                        className="flex-1 py-1.5 rounded text-xs"
                        style={{
                            background: depense === opt.id ? 'var(--color-accent)' : 'var(--color-surface)',
                            color:      depense === opt.id ? 'var(--color-bg)' : 'var(--color-text)',
                            border:     `1px solid ${depense === opt.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
                            fontWeight: depense === opt.id ? 700 : 400,
                            opacity:    (opt.id === 'pp' && ppDispo < 1) || (opt.id === 'pd' && pdDispo < 1) ? 0.4 : 1,
                        }}
                    >
                        {opt.id === null ? opt.label : opt.id === 'pp' ? `PP (${ppDispo})` : `PD (${pdDispo})`}
                    </button>
                ))}
            </div>

            {depense === 'pp' && (
                <div className="flex gap-2 mt-2">
                    {[1, 2, 3].map(n => (
                        <button
                            key={n}
                            onClick={() => onPpCount(n)}
                            disabled={ppDispo < n}
                            className="flex-1 py-1 rounded text-sm"
                            style={{
                                background: ppCount === n ? 'var(--color-secondary)' : 'var(--color-surface)',
                                color:      ppCount === n ? '#fff' : 'var(--color-text)',
                                border:     '1px solid var(--color-border)',
                                opacity:    ppDispo < n ? 0.4 : 1,
                            }}
                        >
                            {n} PP (+{n}D)
                        </button>
                    ))}
                </div>
            )}
        </div>

        {/* Bonus/Malus résultat */}
        <div>
            <p style={labelSt}>Bonus / Malus résultat (couvert, environnement…)</p>
            <SpinInput value={bonusResultat} onChange={onBonusResultat} signed />
        </div>

        {/* Difficulté */}
        <div>
            <p style={labelSt}>Difficulté (ND)</p>
            <div className="flex flex-wrap gap-1 mt-1 mb-2">
                {DIFFICULTY_LEVELS.map(d => (
                    <button
                        key={d.value}
                        onClick={() => onDifficulte(difficulte === d.value ? null : d.value)}
                        className="px-2 py-0.5 rounded text-xs"
                        style={{
                            background: difficulte === d.value ? 'var(--color-accent)' : 'var(--color-surface)',
                            color:      difficulte === d.value ? 'var(--color-bg)' : 'var(--color-text-muted)',
                            border:     '1px solid var(--color-border)',
                        }}
                    >
                        {d.label} ({d.value})
                    </button>
                ))}
                <button
                    onClick={() => onDifficulte(null)}
                    className="px-2 py-0.5 rounded text-xs"
                    style={{
                        background: difficulte == null ? 'var(--color-surface-alt)' : 'var(--color-surface)',
                        border: '1px solid var(--color-border)', color: 'var(--color-text-muted)',
                    }}
                >
                    Sans
                </button>
            </div>
            <input
                type="number" min={1}
                value={difficulte ?? ''}
                onChange={e => onDifficulte(e.target.value ? Number(e.target.value) : null)}
                placeholder="Valeur libre…"
                className="w-full rounded px-2 py-1 text-sm"
                style={inputSt}
            />
        </div>

        {/* Pool final */}
        <div className="rounded-lg px-4 py-3 text-center" style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Pool final</p>
            <p style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--color-primary)' }}>
                {poolFinal}D {residual > 0 ? `+${residual}` : ''}
            </p>
            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                {poolFinal === 1 ? 'Wild Die seul' : `${poolFinal - 1}D ${((poolFinal - 1) > 1) ? 'normaux' : 'normal'} + Wild Die`}
            </p>
        </div>

        <div className="flex gap-2">
            <button onClick={onBack} className="flex-1 py-2 rounded text-sm" style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)' }}>
                ← Retour
            </button>
            <button
                onClick={onRoll}
                disabled={rolling}
                className="flex-1 py-2 rounded text-sm font-semibold"
                style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
            >
                {rolling ? 'Lancer…' : '🎲 Lancer'}
            </button>
        </div>
    </div>
);

// ─── Étape 3 — Résultat ───────────────────────────────────────────────────────

const Step3 = ({ result, onClose }) => {
    const {
        normalValues = [], normalSum = 0,
        wildValues = [], wildSum = 0, wildExploded, wildInitial,
        isComplication, residualPips = 0, bonusResultat = 0,
        total, difficulte, reussite,
        depense, ppCount = 0,
    } = result;

    return (
        <div className="flex flex-col gap-4 p-5">
            <h2 style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '1.1rem' }}>Résultat</h2>

            {isComplication && (
                <div className="rounded-lg px-3 py-2 text-center" style={{ background: 'rgba(139,0,0,0.15)', border: '1px solid var(--color-danger)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-danger)' }}>⚡ Complication ! (Wild Die = 1)</span>
                </div>
            )}

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

            <div
                className="rounded-xl py-4 text-center"
                style={{
                    background: reussite === true ? 'rgba(107,142,35,0.15)' : reussite === false ? 'rgba(139,0,0,0.1)' : 'var(--color-surface-alt)',
                    border:     `2px solid ${reussite === true ? 'var(--color-success)' : reussite === false ? 'var(--color-danger)' : 'var(--color-border)'}`,
                }}
            >
                {(residualPips > 0 || bonusResultat !== 0) && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                        {normalSum} + {wildSum}
                        {residualPips > 0 && ` + ${residualPips}pip`}
                        {bonusResultat > 0 && ` + ${bonusResultat}`}
                        {bonusResultat < 0 && ` ${bonusResultat}`}
                    </p>
                )}
                <p style={{ fontWeight: 900, fontSize: '2.5rem', lineHeight: 1, color: reussite === true ? 'var(--color-success)' : reussite === false ? 'var(--color-danger)' : 'var(--color-text)' }}>
                    {total}
                </p>
                {difficulte != null ? (
                    <p style={{ fontWeight: 700, marginTop: 4, color: reussite ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {reussite ? '✓ Succès' : '✗ Échec'} vs ND {difficulte}
                    </p>
                ) : (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: 4 }}>Pas de difficulté</p>
                )}
            </div>

            {depense === 'pp' && <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>{ppCount} PP dépensé{ppCount > 1 ? 's' : ''}</p>}
            {depense === 'pd' && <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>1 PD dépensé — pool doublé</p>}

            <button
                onClick={onClose}
                className="w-full py-2 rounded font-semibold text-sm"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
            >
                Fermer
            </button>
        </div>
    );
};

// ─── Sous-composants internes ─────────────────────────────────────────────────

// Saisie numérique avec boutons +/− et input direct
const SpinInput = ({ value, onChange, signed = false }) => (
    <div className="flex items-center gap-2 mt-1">
        <button
            onClick={() => onChange(value - 1)}
            className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        >−</button>
        <input
            type="number"
            value={value}
            onChange={e => onChange(Number(e.target.value) || 0)}
            className="rounded text-center text-sm font-bold flex-1"
            style={{ ...inputSt, padding: '4px 8px' }}
        />
        <button
            onClick={() => onChange(value + 1)}
            className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        >+</button>
        <span style={{ fontSize: '0.8rem', color: value > 0 ? 'var(--color-success)' : (value === 0) ? 'var(--color-secondary)' : 'var(--color-danger)', minWidth: 28 }}>
                {value > 0 ? `+${value}` : value}D
            </span>
    </div>
);

const labelSt = { fontSize: '0.8rem', color: 'var(--color-text-muted)' };
const inputSt = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' };

export default TecumahDiceModal;