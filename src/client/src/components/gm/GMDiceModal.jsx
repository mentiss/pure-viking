// GMDiceModal.jsx - Lanceur de dés MJ + Animation 3D
import React, { useState, useRef, useCallback } from "react";
import { rollDiceWithSequence } from "../../tools/utils.js";
import DiceAnimationOverlay from "../shared/DiceAnimationOverlay.jsx";
import { readDiceConfig } from "../modals/DiceConfigModal.jsx";
import {useFetch} from "../../hooks/useFetch.js";

const GMDiceModal = ({ onClose, darkMode, sessionId = null }) => {

    const [threshold, setThreshold] = useState(7);
    const [explosion, setExplosion] = useState(10);
    const [rolling, setRolling] = useState(false);
    const [result, setResult] = useState(null);
    const [broadcast, setBroadcast] = useState(false);
    const [animationData, setAnimationData] = useState(null);

    const fetchWithAuth = useFetch();
    // Ref pour éviter le stale closure dans handleAnimationComplete
    const pendingResultRef = useRef(null);
    // Ref pour broadcast (lu dans le callback sans dépendance)
    const broadcastRef = useRef(broadcast);
    broadcastRef.current = broadcast;

    const reset = () => {
        setResult(null);
        setAnimationData(null);
        pendingResultRef.current = null;
    };

    // ─── Fin d'animation ─────────────────────────────────────────────────────
    const handleAnimationComplete = useCallback(() => {
        const pending = pendingResultRef.current;
        if (!pending) return;

        setResult(pending.result);

        if (broadcastRef.current && pending.broadcastPayload) {
            fetchWithAuth('/api/dice/roll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pending.broadcastPayload)
            }).catch(err => console.error('[GMDiceModal] broadcast error:', err));
        }

        pendingResultRef.current = null;
        setAnimationData(null);
        setRolling(false);
    }, []); // Pas de dépendances — on lit tout depuis les refs

    // ─── Lancer ──────────────────────────────────────────────────────────────
    const handleRoll = () => {
        setRolling(true);
        setResult(null);

        // Construire les seuils d'explosion (ex: explosion=9 → [9, 10])
        const explosionThresholds = Array.from(
            { length: 10 - explosion + 1 },
            (_, i) => explosion + i
        );

        const { rolls, sequence } = rollDiceWithSequence(3, explosionThresholds);
        const successes = rolls.filter(d => d >= threshold).length;

        const pending = {
            result: { rolls, successes },
            broadcastPayload: {
                character_id: -1,
                character_name: 'MJ',
                session_id: sessionId,
                roll_type: 'carac',
                roll_target: 'Jet MJ',
                pool: 3,
                threshold,
                results: rolls,
                successes,
                saga_spent: 0,
                saga_recovered: 0,
            }
        };

        const { animationEnabled } = readDiceConfig();
        if (animationEnabled !== false) {
            pendingResultRef.current = pending;
            setAnimationData({ sequences: sequence });
        } else {
            // Résultat instantané — pas d'animation 3D
            setResult(pending.result);
            if (broadcastRef.current && pending.broadcastPayload) {
                fetchWithAuth('/api/dice/roll', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(pending.broadcastPayload)
                }).catch(err => console.error('[GMDiceModal] broadcast error:', err));
            }
            setRolling(false);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-md w-full border-4 border-viking-bronze p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-viking-brown dark:text-viking-parchment">🎲 Jet MJ</h3>
                    <button onClick={onClose} className="text-2xl text-viking-leather dark:text-viking-bronze hover:text-viking-danger">✕</button>
                </div>

                {/* Paramètres */}
                <div className="space-y-4 mb-4">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-semibold text-viking-brown dark:text-viking-parchment w-24">Seuil succès</label>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setThreshold(Math.max(1, threshold - 1))} className="w-8 h-8 rounded bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment font-bold">-</button>
                            <span className="text-lg font-bold text-viking-bronze w-8 text-center">{threshold}</span>
                            <button onClick={() => setThreshold(Math.min(10, threshold + 1))} className="w-8 h-8 rounded bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment font-bold">+</button>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-semibold text-viking-brown dark:text-viking-parchment w-24">Explosion sur</label>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setExplosion(Math.max(threshold + 1, explosion - 1))} className="w-8 h-8 rounded bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment font-bold">-</button>
                            <span className="text-lg font-bold text-viking-bronze w-8 text-center">{explosion}+</span>
                            <button onClick={() => setExplosion(Math.min(10, explosion + 1))} className="w-8 h-8 rounded bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment font-bold">+</button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="broadcast" checked={broadcast} onChange={(e) => setBroadcast(e.target.checked)} className="w-4 h-4" />
                        <label htmlFor="broadcast" className="text-sm text-viking-brown dark:text-viking-parchment cursor-pointer">
                            📢 Partager le jet (historique visible par tous)
                        </label>
                    </div>
                </div>

                {/* Résultat */}
                {result && (
                    <div className="mb-4 p-4 bg-viking-bronze/20 rounded">
                        <div className="text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">
                            Dés : {result.rolls.join(', ')}
                        </div>
                        <div className="text-lg font-bold text-viking-brown dark:text-viking-parchment">
                            {result.successes} succès
                        </div>
                        <div className="text-xs text-viking-leather dark:text-viking-bronze mt-1">
                            (Seuil {threshold}+, Explosion {explosion}+)
                        </div>
                    </div>
                )}

                {/* Boutons */}
                <div className="flex gap-2">
                    {result ? (
                        <>
                            <button onClick={reset} className="flex-1 px-4 py-2 bg-viking-bronze text-viking-brown rounded font-semibold hover:bg-viking-leather">Nouveau jet</button>
                            <button onClick={onClose} className="flex-1 px-4 py-2 bg-viking-success text-white rounded font-semibold hover:bg-green-700">Fermer</button>
                        </>
                    ) : (
                        <button onClick={handleRoll} disabled={rolling}
                                className="w-full px-4 py-2 bg-viking-bronze text-viking-brown rounded font-semibold hover:bg-viking-leather disabled:opacity-50">
                            {rolling ? 'Lancement...' : '🎲 Lancer les dés'}
                        </button>
                    )}
                </div>
            </div>

            {/* Overlay animation 3D */}
            {animationData && (
                <DiceAnimationOverlay
                    sequences={animationData.sequences}
                    diceType="d10"
                    onComplete={handleAnimationComplete}
                    onSkip={handleAnimationComplete}
                />
            )}
        </div>
    );
};

export default GMDiceModal;