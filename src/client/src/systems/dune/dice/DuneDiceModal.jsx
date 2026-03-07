// src/client/src/systems/dune/dice/DuneDiceModal.jsx
// Modale de jet 2D20 pour le système Dune.
//
// 4 étapes :
//   1 — Sélection : compétence + principe + difficulté
//   2 — Dépenses  : impulsions / menace / détermination
//   3 — Résultats : dés, succès, complications
//   4 — Post-jet  : convertir excédent en impulsions (si applicable)
//
// Logique métier : duneConfig.dice (config.jsx)
// Persistance historique : POST /api/dune/dice/roll
// Socket : update-session-resources pour impulsions/menace/complications

import React, { useState, useCallback, useEffect } from 'react';
import { DiceRoll } from '@dice-roller/rpg-dice-roller';
import { useSocket }   from '../../../context/SocketContext.jsx';
import { useSession }  from '../../../context/SessionContext.jsx';
import { useFetch }    from '../../../hooks/useFetch.js';
import { useSystem }   from '../../../hooks/useSystem.js';
import duneConfig      from '../config.jsx';

// ── Constantes ───────────────────────────────────────────────────────────────

const { IMPULSION_COST, countSuccesses } = duneConfig;
const MAX_DES = 5;

const COMPETENCE_LABELS = {
    analyse:    'Analyse',
    combat:     'Combat',
    discipline: 'Discipline',
    mobilite:   'Mobilité',
    rhetorique: 'Rhétorique',
};
const PRINCIPE_LABELS = {
    devoir:     'Devoir',
    domination: 'Domination',
    foi:        'Foi',
    justice:    'Justice',
    verite:     'Vérité',
};

// ── Sous-composant : affichage d'un dé ───────────────────────────────────────

const DieResult = ({ value, rang, hasSpec }) => {
    let bg, label;
    if (value === 20) {
        bg = 'var(--dune-red)';
        label = '⚡';
    } else if (value <= rang && hasSpec) {
        bg = 'var(--dune-gold)';
        label = '★★';
    } else if (value <= rang) {
        bg = 'var(--dune-success)';
        label = '★';
    } else {
        bg = 'var(--dune-surface-alt)';
        label = null;
    }

    return (
        <div className="flex flex-col items-center gap-0.5">
            <div
                className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm border-2"
                style={{
                    background:   bg,
                    borderColor:  bg,
                    color:        value === 20 ? 'white' : (value <= rang ? 'var(--dune-dark)' : 'var(--dune-text-muted)'),
                }}
            >
                {value}
            </div>
            {label && (
                <span className="text-[9px] font-bold" style={{ color: bg }}>
                    {label}
                </span>
            )}
        </div>
    );
};

// ── Composant principal ───────────────────────────────────────────────────────

/**
 * @param {object}   props
 * @param {object}   props.character        - Personnage complet
 * @param {object}   props.preselect        - { type: 'competence'|'principe', key } (optionnel)
 * @param {Function} props.onClose
 * @param {Function} props.onCharacterUpdate - Pour décrémenter la détermination
 * @param {object}   props.sessionResources  - { impulsions, menace } courants
 */
const DuneDiceModal = ({
                           character,
                           preselect = null,
                           onClose,
                           onCharacterUpdate,
                           sessionResources = { impulsions: 0, menace: 0 },
                       }) => {
    const { apiBase }       = useSystem();
    const fetchWithAuth = useFetch();
    const socket            = useSocket();
    const { activeGMSession } = useSession();

    // ── État de la modale ─────────────────────────────────────────────────
    const [step, setStep] = useState(1);

    // Étape 1
    const [selectedCompetence, setSelectedCompetence] = useState(
        preselect?.type === 'competence'
            ? character.competences.find(c => c.key === preselect.key) ?? null
            : null
    );
    const [selectedPrincipe, setSelectedPrincipe] = useState(
        preselect?.type === 'principe'
            ? character.principes.find(p => p.key === preselect.key) ?? null
            : null
    );
    const [difficulte, setDifficulte] = useState(1);

    // Étape 2
    const [impulsionsDepensees, setImpulsionsDepensees] = useState(0); // 0,1,2,3 dés via imp
    const [menaceGeneree, setMenaceGeneree]             = useState(0); // nb dés via menace
    const [useDetMin, setUseDetMin]                     = useState(false); // détermination active
    const [detMode, setDetMode]                         = useState(null);  // 'reroll' | 'critical'

    // Étape 3
    const [rollResults, setRollResults]   = useState(null); // { results[], succes, complications, ... }
    const [rolling, setRolling]           = useState(false);

    // Étape 4
    const [impulsionsAjoutees, setImpulsionsAjoutees] = useState(false);

    // ── Calculs dérivés ───────────────────────────────────────────────────
    const rang = (selectedCompetence?.rang ?? 0) + (selectedPrincipe?.rang ?? 0);
    const hasSpec = !!selectedCompetence?.specialisation?.trim();
    const nbDes   = 2 + impulsionsDepensees + menaceGeneree;
    const impCout = IMPULSION_COST[impulsionsDepensees] ?? 0;
    const canAddImpDes  = nbDes < MAX_DES && impulsionsDepensees < 3;
    const canAddMenDes  = nbDes < MAX_DES;
    const hasDetermination = character.determination > 0 && !useDetMin;
    const step1Valid = selectedCompetence && selectedPrincipe && difficulte >= 1;

    // ── Réinitialisation dépenses si pool dépasse MAX ─────────────────────
    useEffect(() => {
        if (nbDes > MAX_DES) setMenaceGeneree(prev => Math.max(0, prev - (nbDes - MAX_DES)));
    }, [nbDes]);

    // ── Lancer les dés ────────────────────────────────────────────────────
    const handleRoll = useCallback(async () => {
        if (!step1Valid || rolling) return;
        setRolling(true);

        try {
            const notation = `${nbDes}d20`;
            const diceRoll = new DiceRoll(notation);
            let results    = diceRoll.rolls[0].rolls.map(r => r.value);

            // Détermination mode reroll : on relance et on garde le meilleur
            if (useDetMin && detMode === 'reroll') {
                const roll2    = new DiceRoll(notation);
                const results2 = roll2.rolls[0].rolls.map(r => r.value);
                const { succes: s1 } = countSuccesses(results,  rang, hasSpec);
                const { succes: s2 } = countSuccesses(results2, rang, hasSpec);
                results = s1 >= s2 ? results : results2;
            }

            // Détermination mode critique : on force 1 dé à la valeur du rang
            if (useDetMin && detMode === 'critical') {
                results = [...results];
                const worstIdx = results.reduce((worst, v, i, arr) =>
                    v > arr[worst] ? i : worst, 0);
                results[worstIdx] = 1; // succès critique automatique (valeur 1 ≤ tout rang)
            }

            let { succes, complications } = countSuccesses(results, rang, hasSpec);

            const succesTotal = succes;
            const reussite    = succesTotal >= difficulte;
            const excedent    = Math.max(0, succesTotal - difficulte);

            setRollResults({ results, rang, hasSpec, succes: succesTotal, complications, reussite, excedent });

            // ── Effets post-jet via socket ────────────────────────────────
            if (socket && activeGMSession) {
                // Déduire le coût en impulsions
                if (impCout > 0) {
                    socket.emit('update-session-resources', {
                        sessionId: activeGMSession, field: 'impulsions', delta: -impCout,
                    });
                }
                // Ajouter la menace générée
                if (menaceGeneree > 0) {
                    socket.emit('update-session-resources', {
                        sessionId: activeGMSession, field: 'menace', delta: menaceGeneree,
                    });
                }
                // Complications → compteur GM
                if (complications > 0) {
                    socket.emit('update-session-resources', {
                        sessionId: activeGMSession, field: 'complications', delta: complications,
                    });
                }
            }

            // ── Décrémenter la détermination si utilisée ──────────────────
            if (useDetMin && detMode) {
                onCharacterUpdate?.({ ...character, determination: character.determination - 1 });
            }

            // ── Persistance historique ────────────────────────────────────
            await fetchWithAuth(`${apiBase}/dice/roll`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    character_id:   character.id,
                    character_name: character.nom,
                    session_id:     activeGMSession ?? null,
                    notation,
                    roll_result: JSON.stringify({
                        results, rang, hasSpec, succes: succesTotal,
                        complications, reussite, difficulte,
                        impulsionsCout: impCout, menaceGeneree,
                        useDetermination: !!useDetMin,
                    }),
                    roll_type: 'dune_2d20',
                    successes: succesTotal,
                }),
            }).catch(() => { /* non bloquant */ });

            setStep(3);
        } catch (err) {
            console.error('[DuneDiceModal] Erreur roll:', err);
        } finally {
            setRolling(false);
        }
    }, [step1Valid, rolling, nbDes, rang, hasSpec, difficulte, impCout,
        menaceGeneree, useDetMin, detMode, socket, activeGMSession,
        character, onCharacterUpdate, fetchWithAuth, apiBase]);

    // ── Convertir excédent en impulsions ──────────────────────────────────
    const handleAjouterImpulsions = useCallback(() => {
        if (!rollResults || impulsionsAjoutees || !socket || !activeGMSession) return;
        socket.emit('update-session-resources', {
            sessionId: activeGMSession,
            field: 'impulsions',
            delta: rollResults.excedent,
        });
        setImpulsionsAjoutees(true);
    }, [rollResults, impulsionsAjoutees, socket, activeGMSession]);

    // ── Rendu ─────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div
                className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
                style={{ background: 'var(--dune-surface)', border: '2px solid var(--dune-gold)' }}
            >
                {/* En-tête */}
                <div className="flex items-center justify-between px-4 py-3"
                     style={{ background: 'var(--dune-dark)', borderBottom: '1px solid var(--dune-gold)' }}>
                    <div>
                        <div className="text-sm font-bold" style={{ color: 'var(--dune-gold)' }}>
                            Jet de dés 2D20
                        </div>
                        <div className="text-[10px]" style={{ color: 'var(--dune-sand)' }}>
                            {rang > 0 && `Rang : ${rang}`}
                            {hasSpec && ' · Spécialisation active'}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold px-2 py-1 rounded"
                              style={{ background: 'var(--dune-surface-alt)', color: 'var(--dune-text)' }}>
                            🎲 {nbDes} / {MAX_DES}
                        </span>
                        <button onClick={onClose} style={{ color: 'var(--dune-sand)' }}>✕</button>
                    </div>
                </div>

                <div className="p-4 space-y-4">

                    {/* ── ÉTAPE 1 — Sélection ──────────────────────────── */}
                    {step === 1 && (
                        <>
                            <div className="space-y-3">
                                {/* Compétence */}
                                <div>
                                    <div className="dune-label mb-1">Compétence</div>
                                    <div className="grid grid-cols-3 gap-1">
                                        {character.competences.map(c => (
                                            <button
                                                key={c.key}
                                                onClick={() => setSelectedCompetence(c)}
                                                className="text-xs py-1.5 px-2 rounded font-semibold transition-opacity"
                                                style={{
                                                    background: selectedCompetence?.key === c.key
                                                        ? 'var(--dune-gold)' : 'var(--dune-surface-alt)',
                                                    color: selectedCompetence?.key === c.key
                                                        ? 'var(--dune-dark)' : 'var(--dune-text)',
                                                    border: '1px solid var(--dune-border)',
                                                }}
                                            >
                                                {COMPETENCE_LABELS[c.key]}
                                                <span className="ml-1 opacity-70">{c.rang}</span>
                                                {c.specialisation?.trim() && (
                                                    <span className="ml-1 text-[8px]">●</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Principe */}
                                <div>
                                    <div className="dune-label mb-1">Principe</div>
                                    <div className="grid grid-cols-3 gap-1">
                                        {character.principes.map(p => (
                                            <button
                                                key={p.key}
                                                onClick={() => setSelectedPrincipe(p)}
                                                className="text-xs py-1.5 px-2 rounded font-semibold transition-opacity"
                                                style={{
                                                    background: selectedPrincipe?.key === p.key
                                                        ? 'var(--dune-spice)' : 'var(--dune-surface-alt)',
                                                    color: selectedPrincipe?.key === p.key
                                                        ? 'var(--dune-dark)' : 'var(--dune-text)',
                                                    border: '1px solid var(--dune-border)',
                                                }}
                                            >
                                                {PRINCIPE_LABELS[p.key]}
                                                <span className="ml-1 opacity-70">{p.rang}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Difficulté */}
                                <div>
                                    <div className="dune-label mb-1">Difficulté (succès requis)</div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setDifficulte(d => Math.max(1, d - 1))}
                                            className="w-8 h-8 rounded font-bold"
                                            style={{ background: 'var(--dune-surface-alt)', color: 'var(--dune-text)' }}
                                        >−</button>
                                        <span className="text-2xl font-bold w-10 text-center"
                                              style={{ color: 'var(--dune-gold)' }}>
                                            {difficulte}
                                        </span>
                                        <button
                                            onClick={() => setDifficulte(d => d + 1)}
                                            className="w-8 h-8 rounded font-bold"
                                            style={{ background: 'var(--dune-surface-alt)', color: 'var(--dune-text)' }}
                                        >+</button>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setStep(2)}
                                disabled={!step1Valid}
                                className="dune-btn-primary w-full disabled:opacity-40"
                            >
                                Suivant →
                            </button>
                        </>
                    )}

                    {/* ── ÉTAPE 2 — Dépenses ───────────────────────────── */}
                    {step === 2 && (
                        <>
                            <div className="space-y-3">
                                {/* Résumé rang */}
                                <div className="text-center text-sm" style={{ color: 'var(--dune-text-muted)' }}>
                                    <span className="font-bold" style={{ color: 'var(--dune-gold)' }}>
                                        {COMPETENCE_LABELS[selectedCompetence.key]}
                                    </span>
                                    {' '}({selectedCompetence.rang}) +{' '}
                                    <span className="font-bold" style={{ color: 'var(--dune-spice)' }}>
                                        {PRINCIPE_LABELS[selectedPrincipe.key]}
                                    </span>
                                    {' '}({selectedPrincipe.rang}) = Rang{' '}
                                    <span className="font-bold" style={{ color: 'var(--dune-gold)' }}>{rang}</span>
                                    {hasSpec && (
                                        <span className="ml-1 text-xs px-1 rounded"
                                              style={{ background: 'var(--dune-gold)', color: 'var(--dune-dark)' }}>
                                            SPEC
                                        </span>
                                    )}
                                </div>

                                {/* Impulsions */}
                                <div className="dune-card-alt">
                                    <div className="dune-label mb-2">
                                        Impulsions disponibles : {sessionResources.impulsions}
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        {[0, 1, 2, 3].map(n => {
                                            const cout      = IMPULSION_COST[n];
                                            const abordable = cout <= sessionResources.impulsions;
                                            const poolOk    = 2 + n + menaceGeneree <= MAX_DES;
                                            return (
                                                <button
                                                    key={n}
                                                    onClick={() => setImpulsionsDepensees(n)}
                                                    disabled={(!abordable || !poolOk) && n !== 0}
                                                    className="flex-1 text-xs py-1.5 rounded font-semibold disabled:opacity-30"
                                                    style={{
                                                        background: impulsionsDepensees === n
                                                            ? 'var(--dune-gold)' : 'var(--dune-surface)',
                                                        color: impulsionsDepensees === n
                                                            ? 'var(--dune-dark)' : 'var(--dune-text)',
                                                        border: '1px solid var(--dune-border)',
                                                    }}
                                                >
                                                    {n === 0 ? '0 dé' : `+${n}d`}
                                                    {n > 0 && (
                                                        <span className="block text-[9px] opacity-70">{cout} imp.</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Menace */}
                                <div className="dune-card-alt">
                                    <div className="dune-label mb-2">Générer de la Menace (+1 dé / menace)</div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setMenaceGeneree(m => Math.max(0, m - 1))}
                                            disabled={menaceGeneree <= 0}
                                            className="w-7 h-7 rounded font-bold disabled:opacity-30"
                                            style={{ background: 'var(--dune-ochre)', color: 'white' }}
                                        >−</button>
                                        <span className="font-bold text-lg w-6 text-center"
                                              style={{ color: 'var(--dune-red)' }}>
                                            {menaceGeneree}
                                        </span>
                                        <button
                                            onClick={() => { if (canAddMenDes) setMenaceGeneree(m => m + 1); }}
                                            disabled={!canAddMenDes}
                                            className="w-7 h-7 rounded font-bold disabled:opacity-30"
                                            style={{ background: 'var(--dune-red)', color: 'white' }}
                                        >+</button>
                                        <span className="text-xs ml-1" style={{ color: 'var(--dune-text-muted)' }}>
                                            menace ajoutée au pool
                                        </span>
                                    </div>
                                </div>

                                {/* Détermination */}
                                {character.determination > 0 && (
                                    <div className="dune-card-alt">
                                        <div className="dune-label mb-2">
                                            Détermination ({character.determination} disponible)
                                        </div>
                                        <div className="flex gap-1.5 flex-wrap">
                                            {[
                                                { mode: 'reroll',   label: '🔄 Relancer', desc: 'Lance 2x, garde le meilleur' },
                                                { mode: 'critical', label: '⭐ Critique',  desc: '1 dé compte comme double succès' },
                                            ].map(({ mode, label, desc }) => (
                                                <button
                                                    key={mode}
                                                    onClick={() => {
                                                        setUseDetMin(true);
                                                        setDetMode(mode);
                                                    }}
                                                    className="flex-1 text-xs py-1.5 px-2 rounded font-semibold"
                                                    style={{
                                                        background: useDetMin && detMode === mode
                                                            ? 'var(--dune-spice)' : 'var(--dune-surface)',
                                                        color: useDetMin && detMode === mode
                                                            ? 'var(--dune-dark)' : 'var(--dune-text)',
                                                        border: '1px solid var(--dune-border)',
                                                    }}
                                                >
                                                    {label}
                                                    <span className="block text-[9px] opacity-70">{desc}</span>
                                                </button>
                                            ))}
                                            {useDetMin && (
                                                <button
                                                    onClick={() => { setUseDetMin(false); setDetMode(null); }}
                                                    className="text-xs px-2 rounded"
                                                    style={{ color: 'var(--dune-text-muted)' }}
                                                >
                                                    ✕ Annuler
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => setStep(1)} className="dune-btn-secondary text-xs flex-none px-3">
                                    ← Retour
                                </button>
                                <button
                                    onClick={handleRoll}
                                    disabled={rolling}
                                    className="dune-btn-primary flex-1 disabled:opacity-50"
                                >
                                    {rolling ? 'Lancement…' : `🎲 Lancer ${nbDes}d20`}
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── ÉTAPE 3 — Résultats ──────────────────────────── */}
                    {step === 3 && rollResults && (
                        <>
                            {/* Dés */}
                            <div className="flex flex-wrap gap-2 justify-center">
                                {rollResults.results.map((v, i) => (
                                    <DieResult key={i} value={v} rang={rollResults.rang} hasSpec={rollResults.hasSpec} />
                                ))}
                            </div>

                            {/* Légende */}
                            <div className="flex gap-3 justify-center text-[10px]" style={{ color: 'var(--dune-text-muted)' }}>
                                <span><span style={{ color: 'var(--dune-gold)' }}>★★</span> double succès</span>
                                <span><span style={{ color: 'var(--dune-success)' }}>★</span> succès</span>
                                <span><span style={{ color: 'var(--dune-red)' }}>⚡</span> complication</span>
                            </div>

                            {/* Bilan */}
                            <div className="text-center p-3 rounded-lg"
                                 style={{ background: 'var(--dune-surface-alt)', border: '1.5px solid var(--dune-border)' }}>
                                <div className="text-2xl font-bold mb-1" style={{
                                    color: rollResults.reussite ? 'var(--dune-success)' : 'var(--dune-red)',
                                }}>
                                    {rollResults.reussite ? '✅ Succès' : '❌ Échec'}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--dune-text-muted)' }}>
                                    {rollResults.succes} / {difficulte} succès requis
                                </div>
                                {rollResults.excedent > 0 && (
                                    <div className="text-xs mt-1" style={{ color: 'var(--dune-gold)' }}>
                                        +{rollResults.excedent} succès en excédent
                                    </div>
                                )}
                                {rollResults.complications > 0 && (
                                    <div className="text-xs mt-1" style={{ color: 'var(--dune-red)' }}>
                                        {rollResults.complications} complication(s) envoyée(s) au MJ
                                    </div>
                                )}
                            </div>

                            {/* Post-jet : excédent → impulsions */}
                            {rollResults.excedent > 0 && activeGMSession && (
                                <button
                                    onClick={() => setStep(4)}
                                    className="dune-btn-primary w-full text-sm"
                                >
                                    Utiliser les succès en excédent →
                                </button>
                            )}

                            <button onClick={onClose} className="dune-btn-secondary w-full text-xs">
                                Fermer
                            </button>
                        </>
                    )}

                    {/* ── ÉTAPE 4 — Post-jet ───────────────────────────── */}
                    {step === 4 && rollResults && (
                        <>
                            <div className="text-center space-y-2">
                                <div className="text-sm font-bold" style={{ color: 'var(--dune-gold)' }}>
                                    {rollResults.excedent} succès en excédent
                                </div>
                                <p className="text-xs" style={{ color: 'var(--dune-text-muted)' }}>
                                    Vous pouvez convertir ces succès en Impulsions ajoutées au pool partagé.
                                </p>
                            </div>

                            <button
                                onClick={handleAjouterImpulsions}
                                disabled={impulsionsAjoutees}
                                className="dune-btn-primary w-full disabled:opacity-50"
                            >
                                {impulsionsAjoutees
                                    ? `✅ +${rollResults.excedent} impulsion(s) ajoutées`
                                    : `+ Ajouter ${rollResults.excedent} impulsion(s) au pool`}
                            </button>

                            <button onClick={onClose} className="dune-btn-secondary w-full text-xs">
                                Fermer
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DuneDiceModal;