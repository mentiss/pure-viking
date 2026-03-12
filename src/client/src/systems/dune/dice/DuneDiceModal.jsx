// src/client/src/systems/dune/dice/DuneDiceModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Modale de jet 2D20 pour le système Dune — VERSION v2 (diceEngine async).
//
// Suppressions par rapport à v1 :
//   - Plus d'import DiceRoll direct (rpg-dice-roller)
//   - Plus de DiceAnimationOverlay local (singleton dans PlayerPage)
//   - Plus d'animSequence / pendingResult
//   - roll() est async (animation + persist inclus)
//
// Flux :
//   Étape 1 — Sélection compétence + principe + difficulté
//   Étape 2 — Dépenses : impulsions / menace / détermination
//   Étape 3 — Résultats (après que roll() a rendu la main)
//   Étape 4 — Post-jet : convertir excédent en impulsions
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback, useEffect } from 'react';
import { roll, RollError } from '../../../tools/diceEngine.js';
import { useSocket }         from '../../../context/SocketContext.jsx';
import { useSession }        from '../../../context/SessionContext.jsx';
import { useFetch }          from '../../../hooks/useFetch.js';
import { useSystem }         from '../../../hooks/useSystem.js';
import duneConfig            from '../config.jsx';

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

const DieResult = ({ value, rang, hasSpec, competenceRang }) => {
    let bg, label;
    if (value === 20) {
        bg = 'var(--dune-red)'; label = '⚡';
    } else if (value <= rang && hasSpec && value <= competenceRang) {
        bg = 'var(--dune-gold)'; label = '★★';
    } else if (value <= rang) {
        bg = 'var(--dune-success)'; label = '★';
    } else {
        bg = 'var(--dune-surface-alt)'; label = null;
    }
    return (
        <div className="flex flex-col items-center gap-0.5">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm border-2"
                 style={{ background: bg, borderColor: bg, color: value === 20 ? 'white' : value <= rang ? 'var(--dune-dark)' : 'var(--dune-text-muted)' }}>
                {value}
            </div>
            {label && <span className="text-[9px] font-bold" style={{ color: bg }}>{label}</span>}
        </div>
    );
};

// ── Composant principal ───────────────────────────────────────────────────────

const DuneDiceModal = ({
                           character,
                           preselect       = null,
                           onClose,
                           onCharacterUpdate,
                           sessionResources = { impulsions: 0, menace: 0 },
                       }) => {
    const { apiBase }         = useSystem();
    const fetchWithAuth       = useFetch();
    const socket              = useSocket();
    const { activeGMSession } = useSession();

    const [step, setStep] = useState(1);

    // Étape 1
    const [selectedCompetence, setSelectedCompetence] = useState(
        preselect?.type === 'competence'
            ? character.competences.find(c => c.key === preselect.key) ?? null : null
    );
    const [selectedPrincipe, setSelectedPrincipe] = useState(
        preselect?.type === 'principe'
            ? character.principes.find(p => p.key === preselect.key) ?? null : null
    );
    const [difficulte, setDifficulte] = useState(1);

    // Étape 2
    const [impulsionsDepensees, setImpulsionsDepensees] = useState(0);
    const [menaceGeneree,       setMenaceGeneree]       = useState(0);
    const [useDetMin,           setUseDetMin]           = useState(false);
    const [detMode,             setDetMode]             = useState(null); // 'reroll' | 'critical'

    // Étape 3
    const [rollResults, setRollResults] = useState(null);
    const [rolling,     setRolling]     = useState(false);

    // Étape 4
    const [impulsionsAjoutees, setImpulsionsAjoutees] = useState(false);

    // ── Calculs dérivés ───────────────────────────────────────────────────────
    const rang      = (selectedCompetence?.rang ?? 0) + (selectedPrincipe?.rang ?? 0);
    const hasSpec   = !!(selectedCompetence?.specialisation?.trim());
    const compRang  = selectedCompetence?.rang ?? 0;
    const nbDesBase = 2;
    const nbDes     = Math.min(MAX_DES, nbDesBase + impulsionsDepensees + menaceGeneree);
    const canAddMenDes  = nbDes < MAX_DES;

    const impCoutMax = Math.min(3, sessionResources.impulsions > 0 ? 3 : 0);
    const menaceDisponible = sessionResources.menace ?? 0;
    // Dés restants disponibles pour la menace
    const menaceDesMax = Math.max(0, MAX_DES - nbDesBase - impulsionsDepensees);

    // Réinitialiser la menace si les impulsions réduisent la place disponible
    useEffect(() => {
        if (menaceGeneree > menaceDesMax) {
            setMenaceGeneree(menaceDesMax);
        }
    }, [impulsionsDepensees, menaceDesMax]);

    // ── Jet de dés ────────────────────────────────────────────────────────────
    const handleRoll = useCallback(async () => {
        if (rolling) return;
        setRolling(true);

        try {
            // Décrémenter la détermination si utilisée (avant roll)
            if (useDetMin && detMode && character.determination > 0) {
                onCharacterUpdate({ ...character, determination: character.determination - 1 });
            }

            const ctx = {
                apiBase,
                fetchFn:       fetchWithAuth,
                characterId:   character.id,
                characterName: character.nom,
                sessionId:     activeGMSession ?? null,
                rollType:      'dune_2d20',
                label: [
                    selectedCompetence ? `${COMPETENCE_LABELS[selectedCompetence.key] ?? selectedCompetence.key} (${selectedCompetence.rang})` : null,
                    selectedPrincipe   ? `${PRINCIPE_LABELS[selectedPrincipe.key] ?? selectedPrincipe.key} (${selectedPrincipe.rang})` : null,
                ].filter(Boolean).join(' + ') || `${nbDes}d20`,
                systemData: {
                    nbDes,
                    rang,
                    hasSpec,
                    competenceRang:   compRang,
                    difficulte,
                    impulsionsDepensees,
                    menaceGeneree,
                    useDetermination: useDetMin && !!detMode,
                    detMode:          detMode ?? null,
                },
            };

            const notation = duneConfig.dice.buildNotation(ctx);
            // roll() est async : gère animation + persist en interne
            const result   = await roll(notation, ctx, duneConfig.dice);

            setRollResults(result);
            setStep(3);

            // Mise à jour ressources session post-jet
            if (socket && activeGMSession) {
                if (impulsionsDepensees > 0)
                    socket.emit('update-session-resources', { sessionId: activeGMSession, field: 'impulsions', delta: -impulsionsDepensees });
                if (menaceGeneree > 0)
                    socket.emit('update-session-resources', { sessionId: activeGMSession, field: 'menace', delta: menaceGeneree });
                if (result.complications > 0)
                    socket.emit('update-session-resources', { sessionId: activeGMSession, field: 'complications', delta: result.complications });
            }

        } catch (err) {
            console.error('[DuneDiceModal] roll error:', err);
        } finally {
            setRolling(false);
        }
    }, [
        rolling, useDetMin, detMode, character, onCharacterUpdate,
        apiBase, fetchWithAuth, activeGMSession, socket,
        nbDes, rang, hasSpec, compRang, difficulte,
        impulsionsDepensees, menaceGeneree,
    ]);

    // ── Ajouter l'excédent en impulsions (étape 4) ────────────────────────────
    const handleAjouterImpulsions = useCallback(() => {
        if (!rollResults || impulsionsAjoutees) return;
        if (socket && activeGMSession) {
            socket.emit('update-session-resources', {
                sessionId:        activeGMSession,
                field: 'impulsions',
                delta: rollResults.excedent,
            });
        }
        setImpulsionsAjoutees(true);
    }, [rollResults, impulsionsAjoutees, socket, activeGMSession]);

    // ─────────────────────────────────────────────────────────────────────────
    // Rendu
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
                 style={{ background: 'var(--dune-surface)', border: '2px solid var(--dune-gold)' }}>

                {/* En-tête */}
                <div className="flex items-center justify-between px-4 py-3"
                     style={{ background: 'var(--dune-dark)', borderBottom: '1px solid var(--dune-gold)' }}>
                    <div>
                        <div className="text-sm font-bold" style={{ color: 'var(--dune-gold)' }}>Jet de dés 2D20</div>
                        <div className="text-[10px]" style={{ color: 'var(--dune-sand)' }}>
                            {rang > 0 && `Rang total : ${rang}`}
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

                    {/* ── ÉTAPE 1 : Sélection ──────────────────────────────── */}
                    {step === 1 && (
                        <>
                            {/* Principes */}
                            <div>
                                <div className="dune-label mb-2">Principe</div>
                                <div className="grid grid-cols-3 gap-1">
                                    {(character.principes ?? []).map(prin => (
                                        <button
                                            key={prin.key}
                                            onClick={() => setSelectedPrincipe(
                                                selectedPrincipe?.key === prin.key ? null : prin
                                            )}
                                            className="text-xs py-1.5 px-2 rounded font-semibold transition-opacity"
                                            style={{
                                                background: selectedPrincipe?.key === prin.key ? 'var(--dune-spice)' : 'var(--dune-surface-alt)',
                                                color:      selectedPrincipe?.key === prin.key ? 'var(--dune-dark)' : 'var(--dune-text)',
                                                border: '1px solid var(--dune-border)',
                                            }}
                                        >
                                            {PRINCIPE_LABELS[prin.key] ?? prin.key}
                                            <span className="ml-1 opacity-70">{prin.rang}</span>
                                            {prin.maxime?.trim() && (
                                                <span className="ml-1 text-[8px]">●</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Compétences */}
                            <div>
                                <div className="dune-label mb-2">Compétence</div>
                                <div className="grid grid-cols-3 gap-1">
                                    {(character.competences ?? []).map(comp => (
                                        <button
                                            key={comp.key}
                                            onClick={() => setSelectedCompetence(
                                                selectedCompetence?.key === comp.key ? null : comp
                                            )}
                                            className="text-xs py-1.5 px-2 rounded font-semibold transition-opacity"
                                            style={{
                                                background: selectedCompetence?.key === comp.key ? 'var(--dune-spice)' : 'var(--dune-surface-alt)',
                                                color:      selectedCompetence?.key === comp.key ? 'var(--dune-dark)' : 'var(--dune-text)',
                                                border: '1px solid var(--dune-border)',
                                            }}
                                        >
                                            {COMPETENCE_LABELS[comp.key]}
                                            <span className="ml-1 opacity-70">{comp.rang}</span>
                                            {comp.specialisation?.trim() && (
                                                <span className="ml-1 text-[8px]">●</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>



                            {/* Difficulté */}
                            <div>
                                <div className="dune-label mb-2">Difficulté</div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setDifficulte(d => Math.max(0, d - 1))}
                                            className="dune-btn-secondary px-3">−</button>
                                    <span className="text-lg font-bold w-8 text-center" style={{ color: 'var(--dune-gold)' }}>{difficulte}</span>
                                    <button onClick={() => setDifficulte(d => Math.min(5, d + 1))}
                                            className="dune-btn-secondary px-3">+</button>
                                </div>
                            </div>

                            <button
                                onClick={() => setStep(2)}
                                disabled={!selectedCompetence && !selectedPrincipe}
                                className="dune-btn-primary w-full disabled:opacity-40"
                            >
                                Suivant →
                            </button>
                        </>
                    )}

                    {/* ── ÉTAPE 2 : Dépenses ───────────────────────────────── */}
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
                                <button onClick={() => setStep(1)} className="dune-btn-secondary text-xs flex-none px-3">← Retour</button>
                                <button
                                    onClick={handleRoll}
                                    disabled={rolling || (useDetMin && !detMode)}
                                    className="dune-btn-primary flex-1 disabled:opacity-50"
                                >
                                    {rolling ? '⏳ Lancement…' : `🎲 Lancer ${nbDes}d20`}
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── ÉTAPE 3 : Résultats ──────────────────────────────── */}
                    {step === 3 && rollResults && (
                        <>
                            <div className="text-center">
                                <div className="text-2xl font-bold mb-1"
                                     style={{ color: rollResults.reussite ? 'var(--dune-success)' : 'var(--dune-red)' }}>
                                    {rollResults.reussite ? '✅ Réussite' : '❌ Échec'}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--dune-text-muted)' }}>
                                    {rollResults.succes} succès / {rollResults.difficulte} requis
                                    {rollResults.excedent > 0 && ` · +${rollResults.excedent} excédent`}
                                    {rollResults.complications > 0 && ` · ⚠️ ${rollResults.complications} complication(s)`}
                                </div>
                            </div>

                            <div className="flex gap-2 flex-wrap justify-center">
                                {(rollResults.results ?? []).map((v, i) => (
                                    <DieResult key={i} value={v} rang={rang} hasSpec={hasSpec} competenceRang={compRang} />
                                ))}
                            </div>

                            {/* Bouton excédent → impulsions */}
                            {rollResults.reussite && rollResults.excedent > 0 && !impulsionsAjoutees && (
                                <button
                                    onClick={() => setStep(4)}
                                    className="dune-btn-secondary w-full text-xs"
                                >
                                    Convertir {rollResults.excedent} succès excédentaire(s) en impulsions →
                                </button>
                            )}

                            <button onClick={onClose} className="dune-btn-primary w-full">Fermer</button>
                        </>
                    )}

                    {/* ── ÉTAPE 4 : Post-jet impulsions ────────────────────── */}
                    {step === 4 && rollResults && (
                        <>
                            <p className="text-sm text-center" style={{ color: 'var(--dune-text)' }}>
                                Convertir <strong>{rollResults.excedent}</strong> succès excédentaire(s) en impulsions ?
                            </p>
                            <button
                                onClick={handleAjouterImpulsions}
                                disabled={impulsionsAjoutees}
                                className="dune-btn-primary w-full disabled:opacity-50"
                            >
                                {impulsionsAjoutees
                                    ? `✅ +${rollResults.excedent} impulsion(s) ajoutées`
                                    : `+ Ajouter ${rollResults.excedent} impulsion(s) au pool`}
                            </button>
                            <button onClick={onClose} className="dune-btn-secondary w-full text-xs">Fermer</button>
                        </>
                    )}

                </div>
            </div>
        </div>
    );
};

export default DuneDiceModal;