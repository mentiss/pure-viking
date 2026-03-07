// src/client/src/systems/dune/gm/modals/GMDiceModal.jsx
// Modale de jet de dés pour le GM Dune.
//   - Rang saisi librement (valeur numérique)
//   - Difficulté saisie librement
//   - Dés supplémentaires via dépense de Menace (1:1, max 5d20)
//   - Pas de Détermination, pas d'Impulsions
//   - Résultats diffusés via POST /dice/roll
//   - Animation 3D via DiceAnimationOverlay si animationEnabled dans la config

import React, { useState, useCallback } from 'react';
import { DiceRoll }           from '@dice-roller/rpg-dice-roller';
import { useSocket }          from '../../../../context/SocketContext.jsx';
import { useFetch }           from '../../../../hooks/useFetch.js';
import { useSystem }          from '../../../../hooks/useSystem.js';
import { readDiceConfig }     from '../../../../components/modals/DiceConfigModal.jsx';
import DiceAnimationOverlay   from '../../../../components/shared/DiceAnimationOverlay.jsx';
import duneConfig             from '../../config.jsx';

const { countSuccesses } = duneConfig;
const MAX_DES = 5;

// ── Sous-composant dé ─────────────────────────────────────────────────────────

const DieResult = ({ value, rang }) => {
    let bg;
    if (value === 20)       bg = 'var(--dune-red)';
    else if (value <= rang) bg = 'var(--dune-success)';
    else                    bg = 'var(--dune-surface-alt)';

    return (
        <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm border-2"
             style={{ background: bg, borderColor: bg,
                 color: value === 20 ? 'white' : value <= rang ? 'var(--dune-dark)' : 'var(--dune-text-muted)' }}>
            {value}
        </div>
    );
};

/**
 * @param {Function} props.onClose
 * @param {number}   props.sessionId
 * @param {number}   props.menaceDisponible
 */
const GMDiceModal = ({ onClose, sessionId, menaceDisponible = 0 }) => {
    const { apiBase }  = useSystem();
    const fetchWithAuth = useFetch(); // ✅ useFetch() retourne directement la fonction
    const socket       = useSocket();

    const [rang,           setRang]           = useState(10);
    const [difficulte,     setDifficulte]     = useState(2);
    const [menaceDepensee, setMenaceDepensee] = useState(0);
    const [rolling,        setRolling]        = useState(false);
    const [result,         setResult]         = useState(null);

    // Animation 3D
    const [animSequence,   setAnimSequence]   = useState(null); // déclenche l'overlay
    const [pendingResult,  setPendingResult]  = useState(null); // résultat en attente de l'animation

    const nbDes = 2 + menaceDepensee;

    const handleRoll = useCallback(async () => {
        if (rolling) return;
        setRolling(true);
        try {
            const notation = `${nbDes}d20`;
            const diceRoll = new DiceRoll(notation);
            const results  = diceRoll.rolls[0].rolls.map(r => r.value);
            const { succes, complications } = countSuccesses(results, rang, false);
            const reussite = succes >= difficulte;
            const excedent = Math.max(0, succes - difficulte);

            const rollData = { results, rang, succes, complications, reussite, excedent };

            // ── Effets socket (menace + complications) ────────────────────────
            if (socket && sessionId) {
                if (menaceDepensee > 0) {
                    socket.emit('update-session-resources', {
                        sessionId, field: 'menace', delta: -menaceDepensee,
                    });
                }
                if (complications > 0) {
                    socket.emit('update-session-resources', {
                        sessionId, field: 'complications', delta: complications,
                    });
                }
            }

            // ── Persistance historique ────────────────────────────────────────
            await fetchWithAuth(`${apiBase}/dice/roll`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    character_id:   -1,
                    character_name: 'MJ',
                    session_id:     sessionId ?? null,
                    notation,
                    roll_result: JSON.stringify({ results, rang, succes, complications, reussite, difficulte, menaceDepensee }),
                    roll_type: 'dune_gm_2d20',
                    successes: succes,
                }),
            }).catch(() => {});

            // ── Animation ou affichage direct ─────────────────────────────────
            const diceConfig = readDiceConfig();
            if (diceConfig.animationEnabled) {
                // Construire une AnimationSequence minimale pour les d20
                const animSeq = {
                    mode: 'single',
                    groups: [{
                        id: 'gm-roll',
                        diceType: 'd20',
                        color: 'default',
                        label: `MJ — ${nbDes}d20`,
                        waves: [{ dice: results }],
                    }],
                    insuranceData: null,
                };
                setPendingResult(rollData);
                setAnimSequence(animSeq);
            } else {
                setResult(rollData);
            }
        } catch (err) {
            console.error('[GMDiceModal] Erreur roll:', err);
        } finally {
            setRolling(false);
        }
    }, [rolling, nbDes, rang, difficulte, menaceDepensee, socket, sessionId, fetchWithAuth, apiBase]);

    // Appelé quand l'animation 3D se termine
    const handleAnimComplete = useCallback(() => {
        setAnimSequence(null);
        setResult(pendingResult);
        setPendingResult(null);
    }, [pendingResult]);

    return (
        <>
            {/* ── Overlay animation 3D ─────────────────────────────────────── */}
            {animSequence && (
                <DiceAnimationOverlay
                    animationSequence={animSequence}
                    onComplete={handleAnimComplete}
                    onSkip={handleAnimComplete}
                />
            )}

            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                <div className="w-full max-w-sm rounded-xl shadow-2xl overflow-hidden"
                     style={{ background: 'var(--dune-surface)', border: '2px solid var(--dune-ochre)' }}>

                    {/* En-tête */}
                    <div className="flex items-center justify-between px-4 py-3"
                         style={{ background: 'var(--dune-dark)', borderBottom: '1px solid var(--dune-ochre)' }}>
                        <div className="text-sm font-bold" style={{ color: 'var(--dune-gold)' }}>
                            Jet MJ — {nbDes}d20
                        </div>
                        <button onClick={onClose} style={{ color: 'var(--dune-sand)' }}>✕</button>
                    </div>

                    <div className="p-4 space-y-4">
                        {!result ? (
                            <>
                                {/* Rang */}
                                <div>
                                    <div className="dune-label mb-1">Rang</div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setRang(r => Math.max(1, r - 1))}
                                                className="w-8 h-8 rounded font-bold"
                                                style={{ background: 'var(--dune-surface-alt)', color: 'var(--dune-text)' }}>−</button>
                                        <span className="text-2xl font-bold w-12 text-center"
                                              style={{ color: 'var(--dune-gold)' }}>{rang}</span>
                                        <button onClick={() => setRang(r => r + 1)}
                                                className="w-8 h-8 rounded font-bold"
                                                style={{ background: 'var(--dune-surface-alt)', color: 'var(--dune-text)' }}>+</button>
                                    </div>
                                </div>

                                {/* Difficulté */}
                                <div>
                                    <div className="dune-label mb-1">Difficulté</div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setDifficulte(d => Math.max(1, d - 1))}
                                                className="w-8 h-8 rounded font-bold"
                                                style={{ background: 'var(--dune-surface-alt)', color: 'var(--dune-text)' }}>−</button>
                                        <span className="text-2xl font-bold w-12 text-center"
                                              style={{ color: 'var(--dune-gold)' }}>{difficulte}</span>
                                        <button onClick={() => setDifficulte(d => d + 1)}
                                                className="w-8 h-8 rounded font-bold"
                                                style={{ background: 'var(--dune-surface-alt)', color: 'var(--dune-text)' }}>+</button>
                                    </div>
                                </div>

                                {/* Menace */}
                                <div className="dune-card-alt">
                                    <div className="dune-label mb-1">
                                        Dépenser de la Menace (+1 dé / menace) — disponible : {menaceDisponible}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setMenaceDepensee(m => Math.max(0, m - 1))}
                                                disabled={menaceDepensee <= 0}
                                                className="w-7 h-7 rounded font-bold disabled:opacity-30"
                                                style={{ background: 'var(--dune-ochre)', color: 'white' }}>−</button>
                                        <span className="font-bold text-lg w-6 text-center"
                                              style={{ color: 'var(--dune-red)' }}>{menaceDepensee}</span>
                                        <button
                                            onClick={() => { if (nbDes < MAX_DES && menaceDepensee < menaceDisponible) setMenaceDepensee(m => m + 1); }}
                                            disabled={nbDes >= MAX_DES || menaceDepensee >= menaceDisponible}
                                            className="w-7 h-7 rounded font-bold disabled:opacity-30"
                                            style={{ background: 'var(--dune-red)', color: 'white' }}>+</button>
                                        <span className="text-xs ml-1" style={{ color: 'var(--dune-text-muted)' }}>
                                            → {nbDes} dés
                                        </span>
                                    </div>
                                </div>

                                <button onClick={handleRoll} disabled={rolling}
                                        className="dune-btn-primary w-full disabled:opacity-50">
                                    {rolling ? 'Lancement…' : `🎲 Lancer ${nbDes}d20`}
                                </button>
                            </>
                        ) : (
                            <>
                                {/* Résultats */}
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {result.results.map((v, i) => (
                                        <DieResult key={i} value={v} rang={result.rang} />
                                    ))}
                                </div>

                                <div className="text-center p-3 rounded-lg"
                                     style={{ background: 'var(--dune-surface-alt)' }}>
                                    <div className="text-2xl font-bold mb-1"
                                         style={{ color: result.reussite ? 'var(--dune-success)' : 'var(--dune-red)' }}>
                                        {result.reussite ? '✅ Succès' : '❌ Échec'}
                                    </div>
                                    <div className="text-sm" style={{ color: 'var(--dune-text-muted)' }}>
                                        {result.succes} / {difficulte} succès requis
                                    </div>
                                    {result.excedent > 0 && (
                                        <div className="text-xs mt-1" style={{ color: 'var(--dune-gold)' }}>
                                            +{result.excedent} succès en excédent
                                        </div>
                                    )}
                                    {result.complications > 0 && (
                                        <div className="text-xs mt-1" style={{ color: 'var(--dune-red)' }}>
                                            {result.complications} complication(s)
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={() => setResult(null)} className="dune-btn-secondary flex-1 text-xs">
                                        Nouveau jet
                                    </button>
                                    <button onClick={onClose} className="dune-btn-primary flex-1 text-xs">
                                        Fermer
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default GMDiceModal;